import React from 'react';
import { 
  Box, 
  Switch, 
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTheme } from '../../contexts/ThemeContext';
import { THEMES, getThemeNames, ThemeName } from '../../styles/themes';
import { SelectChangeEvent } from '@mui/material/Select';

export const ThemeSelector: React.FC = () => {
  const { 
    mode, 
    toggleColorMode,
    theme,
    currentTheme,
    setTheme,
  } = useTheme();

  const handleThemeChange = (event: SelectChangeEvent<string>) => {
    setTheme(event.target.value as ThemeName);
  };

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
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Theme</InputLabel>
          <Select
            value={currentTheme}
            onChange={handleThemeChange}
            label="Theme"
          >
            {getThemeNames().map((themeName) => (
              <MenuItem key={themeName} value={themeName}>
                {themeName.replace(/([A-Z])/g, ' $1').trim()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
