import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { theme } from './utils/theme';
import { Home } from './pages/Home';
import { AdminPanel } from './pages/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
          <AppBar position="static" sx={{ width: '100%' }}>
            <Toolbar sx={{ minHeight: '72px' }}>
              <Link to="/" style={{ textDecoration: 'none', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <img 
                  src="/engine-icon.svg" 
                  alt="Engine Logo" 
                  style={{ 
                    height: '58px', 
                    width: '58px',
                    marginRight: '16px'
                  }} 
                />
                <Typography variant="h6" sx={{ color: 'white' }}>
                  Hampio's Draft Engine
                </Typography>
              </Link>
              <Link to="/" style={{ textDecoration: 'none', marginRight: '16px' }}>
                <Button 
                  variant="contained"
                  sx={{ 
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  Home
                </Button>
              </Link>
              <Link to="/admin" style={{ textDecoration: 'none' }}>
                <Button 
                  variant="contained"
                  sx={{ 
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)'
                    }
                  }}
                >
                  Admin
                </Button>
              </Link>
            </Toolbar>
          </AppBar>
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </Box>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
