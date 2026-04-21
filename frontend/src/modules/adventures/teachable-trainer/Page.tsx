import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

const STREAMLIT_URL = 'http://localhost:8501';

export default function TeachableTrainerPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        mx: { xs: -1, sm: -3 },
        mb: -3,
      }}
    >
      <Box
        component="iframe"
        src={STREAMLIT_URL}
        title="Teachable Trainer"
        allow="camera"
        sx={{
          flex: 1,
          width: '100%',
          border: 0,
        }}
      />
      <noscript>
        <Typography variant="body2" sx={{ p: 2 }}>
          Teachable Trainer runs at{' '}
          <a href={STREAMLIT_URL}>{STREAMLIT_URL}</a>
        </Typography>
      </noscript>
    </Box>
  );
}
