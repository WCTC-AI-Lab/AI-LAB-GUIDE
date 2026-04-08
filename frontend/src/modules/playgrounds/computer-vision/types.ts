export type PromptMode = 'click-box' | 'text' | 'both';
export type ActiveTool = 'positive' | 'negative' | 'box';

export interface ClickPoint {
  id: string;
  /** Natural image pixel coordinates */
  x: number;
  y: number;
  type: 'positive' | 'negative';
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A single segmentation mask returned by the backend. */
export interface Mask {
  id: string;
  score: number;
  /** Base64-encoded RGBA PNG at natural image resolution */
  maskB64: string;
  bbox: { x: number; y: number; w: number; h: number };
  visible: boolean;
  /** Display label (auto-assigned, user-editable later) */
  label: string;
  /** Hex color for overlays and bbox strokes */
  color: string;
}

export interface ImageInfo {
  name: string;
  url: string;
}

export interface VideoInfo {
  name: string;
  url: string;
  /** uploaded = saved, no frames yet; extracting = ffmpeg running; ready = frames available */
  status: 'uploaded' | 'extracting' | 'ready' | 'error' | 'unknown';
  frame_count: number;
  /** Total video duration in seconds (available once a clip has been extracted) */
  video_duration?: number;
  /** Clip window that was extracted (seconds into the original video) */
  clip_start?: number;
  clip_end?: number;
}

export interface FrameInfo {
  index: number;
  /** Relative path for the segment endpoint: "<video_base>/<filename>" */
  name: string;
  url: string;
}

export interface SegmentResponse {
  masks: Array<{
    id: string;
    score: number;
    mask_b64: string;
    bbox: { x: number; y: number; w: number; h: number };
  }>;
  error?: string;
}

/** Original prompts used to generate a mask — stored so video tracking can replay them. */
export interface SourcePrompts {
  points: ClickPoint[];
  box: BoundingBox | null;
  text: string;
}

/** An accepted, finalised object (the mask the user chose to keep). */
export interface AcceptedObject {
  id: string;
  label: string;
  mask: Mask;
  /** Color swatch (first pixel of the mask palette colour) */
  color: string;
  /** Prompts captured at acceptance time; used to re-register the object in a video session. */
  sourcePrompts?: SourcePrompts;
}

// ---------------------------------------------------------------------------
// Video tracking — Phase 4
// ---------------------------------------------------------------------------

/** A tracked object in the video session. */
export interface VideoObject {
  /** Integer ID assigned by SAM3 (1-based, user-assigned for interactive path). */
  id: number;
  label: string;
  /** Hex color matching the backend palette for this obj_id. */
  color: string;
  visible: boolean;
}

/** Mask data for a single object on a single video frame. */
export interface FrameMaskData {
  objId: number;
  maskB64: string;
  bbox: { x: number; y: number; w: number; h: number };
  score: number;
}

/** Props shared between canvas and parent so hit-testing can work. */
export interface CanvasDisplayInfo {
  /** Displayed image width in CSS pixels */
  displayW: number;
  /** Displayed image height in CSS pixels */
  displayH: number;
  /** Natural image width (for coord scaling) */
  naturalW: number;
  /** Natural image height (for coord scaling) */
  naturalH: number;
}
