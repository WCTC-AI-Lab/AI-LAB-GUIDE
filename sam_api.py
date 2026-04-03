"""
SAM Playground — Flask Blueprint.

Run the server with the SAM3 venv so sam3+torch are importable:
  C:\\Users\\AI-Lab\\Desktop\\SAM3\\venv\\Scripts\\python.exe app.py

For PM2 production use, update the pm2 command to point at that pythonw.exe.
"""

from __future__ import annotations

import base64
import copy
import io
import json as _json_mod
import os
import shutil
import subprocess
import threading
import uuid

import numpy as np
import torch
from flask import Blueprint, jsonify, request, send_from_directory
from PIL import Image

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_ROOT = os.path.abspath(os.path.dirname(__file__))
IMAGES_DIR = os.path.join(_ROOT, "assets", "images")
VIDEOS_DIR = os.path.join(_ROOT, "assets", "videos")
FRAMES_DIR = os.path.join(_ROOT, "assets", "frames")

os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_FRAMES = 100

# { video_filename: { status: "extracting"|"ready"|"error", frame_count, duration, error } }
_video_status: dict = {}

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
sam_bp = Blueprint("sam", __name__, url_prefix="/api/sam")

# ---------------------------------------------------------------------------
# Lazy SAM3 model singleton (loaded on first /segment request)
# ---------------------------------------------------------------------------
_model = None
_processor = None

# Per-image backbone cache: re-encoding the same image wastes GPU time.
# We store the backbone outputs for the last image so click interactions
# on the same image skip the encoder step.
_backbone_cache: dict = {"path": None, "backbone_out": None, "h": None, "w": None}


def _get_model():
    global _model, _processor
    if _model is not None:
        return _model, _processor

    from sam3 import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    import sam3 as _sam3_pkg

    sam3_root = os.path.dirname(_sam3_pkg.__file__)
    bpe_path = os.path.join(sam3_root, "assets", "bpe_simple_vocab_16e6.txt.gz")

    _model = build_sam3_image_model(
        enable_inst_interactivity=True,
        bpe_path=bpe_path if os.path.exists(bpe_path) else None,
    )
    _processor = Sam3Processor(_model)
    return _model, _processor


def _get_state_for_path(full_path: str) -> dict:
    """Return a fresh inference state for the image at full_path.
    Re-uses cached backbone features when the same path is requested twice."""
    _, processor = _get_model()

    if _backbone_cache["path"] == full_path:
        return {
            "backbone_out": {
                k: v.clone() if isinstance(v, torch.Tensor) else copy.copy(v)
                for k, v in _backbone_cache["backbone_out"].items()
            },
            "original_height": _backbone_cache["h"],
            "original_width": _backbone_cache["w"],
        }

    pil_image = Image.open(full_path).convert("RGB")
    state = processor.set_image(pil_image)

    _backbone_cache["path"] = full_path
    _backbone_cache["backbone_out"] = state["backbone_out"]
    _backbone_cache["h"] = state["original_height"]
    _backbone_cache["w"] = state["original_width"]

    return state


def _get_state_for_image(image_filename: str) -> dict:
    """Convenience wrapper for images stored in IMAGES_DIR."""
    return _get_state_for_path(os.path.join(IMAGES_DIR, image_filename))


# ---------------------------------------------------------------------------
# Color palette for mask overlays (RGBA values)
# ---------------------------------------------------------------------------
_MASK_COLORS = [
    (59, 130, 246),   # blue
    (16, 185, 129),   # green
    (245, 158, 11),   # amber
    (239, 68, 68),    # red
    (168, 85, 247),   # purple
    (236, 72, 153),   # pink
    (20, 184, 166),   # teal
    (249, 115, 22),   # orange
]


