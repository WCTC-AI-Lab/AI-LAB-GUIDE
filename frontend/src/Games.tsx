import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

export default function Games() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h3" color="primary" gutterBottom>
        Games
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This is where we&apos;ll talk about how you can vibe code games and put them into this website!
      </Typography>
      <Typography variant="body1">
        <Link
          href="https://zealous-coast-060765e0f.2.azurestaticapps.net"
          target="_blank"
          rel="noopener noreferrer"
        >
          Play games here →
        </Link>
      </Typography>
    </Box>
  );
}
