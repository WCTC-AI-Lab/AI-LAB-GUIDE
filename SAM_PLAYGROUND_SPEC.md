# SAM Playground — UI/UX Specification

## Overview

A locally-run bespoke tool for the AI Lab that provides an interactive playground for Meta's SAM3 (Segment Anything Model 3). The app runs on the lab machine only — it is not deployed to a server. File uploads are handled as local file saves to a designated directory.

The three core capabilities, in order of complexity:
1. **Image segmentation** — point clicks, bounding boxes, and text prompts
2. **Video tracking** — frame-by-frame propagation with live corrections
3. **Agent mode** — a VLM reasons over the image to handle complex natural-language queries

---

## Core Concepts (for implementers)

**SAM1 interaction model:** The user places positive clicks (foreground) and negative clicks (background) on an image, or draws a bounding box. SAM returns a mask for the selected region. No tracking.

**SAM2 interaction model:** Same prompt types as SAM1 for the initial frame. The session then propagates the mask forward and backward through video frames using a memory bank. When a user adds a click correction at a mid-video frame, SAM2 re-propagates *from that frame outward* — not from frame 0 again. Memory is updated incrementally. The session state (predictor + memory) must stay alive in the backend between interactions; it cannot be reconstructed cheaply. **Bounding boxes work only on the initial prompt frame — mid-video corrections are point clicks only.**

**SAM3 additions:** Zero-shot open-vocabulary detection. The user types a noun phrase ("dog", "red car on the left") and SAM3 finds and masks all instances in the image or video frame, with no prior training on that category. After text detection, the same SAM2-style refinement and tracking applies.

**Agent mode:** A vision LLM (e.g., `gemma3:27b` via Ollama) acts as a planner. It looks at the image, decides what noun phrase to pass to SAM3, inspects the resulting masks, and decides whether any match the user's intent. It iterates automatically (SAM3 → VLM → SAM3 → ...) until it confidently selects a mask or gives up. The user just types a complex query like "the leftmost child wearing a blue vest" and gets back a mask.

---

## Application Layout

### Global Shell

- **Top nav / mode switcher:** `Image` | `Video` | `Agent`
- **Load panel (persistent sidebar or modal):** load an example asset or upload your own
  - Example images: `truck.jpg`, `groceries.jpg`, `test_image.jpg`
  - Example video: `bedroom.mp4` or the `0001/` frame set
  - Upload image: file picker → saves to `assets/images/`
  - Upload video: file picker → saves to `assets/videos/`, triggers frame extraction server-side
- **Output panel:** displays current mask overlays and allows export

---

## Mode 1 — Image

### Layout
Canvas (left, ~60% width) + controls panel (right, ~40% width).

### Canvas interactions

| Interaction | Action |
|---|---|
| Left click | Add positive point (foreground) |
| Right click | Add negative point (background) |
| Click + drag | Draw bounding box |
| Hover over mask | Highlight that mask |
| Click on existing mask | Select it for refinement |

Positive points render as green dots, negative as red dots. Bounding boxes render as blue dashed rectangles. Masks render as semi-transparent colored overlays with visible edges.

### Controls Panel

**Prompt mode selector** (radio or tab):
- `Click / Box` — SAM1 style
- `Text Prompt` — SAM3 open-vocab detector
- `Both` — text prompt first, then refine with clicks/box

**Click / Box mode:**
- Toggle: `+ Positive` / `− Negative` (determines what the next click does)
- "Clear points" button
- "Clear box" button
- "Run" button (or auto-run on each click — see Open Questions)

**Text Prompt mode:**
- Free-text input field: `"Find all: _______"`
- Confidence threshold slider (0–1, default 0.5)
- "Detect" button
- Shows all detected instances as numbered masks

**Both mode:**
- Text prompt first → detect → then click/box to refine the selected instance

**Output controls:**
- "Export mask" → downloads binary PNG or RGBA overlay (decide format early)
- "Export all masks" → downloads a zip of all detected instances

---

## Mode 2 — Video

### Layout
Frame viewer (top, full width) + scrubber (below viewer) + controls panel (bottom or right sidebar).

### Frame extraction (on load)
When a video is loaded, the server extracts up to 100 evenly-spaced frames using ffmpeg and stores them as JPEGs in a temp directory. The frontend loads thumbnails for the scrubber and full-resolution frames on demand.

