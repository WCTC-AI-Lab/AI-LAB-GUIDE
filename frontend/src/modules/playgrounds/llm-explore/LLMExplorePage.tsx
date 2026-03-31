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
import Tooltip from '@mui/material/Tooltip';
import ClickAwayListener from '@mui/material/ClickAwayListener';

interface LogprobCandidate {
  token: string;
  prob_percent: number;
}

const TOOLTIP_MODEL =
  'Pick which language model adds the next word. Only models installed on this computer are listed.';
const TOOLTIP_TEMPERATURE =
  'Temperature controls how random the next word is. Lower values stick to the most likely words. Higher values allow stranger choices.';
const TOOLTIP_STEP =
  'Ask the model for exactly one next word and add it to the end of your text.';
const TOOLTIP_PLAY =
  'Keep asking for one next word after another until you press pause.';

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <span>
        <Tooltip
          title={text}
          arrow
          placement="left"
          open={open}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          onClose={() => setOpen(false)}
        >
          <Box
            component="button"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="More info"
            sx={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: 'primary.main',
              bgcolor: open ? 'primary.main' : 'transparent',
              color: open ? 'primary.contrastText' : 'primary.main',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'serif',
              fontStyle: 'italic',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 0,
              ml: 1,
              verticalAlign: 'middle',
              flexShrink: 0,
              transition: 'all 0.15s',
              '&:hover': { bgcolor: 'primary.light', color: 'primary.contrastText' },
            }}
          >
            i
          </Box>
        </Tooltip>
      </span>
    </ClickAwayListener>
  );
}

export default function LLMExplorePage() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [latestLogprobs, setLatestLogprobs] = useState<LogprobCandidate[] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [temperature, setTemperature] = useState<number>(0.0);

  const isPlayingRef = useRef(false);
  const textRef = useRef(inputText);
  const tempRef = useRef(temperature);
  const modelRef = useRef(selectedModel);

  useEffect(() => {
    textRef.current = inputText;
  }, [inputText]);
  useEffect(() => {
    tempRef.current = temperature;
  }, [temperature]);
  useEffect(() => {
    modelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
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
          temperature: tempRef.current,
        }),
      });
      const data = await res.json();

      if (data.next_token !== undefined) {
        setInputText((prev) => prev + data.next_token);
        setLastToken(data.next_token);
        setLatestLogprobs(data.logprobs || null);
        success = true;
      }
    } catch (error) {
      console.error('Error generating token:', error);
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
          Explore a Large Language Model
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: 'text.primary' }}>
          A Large Language Model, or LLM, can be used to predict or generate the next word or &quot;token&quot;
          given some text. Chatbots like ChatGPT work by writing a &quot;script&quot; with sections for what
          you say and what the &quot;assistant&quot; says.
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, color: 'text.primary' }}>
          Write anything into the text box and use the controls on the side add words with an LLM. All of the
          LLMs are running locally as a program on this computer.
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 600, color: 'text.primary' }}>
          Some ideas:
        </Typography>
        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5, listStyleType: 'disc', color: 'text.primary' }}>
          <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
            write a story with the LLM where you take turns writing paragraphs
          </Typography>
          <Typography component="li" variant="body1" sx={{ mb: 0.5 }}>
            write the setup to a joke and have it attempt the punchline
          </Typography>
          <Typography component="li" variant="body1">
            figure out what scenario you have to put the LLM in to have it say something crazy
          </Typography>
        </Box>
        <TextField
          multiline
          minRows={12}
          fullWidth
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
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
      <Paper
        sx={{
          flex: 1,
          p: 3,
          bgcolor: 'grey.100',
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          color: 'text.primary',
        }}
        elevation={3}
      >
        <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 700 }}>
          Controls
        </Typography>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Model
            </Typography>
            <InfoTip text={TOOLTIP_MODEL} />
          </Box>
          <FormControl fullWidth>
            <InputLabel id="llm-model-label" sx={{ color: 'text.secondary' }}>
              Model
            </InputLabel>
            <Select
              labelId="llm-model-label"
              value={selectedModel}
              label="Model"
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={models.length === 0 || isPlaying}
            >
              {models.length === 0 ? (
                <MenuItem value="">No models available</MenuItem>
              ) : (
                models.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Temperature: {temperature.toFixed(1)}
            </Typography>
            <InfoTip text={TOOLTIP_TEMPERATURE} />
          </Box>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleGenerateToken}
              disabled={loading || !inputText || isPlaying}
              sx={{ py: 1, flex: 1 }}
            >
              Step (1 Token)
            </Button>
            <InfoTip text={TOOLTIP_STEP} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              color={isPlaying ? 'secondary' : 'success'}
              onClick={togglePlay}
              disabled={(!inputText && !isPlaying) || (loading && !isPlaying)}
              sx={{ py: 1.5, fontWeight: 'bold', flex: 1 }}
            >
              {isPlaying ? 'Pause Auto-Generate' : 'Play Auto-Generate'}
            </Button>
            <InfoTip text={TOOLTIP_PLAY} />
          </Box>
        </Box>

        {latestLogprobs && latestLogprobs.length > 0 && (
          <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
              Top Candidates (Logprobs)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {latestLogprobs.map((item, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: idx === 0 ? '#e8f5e9' : '#f5f5f5',
                    p: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      mr: 1,
                      color: 'text.primary',
                    }}
                  >
                    &quot;{item.token}&quot;
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color={idx === 0 ? 'success.main' : 'text.secondary'}
                  >
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
