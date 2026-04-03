import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import type { AcceptedObject } from './types';
import MaskList from './MaskList';
import AnnotationPanel from './AnnotationPanel';
import { useAnnotationState } from './useAnnotationState';
import type { FrameInfo, VideoInfo } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// Future options: clip_duration (seconds), max_frames, strategy ('consecutive'|'even'|'fps')
const CLIP_DURATION_S  = 60;
const MAX_CLIP_FRAMES  = 100;
const STEP_INTERVAL_MS = 120;
const POLL_INTERVAL_MS = 2000;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// TickTimeline — one box per frame, click to seek, hover preview
// ---------------------------------------------------------------------------
const TICK_RULER_H = 36;

function TickTimeline({
  frameCount, currentFrame, frames, onSeek, annotatedFrames,
}: {
  frameCount: number;
  currentFrame: number;
  frames: FrameInfo[];
  onSeek: (index: number) => void;
  annotatedFrames?: Set<number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverX,   setHoverX]   = useState(0);
  const [hoverTop, setHoverTop] = useState(0);

  const idxFromEvent = useCallback((e: ReactMouseEvent): number => {
    if (!containerRef.current) return 0;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1 - 1e-9, (e.clientX - left) / width));
    return Math.floor(ratio * frameCount);
  }, [frameCount]);

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!containerRef.current) return;
    setHoverIdx(idxFromEvent(e));
    setHoverX(e.clientX);
    setHoverTop(containerRef.current.getBoundingClientRect().top);
  };

  return (
    <>
      {hoverIdx !== null && frames[hoverIdx] && (
        <Box sx={{
          position: 'fixed', left: hoverX, top: hoverTop - 148,
          transform: 'translateX(-50%)', zIndex: 9999,
          pointerEvents: 'none', bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
          borderRadius: 1, overflow: 'hidden', boxShadow: 4, width: 160,
        }}>
          <Box component="img" src={frames[hoverIdx].url} alt="" sx={{ width: '100%', display: 'block' }} />
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', py: 0.5, color: 'text.secondary' }}>
            Frame {hoverIdx + 1} / {frameCount}
          </Typography>
        </Box>
      )}

      <Box
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        onClick={(e) => onSeek(idxFromEvent(e))}
        sx={{ width: '100%', height: TICK_RULER_H, cursor: 'crosshair', userSelect: 'none' }}
      >
        <Box sx={{
          display: 'flex', width: '100%', height: '100%',
          borderRadius: 1, overflow: 'hidden', bgcolor: 'action.selected',
        }}>
          {Array.from({ length: frameCount }, (_, i) => {
            const isCurrent    = i === currentFrame;
            const isHovered    = !isCurrent && i === hoverIdx;
            const isMajor      = i % 10 === 0;
            const hasAnnotation = annotatedFrames?.has(i) ?? false;
            return (
              <Box key={i} sx={{
                flex: 1, height: '100%', position: 'relative',
                bgcolor: isCurrent ? 'primary.main' : isHovered ? 'action.hover' : 'transparent',
                opacity: isCurrent ? 0.45 : 1,
                borderRight: '1px solid',
                borderColor: isMajor ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                transition: 'background-color 0.07s',
              }}>
                {hasAnnotation && (
                  <Box sx={{
                    position: 'absolute', bottom: 3, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 5, height: 5, borderRadius: '50%',
                    bgcolor: 'warning.main', opacity: 0.9,
                    pointerEvents: 'none',
                  }} />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function VideoMode() {
  // ── Video list ────────────────────────────────────────────────────────────
  const [videos,        setVideos]        = useState<VideoInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);
  const [subMode,       setSubMode]       = useState<'browse' | 'frames'>('browse');

  // ── Browse mode ───────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime,   setCurrentTime]   = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPaused,      setIsPaused]      = useState(true);

  // ── Extraction ────────────────────────────────────────────────────────────
  const [isExtracting, setIsExtracting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Frame mode ────────────────────────────────────────────────────────────
  const [frames,        setFrames]        = useState<FrameInfo[]>([]);
  const [currentFrame,  setCurrentFrame]  = useState(0);
  const [clipInfo,      setClipInfo]      = useState<{ start: number; end: number } | null>(null);
  const [isStepPlaying, setIsStepPlaying] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Tracking ──────────────────────────────────────────────────────────────
  const [selectedTrackIds,  setSelectedTrackIds]  = useState<Set<string>>(new Set());
  const [isTracking,        setIsTracking]        = useState(false);
  const [trackProgress,     setTrackProgress]     = useState<{ done: number; total: number } | null>(null);
  const [trackError,        setTrackError]        = useState<string | null>(null);
  const [trackN,            setTrackN]            = useState<number | ''>('');
  // Bumped after each successful propagation so annotatedFrameIndices recomputes
  const [trackVersion,      setTrackVersion]      = useState(0);

  // Lazy video predictor session: { sessionId, objIdMap: AcceptedObject.id → SAM obj_id, nextObjId }
  const sessionRef = useRef<{
    sessionId: string;
    objIdMap: Map<string, number>;
    nextObjId: number;
  } | null>(null);

  // ── Annotation state (shared with AnnotationPanel + MaskList in sidebar) ─
  const currentFrameInfo = frames[currentFrame] ?? null;
  const frameSourceParam = currentFrameInfo ? { frame_path: currentFrameInfo.name } : null;
  const annotation = useAnnotationState(subMode === 'frames' ? frameSourceParam : null);

  // ── Reset tracking session when a new clip is loaded ─────────────────────
  useEffect(() => {
    const ref = sessionRef.current;
    if (ref) {
      fetch(`/api/sam/video/session/${ref.sessionId}`, { method: 'DELETE' }).catch(() => {});
      sessionRef.current = null;
    }
    setSelectedTrackIds(new Set());
    setTrackError(null);
    setTrackProgress(null);
  }, [frames]);

  // ── Which frame indices have accepted annotations (for timeline indicators) ─
  // acceptedBySourceRef holds saved accepted objects for all frames we've visited.
  // annotation.accepted holds the live state for the current frame.
  // Recomputes whenever accepted changes (current frame) or currentFrame changes (navigation).
  const annotatedFrameIndices = useMemo(() => {
    const set = new Set<number>();
    frames.forEach((frame, idx) => {
      const key = JSON.stringify({ frame_path: frame.name });
      const saved = annotation.acceptedBySourceRef.current.get(key);
      if (saved && saved.length > 0) set.add(idx);
    });
    if (annotation.accepted.length > 0) set.add(currentFrame);
    return set;
  // acceptedBySourceRef is a ref — not reactive, but we read its latest value
  // whenever accepted/frame/trackVersion changes. trackVersion is bumped after propagation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, annotation.accepted, currentFrame, trackVersion]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);
  useEffect(() => () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current); }, []);

  // ── Load video list on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/sam/videos')
      .then((r) => r.json())
      .then((data: { videos: VideoInfo[] }) => {
        setVideos(data.videos);
        if (data.videos.length > 0) setSelectedVideo(data.videos[data.videos.length - 1]);
      })
      .catch(() => setError('Could not load video list from backend.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Frame step-play ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isStepPlaying) {
      stepTimerRef.current = setInterval(() => {
        setCurrentFrame((f) => {
          if (f >= frames.length - 1) { setIsStepPlaying(false); return f; }
          return f + 1;
        });
      }, STEP_INTERVAL_MS);
    } else {
      if (stepTimerRef.current) { clearInterval(stepTimerRef.current); stepTimerRef.current = null; }
    }
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current); };
  }, [isStepPlaying, frames.length]);

  // ── Arrow key navigation ──────────────────────────────────────────────────
  useEffect(() => {
    if (subMode !== 'frames') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft')  setCurrentFrame((f) => Math.max(0, f - 1));
      if (e.key === 'ArrowRight') setCurrentFrame((f) => Math.min(frames.length - 1, f + 1));
      if (e.key === ' ') { e.preventDefault(); setIsStepPlaying((p) => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [subMode, frames.length]);

  // ── Track selected objects forward or backward ────────────────────────────
  const trackObjects = useCallback(async (
    direction: 'forward' | 'backward',
    maxFrames?: number,
  ) => {
    if (isTracking || !selectedVideo) return;

    const objectsToTrack = annotation.accepted.filter((o) => selectedTrackIds.has(o.id));
    if (objectsToTrack.length === 0) return;

    setIsTracking(true);
    setTrackError(null);
    setTrackProgress(null);

    try {
      // 1. Init session lazily on first track call for this clip
      if (!sessionRef.current) {
        const initRes = await fetch('/api/sam/video/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_name: selectedVideo.name }),
        });
        const initData = await initRes.json();
        if (initData.error) throw new Error(initData.error);
        sessionRef.current = { sessionId: initData.session_id, objIdMap: new Map(), nextObjId: 1 };
      }

      const session = sessionRef.current;

      // 2. Register each selected object via add_prompt (interactive path: bbox center click)
      for (const obj of objectsToTrack) {
        if (!session.objIdMap.has(obj.id)) {
          session.objIdMap.set(obj.id, session.nextObjId++);
        }
        const objId = session.objIdMap.get(obj.id)!;

        // Use bbox center as a positive click — always available regardless of prompt type
        const b = obj.mask.bbox;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;

        const promptRes = await fetch('/api/sam/video/prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: session.sessionId,
            frame_idx: currentFrame,
            obj_id: objId,
            points: [{ x: cx, y: cy, label: 1 }],
            is_anchor: true,
          }),
        });
        const promptData = await promptRes.json();
        if (promptData.error) throw new Error(promptData.error);
      }

      // 3. Start propagation
      const propRes = await fetch('/api/sam/video/propagate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.sessionId,
          start_frame: currentFrame,
          direction,
          ...(maxFrames !== undefined ? { max_frames: maxFrames } : {}),
        }),
      });
      const propData = await propRes.json();
      if (propData.error) throw new Error(propData.error);

      // 4. Poll until propagation completes
      for (let attempt = 0; attempt < 600; attempt++) {
        await new Promise((r) => setTimeout(r, 500));
        const statusRes = await fetch(`/api/sam/video/propagate-status/${session.sessionId}`);
        const status = await statusRes.json();
        setTrackProgress({ done: status.frames_done ?? 0, total: status.total_frames ?? frames.length });
        if (status.status === 'done') break;
        if (status.status === 'error') throw new Error(status.error ?? 'Propagation failed');
      }

      // 5. Fetch all frame masks and merge into acceptedBySourceRef
      const masksRes  = await fetch(`/api/sam/video/frame-masks/${session.sessionId}`);
      const masksData = await masksRes.json();

      // Build inverse map: SAM obj_id → AcceptedObject.id
      const objIdToAcceptedId = new Map<number, string>();
      session.objIdMap.forEach((samId, acceptedId) => objIdToAcceptedId.set(samId, acceptedId));

      // Collect all known AcceptedObjects across every frame for label/color lookup
      const allAcceptedById = new Map<string, AcceptedObject>();
      annotation.acceptedBySourceRef.current.forEach((objs) => objs.forEach((o) => allAcceptedById.set(o.id, o)));
      annotation.accepted.forEach((o) => allAcceptedById.set(o.id, o));

      type BackendMask = { obj_id: number; mask_b64: string; bbox: { x: number; y: number; w: number; h: number }; score: number };

      Object.entries(masksData.frame_masks as Record<string, BackendMask[]>).forEach(([idxStr, masks]) => {
        const frameIdx = parseInt(idxStr);
        const frame    = frames[frameIdx];
        if (!frame) return;

        const sourceKey = JSON.stringify({ frame_path: frame.name });
        const existing  = [...(annotation.acceptedBySourceRef.current.get(sourceKey) ?? [])];

        for (const m of masks) {
          const acceptedId  = objIdToAcceptedId.get(m.obj_id);
          if (!acceptedId) continue;
          const originalObj = allAcceptedById.get(acceptedId);
          if (!originalObj) continue;

          const newObj: AcceptedObject = {
            id: acceptedId,
            label: originalObj.label,
            color: originalObj.color,
            mask: {
              id: acceptedId,
              score: m.score,
              maskB64: m.mask_b64,
              bbox: m.bbox,
              visible: true,
              label: originalObj.label,
              color: originalObj.color,
            },
            sourcePrompts: originalObj.sourcePrompts,
          };

          const existingIdx = existing.findIndex((o) => o.id === acceptedId);
          if (existingIdx >= 0) existing[existingIdx] = newObj;
          else existing.push(newObj);
        }

        annotation.acceptedBySourceRef.current.set(sourceKey, existing);
      });

      // Bump version so annotatedFrameIndices useMemo recomputes
      setTrackVersion((v) => v + 1);

    } catch (err) {
      setTrackError(String(err));
    } finally {
      setIsTracking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking, selectedVideo, annotation, currentFrame, frames, selectedTrackIds]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const loadFrames = useCallback(async (videoName: string) => {
    const res = await fetch(`/api/sam/video-frames/${videoName}`);
    const data: { frames: FrameInfo[] } = await res.json();
    setFrames(data.frames);
    setCurrentFrame(0);
  }, []);

  const startPolling = useCallback((videoName: string) => {
    stopPolling();
    setIsExtracting(true);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/sam/video-status/${videoName}`);
        const data = await res.json();
        if (data.status === 'ready') {
          stopPolling(); setIsExtracting(false);
          setVideos((prev) => prev.map((v) =>
            v.name === videoName
              ? { ...v, status: 'ready', frame_count: data.frame_count,
                  clip_start: data.clip_start, clip_end: data.clip_end,
                  video_duration: data.video_duration }
              : v,
          ));
          setClipInfo({ start: data.clip_start ?? 0, end: data.clip_end ?? 0 });
          await loadFrames(videoName);
          setSubMode('frames');
        } else if (data.status === 'error') {
          stopPolling(); setIsExtracting(false);
          setError(`Extraction failed: ${data.error ?? 'unknown error'}`);
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, loadFrames]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true); setError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res  = await fetch('/api/sam/upload-video', { method: 'POST', body: form });
      const data: VideoInfo & { error?: string } = await res.json();
      if (data.error) { setError(data.error); return; }
      const newVideo: VideoInfo = { ...data, status: 'uploaded', frame_count: 0 };
      setVideos((prev) => [...prev, newVideo]);
      setSelectedVideo(newVideo);
      setSubMode('browse'); setFrames([]); setCurrentFrame(0);
    } catch (e) { setError(String(e)); }
    finally { setIsUploading(false); }
  }, []);

  // ── Extract clip ──────────────────────────────────────────────────────────
  const handleExtractClip = useCallback(async () => {
    if (!selectedVideo) return;
    const center = videoRef.current?.currentTime ?? currentTime;
    try {
      const res = await fetch('/api/sam/extract-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_name: selectedVideo.name, center_time: center,
          clip_duration: CLIP_DURATION_S, max_frames: MAX_CLIP_FRAMES, strategy: 'consecutive',
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      startPolling(selectedVideo.name);
    } catch (e) { setError(String(e)); }
  }, [selectedVideo, currentTime, startPolling]);

  // ── Back to browse ────────────────────────────────────────────────────────
  const handleBackToBrowse = useCallback(() => {
    setIsStepPlaying(false);
    setSubMode('browse');
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────
  const clipStart = Math.max(0, currentTime - CLIP_DURATION_S / 2);
  const clipEnd   = videoDuration > 0
    ? Math.min(videoDuration, currentTime + CLIP_DURATION_S / 2)
    : currentTime + CLIP_DURATION_S / 2;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 1 }}>

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ width: 220, flexShrink: 0, overflow: 'hidden' }}>
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {subMode === 'frames' ? 'Frames' : 'Video'}
          </Typography>
        </Box>
        <Divider />

        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {subMode === 'browse' ? (
            /* ── Browse mode sidebar ─ */
            <>
              <FormControl size="small" fullWidth>
                <InputLabel>Select video</InputLabel>
                <Select
                  label="Select video"
                  value={selectedVideo?.name ?? ''}
                  onChange={(e) => {
                    const v = videos.find((v) => v.name === e.target.value);
                    if (v) { setSelectedVideo(v); setSubMode('browse'); setFrames([]); }
                  }}
                >
                  {videos.length === 0 && <MenuItem disabled value="">No videos yet</MenuItem>}
                  {videos.map((v) => (
                    <MenuItem key={v.name} value={v.name}>
                      <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {v.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                component="label" variant="outlined" size="small" fullWidth
                startIcon={isUploading ? <CircularProgress size={14} /> : <UploadFileIcon />}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading…' : 'Upload video'}
                <input type="file" accept=".mp4,.mov,.avi,.mkv,.webm" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
                />
              </Button>
              {videoDuration > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Duration: {formatTime(videoDuration)}
                </Typography>
              )}
            </>
          ) : (
            /* ── Frame mode sidebar ─ */
            <>
              <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                {selectedVideo?.name}
              </Typography>

              {clipInfo && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    Clip: {formatTime(clipInfo.start)} – {formatTime(clipInfo.end)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {frames.length} frames extracted
                  </Typography>
                </Box>
              )}

              <Typography variant="caption" color="text.secondary">
                Frame {currentFrame + 1} / {frames.length}
              </Typography>

              <Button variant="text" size="small" startIcon={<ArrowBackIcon />}
                onClick={handleBackToBrowse} sx={{ justifyContent: 'flex-start', textTransform: 'none', mt: -0.5 }}>
                Back to browse
              </Button>
            </>
          )}
        </Box>

        {/* ── Mask list — below frame info in frame mode ─────────────────── */}
        {subMode === 'frames' && (
          <>
            <Divider />
            <MaskList
              candidates={annotation.candidates}
              selectedCandidateId={annotation.selectedCandidateId}
              onSelectCandidate={annotation.setSelectedCandidateId}
              onAcceptCandidate={annotation.handleAcceptCandidate}
              accepted={annotation.accepted}
              onToggleAcceptedVisibility={annotation.handleToggleAcceptedVisibility}
              onDeleteAccepted={annotation.handleDeleteAccepted}
              onExportAll={annotation.handleExportAll}
              soloedId={annotation.soloedId}
              onToggleSolo={annotation.handleToggleSolo}
              selectedTrackIds={selectedTrackIds}
              onToggleTrackSelected={(id) =>
                setSelectedTrackIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                })
              }
            />
          </>
        )}
      </Paper>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        )}

        {/* ════ BROWSE MODE ════ */}
        {subMode === 'browse' && (
          <>
            {!selectedVideo ? (
              <Box sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: 400, gap: 1.5,
                border: '2px dashed', borderColor: 'divider', borderRadius: 2, color: 'text.disabled',
              }}>
                <VideoFileIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                <Typography variant="body2">Upload or select a video to get started.</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ bgcolor: '#000', borderRadius: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                  <Box component="video" ref={videoRef} src={selectedVideo.url} controls
                    onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
                    onDurationChange={() => setVideoDuration(videoRef.current?.duration ?? 0)}
                    onPlay={() => setIsPaused(false)} onPause={() => setIsPaused(true)}
                    sx={{ maxWidth: '100%', maxHeight: 520, display: 'block' }}
                  />
                </Box>

                {isPaused && (
                  <Box sx={{
                    p: 2, border: '1px solid', borderColor: 'primary.main',
                    borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex', flexDirection: 'column', gap: 1,
                  }}>
                    <Typography variant="body2" fontWeight={600}>
                      ⏸&nbsp; Paused at {formatTime(currentTime)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clip window: {formatTime(clipStart)} → {formatTime(clipEnd)}
                      &nbsp;·&nbsp;{MAX_CLIP_FRAMES} consecutive frames from here
                    </Typography>
                    {isExtracting ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption">Extracting frames with ffmpeg…</Typography>
                      </Box>
                    ) : (
                      <Button variant="contained" size="small" onClick={handleExtractClip} sx={{ alignSelf: 'flex-start' }}>
                        Extract clip &amp; switch to frames →
                      </Button>
                    )}
                  </Box>
                )}
                {!isPaused && (
                  <Typography variant="caption" color="text.disabled">
                    Pause the video to select a clip for frame-by-frame annotation.
                  </Typography>
                )}
              </>
            )}
          </>
        )}

        {/* ════ FRAME MODE ════ */}
        {subMode === 'frames' && (
          <>
            <AnnotationPanel
              imageUrl={currentFrameInfo?.url ?? null}
              state={annotation}
            />

            {/* Playback controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="First frame">
                <IconButton size="small" onClick={() => { setIsStepPlaying(false); setCurrentFrame(0); }}>
                  <SkipPreviousIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Previous frame (←)">
                <IconButton size="small" onClick={() => setCurrentFrame((f) => Math.max(0, f - 1))}>
                  <NavigateBeforeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={isStepPlaying ? 'Pause (Space)' : 'Step-play (Space)'}>
                <IconButton size="small" onClick={() => setIsStepPlaying((p) => !p)} color={isStepPlaying ? 'primary' : 'default'}>
                  {isStepPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Next frame (→)">
                <IconButton size="small" onClick={() => setCurrentFrame((f) => Math.min(frames.length - 1, f + 1))}>
                  <NavigateNextIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Last frame">
                <IconButton size="small" onClick={() => { setIsStepPlaying(false); setCurrentFrame(frames.length - 1); }}>
                  <SkipNextIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontVariantNumeric: 'tabular-nums' }}>
                Frame {currentFrame + 1} / {frames.length}
                {clipInfo && ` · ${formatTime(clipInfo.start)}–${formatTime(clipInfo.end)}`}
              </Typography>
            </Box>

            {/* Track controls */}
            {(() => {
              const selectedAtFrame = annotation.accepted.filter((o) => selectedTrackIds.has(o.id));
              const noneSelected    = selectedTrackIds.size === 0;
              const noneAtFrame     = selectedTrackIds.size > 0 && selectedAtFrame.length === 0;
              const disabled        = noneSelected || noneAtFrame || isTracking;

              const trackNLabel = trackN !== '' ? String(trackN) : '∞';

              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ fontWeight: 600, mr: 0.25, whiteSpace: 'nowrap' }}>
                    Track:
                  </Typography>

                  <Tooltip title={`Track selected ← 1 frame`}>
                    <span>
                      <Button variant="outlined" size="small" disabled={disabled}
                        onClick={() => trackObjects('backward', 1)}
                        sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.72rem', lineHeight: 1.5 }}>
                        ← 1
                      </Button>
                    </span>
                  </Tooltip>

                  <Tooltip title={`Track selected ← ${trackNLabel} frames`}>
                    <span>
                      <Button variant="outlined" size="small" disabled={disabled}
                        onClick={() => trackObjects('backward', trackN !== '' ? trackN : undefined)}
                        sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.72rem', lineHeight: 1.5 }}>
                        ← N
                      </Button>
                    </span>
                  </Tooltip>

                  <TextField
                    size="small"
                    type="number"
                    placeholder="∞"
                    value={trackN}
                    disabled={isTracking}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTrackN(v === '' ? '' : Math.max(1, parseInt(v) || 1));
                    }}
                    inputProps={{ min: 1 }}
                    sx={{ width: 60 }}
                    InputProps={{ sx: { fontSize: '0.75rem' } }}
                  />

                  <Tooltip title={`Track selected N → ${trackNLabel} frames`}>
                    <span>
                      <Button variant="outlined" size="small" disabled={disabled}
                        onClick={() => trackObjects('forward', trackN !== '' ? trackN : undefined)}
                        sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.72rem', lineHeight: 1.5 }}>
                        N →
                      </Button>
                    </span>
                  </Tooltip>

                  <Tooltip title="Track selected 1 frame →">
                    <span>
                      <Button variant="outlined" size="small" disabled={disabled}
                        onClick={() => trackObjects('forward', 1)}
                        sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.72rem', lineHeight: 1.5 }}>
                        1 →
                      </Button>
                    </span>
                  </Tooltip>

                  {isTracking && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 0.5 }}>
                      <CircularProgress size={13} />
                      {trackProgress && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {trackProgress.done}/{trackProgress.total}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {!isTracking && noneSelected && (
                    <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                      check objects to track
                    </Typography>
                  )}
                  {!isTracking && noneAtFrame && (
                    <Typography variant="caption" sx={{ color: 'warning.main', ml: 0.5 }}>
                      no selected objects at this frame
                    </Typography>
                  )}
                </Box>
              );
            })()}

            {trackError && (
              <Alert severity="error" onClose={() => setTrackError(null)} sx={{ py: 0 }}>
                {trackError}
              </Alert>
            )}

            {/* Tick timeline */}
            <TickTimeline
              frameCount={frames.length}
              currentFrame={currentFrame}
              frames={frames}
              onSeek={(i) => setCurrentFrame(i)}
              annotatedFrames={annotatedFrameIndices}
            />

            <Typography variant="caption" color="text.disabled">
              ← / → to step through frames · Space to step-play · Click timeline to seek
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
