import { Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';
import PlaygroundsIndexPage from './modules/playgrounds/PlaygroundsIndexPage';
import AdventuresIndexPage from './modules/adventures/AdventuresIndexPage';
import NavHoverGroup from './NavHoverGroup';
import {
  playgroundModules,
  adventureModules,
  playgroundModulesSorted,
  adventureModulesSorted,
  LLMExplorePage,
  VibeGameMakerAdventurePage,
  type RegisteredModule,
} from './modules/registry';

const SUSPENSE_FALLBACK_MIN_HEIGHT_PX = 240;

function Home() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h3" color="primary" gutterBottom>
        Welcome to the AI Lab Guide
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
        This site is your entry point to the lab: quick playgrounds to try the machine, and short
        adventures you can finish in about half an hour. Use the bar above to open a hub or jump
        straight into a module.
      </Typography>
    </Box>
  );
}

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: SUSPENSE_FALLBACK_MIN_HEIGHT_PX,
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      {children}
    </Suspense>
  );
}

function moduleDetailRoutes(segment: 'playgrounds' | 'adventures', modules: RegisteredModule[]) {
  return modules.map(({ meta, Page }) => (
    <Route
      key={`${segment}-${meta.slug}`}
      path={`/${segment}/${meta.slug}`}
      element={
        <PageSuspense>
          <Page />
        </PageSuspense>
      }
    />
  ));
}

function App() {
  const vibeGameMakerRoute = (
    <PageSuspense>
      <VibeGameMakerAdventurePage />
    </PageSuspense>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#e3eafc' }}>
      <Router>
        <AppBar position="static" sx={{ bgcolor: '#1a237e', width: '100vw', left: 0 }}>
          <Toolbar sx={{ overflow: 'visible' }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              AI Lab
            </Typography>
            <Button color="inherit" component={Link} to="/">Home</Button>
            <NavHoverGroup
              label="Playgrounds"
              hubTo="/playgrounds"
              links={playgroundModulesSorted.map(({ meta }) => ({
                label: meta.title,
                to: `/playgrounds/${meta.slug}`,
              }))}
            />
            <NavHoverGroup
              label="Adventures"
              hubTo="/adventures"
              links={adventureModulesSorted.map(({ meta }) => ({
                label: meta.title,
                to: `/adventures/${meta.slug}`,
              }))}
            />
          </Toolbar>
        </AppBar>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Container maxWidth="md" sx={{ bgcolor: '#fff', minHeight: '80vh', mt: 4, mb: 4, borderRadius: 2, boxShadow: 2, px: { xs: 1, sm: 3 } }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/playgrounds" element={<PlaygroundsIndexPage />} />
              <Route path="/adventures" element={<AdventuresIndexPage />} />
              <Route
                path="/llm-explore"
                element={
                  <PageSuspense>
                    <LLMExplorePage />
                  </PageSuspense>
                }
              />
              {moduleDetailRoutes('playgrounds', playgroundModules)}
              {moduleDetailRoutes('adventures', adventureModules)}
              <Route path="/games" element={vibeGameMakerRoute} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </Box>
  );
}

export default App;