def _mask_to_b64(mask_bool: np.ndarray, color_idx: int = 0) -> str:
    """Convert a boolean HxW mask to a base64-encoded RGBA PNG."""
    r, g, b = _MASK_COLORS[color_idx % len(_MASK_COLORS)]
    h, w = mask_bool.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[mask_bool, 0] = r
    rgba[mask_bool, 1] = g
    rgba[mask_bool, 2] = b
    rgba[mask_bool, 3] = 140  # ~55% opacity
    img = Image.fromarray(rgba, "RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _mask_to_bbox(mask_bool: np.ndarray) -> dict:
    rows = np.any(mask_bool, axis=1)
    cols = np.any(mask_bool, axis=0)
    if not rows.any():
        return {"x": 0, "y": 0, "w": 0, "h": 0}
    rmin, rmax = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    cmin, cmax = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])
    return {"x": cmin, "y": rmin, "w": cmax - cmin, "h": rmax - rmin}


# ---------------------------------------------------------------------------
# Routes — Images
# ---------------------------------------------------------------------------

@sam_bp.route("/images", methods=["GET"])
def list_images():
    files = []
    for f in sorted(os.listdir(IMAGES_DIR)):
        if os.path.splitext(f)[1].lower() in ALLOWED_IMAGE_EXTS:
            files.append({"name": f, "url": f"/api/sam/images/{f}"})
    return jsonify({"images": files})


@sam_bp.route("/images/<path:filename>", methods=["GET"])
def serve_image(filename):
    return send_from_directory(IMAGES_DIR, filename)


@sam_bp.route("/upload-image", methods=["POST"])
def upload_image():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        return jsonify({"error": f"Unsupported file type: {ext}"}), 400
    safe_name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(f.filename)}"
    f.save(os.path.join(IMAGES_DIR, safe_name))
    return jsonify({"name": safe_name, "url": f"/api/sam/images/{safe_name}"})


# ---------------------------------------------------------------------------
# Routes — Segmentation
# ---------------------------------------------------------------------------

@sam_bp.route("/segment", methods=["POST"])
def segment():
    """
    Body:
      {
        image_path: str,           -- filename in assets/images/
        points?: [{x, y, label}],  -- pixel coords; label 1=positive 0=negative
        box?: {x1, y1, x2, y2},   -- pixel xyxy
        text?: str,                -- text prompt (SAM3 open-vocab)
        confidence?: float,        -- detection threshold, default 0.5 (text mode)
      }
    Returns:
      { masks: [{id, score, mask_b64, bbox}] }
    """
    data = request.get_json()
    if not data or ("image_path" not in data and "frame_path" not in data):
        return jsonify({"error": "image_path or frame_path required"}), 400

    # Resolve the absolute path on disk depending on which key was sent.
    if "frame_path" in data:
        # frame_path is a relative path like "video_base/frame0001.jpg"
        candidate = os.path.normpath(os.path.join(FRAMES_DIR, data["frame_path"]))
        # Guard against path-traversal attacks
        if not candidate.startswith(os.path.abspath(FRAMES_DIR)):
            return jsonify({"error": "Invalid frame_path"}), 400
        resolved_path = candidate
    else:
        image_filename = os.path.basename(data["image_path"])
        resolved_path = os.path.join(IMAGES_DIR, image_filename)

    if not os.path.exists(resolved_path):
        return jsonify({"error": f"Image not found: {resolved_path}"}), 404

    try:
        model, processor = _get_model()
    except Exception as exc:
        return jsonify({"error": f"Failed to load SAM3 model: {exc}"}), 500

    try:
        state = _get_state_for_path(resolved_path)
    except Exception as exc:
        return jsonify({"error": f"Failed to encode image: {exc}"}), 500

    points_data = data.get("points") or []
    box_data = data.get("box")
    text = (data.get("text") or "").strip()
    confidence = float(data.get("confidence", 0.5))

    result_masks = []

    # ------------------------------------------------------------------
    # Text prompt → grounding path (Sam3Processor)
    # ------------------------------------------------------------------
    if text:
        try:
            device_type = next(model.parameters()).device.type  # 'cuda' or 'cpu'

            processor.confidence_threshold = confidence
            processor.reset_all_prompts(state)
            with torch.autocast(device_type=device_type, dtype=torch.bfloat16,
                                 enabled=(device_type == 'cuda')):
                state = processor.set_text_prompt(prompt=text, state=state)

            raw_masks = state.get("masks")
            raw_scores = state.get("scores")

            if raw_masks is not None:
                masks_np = raw_masks.cpu().float().numpy() if isinstance(raw_masks, torch.Tensor) else np.array(raw_masks)
                scores_np = raw_scores.cpu().float().numpy() if isinstance(raw_scores, torch.Tensor) else np.array(raw_scores or [])

                for i, mask in enumerate(masks_np):
                    # mask shape: (1, H, W) or (H, W)
                    if mask.ndim == 3:
                        mask = mask[0]
                    bool_mask = mask.astype(bool)
                    score = float(scores_np[i]) if i < len(scores_np) else 0.0
                    result_masks.append({
                        "id": str(uuid.uuid4()),
                        "score": round(score, 3),
                        "mask_b64": _mask_to_b64(bool_mask, i),
                        "bbox": _mask_to_bbox(bool_mask),
                    })
        except Exception as exc:
            return jsonify({"error": f"Text segmentation failed: {exc}"}), 500

    # ------------------------------------------------------------------
    # Point / box prompt → interactive path (model.predict_inst)
    # ------------------------------------------------------------------
    else:
        point_coords = None
        point_labels = None
        box = None

        if points_data:
            point_coords = np.array([[p["x"], p["y"]] for p in points_data], dtype=np.float32)
            point_labels = np.array([p["label"] for p in points_data], dtype=np.int32)

        if box_data:
            box = np.array([[
                box_data["x1"], box_data["y1"],
                box_data["x2"], box_data["y2"],
            ]], dtype=np.float32)

        if point_coords is None and box is None:
            return jsonify({"masks": []})

        try:
            model_dtype = next(model.parameters()).dtype
            if "backbone_out" in state and isinstance(state["backbone_out"], dict):
                state["backbone_out"] = {
                    k: v.to(model_dtype) if isinstance(v, torch.Tensor) else v
                    for k, v in state["backbone_out"].items()
                }

            masks, scores, _ = model.predict_inst(
                state,
                point_coords=point_coords,
                point_labels=point_labels,
                box=box,
                multimask_output=(box is None),
            )
            # masks: (num_masks, H, W) — values are logits or booleans
            for i, (mask, score) in enumerate(zip(masks, scores)):
                bool_mask = (mask > 0.0).astype(bool) if mask.dtype != bool else mask
                result_masks.append({
                    "id": str(uuid.uuid4()),
                    "score": round(float(score), 3),
                    "mask_b64": _mask_to_b64(bool_mask, i),
                    "bbox": _mask_to_bbox(bool_mask),
                })
        except Exception as exc:
            return jsonify({"error": f"Point/box segmentation failed: {exc}"}), 500

    return jsonify({"masks": result_masks})


