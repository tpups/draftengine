import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Button, IconButton } from '@mui/material';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { theme } from './utils/theme';
import { Home } from './pages/Home';
import { AdminPanel } from './pages/AdminPanel';
import { DebugLogWindow } from './components/DebugLogWindow';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useState } from 'react';
import { debugService } from './services/debugService';

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname === '/admin';
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
        <AppBar position="static" sx={{ width: '100%', cursor: 'default' }}>
          <Toolbar sx={{ minHeight: '72px', cursor: 'default' }}>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
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
            </Box>
            <Link to="/" style={{ textDecoration: 'none', marginRight: '16px' }}>
              <Button 
                variant="contained"
                sx={{ 
                  color: 'white',
                  backgroundColor: isHome ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  boxShadow: isHome ? '0 0 10px rgba(255, 255, 255, 0.2)' : 'none',
                  '&:hover': {
                    backgroundColor: isHome ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                Home
              </Button>
            </Link>
            <Link to="/admin" style={{ textDecoration: 'none', marginRight: '16px' }}>
              <Button 
                variant="contained"
                sx={{ 
                  color: 'white',
                  backgroundColor: isAdmin ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  boxShadow: isAdmin ? '0 0 10px rgba(255, 255, 255, 0.2)' : 'none',
                  '&:hover': {
                    backgroundColor: isAdmin ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                Admin
              </Button>
            </Link>
            <IconButton
              onClick={() => {
                const newState = !showDebugLogs;
                setShowDebugLogs(newState);
                if (newState) {
                  debugService.enablePolling();
                } else {
                  debugService.disablePolling();
                }
              }}
              sx={{ 
                color: showDebugLogs ? 'warning.main' : 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              title={showDebugLogs ? 'Hide Debug Logs' : 'Show Debug Logs'}
            >
              <BugReportIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>

        {showDebugLogs && (
          <DebugLogWindow 
            onClose={() => {
              setShowDebugLogs(false);
              debugService.disablePolling();
            }} 
          />
        )}
      </Box>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
