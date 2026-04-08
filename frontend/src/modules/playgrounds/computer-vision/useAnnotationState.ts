import { useState, useEffect, useCallback, useRef } from 'react';
import type React from 'react';
import { PALETTE } from './palette';
import type {
  AcceptedObject,
  ActiveTool,
  BoundingBox,
  ClickPoint,
  Mask,
  PromptMode,
  SourcePrompts,
} from './types';

const AUTO_RUN_DELAY_MS = 600;

function recolorMask(maskB64: string, hexColor: string): Promise<string> {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const px = imageData.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 0) { px[i] = r; px[i + 1] = g; px[i + 2] = b; }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.src = `data:image/png;base64,${maskB64}`;
  });
}

export interface AnnotationStateResult {
  // Prompt
  mode: PromptMode;
  setMode: (m: PromptMode) => void;
  activeTool: ActiveTool;
  setActiveTool: (t: ActiveTool) => void;
  points: ClickPoint[];
  box: BoundingBox | null;
  text: string;
  setText: (t: string) => void;
  confidence: number;
  setConfidence: (c: number) => void;

  // Results
  candidates: Mask[];
  selectedCandidateId: string | null;
  setSelectedCandidateId: (id: string | null) => void;
  accepted: AcceptedObject[];
  soloedId: string | null;

  // Display toggles
  showBboxOverlay: boolean;
  showAnnotations: boolean;
  toggleBboxOverlay: () => void;
  toggleAnnotations: () => void;

  // UI
  isLoading: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  hasPrompts: boolean;
  allMasks: Mask[];

  // Handlers
  runSegmentation: () => Promise<void>;
  handlePointAdded: (pt: ClickPoint) => void;
  handleBoxDrawn: (b: BoundingBox) => void;
  handleClear: () => void;
  handleAcceptCandidate: (id: string) => Promise<void>;
  handleToggleAcceptedVisibility: (id: string) => void;
  handleDeleteAccepted: (id: string) => void;
  handleToggleSolo: (id: string) => void;
  handleExportAll: () => void;

  // Cross-frame persistence (video mode: read accepted objects for any source key)
  acceptedBySourceRef: React.MutableRefObject<Map<string, AcceptedObject[]>>;
}

