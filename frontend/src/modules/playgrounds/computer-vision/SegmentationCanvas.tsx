import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type MouseEvent,
} from 'react';
import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { ActiveTool, BoundingBox, ClickPoint, Mask } from './types';

// Single dip: briefly vanishes so the eye locks onto it when it returns
const maskFlash = keyframes`
  0%   { opacity: 1; }
  30%  { opacity: 0.05; }
  70%  { opacity: 1; }
  100% { opacity: 1; }
`;

interface Props {
  imageUrl: string;
  activeTool: ActiveTool;
  points: ClickPoint[];
  boundingBox: BoundingBox | null;
  /** All masks (accepted + candidates). Canvas filters by visible / solo. */
  masks: Mask[];
  /** ID of the currently selected candidate mask (highlighted). */
  selectedMaskId: string | null;
  /** When set, only this mask is shown (solo mode). */
  soloedMaskId: string | null;
  /** Show bounding-box rectangles as an SVG overlay. */
  showBboxOverlay: boolean;
  /** Show label + confidence badges as an SVG overlay. */
  showAnnotations: boolean;
  isLoading: boolean;
  onPointAdded: (point: ClickPoint) => void;
  onBoxDrawn: (box: BoundingBox) => void;
  onImageLoaded: (naturalW: number, naturalH: number) => void;
}

const POS_COLOR = '#22c55e';
const NEG_COLOR = '#ef4444';
const BOX_COLOR = '#3b82f6';
const DOT_RADIUS = 7;
const DOT_BORDER = 2.5;

