import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ModuleHubCard from './modules/ModuleHubCard';
import { LAB_HARDWARE_SPEC } from './labHardwareSpec';
import { adventureModulesSorted, playgroundModulesSorted } from './modules/registry';

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function HomePage() {
  const { gpuType, vramGigabytes, flopsFp32, cpuModel, systemRamGigabytes } = LAB_HARDWARE_SPEC;
  const featuredPlayground = playgroundModulesSorted[0];
  const featuredAdventure = adventureModulesSorted[0];

  return (
    <Box sx={{ py: { xs: 2, sm: 4 } }}>
      {/* ── Hero + specs ── */}
      <Grid container spacing={3} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h3" color="primary" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
            Welcome to the AI LAB
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ mt: 1.5, fontWeight: 400, color: 'text.secondary', maxWidth: 520 }}
          >
            You are on a high-end AI-accelerated computer.
          </Typography>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            elevation={2}
            sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff' }}
            component="aside"
            aria-label="Computer hardware"
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
              This computer
            </Typography>
            <Stack spacing={1.5}>
              <SpecRow label="GPU" value={gpuType} />
              <Box sx={{ display: 'flex', gap: 4 }}>
                <SpecRow label="VRAM" value={`${vramGigabytes} GB`} />
                <SpecRow label="Compute" value={flopsFp32} />
              </Box>
              <SpecRow label="CPU" value={cpuModel} />
              <SpecRow label="RAM" value={`${systemRamGigabytes} GB`} />
            </Stack>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 2,
                fontWeight: 600,
                color: 'warning.dark',
                bgcolor: 'warning.light',
                px: 1.25,
                py: 0.75,
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              Computer clears data on restart
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── CTA section on a contrasting band ── */}
      <Box
        sx={{
          mx: { xs: -1, sm: -3 },
          px: { xs: 1, sm: 3 },
          py: 5,
          mt: 5,
          bgcolor: '#eef2f9',
          borderRadius: 3,
        }}
      >
        <Grid container spacing={3}>
          {/* Playgrounds */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                bgcolor: '#fff',
              }}
            >
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Explore a Playground
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary', lineHeight: 1.6 }}>
                Playgrounds are self-contained pages. You can open one and explore AI ideas directly.
              </Typography>
              {featuredPlayground ? (
                <Box sx={{ mt: 2.5, flex: 1 }}>
                  <ModuleHubCard
                    title={featuredPlayground.meta.title}
                    description={featuredPlayground.meta.description}
                    to={`/playgrounds/${featuredPlayground.meta.slug}`}
                    thumbnailUrl={featuredPlayground.meta.thumbnailUrl}
                    thumbnailAlt={featuredPlayground.meta.thumbnailAlt}
                  />
                </Box>
              ) : null}
              <Button
                component={RouterLink}
                to="/playgrounds"
                variant="contained"
                size="large"
                fullWidth
                sx={{ mt: 2.5, py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                See all playgrounds
              </Button>
            </Paper>
          </Grid>

          {/* Adventures */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                bgcolor: '#fff',
              }}
            >
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Try an Adventure
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary', lineHeight: 1.6 }}>
                Adventures are guided projects. You start from scratch and build something step by step.
              </Typography>
              {featuredAdventure ? (
                <Box sx={{ mt: 2.5, flex: 1 }}>
                  <ModuleHubCard
                    title={featuredAdventure.meta.title}
                    description={featuredAdventure.meta.description}
                    to={`/adventures/${featuredAdventure.meta.slug}`}
                    thumbnailUrl={featuredAdventure.meta.thumbnailUrl}
                    thumbnailAlt={featuredAdventure.meta.thumbnailAlt}
                  />
                </Box>
              ) : null}
              <Button
                component={RouterLink}
                to="/adventures"
                variant="contained"
                size="large"
                fullWidth
                sx={{ mt: 2.5, py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                See all adventures
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
