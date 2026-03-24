import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import ModuleHubCard from '../ModuleHubCard';
import { adventureModulesSorted } from '../registry';

export default function AdventuresIndexPage() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" color="primary" gutterBottom>
        Adventures
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        Guided, time-boxed projects—pick one and follow the steps on the lab machine.
      </Typography>
      <Grid container spacing={2}>
        {adventureModulesSorted.map(({ meta }) => (
          <Grid key={meta.slug} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
            <ModuleHubCard
              title={meta.title}
              description={meta.description}
              to={`/adventures/${meta.slug}`}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
