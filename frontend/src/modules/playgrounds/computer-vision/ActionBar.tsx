import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import CropFreeIcon from '@mui/icons-material/CropFree';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import type { ActiveTool, PromptMode } from './types';

interface Props {
  mode: PromptMode;
  onModeChange: (m: PromptMode) => void;
  activeTool: ActiveTool;
  onToolChange: (t: ActiveTool) => void;
  text: string;
  onTextChange: (v: string) => void;
  confidence: number;
  onConfidenceChange: (v: number) => void;
  onRun: () => void;
  onClear: () => void;
  isLoading: boolean;
  hasPrompts: boolean;
  hasCandidates: boolean;
  hasImage: boolean;
  showBboxOverlay: boolean;
  onToggleBboxOverlay: () => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
}

const SEP = (
  <Box sx={{ width: '1px', height: 26, bgcolor: 'divider', mx: 0.25, flexShrink: 0 }} />
);

export default function ActionBar({
  mode, onModeChange,
  activeTool, onToolChange,
  text, onTextChange,
  confidence, onConfidenceChange,
  onRun, onClear,
  isLoading, hasPrompts, hasCandidates, hasImage,
  showBboxOverlay, onToggleBboxOverlay,
  showAnnotations, onToggleAnnotations,
}: Props) {
  const showClickBox = mode === 'click-box' || mode === 'both';
  const showText = mode === 'text' || mode === 'both';

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        flexWrap: 'wrap',
        px: 1.25,
        py: 0.75,
        mb: 1,
      }}
    >
      {/* ── Prompt mode ─────────────────────────────────── */}
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, v) => v && onModeChange(v as PromptMode)}
        size="small"
      >
        <ToggleButton value="click-box" sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9 }}>
          Click/Box
        </ToggleButton>
        <ToggleButton value="text" sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9 }}>
          Text
        </ToggleButton>
        <ToggleButton value="both" sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9 }}>
          Both
        </ToggleButton>
      </ToggleButtonGroup>

      {showClickBox && SEP}

      {/* ── Click / box tools ───────────────────────────── */}
      {showClickBox && (
        <ToggleButtonGroup
          value={activeTool}
          exclusive
          onChange={(_, v) => v && onToolChange(v as ActiveTool)}
          size="small"
        >
          <Tooltip title="Left-click: positive point" placement="top">
            <ToggleButton value="positive" sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9, color: 'success.main' }}>
              + Pos
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Left-click: negative point" placement="top">
            <ToggleButton value="negative" sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9, color: 'error.main' }}>
              − Neg
            </ToggleButton>
          </Tooltip>
          <Tooltip title="Click-drag to draw a bounding box" placement="top">
            <ToggleButton value="box" sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9 }}>
              ☐ Box
            </ToggleButton>
          </Tooltip>
        </ToggleButtonGroup>
      )}

      {showText && SEP}

      {/* ── Text prompt ─────────────────────────────────── */}
      {showText && (
        <>
          <TextField
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder='e.g. "dog", "red car"'
            size="small"
            sx={{ width: 180 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onRun();
              }
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 90, px: 0.5 }}>
            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', lineHeight: 1.2 }}>
              CONF: {confidence.toFixed(2)}
            </Typography>
            <Slider
              value={confidence}
              onChange={(_, v) => onConfidenceChange(v as number)}
              min={0.1} max={0.9} step={0.05}
              size="small"
              sx={{ py: 0.5 }}
            />
          </Box>
        </>
      )}

      {/* Spacer */}
      <Box sx={{ flex: 1, minWidth: 8 }} />

      {/* ── Overlay toggles ─────────────────────────────── */}
      <Tooltip title={showBboxOverlay ? 'Hide bounding boxes' : 'Show bounding boxes'} placement="top">
        <ToggleButton
          value="bbox"
          selected={showBboxOverlay}
          onChange={onToggleBboxOverlay}
          size="small"
          sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9 }}
        >
          <CropFreeIcon sx={{ fontSize: 14, mr: 0.4 }} />
          BBox
        </ToggleButton>
      </Tooltip>

      <Tooltip title={showAnnotations ? 'Hide label annotations' : 'Show label + confidence annotations'} placement="top">
        <ToggleButton
          value="annotations"
          selected={showAnnotations}
          onChange={onToggleAnnotations}
          size="small"
          sx={{ fontSize: '0.7rem', py: 0.4, px: 0.9 }}
        >
          <LabelOutlinedIcon sx={{ fontSize: 14, mr: 0.4 }} />
          Annot
        </ToggleButton>
      </Tooltip>

      {SEP}

      {/* ── Run / Clear ─────────────────────────────────── */}
      <Button
        variant="contained"
        startIcon={<PlayArrowIcon />}
        onClick={onRun}
        disabled={isLoading || !hasImage}
        size="small"
        sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
      >
        {isLoading ? 'Running…' : hasCandidates ? 'Rerun SAM' : 'Run SAM'}
      </Button>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<ClearAllIcon />}
        onClick={onClear}
        disabled={!hasPrompts}
        size="small"
        sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        Clear
      </Button>
    </Paper>
  );
}
