import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DownloadIcon from '@mui/icons-material/Download';
import AdjustIcon from '@mui/icons-material/Adjust';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { AcceptedObject, Mask } from './types';
import { PALETTE } from './palette';

interface Props {
  /** Latest SAM run candidates (cleared after accept/clear). */
  candidates: Mask[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  onAcceptCandidate: (id: string) => void;

  /** Already-accepted, finalised objects. */
  accepted: AcceptedObject[];
  onToggleAcceptedVisibility: (id: string) => void;
  onDeleteAccepted: (id: string) => void;
  onExportAll: () => void;

  /** Solo: only this mask is shown on canvas (null = show all). */
  soloedId: string | null;
  onToggleSolo: (id: string) => void;

  /** Optional: IDs of objects selected for video tracking. Renders checkboxes when provided. */
  selectedTrackIds?: Set<string>;
  onToggleTrackSelected?: (id: string) => void;
}

const SECTION_LABEL_SX = {
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'text.disabled',
};

function ColorSwatch({ color }: { color: string }) {
  return (
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '3px',
        bgcolor: color,
        flexShrink: 0,
        border: '1px solid rgba(0,0,0,0.15)',
      }}
    />
  );
}

export default function MaskList({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  onAcceptCandidate,
  accepted,
  onToggleAcceptedVisibility,
  onDeleteAccepted,
  onExportAll,
  soloedId,
  onToggleSolo,
  selectedTrackIds,
  onToggleTrackSelected,
}: Props) {
  const hasCandidates = candidates.length > 0;
  const hasAccepted = accepted.length > 0;
  const anySoloed = soloedId !== null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Candidates ───────────────────────────────── */}
      {hasCandidates && (
        <>
          <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
            <Typography sx={SECTION_LABEL_SX}>CANDIDATES</Typography>
          </Box>
          {candidates.map((m, i) => {
            const isSelected = m.id === selectedCandidateId;
            const color = m.color || PALETTE[i % PALETTE.length];
            return (
              <Box
                key={m.id}
                onClick={() => onSelectCandidate(m.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  cursor: 'pointer',
                  bgcolor: isSelected ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background 0.1s',
                }}
              >
                <ColorSwatch color={color} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem' }}>
                    Mask {i + 1}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    score {m.score.toFixed(2)}
                  </Typography>
                </Box>
                <Tooltip title="Accept this mask" placement="left">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptCandidate(m.id);
                    }}
                    sx={{ color: 'success.main' }}
                  >
                    <CheckCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
          <Box sx={{ px: 1.5, pb: 1, pt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Click a mask to highlight it · ✓ to accept
            </Typography>
          </Box>
          <Divider />
        </>
      )}

      {/* ── Accepted objects ─────────────────────────── */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: hasAccepted ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={SECTION_LABEL_SX}>ACCEPTED OBJECTS</Typography>
        {anySoloed && (
          <Typography
            variant="caption"
            sx={{ color: 'warning.main', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.05em' }}
          >
            SOLO
          </Typography>
        )}
      </Box>

      {!hasAccepted && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            No objects yet. Run SAM and accept a mask.
          </Typography>
        </Box>
      )}

      {accepted.map((obj) => {
        const isSoloed = obj.id === soloedId;
        const isHidden = anySoloed && !isSoloed;
        const isTrackSelected = selectedTrackIds?.has(obj.id) ?? false;
        return (
          <Box
            key={obj.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              opacity: isHidden ? 0.35 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {selectedTrackIds !== undefined && (
              <Tooltip title={isTrackSelected ? 'Deselect for tracking' : 'Select for tracking'} placement="left">
                <Checkbox
                  size="small"
                  checked={isTrackSelected}
                  onChange={() => onToggleTrackSelected?.(obj.id)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ p: 0.25, mr: -0.75 }}
                />
              </Tooltip>
            )}
            <ColorSwatch color={obj.color} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontSize: '0.8rem' }}>
                {obj.label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                score {obj.mask.score.toFixed(2)}
              </Typography>
            </Box>

            {/* Solo */}
            <Tooltip title={isSoloed ? 'Un-solo' : 'Solo (show only this)'} placement="left">
              <IconButton
                size="small"
                onClick={() => onToggleSolo(obj.id)}
                sx={{ color: isSoloed ? 'warning.main' : 'text.disabled' }}
              >
                {isSoloed ? (
                  <AdjustIcon fontSize="small" />
                ) : (
                  <RadioButtonUncheckedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            {/* Visibility */}
            <Tooltip title={obj.mask.visible ? 'Hide' : 'Show'} placement="left">
              <IconButton
                size="small"
                onClick={() => onToggleAcceptedVisibility(obj.id)}
                sx={{ color: 'text.disabled' }}
              >
                {obj.mask.visible ? (
                  <VisibilityIcon fontSize="small" />
                ) : (
                  <VisibilityOffIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            {/* Delete */}
            <Tooltip title="Remove" placement="left">
              <IconButton
                size="small"
                onClick={() => onDeleteAccepted(obj.id)}
                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      })}

      {hasAccepted && (
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={onExportAll}
            fullWidth
            sx={{ fontSize: '0.72rem' }}
          >
            Export masks
          </Button>
        </Box>
      )}
    </Box>
  );
}
