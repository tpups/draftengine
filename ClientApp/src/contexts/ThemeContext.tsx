import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { 
  Theme, 
  ThemeName, 
  DEFAULT_THEME, 
  THEMES,
  getTheme,
  createPaletteFromTheme,
  getNextTheme,
  getPreviousTheme,
} from '../styles/themes';

type ColorMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  currentTheme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  nextTheme: () => void;
  previousTheme: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  currentTheme: DEFAULT_THEME,
  setTheme: () => {},
  nextTheme: () => {},
  previousTheme: () => {},
  theme: THEMES[DEFAULT_THEME],
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ColorMode>(() => 
    (localStorage.getItem('colorMode') as ColorMode) || 'light'
  );

  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() =>
    (localStorage.getItem('themeName') as ThemeName) || DEFAULT_THEME
  );

  const theme = getTheme(currentTheme);

  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('colorMode', newMode);
  };

  const setTheme = (newTheme: ThemeName) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('themeName', newTheme);
  };

  const nextTheme = () => {
    const next = getNextTheme(currentTheme);
    setTheme(next);
  };

  const previousTheme = () => {
    const previous = getPreviousTheme(currentTheme);
    setTheme(previous);
  };

  const muiTheme = createTheme({
    palette: createPaletteFromTheme(theme, mode),
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: mode === 'light'
                ? theme.colors.action.hover.light
                : theme.colors.action.hover.dark,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: mode === 'light'
                ? theme.colors.action.hover.light
                : theme.colors.action.hover.dark,
            },
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ 
      mode, 
      toggleColorMode, 
      currentTheme,
      setTheme,
      nextTheme,
      previousTheme,
      theme,
    }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
