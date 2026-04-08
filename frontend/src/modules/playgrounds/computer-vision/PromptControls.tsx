import { useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { ImageInfo } from './types';

interface Props {
  images: ImageInfo[];
  selectedImage: ImageInfo | null;
  onSelectImage: (img: ImageInfo) => void;
  onUploadImage: (file: File) => void;
}

const SECTION_LABEL_SX = {
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'text.disabled',
  mb: 0.75,
};

export default function PromptControls({
  images,
  selectedImage,
  onSelectImage,
  onUploadImage,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadImage(file);
    e.target.value = '';
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={SECTION_LABEL_SX}>IMAGE</Typography>

      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel id="img-select-label">Select image</InputLabel>
        <Select
          labelId="img-select-label"
          value={selectedImage?.name ?? ''}
          label="Select image"
          onChange={(e) => {
            const img = images.find((i) => i.name === e.target.value);
            if (img) onSelectImage(img);
          }}
        >
          {images.map((img) => (
            <MenuItem key={img.name} value={img.name} sx={{ fontSize: '0.82rem' }}>
              {img.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        size="small"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        fullWidth
        onClick={() => fileInputRef.current?.click()}
        sx={{ fontSize: '0.75rem' }}
      >
        Upload image
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleFileChange}
      />
    </Box>
  );
}