# ---------------------------------------------------------------------------
# Clip extraction (background worker)
# ---------------------------------------------------------------------------

def _extract_clip_worker(
    video_filename: str,
    video_path: str,
    out_dir: str,
    center_time: float,
    clip_duration: float = 60.0,   # total seconds of clip window (±half around center)
    max_frames: int = MAX_FRAMES,  # cap on extracted frames
    strategy: str = "consecutive",  # "consecutive" | "even" | "fps"  (future: "keyframe")
    target_fps: float | None = None,  # used when strategy="fps", e.g. 10.0 for 10fps
    # Future params:
    # chunk_index: int | None = None  — for whole-video-one-chunk-at-a-time mode
    # quality: int = 3               — ffmpeg -q:v value (1=best, 31=worst)
) -> None:
    """Extract frames from a clip window around center_time.

    strategy="consecutive" → take max_frames consecutive frames at native fps (default)
    strategy="even"        → evenly space max_frames across the clip duration
    strategy="fps"         → extract at a fixed fps (target_fps), up to max_frames cap
    """
    try:
        # Get video duration and native fps via ffprobe
        probe_cmd = (
            f'ffprobe -v quiet -print_format json -show_streams -show_format "{video_path}"'
        )
        probe_result = subprocess.run(
            probe_cmd, shell=True, capture_output=True, text=True, check=True
        )
        probe_data = _json_mod.loads(probe_result.stdout)
        video_duration = float(probe_data["format"]["duration"])

        # Parse native fps from the first video stream (e.g. "30000/1001" or "30/1")
        native_fps: float = 30.0
        for stream in probe_data.get("streams", []):
            if stream.get("codec_type") == "video":
                r_frame_rate = stream.get("r_frame_rate", "30/1")
                try:
                    num, den = r_frame_rate.split("/")
                    native_fps = float(num) / float(den)
                except Exception:
                    pass
                break

        # Compute clip bounds, clamped to video length.
        # "consecutive" starts at the current frame and runs forward;
        # other strategies use a symmetric window around center_time.
        if strategy == "consecutive":
            clip_start = max(0.0, center_time)
            clip_end   = video_duration  # ffmpeg will stop at -frames:v anyway
        else:
            half = clip_duration / 2.0
            clip_start = max(0.0, center_time - half)
            clip_end   = min(video_duration, center_time + half)
        actual_duration = max(clip_end - clip_start, 0.001)

        # Build ffmpeg fps filter and frame cap based on strategy
        if strategy == "consecutive":
            # No fps filter — extract every frame at native rate, stop after cap
            fps_filter = ""
            frame_cap = max_frames
        elif strategy == "fps" and target_fps is not None:
            fps = float(target_fps)
            fps_filter = f' -vf "fps={fps:.6f}"'
            frame_cap = min(max_frames, int(actual_duration * fps) + 1)
        else:  # "even" — distribute max_frames evenly over the clip
            fps = max_frames / actual_duration
            fps_filter = f' -vf "fps={fps:.6f}"'
            frame_cap = max_frames

        # Clear any previous frames for this video
        if os.path.exists(out_dir):
            shutil.rmtree(out_dir)
        os.makedirs(out_dir, exist_ok=True)

        out_pattern = os.path.join(out_dir, "frame%04d.jpg").replace("\\", "/")
        extract_cmd = (
            f'ffmpeg -y -ss {clip_start:.3f} -t {actual_duration:.3f}'
            f' -i "{video_path}"'
            f'{fps_filter}'
            f' -q:v 3 -frames:v {frame_cap}'
            f' "{out_pattern}"'
        )
        subprocess.run(extract_cmd, shell=True, capture_output=True, check=True)

        frame_files = sorted(f for f in os.listdir(out_dir) if f.endswith(".jpg"))
        _video_status[video_filename] = {
            "status": "ready",
            "frame_count": len(frame_files),
            "clip_start": round(clip_start, 3),
            "clip_end": round(clip_end, 3),
            "clip_duration": round(actual_duration, 3),
            "video_duration": round(video_duration, 3),
        }
    except Exception as exc:
        _video_status[video_filename] = {"status": "error", "error": str(exc)}


