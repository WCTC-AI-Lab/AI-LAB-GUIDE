import { useEffect, useState, useRef } from 'react';
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
import Slider from '@mui/material/Slider';

// Define the shape of our new logprob data
interface LogprobCandidate {
  token: string;
  prob_percent: number;
}

export default function LLMExplore() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  
  // New state to hold the probability distribution
  const [latestLogprobs, setLatestLogprobs] = useState<LogprobCandidate[] | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [temperature, setTemperature] = useState<number>(0.0);

  const isPlayingRef = useRef(false);
  const textRef = useRef(inputText);
  const tempRef = useRef(temperature);
  const modelRef = useRef(selectedModel);

  useEffect(() => { textRef.current = inputText; }, [inputText]);
  useEffect(() => { tempRef.current = temperature; }, [temperature]);
  useEffect(() => { modelRef.current = selectedModel; }, [selectedModel]);

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
    if (!modelRef.current || !textRef.current) return;
    
    setLoading(true);
    let success = false;
    
    try {
      const res = await fetch('/api/predict-next-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: modelRef.current, 
          prompt: textRef.current,
          temperature: tempRef.current
        })
      });
      const data = await res.json();
      
      if (data.next_token !== undefined) {
        setInputText(prev => prev + data.next_token);
        setLastToken(data.next_token);
        // Save the parsed distribution for rendering
        setLatestLogprobs(data.logprobs || null);
        success = true;
      }
    } catch (error) {
      console.error("Error generating token:", error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
    
    setLoading(false);
    return success;
  };

  const generateLoop = async () => {
    if (!isPlayingRef.current) return;
    await handleGenerateToken();
    setTimeout(() => {
      if (isPlayingRef.current) generateLoop();
    }, 50); 
  };

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    isPlayingRef.current = nextState;
    if (nextState) generateLoop();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, py: 4 }}>
      <Box sx={{ flex: 2 }}>
        <Typography variant="h4" color="primary" gutterBottom>
          LLM Explore
        </Typography>
        <TextField
          multiline
          minRows={12}
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
      <Paper sx={{ flex: 1, p: 3, bgcolor: '#f5f7fa', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 3 }} elevation={3}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Controls
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel>Model</InputLabel>
          <Select
            value={selectedModel}
            label="Model"
            onChange={e => setSelectedModel(e.target.value)}
            disabled={models.length === 0 || isPlaying}
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

        <Box>
          <Typography variant="body2" gutterBottom>
            Temperature: {temperature.toFixed(1)}
          </Typography>
          <Slider
            value={temperature}
            min={0.0}
            max={2.0}
            step={0.1}
            onChange={(_e, val) => setTemperature(val as number)}
            disabled={isPlaying}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handleGenerateToken} 
            disabled={loading || !inputText || isPlaying}
            sx={{ py: 1 }}
          >
            Step (1 Token)
          </Button>
          <Button 
            variant="contained" 
            color={isPlaying ? "secondary" : "success"} 
            onClick={togglePlay} 
            disabled={(!inputText && !isPlaying) || (loading && !isPlaying)}
            sx={{ py: 1.5, fontWeight: 'bold' }}
          >
            {isPlaying ? 'Pause Auto-Generate' : 'Play Auto-Generate'}
          </Button>
        </Box>

        {/* PROBABILITY DISTRIBUTION UI */}
        {latestLogprobs && latestLogprobs.length > 0 && (
          <Box sx={{ mt: 1, p: 2, bgcolor: '#ffffff', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
              Top Candidates (Logprobs)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {latestLogprobs.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: idx === 0 ? '#e8f5e9' : '#f5f5f5', p: 1, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mr: 1 }}>
                    "{item.token}"
                  </Typography>
                  <Typography variant="caption" fontWeight="bold" color={idx === 0 ? 'success.main' : 'text.secondary'}>
                    {item.prob_percent.toFixed(1)}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}