### Step 1 — Select starting frame

- Horizontal scrubber showing frame thumbnails
- User drags to pick the frame they want to start from
- Selected frame displayed in the main viewer at full size
- "Set as start frame" confirmation button (or auto-confirm on release)

### Step 2 — Prompt the starting frame

Same canvas interaction model as Image mode:

| Interaction | Action |
|---|---|
| Left click | Add positive point |
| Right click | Add negative point |
| Click + drag | Draw bounding box |

**Text prompt** also available here — type a noun phrase to let SAM3 find the object on the starting frame automatically.

After prompting, click **"Start tracking"**.

### Step 3 — Track

- A progress bar or spinner shows propagation progress (forward + backward from the start frame)
- Once complete, the scrubber updates: every frame thumbnail shows the mask overlay
- The main viewer shows the current frame with the mask
- Dragging the scrubber previews any frame's mask

### Step 4 — Correct and re-track

- User scrubs to a frame where the mask looks wrong
- Adds **positive or negative point clicks** on the main viewer canvas to correct it
  - *Note: bounding boxes are not available for mid-video corrections — only point clicks*
- Clicks **"Re-track from here"**
- SAM3 re-propagates from that frame forward (and optionally backward), updating the memory bank
- Scrubber and masks update to reflect the new result
- Repeat as many times as needed

**Object management:**
- Each tracked object gets a color-coded label in a list panel
- Multiple objects can be tracked simultaneously (add a second object by clicking "Track new object" and repeating the prompt flow)
- Any object can be selected for correction independently

**Output controls:**
- "Export masks as video" → renders the original video with mask overlays as an MP4
- "Export frame masks" → downloads a folder of per-frame binary PNGs

---

## Mode 3 — Agent

### Layout
Image viewer (left) + chat/query panel (right).

### Flow

1. User loads an image (same load panel as Image mode)
2. User types a natural-language query into the text input: e.g., `"the leftmost child wearing a blue vest"`
3. Click **"Run Agent"**
4. The backend loops automatically: VLM → SAM3 → VLM → SAM3 ... until a result is selected
5. A log panel (collapsible) shows each round: what phrase the VLM tried, how many masks SAM3 found, whether the VLM accepted or rejected them
6. Final result is displayed as a mask overlay on the image
7. "Export mask" button

### Notes on agent behavior
- If the VLM cannot find a satisfactory mask after several iterations it calls `report_no_mask` and the UI displays a "No match found" message
- The VLM uses `gemma3:27b` via Ollama locally — Ollama must be running before launching the app. The agent's format compliance (it needs to output structured XML tool calls) is model-dependent; results may vary with local models vs. the Qwen3-VL models Meta tested with.
- This mode does **not** currently support video — it is image-only for the agent pipeline

---

## Backend API Surface

These are the backend endpoints the frontend needs:

| Endpoint | Description |
|---|---|
| `POST /load/image` | Save uploaded image, return path |
| `POST /load/video` | Save uploaded video, extract frames, return frame list |
| `POST /image/segment` | Run SAM3 with point/box prompts on image, return masks |
| `POST /image/detect` | Run SAM3 text detection on image, return masks + boxes |
| `POST /video/init` | Initialize video predictor session on start frame with prompts |
| `POST /video/propagate` | Propagate all frames, return per-frame masks |
| `POST /video/correct` | Add point correction at a frame, re-propagate, return updated masks |
| `POST /agent/run` | Run the VLM agent loop on an image + query, stream log + final mask |

The video predictor session must be held **in memory on the server** between `/video/init`, `/video/propagate`, and `/video/correct` calls — it cannot be reconstructed cheaply from disk. A simple session ID (UUID) in the request ties calls to the right predictor instance.

---

## Open Questions (decide before building)

1. **Mask export format:** Binary PNG, RGBA overlay, RLE JSON (COCO format), or all three as options?
2. **Multi-object video:** Allow tracking multiple objects per session in the MVP, or phase 2?
3. **Frame count limit:** 100 frames is a practical default given current throughput (~4 it/sec). Make it configurable or hardcode it?
4. **Auto-run on click:** For image mode, run inference on every click (snappier UX, more GPU calls) or require explicit "Run" button (batched, more control)?
5. **Agent streaming:** Stream the agent's round-by-round log to the UI in real time, or just show the final result?
