import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import ImageMode from './ImageMode';
import VideoMode from './VideoMode';

type Mode = 'image' | 'video';

export default function ComputerVisionPlaygroundPage() {
  const [mode, setMode] = useState<Mode>('image');

  return (
    <Box sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 0.5 }}>
        <Typography variant="h5" fontWeight={700} color="primary">
          SAM Playground
        </Typography>
        <Chip label="SAM3" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Segment anything with point clicks, bounding boxes, or a text description.
      </Typography>

      {/* Mode tabs */}
      <Tabs
        value={mode}
        onChange={(_, v) => setMode(v as Mode)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}
      >
        <Tab label="Image" value="image" />
        <Tab label="Video" value="video" />
      </Tabs>

      {/* Content */}
      {mode === 'image' && <ImageMode />}
      {mode === 'video' && <VideoMode />}
    </Box>
  );
}