# ---------------------------------------------------------------------------
# Routes — Videos
# ---------------------------------------------------------------------------

@sam_bp.route("/videos", methods=["GET"])
def list_videos():
    files = []
    for f in sorted(os.listdir(VIDEOS_DIR)):
        if os.path.splitext(f)[1].lower() not in ALLOWED_VIDEO_EXTS:
            continue
        base = os.path.splitext(f)[0]
        frame_dir = os.path.join(FRAMES_DIR, base)

        # On server restart, recover status from disk
        if f not in _video_status:
            if os.path.isdir(frame_dir):
                frame_files = [x for x in os.listdir(frame_dir) if x.endswith(".jpg")]
                _video_status[f] = {"status": "ready", "frame_count": len(frame_files)}
            else:
                _video_status[f] = {"status": "uploaded"}

        status = _video_status.get(f, {"status": "uploaded"})
        files.append({
            "name": f,
            "url": f"/api/sam/videos/{f}",
            "status": status.get("status", "uploaded"),
            "frame_count": status.get("frame_count", 0),
            "clip_start": status.get("clip_start"),
            "clip_end": status.get("clip_end"),
            "video_duration": status.get("video_duration"),
        })
    return jsonify({"videos": files})


@sam_bp.route("/videos/<path:filename>", methods=["GET"])
def serve_video(filename):
    return send_from_directory(VIDEOS_DIR, filename)


