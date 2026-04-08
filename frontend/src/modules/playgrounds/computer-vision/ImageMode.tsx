import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import PromptControls from './PromptControls';
import MaskList from './MaskList';
import AnnotationPanel from './AnnotationPanel';
import { useAnnotationState } from './useAnnotationState';
import type { ImageInfo } from './types';

export default function ImageMode() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sam/images')
      .then((r) => r.json())
      .then((data: { images: ImageInfo[] }) => {
        setImages(data.images);
        if (data.images.length > 0) setSelectedImage(data.images[0]);
      })
      .catch(() => setLoadError('Could not load image list from backend.'));
  }, []);

  const handleSelectImage = useCallback((img: ImageInfo) => {
    setSelectedImage(img);
  }, []);

  const handleUploadImage = useCallback(async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/sam/upload-image', { method: 'POST', body: form });
      const data: ImageInfo & { error?: string } = await res.json();
      if (data.error) { setLoadError(data.error); return; }
      setImages((prev) => [...prev, data]);
      handleSelectImage(data);
    } catch (err) {
      setLoadError(String(err));
    }
  }, [handleSelectImage]);

  const sourceParam = selectedImage ? { image_path: selectedImage.name } : null;
  const annotation = useAnnotationState(sourceParam);

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 1 }}>

      {/* ── Left sidebar: image picker + mask list ────────────────────────── */}
      <Paper variant="outlined" sx={{ width: 240, flexShrink: 0, overflow: 'hidden' }}>
        {loadError && (
          <Alert severity="error" onClose={() => setLoadError(null)} sx={{ mx: 1, mt: 1 }}>
            {loadError}
          </Alert>
        )}
        <PromptControls
          images={images}
          selectedImage={selectedImage}
          onSelectImage={handleSelectImage}
          onUploadImage={handleUploadImage}
        />

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
        />
      </Paper>

      {/* ── Right: action bar + canvas ────────────────────────────────────── */}
      <AnnotationPanel
        imageUrl={selectedImage?.url ?? null}
        state={annotation}
      />
    </Box>
  );
}
