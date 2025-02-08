import React from 'react';
import { 
  Box, 
  Typography, 
  Switch, 
  IconButton, 
  Paper,
  Grid,
  Tooltip,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '../../contexts/ThemeContext';

const ThemePreview: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography variant="subtitle2">
        {theme.name}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: 1,
            backgroundColor: theme.preview.primary,
          }}
        />
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: 1,
            backgroundColor: theme.preview.secondary,
          }}
        />
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: 1,
            backgroundColor: theme.preview.accent,
          }}
        />
      </Box>
    </Box>
  );
};

export const ThemeSelector: React.FC = () => {
  const { 
    mode, 
    toggleColorMode, 
    previousTheme, 
    nextTheme,
    theme,
  } = useTheme();

  return (
    <Paper 
      sx={{ 
        p: 2,
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: mode === 'light' ? 'grey.200' : 'grey.800'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Previous Theme">
            <IconButton onClick={previousTheme} size="small">
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          
          <ThemePreview />

          <Tooltip title="Next Theme">
            <IconButton onClick={nextTheme} size="small">
              <ChevronRightIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LightModeIcon 
            sx={{ 
              color: mode === 'light' ? theme.colors.primary.main : theme.colors.text.disabled.light,
              transition: 'color 0.3s ease'
            }} 
          />
          <Switch
            checked={mode === 'dark'}
            onChange={toggleColorMode}
            color="primary"
          />
          <DarkModeIcon 
            sx={{ 
              color: mode === 'dark' ? theme.colors.primary.main : theme.colors.text.disabled.light,
              transition: 'color 0.3s ease'
            }} 
          />
        </Box>
      </Box>
    </Paper>
  );
};
