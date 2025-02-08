import { Box, AppBar, Toolbar, Typography, Button, IconButton, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from './contexts/ThemeContext';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { AdminPanel } from './pages/AdminPanel';
import { DebugLogWindow } from './components/DebugLogWindow';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useState } from 'react';
import { debugService } from './services/debugService';

import { ThemeProvider } from './contexts/ThemeContext';

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname === '/admin';
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const muiTheme = useMuiTheme();
  const { theme } = useTheme();
  
  return (
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
                backgroundColor: isHome ? theme.colors.action.selected.light : theme.colors.action.hover.light,
                cursor: 'pointer',
                boxShadow: isHome ? '0 0 10px rgba(255, 255, 255, 0.2)' : 'none',
                '&:hover': {
                  backgroundColor: isHome ? theme.colors.action.selected.light : theme.colors.action.hover.light
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
                backgroundColor: isAdmin ? theme.colors.action.selected.light : theme.colors.action.hover.light,
                cursor: 'pointer',
                boxShadow: isAdmin ? '0 0 10px rgba(255, 255, 255, 0.2)' : 'none',
                '&:hover': {
                  backgroundColor: isAdmin ? theme.colors.action.selected.light : theme.colors.action.hover.light
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
              color: showDebugLogs ? theme.colors.pickState.current : 'white',
              '&:hover': {
                backgroundColor: theme.colors.action.hover.light
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
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
