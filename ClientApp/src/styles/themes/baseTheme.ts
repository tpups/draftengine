import { PaletteOptions } from '@mui/material/styles';

export interface ThemeColors {
  primary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  secondary: {
    main: string;
    light: string;
    dark: string;
    contrastText: string;
  };
  background: {
    default: {
      light: string;
      dark: string;
    };
    paper: {
      light: string;
      dark: string;
    };
    elevated: {
      light: string;
      dark: string;
    };
  };
    text: {
      primary: {
        light: string;
        dark: string;
      };
      secondary: {
        light: string;
        dark: string;
      };
      disabled: {
        light: string;
        dark: string;
      };
      onHighlight?: {
        light: string;
        dark: string;
      };
    };
  action: {
    active: {
      light: string;
      dark: string;
    };
    hover: {
      light: string;
      dark: string;
    };
    selected: {
      light: string;
      dark: string;
    };
    disabled: {
      light: string;
      dark: string;
    };
    border?: {
      light: string;
      dark: string;
    };
  };
  pickState: {
    selected: {
      light: string;
      dark: string;
    };
    current: {
      light: string;
      dark: string;
    };
    active: {
      light: string;
      dark: string;
    };
    available: {
      light: string;
      dark: string;
    };
    unavailable: {
      light: string;
      dark: string;
    };
  };
}

export interface Theme {
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
  colors: ThemeColors;
}

export const createPaletteFromTheme = (theme: Theme, mode: 'light' | 'dark'): PaletteOptions => ({
  mode,
  primary: theme.colors.primary,
  secondary: theme.colors.secondary,
  background: {
    default: mode === 'light' 
      ? theme.colors.background.default.light 
      : theme.colors.background.default.dark,
    paper: mode === 'light'
      ? theme.colors.background.paper.light
      : theme.colors.background.paper.dark,
  },
  text: {
    primary: mode === 'light'
      ? theme.colors.text.primary.light
      : theme.colors.text.primary.dark,
    secondary: mode === 'light'
      ? theme.colors.text.secondary.light
      : theme.colors.text.secondary.dark,
    disabled: mode === 'light'
      ? theme.colors.text.disabled.light
      : theme.colors.text.disabled.dark,
  },
  action: {
    active: mode === 'light'
      ? theme.colors.action.active.light
      : theme.colors.action.active.dark,
    hover: mode === 'light'
      ? theme.colors.action.hover.light
      : theme.colors.action.hover.dark,
    selected: mode === 'light'
      ? theme.colors.action.selected.light
      : theme.colors.action.selected.dark,
    disabled: mode === 'light'
      ? theme.colors.action.disabled.light
      : theme.colors.action.disabled.dark,
  },
});
