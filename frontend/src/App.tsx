
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import LLMExplore from './LLMExplore';
import Games from './Games';

function Home() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h3" color="primary" gutterBottom>
        Welcome to the AI Lab Frontend
      </Typography>
      <Typography variant="body1" color="text.secondary">
        This is a minimal React + Flask monorepo starter. Use the navigation bar to explore features.
      </Typography>
    </Box>
  );
}



function App() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#e3eafc' }}>
      <Router>
        <AppBar position="static" sx={{ bgcolor: '#1a237e', width: '100vw', left: 0 }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              AI Lab
            </Typography>
            <Button color="inherit" component={Link} to="/">Home</Button>
            <Button color="inherit" component={Link} to="/llm-explore">LLM Explore</Button>
            <Button color="inherit" component={Link} to="/games">Games</Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Container maxWidth="md" sx={{ bgcolor: '#fff', minHeight: '80vh', mt: 4, mb: 4, borderRadius: 2, boxShadow: 2, px: { xs: 1, sm: 3 } }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/llm-explore" element={<LLMExplore />} />
              <Route path="/games" element={<Games />} />
            </Routes>
          </Container>
        </Box>
      </Router>
    </Box>
  );
}

export default App;
