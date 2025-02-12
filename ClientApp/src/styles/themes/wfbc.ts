import { Theme } from './baseTheme';

// WFBC color palette
const palette = {
  blue: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#07689f',  // Deep blue
    600: '#065d8f',
    700: '#05527f',
    800: '#04476f',
    900: '#13293d',  // Navy blue
  },
  red: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#bf211e',  // Signal red
    600: '#ab1d1b',
    700: '#971918',
    800: '#831515',
    900: '#6f1212',
  },
  yellow: {
    50: '#FFFDE7',
    100: '#FFF9C4',
    200: '#FFF59D',
    300: '#FFF176',
    400: '#FFEE58',
    500: '#ffc93c',  // Bright yellow
    600: '#e6b535',
    700: '#cca12f',
    800: '#b38d28',
    900: '#997922',
  },
  grey: {
    50: '#fdfffc',  // Soft white
    100: '#F5F7F9',
    200: '#E9EEF2',
    300: '#b9cdda',  // Light steel blue
    400: '#9db5b2',  // Muted sea green
    500: '#8da3a0',
    600: '#7d918e',
    700: '#6d7f7c',
    800: '#5d6d6a',
    900: '#02111b',  // Deep navy/black
  }
};

const wfbc: Theme = {
  name: 'WFBC',
  description: 'World Fantasy Baseball Classic theme with maritime-inspired colors',
  preview: {
    primary: palette.blue[500],
    secondary: palette.blue[900],
    accent: palette.blue[500],
  },
  colors: {
    primary: {
      main: palette.blue[500], // Deep blue
      light: palette.blue[400], // Lighter blue for hover states
      dark: palette.blue[700], // Darker blue for active states
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.blue[900],
      light: palette.blue[700],
      dark: palette.blue[900],
      contrastText: '#ffffff',
    },
    background: {
      default: {
        light: '#f0f4f8', // More muted maritime blue background
        dark: '#0a1929',
      },
      paper: {
        light: '#ffffff', // Pure white for better contrast with content
        dark: '#0d2339',
      },
      elevated: {
        light: '#e8f1f8', // Slightly darker blue for better row contrast
        dark: '#0d2339',
      },
    },
    text: {
      primary: {
        light: '#0f172a', // Darker navy for better contrast
        dark: '#e2e8f0', // Slightly muted white for better readability
      },
      secondary: {
        light: '#1e3a5f', // Rich navy for light mode
        dark: '#cbd5e1', // Muted blue-white for better balance
      },
      disabled: {
        light: '#64748b', // Darker muted blue for better contrast
        dark: '#64748b', // More muted blue for better hierarchy
      },
      onHighlight: {
        light: palette.blue[900], // Dark blue for contrast on yellow
        dark: '#ffffff',
      },
    },
    action: {
      active: {
        light: palette.blue[500], // Deep blue for active states
        dark: palette.blue[400],
      },
      hover: {
        light: 'rgba(7, 104, 159, 0.12)', // Stronger hover effect
        dark: 'rgba(185, 205, 218, 0.25)',
      },
      selected: {
        light: 'rgba(7, 104, 159, 0.14)', // Deep blue with opacity for selected
        dark: 'rgba(185, 205, 218, 0.30)',
      },
      disabled: {
        light: '#94a3b8', // Muted blue-grey
        dark: '#2a5475',
      },
      border: {
        light: '#cbd5e1', // Border color for light mode
        dark: '#1e293b',
      },
    },
    pickState: {
      selected: {
        light: palette.red[500], // Red for delete/danger actions
        dark: palette.red[400],
      },
      current: {
        light: palette.blue[600], // Maritime blue for current states
        dark: palette.blue[300], // Medium-light blue for better contrast in dark mode
      },
      active: {
        light: palette.yellow[500], // Bright yellow for active pick
        dark: palette.yellow[700], // More muted yellow for dark mode
      },
      available: {
        light: '#ffffff',
        dark: '#0f2537',
      },
      unavailable: {
        light: '#e2e8f0',
        dark: '#061219',
      },
      traded: {
        light: palette.blue[200], // Light blue for traded picks
        dark: palette.blue[800],
      },
    },
  },
};

export default wfbc;