export default function SegmentationCanvas({
  imageUrl,
  activeTool,
  points,
  boundingBox,
  masks,
  selectedMaskId,
  soloedMaskId,
  showBboxOverlay,
  showAnnotations,
  isLoading,
  onPointAdded,
  onBoxDrawn,
  onImageLoaded,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [flashingMaskId, setFlashingMaskId] = useState<string | null>(null);

  // When a mask is soloed, flash it so the eye is drawn to it
  useEffect(() => {
    if (!soloedMaskId) return;
    setFlashingMaskId(soloedMaskId);
    const t = setTimeout(() => setFlashingMaskId(null), 650);
    return () => clearTimeout(t);
  }, [soloedMaskId]);

  // Drag state for bounding-box drawing
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const isDragging = dragStart !== null;

  // -----------------------------------------------------------------------
  // Sync canvas pixel dimensions with the displayed image size
  // -----------------------------------------------------------------------
  const syncCanvasSize = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
  }, []);

  // -----------------------------------------------------------------------
  // Coordinate helpers
  // -----------------------------------------------------------------------
  const toNaturalCoords = useCallback((cssX: number, cssY: number) => {
    const img = imgRef.current;
    if (!img) return { x: cssX, y: cssY };
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    return { x: Math.round(cssX * scaleX), y: Math.round(cssY * scaleY) };
  }, []);

  const canvasPos = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // -----------------------------------------------------------------------
  // Which masks to display
  // -----------------------------------------------------------------------
  const masksToShow = soloedMaskId
    ? masks.filter((m) => m.id === soloedMaskId)
    : masks.filter((m) => m.visible);

  // -----------------------------------------------------------------------
  // Draw overlay (points + prompt box + drag preview)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Prompt bounding box
    const drawBox = (b: BoundingBox, alpha = 1) => {
      const img = imgRef.current;
      if (!img) return;
      const sx = img.clientWidth / img.naturalWidth;
      const sy = img.clientHeight / img.naturalHeight;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = BOX_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(b.x1 * sx, b.y1 * sy, (b.x2 - b.x1) * sx, (b.y2 - b.y1) * sy);
      ctx.restore();
    };

    if (boundingBox) drawBox(boundingBox);

    // Drag-preview box
    if (isDragging && dragStart && dragCurrent) {
      ctx.save();
      ctx.strokeStyle = BOX_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.8;
      ctx.strokeRect(
        dragStart.x, dragStart.y,
        dragCurrent.x - dragStart.x,
        dragCurrent.y - dragStart.y,
      );
      ctx.restore();
    }

    // Click points
    for (const pt of points) {
      const img = imgRef.current;
      if (!img) continue;
      const sx = img.clientWidth / img.naturalWidth;
      const sy = img.clientHeight / img.naturalHeight;
      const cx = pt.x * sx;
      const cy = pt.y * sy;
      const color = pt.type === 'positive' ? POS_COLOR : NEG_COLOR;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_RADIUS + DOT_BORDER, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 3.5, cy);
      ctx.lineTo(cx + 3.5, cy);
      ctx.stroke();
      if (pt.type === 'positive') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3.5);
        ctx.lineTo(cx, cy + 3.5);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [points, boundingBox, dragStart, dragCurrent, isDragging]);

  // -----------------------------------------------------------------------
  // Cursor style
  // -----------------------------------------------------------------------
  const cursor =
    activeTool === 'box' ? 'crosshair' : activeTool === 'positive' ? 'cell' : 'not-allowed';

  // -----------------------------------------------------------------------
  // Mouse handlers
  // -----------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pos = canvasPos(e);

      if (activeTool === 'box') {
        setDragStart(pos);
        setDragCurrent(pos);
        return;
      }

      const type =
        e.button === 2 ? 'negative' : activeTool === 'negative' ? 'negative' : 'positive';
      const natural = toNaturalCoords(pos.x, pos.y);
      onPointAdded({ id: crypto.randomUUID(), x: natural.x, y: natural.y, type });
    },
    [activeTool, canvasPos, toNaturalCoords, onPointAdded],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;
      setDragCurrent(canvasPos(e));
    },
    [isDragging, canvasPos],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !dragStart) return;
      const end = canvasPos(e);
      setDragStart(null);
      setDragCurrent(null);

      const minX = Math.min(dragStart.x, end.x);
      const minY = Math.min(dragStart.y, end.y);
      const maxX = Math.max(dragStart.x, end.x);
      const maxY = Math.max(dragStart.y, end.y);

      if (maxX - minX < 5 || maxY - minY < 5) return;

      const tl = toNaturalCoords(minX, minY);
      const br = toNaturalCoords(maxX, maxY);
      onBoxDrawn({ x1: tl.x, y1: tl.y, x2: br.x, y2: br.y });
    },
    [isDragging, dragStart, canvasPos, toNaturalCoords, onBoxDrawn],
  );

  const handleContextMenu = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  // -----------------------------------------------------------------------
  // Image load
  // -----------------------------------------------------------------------
  const handleImageLoad = useCallback(() => {
    syncCanvasSize();
    const img = imgRef.current;
    if (img) {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      onImageLoaded(img.naturalWidth, img.naturalHeight);
    }
  }, [syncCanvasSize, onImageLoaded]);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        maxWidth: '100%',
        userSelect: 'none',
        lineHeight: 0,
        borderRadius: 1,
        overflow: 'hidden',
        boxShadow: 2,
      }}
    >
      {/* Base image */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Segmentation canvas"
        draggable={false}
        onLoad={handleImageLoad}
        style={{ display: 'block', maxWidth: '100%', maxHeight: '560px' }}
      />

      {/* Mask overlays */}
      {masksToShow.map((m) => {
        const isFlashing = m.id === flashingMaskId;
        return (
          <Box
            key={m.id}
            component="img"
            src={`data:image/png;base64,${m.maskB64}`}
            alt=""
            draggable={false}
            sx={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              pointerEvents: 'none',
              opacity: m.id === selectedMaskId ? 1 : 0.65,
              transition: isFlashing ? 'none' : 'opacity 0.15s',
              animation: isFlashing ? `${maskFlash} 0.65s ease-in-out` : 'none',
            }}
          />
        );
      })}

      {/* SVG overlay — bounding boxes and/or annotation badges */}
      {(showBboxOverlay || showAnnotations) && naturalSize.w > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
          viewBox={`0 0 ${naturalSize.w} ${naturalSize.h}`}
          preserveAspectRatio="none"
        >
          {masksToShow.map((m) => {
            const { x, y, w, h } = m.bbox;
            if (w === 0 && h === 0) return null;
            const color = m.color || '#3b82f6';
            const strokeW = Math.max(1, naturalSize.w / 400);

            // Annotation badge sizing (in natural-image coords)
            const fontSize = Math.max(14, naturalSize.w / 45);
            const pad = fontSize * 0.4;
            const badgeText = `${m.label}  ${m.score.toFixed(2)}`;
            // Estimate badge width: monospace chars ~0.6em wide
            const badgeW = badgeText.length * fontSize * 0.58 + pad * 2;
            const badgeH = fontSize + pad * 2;
            // Place badge just inside the top-left of the bbox
            const bx = x + strokeW;
            const by = y + strokeW;

            return (
              <g key={m.id}>
                {showBboxOverlay && (
                  <>
                    <rect
                      x={x} y={y} width={w} height={h}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeW}
                      strokeDasharray="6 4"
                      opacity={0.9}
                    />
                    <circle
                      cx={x} cy={y}
                      r={Math.max(3, naturalSize.w / 200)}
                      fill={color}
                      opacity={0.9}
                    />
                  </>
                )}
                {showAnnotations && (
                  <g>
                    <rect
                      x={bx} y={by}
                      width={badgeW} height={badgeH}
                      fill={color}
                      rx={pad * 0.8}
                      opacity={0.88}
                    />
                    <text
                      x={bx + pad}
                      y={by + badgeH - pad}
                      fill="white"
                      fontSize={fontSize}
                      fontFamily="monospace"
                      fontWeight="700"
                    >
                      {badgeText}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Interactive canvas — points, prompt box, drag preview */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          cursor,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />

      {/* Loading spinner */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.45)',
            gap: 1,
          }}
        >
          <CircularProgress size={40} sx={{ color: '#fff' }} />
          <Typography variant="caption" sx={{ color: '#fff' }}>
            Running SAM…
          </Typography>
        </Box>
      )}
    </Box>
  );
}
