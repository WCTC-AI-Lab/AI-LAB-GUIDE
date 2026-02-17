import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';

export default function LLMExplore() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        setModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0]);
        } else {
          setSelectedModel('');
        }
      });
  }, []);

  const handleGenerateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/predict-next-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, prompt: inputText })
      });
      const data = await res.json();
      
      if (data.next_token !== undefined) {
        // Use functional state update to ensure we grab the latest text
        setInputText(prev => prev + data.next_token);
        setLastToken(data.next_token);
      }
    } catch (error) {
      console.error("Error generating token:", error);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, py: 4 }}>
      <Box sx={{ flex: 2 }}>
        <Typography variant="h4" color="primary" gutterBottom>
          LLM Explore
        </Typography>
        <TextField
          multiline
          minRows={8}
          fullWidth
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Type or paste your text here..."
          sx={{ mt: 2 }}
        />
        {lastToken !== null && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Last Token:
            </Typography>
            <Chip 
              label={`"${lastToken}"`} 
              color="primary" 
              variant="outlined" 
              size="small" 
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>
        )}
      </Box>
      <Paper sx={{ flex: 1, p: 3, bgcolor: '#f5f7fa', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 3 }} elevation={3}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Controls
        </Typography>
        <FormControl fullWidth>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            label="Model"
            onChange={e => setSelectedModel(e.target.value)}
            disabled={models.length === 0}
          >
            {models.length === 0 ? (
              <MenuItem value="">No models available</MenuItem>
            ) : (
              models.map(model => (
                <MenuItem key={model} value={model}>{model}</MenuItem>
              ))
            )}
          </Select>
        </FormControl>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleGenerateToken} 
          disabled={loading || !inputText}
          sx={{ py: 1.5 }}
        >
          {loading ? 'Thinking...' : 'Generate Next Token'}
        </Button>
      </Paper>
    </Box>
  );
}