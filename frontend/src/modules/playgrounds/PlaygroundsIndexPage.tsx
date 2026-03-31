import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import ModuleHubCard from '../ModuleHubCard';
import { playgroundModulesSorted } from '../registry';

export default function PlaygroundsIndexPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        Playgrounds
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        Quick, low-commitment ways to try the machine—pick one to open.
      </Typography>
      <Grid container spacing={2}>
        {playgroundModulesSorted.map(({ meta }) => (
          <Grid key={meta.slug} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
            <ModuleHubCard
              title={meta.title}
              description={meta.description}
              to={`/playgrounds/${meta.slug}`}
              thumbnailUrl={meta.thumbnailUrl}
              thumbnailAlt={meta.thumbnailAlt}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