export function useAnnotationState(
  sourceParam: { image_path: string } | { frame_path: string } | null,
): AnnotationStateResult {
  const [mode, setMode] = useState<PromptMode>('click-box');
  const [activeTool, setActiveTool] = useState<ActiveTool>('positive');
  const [points, setPoints] = useState<ClickPoint[]>([]);
  const [box, setBox] = useState<BoundingBox | null>(null);
  const [text, setText] = useState('');
  const [confidence, setConfidence] = useState(0.5);

  const [candidates, setCandidates] = useState<Mask[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<AcceptedObject[]>([]);
  const [objectCounter, setObjectCounter] = useState(1);

  const [soloedId, setSoloedId] = useState<string | null>(null);
  const [showBboxOverlay, setShowBboxOverlay] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoRunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-source persistence: accepted objects and their counter survive frame navigation.
  const acceptedBySource = useRef<Map<string, AcceptedObject[]>>(new Map());
  const counterBySource  = useRef<Map<string, number>>(new Map());
  const prevSourceKeyRef = useRef<string | null>(null);

  // Always-current refs so the save step inside the effect sees fresh values.
  const acceptedRef = useRef(accepted);
  acceptedRef.current = accepted;
  const counterRef = useRef(objectCounter);
  counterRef.current = objectCounter;

  // Reset prompt/candidate state when the source changes, but save/restore accepted.
  const sourceKey = sourceParam ? JSON.stringify(sourceParam) : null;
  useEffect(() => {
    const prevKey = prevSourceKeyRef.current;

    // Persist accepted objects for the source we're leaving.
    if (prevKey !== null) {
      acceptedBySource.current.set(prevKey, acceptedRef.current);
      counterBySource.current.set(prevKey, counterRef.current);
    }
    prevSourceKeyRef.current = sourceKey;

    // Restore accepted objects for the source we're entering (or start fresh).
    const restoredAccepted = sourceKey ? (acceptedBySource.current.get(sourceKey) ?? []) : [];
    const restoredCounter  = sourceKey ? (counterBySource.current.get(sourceKey) ?? 1)  : 1;

    setPoints([]);
    setBox(null);
    setText('');
    setCandidates([]);
    setSelectedCandidateId(null);
    setAccepted(restoredAccepted);
    setObjectCounter(restoredCounter);
    setSoloedId(null);
    setError(null);
  }, [sourceKey]);

  const runSegmentation = useCallback(async () => {
    if (!sourceParam) return;

    const hasClickBox = points.length > 0 || box !== null;
    const hasText = text.trim().length > 0;
    const isClickBoxMode = mode === 'click-box';
    const isTextMode = mode === 'text';
    const isBothMode = mode === 'both';

    if (isClickBoxMode && !hasClickBox) return;
    if (isTextMode && !hasText) return;
    if (isBothMode && !hasText && !hasClickBox) return;

    setIsLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { ...sourceParam };

      if ((isClickBoxMode || isBothMode) && hasClickBox) {
        if (points.length > 0) {
          body.points = points.map((p) => ({
            x: p.x, y: p.y, label: p.type === 'positive' ? 1 : 0,
          }));
        }
        if (box) body.box = box;
      }

      if ((isTextMode || isBothMode) && hasText) {
        body.text = text.trim();
        body.confidence = confidence;
      }

      const res = await fetch('/api/sam/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.error) { setError(data.error); return; }

      const newMasks: Mask[] = (data.masks ?? []).map(
        (m: { id: string; score: number; mask_b64: string; bbox: { x: number; y: number; w: number; h: number } }, i: number) => ({
          id: m.id, score: m.score, maskB64: m.mask_b64, bbox: m.bbox,
          visible: true, label: `Candidate ${i + 1}`, color: PALETTE[i % PALETTE.length],
        }),
      );

      setCandidates(newMasks);
      setSelectedCandidateId(newMasks[0]?.id ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [sourceParam, points, box, text, confidence, mode]);

  const scheduleAutoRun = useCallback(() => {
    if (AUTO_RUN_DELAY_MS <= 0) return;
    if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
    autoRunTimer.current = setTimeout(runSegmentation, AUTO_RUN_DELAY_MS);
  }, [runSegmentation]);

  const hasPrompts = points.length > 0 || box !== null || text.trim().length > 0;

  // Enter key shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (hasPrompts && !isLoading && sourceParam) runSegmentation();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasPrompts, isLoading, sourceParam, runSegmentation]);

  const handlePointAdded = useCallback(
    (pt: ClickPoint) => { setPoints((prev) => [...prev, pt]); scheduleAutoRun(); },
    [scheduleAutoRun],
  );

  const handleBoxDrawn = useCallback(
    (b: BoundingBox) => { setBox(b); scheduleAutoRun(); },
    [scheduleAutoRun],
  );

  const handleClear = useCallback(() => {
    setPoints([]); setBox(null);
    setCandidates([]); setSelectedCandidateId(null);
    setError(null);
  }, []);

  const handleAcceptCandidate = useCallback(async (id: string) => {
    const mask = candidates.find((m) => m.id === id);
    if (!mask) return;
    const color = PALETTE[accepted.length % PALETTE.length];
    const recoloredB64 = await recolorMask(mask.maskB64, color);
    const prompts: SourcePrompts = { points: [...points], box, text };
    const newObj: AcceptedObject = {
      id: crypto.randomUUID(),
      label: `Object ${objectCounter}`,
      mask: { ...mask, maskB64: recoloredB64, visible: true, color },
      color,
      sourcePrompts: prompts,
    };
    setAccepted((prev) => [...prev, newObj]);
    setObjectCounter((n) => n + 1);
    setCandidates((prev) => prev.filter((m) => m.id !== id));
    setSelectedCandidateId(null);
  }, [candidates, accepted.length, objectCounter, points, box, text]);

  const handleToggleAcceptedVisibility = useCallback((id: string) => {
    setAccepted((prev) =>
      prev.map((obj) => obj.id === id ? { ...obj, mask: { ...obj.mask, visible: !obj.mask.visible } } : obj),
    );
  }, []);

  const handleDeleteAccepted = useCallback((id: string) => {
    setAccepted((prev) => prev.filter((obj) => obj.id !== id));
    if (soloedId === id) setSoloedId(null);
  }, [soloedId]);

  const handleToggleSolo = useCallback((id: string) => {
    setSoloedId((prev) => (prev === id ? null : id));
  }, []);

  const handleExportAll = useCallback(() => {
    accepted.forEach((obj) => {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${obj.mask.maskB64}`;
      link.download = `${obj.label.replace(/\s+/g, '_')}.png`;
      link.click();
    });
  }, [accepted]);

  const allMasks: Mask[] = [
    ...accepted.map((o) => ({ ...o.mask, id: o.id })),
    ...candidates,
  ];

  return {
    mode, setMode,
    activeTool, setActiveTool,
    points, box, text, setText, confidence, setConfidence,
    candidates, selectedCandidateId, setSelectedCandidateId,
    accepted, soloedId,
    showBboxOverlay, showAnnotations,
    toggleBboxOverlay: () => setShowBboxOverlay((v) => !v),
    toggleAnnotations: () => setShowAnnotations((v) => !v),
    isLoading, error, setError,
    hasPrompts, allMasks,
    runSegmentation,
    handlePointAdded, handleBoxDrawn, handleClear,
    acceptedBySourceRef: acceptedBySource,
    handleAcceptCandidate, handleToggleAcceptedVisibility,
    handleDeleteAccepted, handleToggleSolo, handleExportAll,
  };
}