@sam_bp.route("/upload-video", methods=["POST"])
def upload_video():
    """Save the video file. Frame extraction is triggered separately via /extract-clip."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in ALLOWED_VIDEO_EXTS:
        return jsonify({"error": f"Unsupported file type: {ext}"}), 400

    safe_name = f"{uuid.uuid4().hex[:8]}_{os.path.basename(f.filename)}"
    video_path = os.path.join(VIDEOS_DIR, safe_name)
    f.save(video_path)

    _video_status[safe_name] = {"status": "uploaded"}
    return jsonify({"name": safe_name, "url": f"/api/sam/videos/{safe_name}", "status": "uploaded"})


@sam_bp.route("/extract-clip", methods=["POST"])
def extract_clip():
    """Start async frame extraction for a clip window.

    Body: {
        video_name:     str,
        center_time:    float,          # seconds — where user paused
        clip_duration:  float = 60,     # total seconds of window (±half around center)
        max_frames:     int   = 100,    # frame cap
        strategy:       str   = "even", # "even" | "fps"
        target_fps:     float | null,   # required when strategy="fps"
    }
    """
    data = request.get_json() or {}
    video_name = data.get("video_name")
    if not video_name:
        return jsonify({"error": "video_name required"}), 400

    video_path = os.path.join(VIDEOS_DIR, video_name)
    if not os.path.exists(video_path):
        return jsonify({"error": f"Video not found: {video_name}"}), 404

    center_time = float(data.get("center_time", 0))
    clip_duration = float(data.get("clip_duration", 60))
    max_frames = int(data.get("max_frames", MAX_FRAMES))
    strategy = str(data.get("strategy", "even"))
    target_fps_raw = data.get("target_fps")
    target_fps = float(target_fps_raw) if target_fps_raw is not None else None

    base = os.path.splitext(video_name)[0]
    out_dir = os.path.join(FRAMES_DIR, base)

    _video_status[video_name] = {"status": "extracting"}
    thread = threading.Thread(
        target=_extract_clip_worker,
        args=(video_name, video_path, out_dir,
              center_time, clip_duration, max_frames, strategy, target_fps),
        daemon=True,
    )
    thread.start()

    return jsonify({"status": "extracting"})


@sam_bp.route("/video-status/<path:video_name>", methods=["GET"])
def video_status(video_name):
    status = _video_status.get(video_name)
    if status is None:
        return jsonify({"error": "Unknown video"}), 404
    return jsonify(status)


@sam_bp.route("/video-frames/<path:video_name>", methods=["GET"])
def list_video_frames(video_name):
    """Return ordered list of frame URLs for a video (identified by full filename)."""
    base = os.path.splitext(video_name)[0]
    frame_dir = os.path.join(FRAMES_DIR, base)
    if not os.path.isdir(frame_dir):
        return jsonify({"frames": []})
    frame_files = sorted(f for f in os.listdir(frame_dir) if f.endswith(".jpg"))
    frames = [
        {"index": i, "name": f"{base}/{fname}", "url": f"/api/sam/frames/{base}/{fname}"}
        for i, fname in enumerate(frame_files)
    ]
    return jsonify({"frames": frames})


@sam_bp.route("/frames/<video_name>/<path:filename>", methods=["GET"])
def serve_frame(video_name, filename):
    frame_dir = os.path.join(FRAMES_DIR, video_name)
    return send_from_directory(frame_dir, filename)


# ===========================================================================
# Video Tracking — Phase 4
# ===========================================================================

_video_predictor = None  # Sam3VideoPredictor singleton (lazy)

# { session_id: {predictor_session_id, video_name, frame_dir, frame_count,
#                frame_w, frame_h, frame_masks, anchor_frames, propagation} }
_track_sessions: dict = {}


def _get_video_predictor():
    global _video_predictor
    if _video_predictor is not None:
        return _video_predictor
    from sam3.model.sam3_video_predictor import Sam3VideoPredictor
    import sam3 as _sam3_pkg

    sam3_root = os.path.dirname(_sam3_pkg.__file__)
    bpe_path = os.path.join(sam3_root, "assets", "bpe_simple_vocab_16e6.txt.gz")
    _video_predictor = Sam3VideoPredictor(
        bpe_path=bpe_path if os.path.exists(bpe_path) else None,
    )
    return _video_predictor


def _get_device_type() -> str:
    """Return 'cuda' or 'cpu' based on whichever model is already loaded, or CUDA availability."""
    if _model is not None:
        return next(_model.parameters()).device.type
    return "cuda" if torch.cuda.is_available() else "cpu"


def _extract_outputs_as_masks(outputs) -> list:
    """Convert SAM3 propagation / prompt outputs → list of serialisable mask dicts."""
    if outputs is None:
        return []
    obj_ids = outputs.get("out_obj_ids")
    binary_masks = outputs.get("out_binary_masks")
    tracker_probs = outputs.get("out_tracker_probs")
    if obj_ids is None or binary_masks is None or len(obj_ids) == 0:
        return []

    result = []
    for i, obj_id in enumerate(obj_ids.tolist()):
        mask = binary_masks[i]
        # Handle both PyTorch tensors (possibly BFloat16) and numpy arrays
        if isinstance(mask, torch.Tensor):
            mask = mask.cpu().float().numpy()
        bool_mask = mask.astype(bool) if mask.dtype != bool else mask
        if not bool_mask.any():
            continue  # skip blank frames
        score = float(tracker_probs[i]) if tracker_probs is not None and i < len(tracker_probs) else 1.0
        result.append({
            "obj_id": int(obj_id),
            "mask_b64": _mask_to_b64(bool_mask, int(obj_id)),
            "bbox": _mask_to_bbox(bool_mask),
            "score": round(score, 3),
        })
    return result


def _propagate_worker(
    session_id: str,
    direction: str,
    start_frame: int,
    max_frames_to_track,
) -> None:
    """Background thread: consume the propagate_in_video generator and store results."""
    session = _track_sessions.get(session_id)
    if not session:
        return

    prop = session["propagation"]
    prop["status"] = "running"
    prop["frames_done"] = 0
    prop["error"] = None
    prop["updated_frames"] = set()

    try:
        predictor   = _get_video_predictor()
        device_type = _get_device_type()
        anchor_frames = session.get("anchor_frames", set())

        with torch.autocast(device_type=device_type, dtype=torch.bfloat16,
                             enabled=(device_type == "cuda")):
            for result in predictor.handle_stream_request({
                "type": "propagate_in_video",
                "session_id": session["predictor_session_id"],
                "propagation_direction": direction,
                "start_frame_index": start_frame,
                "max_frame_num_to_track": max_frames_to_track,
            }):
                frame_idx = result["frame_index"]
                masks = _extract_outputs_as_masks(result["outputs"])

                # Honour anchor-frame rule: don't overwrite unless it's the start frame
                if frame_idx not in anchor_frames or frame_idx == start_frame:
                    session["frame_masks"][frame_idx] = masks
                    prop["updated_frames"].add(frame_idx)

                prop["frames_done"] += 1

        prop["status"] = "done"
    except Exception as exc:
        prop["status"] = "error"
        prop["error"] = str(exc)


# ---------------------------------------------------------------------------
# Routes — Video Tracking
# ---------------------------------------------------------------------------

@sam_bp.route("/video/init", methods=["POST"])
def video_init():
    """Start a SAM3 video-tracking session for an extracted clip.

    Body: { video_name: str }
    Returns: { session_id, frame_count, frame_w, frame_h }
    """
    data = request.get_json() or {}
    video_name = data.get("video_name")
    if not video_name:
        return jsonify({"error": "video_name required"}), 400

    base = os.path.splitext(video_name)[0]
    frame_dir = os.path.join(FRAMES_DIR, base)
    if not os.path.isdir(frame_dir):
        return jsonify({"error": "Frames not extracted yet — run extract-clip first"}), 404

    frame_files = sorted(f for f in os.listdir(frame_dir) if f.endswith(".jpg"))
    if not frame_files:
        return jsonify({"error": "No frames found in clip directory"}), 404

    # Read frame dimensions from the first JPEG
    first_path = os.path.join(frame_dir, frame_files[0])
    with Image.open(first_path) as img:
        frame_w, frame_h = img.size

    try:
        predictor = _get_video_predictor()
    except Exception as exc:
        return jsonify({"error": f"Failed to load SAM3 video model: {exc}"}), 500

    try:
        result = predictor.start_session(resource_path=frame_dir)
        predictor_session_id = result["session_id"]
    except Exception as exc:
        return jsonify({"error": f"Failed to start video session: {exc}"}), 500

    # SAM3's interactive add_prompt (tracker path) asserts that
    # inference_state["cached_frame_outputs"][frame_idx] already exists — it is
    # normally populated by propagate_in_video.  Pre-filling with empty dicts
    # satisfies that assertion so the user can annotate any frame before the first
    # propagation.  propagate_in_video will overwrite these with real mask data.
    sam3_session = predictor._get_session(predictor_session_id)
    for fidx in range(len(frame_files)):
        sam3_session["state"]["cached_frame_outputs"][fidx] = {}

    # Reuse the SAM3 session ID as our own key
    _track_sessions[predictor_session_id] = {
        "predictor_session_id": predictor_session_id,
        "video_name": video_name,
        "frame_dir": frame_dir,
        "frame_count": len(frame_files),
        "frame_w": frame_w,
        "frame_h": frame_h,
        "frame_masks": {},     # frame_idx -> list of mask dicts
        "anchor_frames": set(), # frames with user-provided prompts (never overwritten)
        "propagation": {
            "status": "idle",
            "frames_done": 0,
            "error": None,
            "updated_frames": set(),
        },
    }

    return jsonify({
        "session_id": predictor_session_id,
        "frame_count": len(frame_files),
        "frame_w": frame_w,
        "frame_h": frame_h,
    })


@sam_bp.route("/video/prompt", methods=["POST"])
def video_prompt():
    """Add a prompt on a specific video frame.

    Body:
      {
        session_id: str,
        frame_idx:  int,
        obj_id:     int,              -- required for points (interactive tracker)
        points?:    [{x, y, label}],  -- pixel coords; label 1=pos 0=neg
        box?:       {x1,y1,x2,y2},   -- pixel xyxy  (SAM3 semantic path, no obj_id)
        text?:      str,              -- text prompt  (SAM3 semantic path, no obj_id)
        is_anchor?: bool,             -- mark as user anchor; default true
      }
    Returns:
      { frame_idx, masks: [{obj_id, mask_b64, bbox, score}] }
    """
    data = request.get_json() or {}
    session_id = data.get("session_id")
    if not session_id or session_id not in _track_sessions:
        return jsonify({"error": "Invalid or expired session_id"}), 400

    session = _track_sessions[session_id]
    frame_idx  = int(data.get("frame_idx", 0))
    frame_w    = session["frame_w"]
    frame_h    = session["frame_h"]
    points_data = data.get("points") or []
    box_data    = data.get("box")
    text        = (data.get("text") or "").strip()
    obj_id      = data.get("obj_id")
    is_anchor   = bool(data.get("is_anchor", True))

    predictor   = _get_video_predictor()
    device_type = _get_device_type()

    # ── Interactive (points) path — requires obj_id ────────────────────────
    if points_data and obj_id is not None:
        pts   = [[p["x"] / frame_w, p["y"] / frame_h] for p in points_data]
        labels = [p["label"] for p in points_data]
        pts_t  = torch.tensor(pts,    dtype=torch.float32)
        lbl_t  = torch.tensor(labels, dtype=torch.int32)

        with torch.autocast(device_type=device_type, dtype=torch.bfloat16,
                             enabled=(device_type == "cuda")):
            response = predictor.handle_request({
                "type":         "add_prompt",
                "session_id":   session["predictor_session_id"],
                "frame_index":  frame_idx,
                "points":       pts_t,
                "point_labels": lbl_t,
                "obj_id":       int(obj_id),
            })

    # ── SAM3 semantic (text / box) path ────────────────────────────────────
    elif text or box_data:
        boxes_xywh = None
        box_labels = None
        if box_data:
            x1, y1 = box_data["x1"] / frame_w, box_data["y1"] / frame_h
            bw     = (box_data["x2"] - box_data["x1"]) / frame_w
            bh     = (box_data["y2"] - box_data["y1"]) / frame_h
            boxes_xywh = [[x1, y1, bw, bh]]
            box_labels = [1]

        with torch.autocast(device_type=device_type, dtype=torch.bfloat16,
                             enabled=(device_type == "cuda")):
            response = predictor.handle_request({
                "type":                "add_prompt",
                "session_id":          session["predictor_session_id"],
                "frame_index":         frame_idx,
                "text":                text or None,
                "bounding_boxes":      boxes_xywh,
                "bounding_box_labels": box_labels,
            })

    else:
        return jsonify({"error": "Provide points+obj_id, a bounding box, or text"}), 400

    outputs = response.get("outputs")
    masks   = _extract_outputs_as_masks(outputs)

    session["frame_masks"][frame_idx] = masks
    if is_anchor:
        session["anchor_frames"].add(frame_idx)

    return jsonify({"frame_idx": frame_idx, "masks": masks})


@sam_bp.route("/video/propagate", methods=["POST"])
def video_propagate():
    """Start propagation from a frame in one direction.

    Body: { session_id, start_frame, direction: "forward"|"backward" }
    Returns: { status: "started" }
    """
    data = request.get_json() or {}
    session_id = data.get("session_id")
    if not session_id or session_id not in _track_sessions:
        return jsonify({"error": "Invalid or expired session_id"}), 400

    session = _track_sessions[session_id]
    prop    = session["propagation"]

    if prop["status"] == "running":
        return jsonify({"error": "Propagation is already running"}), 409

    start_frame = int(data.get("start_frame", 0))
    direction   = data.get("direction", "forward")
    if direction not in ("forward", "backward"):
        return jsonify({"error": 'direction must be "forward" or "backward"'}), 400

    # Enforce anchor-frame stopping rule with max_frame_num_to_track
    anchor_frames       = session.get("anchor_frames", set())
    max_frames_to_track = None  # default: propagate all the way

    if direction == "forward":
        next_anchors = sorted(f for f in anchor_frames if f > start_frame)
        if next_anchors:
            max_frames_to_track = next_anchors[0] - start_frame - 1
    else:  # backward
        prev_anchors = sorted(f for f in anchor_frames if f < start_frame)
        if prev_anchors:
            max_frames_to_track = start_frame - prev_anchors[-1] - 1

    # Optional client-requested limit — take the more restrictive value
    client_max = data.get("max_frames")
    if client_max is not None:
        client_max = int(client_max)
        max_frames_to_track = min(max_frames_to_track, client_max) if max_frames_to_track is not None else client_max

    if max_frames_to_track is not None and max_frames_to_track <= 0:
        return jsonify({"error": "Adjacent anchor frame — nothing to propagate"}), 400

    thread = threading.Thread(
        target=_propagate_worker,
        args=(session_id, direction, start_frame, max_frames_to_track),
        daemon=True,
    )
    thread.start()

    return jsonify({"status": "started"})


@sam_bp.route("/video/propagate-status/<session_id>", methods=["GET"])
def video_propagate_status(session_id):
    """Poll propagation progress.

    Returns: { status, frames_done, total_frames, error? }
    """
    session = _track_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Unknown session"}), 404

    prop = session["propagation"]
    return jsonify({
        "status":       prop["status"],
        "frames_done":  prop.get("frames_done", 0),
        "total_frames": session["frame_count"],
        "error":        prop.get("error"),
    })


@sam_bp.route("/video/frame-masks/<session_id>", methods=["GET"])
def video_frame_masks(session_id):
    """Return all accumulated frame masks for a session.

    Returns: { frame_masks: { "frame_idx": [{obj_id, mask_b64, bbox, score}] } }
    """
    session = _track_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Unknown session"}), 404

    # JSON keys must be strings
    frame_masks_json = {str(k): v for k, v in session["frame_masks"].items()}
    anchor_frames_list = sorted(session.get("anchor_frames", set()))
    return jsonify({
        "frame_masks":   frame_masks_json,
        "anchor_frames": anchor_frames_list,
    })


@sam_bp.route("/video/session/<session_id>", methods=["DELETE"])
def video_close_session(session_id):
    """Close a tracking session and free GPU memory."""
    session = _track_sessions.pop(session_id, None)
    if session:
        try:
            predictor = _get_video_predictor()
            predictor.close_session(session["predictor_session_id"])
        except Exception:
            pass
    return jsonify({"is_success": True})
