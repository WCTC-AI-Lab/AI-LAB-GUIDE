import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { GAMES_SITE_URL, GAMES_SOURCE_REPO_URL } from './links';

export default function VibeGameMakerAdventurePage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        Vibe-coded game maker
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        You&apos;ll use the lab machine and an editor to build a small browser game. Each new game lives
        as its own file in the <strong>games project</strong> (separate repository from this guide). When
        you&apos;re ready, the games site picks them up so anyone can play.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        On the lab machine
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxWidth: 640 }}>
        Exact commands depend on how the games repo is set up—follow its README first. Typical flow:
      </Typography>
      <Stack component="ol" spacing={1} sx={{ pl: 3, maxWidth: 640, m: 0 }}>
        <Typography component="li" variant="body2" color="text.secondary">
          Open a terminal on this machine and clone or open the games repository.
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Install dependencies and start the project dev server (see games repo README).
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Add a new game as a new file where that project expects it, then refresh locally to try it.
        </Typography>
        <Typography component="li" variant="body2" color="text.secondary">
          Commit and push when you&apos;re happy; deployment is handled from the games repo.
        </Typography>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Play games
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Hosted site (different repo / deployment from this guide):
      </Typography>
      <Typography variant="body1">
        <Link href={GAMES_SITE_URL} target="_blank" rel="noopener noreferrer">
          Open games site →
        </Link>
      </Typography>

      {GAMES_SOURCE_REPO_URL ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Source repository
          </Typography>
          <Typography variant="body1">
            <Link href={GAMES_SOURCE_REPO_URL} target="_blank" rel="noopener noreferrer">
              Games project on GitHub →
            </Link>
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
