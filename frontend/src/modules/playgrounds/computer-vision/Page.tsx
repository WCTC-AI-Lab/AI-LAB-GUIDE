import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function ComputerVisionPlaygroundPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        Computer vision playground
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
        This area is coming soon. Here you&apos;ll be able to run short vision demos and experiments
        on the lab machine.
      </Typography>
    </Box>
  );
}
