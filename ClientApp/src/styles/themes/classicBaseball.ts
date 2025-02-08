import { Theme } from './baseTheme';

// Classic Baseball color palette
const palette = {
  navy: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#1E3A8A',  // Deep navy
    600: '#1A327A',
    700: '#162B6A',
    800: '#12245A',
    900: '#0E1D4A',
  },
  leather: {
    50: '#FDF8F6',
    100: '#F9EBE4',
    200: '#F5D9CC',
    300: '#F0BBA3',
    400: '#EBA07E',
    500: '#8B4513',  // Baseball glove brown
    600: '#7A3D11',
    700: '#69350E',
    800: '#582D0C',
    900: '#47250A',
  },
  chalk: {
    50: '#FFFFFF',
    100: '#FAFAFA',
    200: '#F5F5F5',
    300: '#E8E8E8',
    400: '#D9D9D9',
    500: '#BFBFBF',
    600: '#A6A6A6',
    700: '#8C8C8C',
    800: '#737373',
    900: '#595959',
  },
  grass: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#115E1F',  // Baseball field green
    600: '#0F5119',
    700: '#0C4414',
    800: '#0A370F',
    900: '#072A0A',
  }
};

const classicBaseball: Theme = {
  name: 'Classic Baseball',
  description: 'Traditional baseball aesthetics with deep navy, leather brown, and field green accents',
  preview: {
    primary: palette.navy[500],
    secondary: palette.leather[500],
    accent: palette.grass[500],
  },
  colors: {
    primary: {
      main: palette.navy[500],
      light: palette.navy[300],
      dark: palette.navy[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.leather[500],
      light: palette.leather[300],
      dark: palette.leather[700],
      contrastText: '#ffffff',
    },
    background: {
      default: {
        light: palette.chalk[50],
        dark: palette.navy[900],
      },
      paper: {
        light: '#ffffff',
        dark: palette.navy[800],
      },
      elevated: {
        light: '#ffffff',
        dark: palette.navy[700],
      },
    },
    text: {
      primary: {
        light: palette.navy[900],
        dark: palette.chalk[50],
      },
      secondary: {
        light: palette.navy[700],
        dark: palette.chalk[400],
      },
      disabled: {
        light: palette.chalk[500],
        dark: palette.chalk[700],
      },
    },
    action: {
      active: {
        light: palette.navy[700],
        dark: palette.chalk[100],
      },
      hover: {
        light: 'rgba(30, 58, 138, 0.04)',  // navy[500] with opacity
        dark: 'rgba(255, 255, 255, 0.08)',
      },
      selected: {
        light: 'rgba(30, 58, 138, 0.08)',  // navy[500] with opacity
        dark: 'rgba(255, 255, 255, 0.16)',
      },
      disabled: {
        light: palette.chalk[300],
        dark: palette.navy[600],
      },
    },
    pickState: {
      selected: {
        light: palette.navy[600],
        dark: palette.navy[500],
      },
      current: {
        light: palette.grass[600],
        dark: palette.grass[500],
      },
      active: {
        light: palette.navy[400],
        dark: palette.navy[300],
      },
      available: {
        light: '#ffffff',
        dark: palette.navy[800],
      },
      unavailable: {
        light: palette.chalk[200],
        dark: palette.navy[600],
      },
    },
  },
};

export default classicBaseball;
