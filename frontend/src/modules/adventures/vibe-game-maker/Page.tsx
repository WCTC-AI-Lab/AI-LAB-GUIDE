import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import { GAMES_SITE_URL, GAMES_SITE_TITLE, GAMES_SOURCE_REPO_URL } from './links';

const DESKTOP_SHORTCUT_IMAGE = '/images/ai-lab-games-desktop-shortcut.png';

function Cmd({ children, label }: { children: string; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
      <Box
        component="span"
        sx={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontWeight: 700,
          fontSize: '0.95rem',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 1.25,
          py: 0.5,
          borderRadius: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2.5, sm: 3.5 },
        height: '100%',
        borderRadius: 3,
        bgcolor: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.35rem',
          mb: 2,
        }}
      >
        {step}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Paper>
  );
}

export default function VibeGameMakerAdventurePage() {
  return (
    <Box sx={{ py: 4 }}>
      {/* ── Hero: title + arcade ── */}
      <Grid container spacing={3} alignItems="center" sx={{ mb: 5 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="h4" color="primary" sx={{ fontWeight: 800 }}>
            Make a Video Game
          </Typography>
          <Typography variant="body1" color="text.primary" sx={{ mt: 1, lineHeight: 1.7 }}>
            Build, iterate, and deploy your own game to the AI Lab Arcade.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <Link href={GAMES_SITE_URL} target="_blank" rel="noopener noreferrer">
              Visit the Arcade →
            </Link>
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
            Check out the Arcade
          </Typography>
          <Box
            sx={{
              width: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'grey.900',
            }}
          >
            <Box sx={{ position: 'relative', width: '100%', pt: '56.25%' }}>
              <Box
                component="iframe"
                src={GAMES_SITE_URL}
                title={`${GAMES_SITE_TITLE} — embedded preview`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* ── Steps section on a contrasting band ── */}
      <Box
        sx={{
          mx: { xs: -1, sm: -3 },
          px: { xs: 1, sm: 3 },
          py: 5,
          bgcolor: '#eef2f9',
          borderRadius: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
          How it works
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <StepCard step={1} title="Open the Project">
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Click the <strong>GAME ADVENTURE</strong> shortcut on the desktop. It opens the project in Cursor
                with the chat sidebar ready to go.
              </Typography>
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Box
                  component="img"
                  src={DESKTOP_SHORTCUT_IMAGE}
                  alt="GAME ADVENTURE desktop shortcut"
                  sx={{
                    maxWidth: 160,
                    width: '100%',
                    height: 'auto',
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: 'grey.200',
                  }}
                />
              </Box>
            </StepCard>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <StepCard step={2} title="Send a Start Command">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Cmd label="start a new game">/new-game</Cmd>
                <Cmd label="change one you started">/update-game</Cmd>
                <Cmd label="remix an existing game">/fork-game</Cmd>
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 2.5 }}>
                Type the command exactly and press Enter.
              </Typography>
            </StepCard>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <StepCard step={3} title="Deploy Your Game">
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                When you are happy with your game, type{' '}
                <Box
                  component="span"
                  sx={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  /finish
                </Box>{' '}
                and press Enter. Wait a few minutes, then open the <strong>Dev App</strong> shortcut on the desktop
                to see it live.
              </Typography>
            </StepCard>
          </Grid>
        </Grid>
      </Box>

      {GAMES_SOURCE_REPO_URL ? (
        <Box sx={{ mt: 4 }}>
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
