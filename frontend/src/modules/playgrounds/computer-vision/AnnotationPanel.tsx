import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import ActionBar from './ActionBar';
import SegmentationCanvas from './SegmentationCanvas';
import type { AnnotationStateResult } from './useAnnotationState';

const AUTO_RUN_DELAY_MS = 600;

export interface AnnotationPanelProps {
  /** URL of the image or video frame to display. */
  imageUrl: string | null;
  /** State and handlers from useAnnotationState(). */
  state: AnnotationStateResult;
}

/**
 * Renders the action bar and interactive segmentation canvas.
 * Pair this with a <MaskList> in the parent sidebar and
 * pass the shared annotation state from useAnnotationState().
 */
export default function AnnotationPanel({ imageUrl, state }: AnnotationPanelProps) {
  const {
    mode, setMode, activeTool, setActiveTool,
    text, setText, confidence, setConfidence,
    allMasks, selectedCandidateId, setSelectedCandidateId,
    soloedId, showBboxOverlay, showAnnotations,
    toggleBboxOverlay, toggleAnnotations,
    isLoading, error, setError, hasPrompts,
    points, box,
    runSegmentation, handlePointAdded, handleBoxDrawn, handleClear,
    candidates,
  } = state;

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <ActionBar
        mode={mode}
        onModeChange={setMode}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        text={text}
        onTextChange={setText}
        confidence={confidence}
        onConfidenceChange={setConfidence}
        onRun={runSegmentation}
        onClear={handleClear}
        isLoading={isLoading}
        hasPrompts={hasPrompts}
        hasCandidates={candidates.length > 0}
        hasImage={imageUrl !== null}
        showBboxOverlay={showBboxOverlay}
        onToggleBboxOverlay={toggleBboxOverlay}
        showAnnotations={showAnnotations}
        onToggleAnnotations={toggleAnnotations}
      />

      {imageUrl ? (
        <SegmentationCanvas
          imageUrl={imageUrl}
          activeTool={activeTool}
          points={points}
          boundingBox={box}
          masks={allMasks}
          selectedMaskId={selectedCandidateId}
          soloedMaskId={soloedId}
          showBboxOverlay={showBboxOverlay}
          showAnnotations={showAnnotations}
          isLoading={isLoading}
          onPointAdded={handlePointAdded}
          onBoxDrawn={handleBoxDrawn}
          onImageLoaded={() => {}}
        />
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            color: 'text.disabled',
          }}
        >
          <Typography variant="body2">Select or upload a source to get started.</Typography>
        </Box>
      )}

      {imageUrl && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Left-click = positive · Right-click = negative · Drag = box
            {AUTO_RUN_DELAY_MS > 0 ? ' · SAM runs automatically after each prompt' : ''}
            {' · '}Enter = run SAM
          </Typography>
        </Box>
      )}
    </Box>
  );
}
