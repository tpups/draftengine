import { Theme } from './baseTheme';

// Vintage Ballpark color palette
const palette = {
  brick: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#B91C1C',  // Stadium seat red
    600: '#991B1B',
    700: '#7F1D1D',
    800: '#671D1D',
    900: '#4C1D1D',
  },
  sage: {
    50: '#F1F8F1',
    100: '#DCEFDC',
    200: '#BBE1BB',
    300: '#92CD92',
    400: '#69B569',
    500: '#2F572F',  // Aged scoreboard green
    600: '#294D29',
    700: '#234323',
    800: '#1C381C',
    900: '#162E16',
  },
  wood: {
    50: '#FDFAF7',
    100: '#FAF2EA',
    200: '#F5E1D0',
    300: '#EBC8A8',
    400: '#E0A87A',
    500: '#8B4513',  // Warm wood grain
    600: '#7A3D11',
    700: '#69350E',
    800: '#582D0C',
    900: '#47250A',
  },
  cream: {
    50: '#FFFCF7',
    100: '#FFF8ED',
    200: '#FFF1DB',
    300: '#FFE4C0',
    400: '#FFD7A5',
    500: '#F5DEB3',  // Vintage paper
    600: '#DCC59F',
    700: '#C3AD8B',
    800: '#AA9477',
    900: '#917B63',
  }
};

const vintageBallpark: Theme = {
  name: 'Vintage Ballpark',
  description: 'Nostalgic design inspired by classic baseball stadiums and memorabilia',
  preview: {
    primary: palette.brick[500],
    secondary: palette.sage[500],
    accent: palette.wood[500],
  },
  colors: {
    primary: {
      main: palette.brick[500],
      light: palette.brick[300],
      dark: palette.brick[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.sage[500],
      light: palette.sage[300],
      dark: palette.sage[700],
      contrastText: '#ffffff',
    },
    background: {
      default: {
        light: palette.cream[50],
        dark: palette.wood[900],
      },
      paper: {
        light: palette.cream[100],
        dark: palette.wood[800],
      },
      elevated: {
        light: '#ffffff',
        dark: palette.wood[700],
      },
    },
    text: {
      primary: {
        light: palette.wood[900],
        dark: palette.cream[100],
      },
      secondary: {
        light: palette.wood[700],
        dark: palette.cream[300],
      },
      disabled: {
        light: palette.cream[700],
        dark: palette.wood[600],
      },
    },
    action: {
      active: {
        light: palette.brick[600],
        dark: palette.cream[200],
      },
      hover: {
        light: 'rgba(185, 28, 28, 0.04)',  // brick[500] with opacity
        dark: 'rgba(255, 241, 219, 0.08)',  // cream[200] with opacity
      },
      selected: {
        light: 'rgba(185, 28, 28, 0.08)',
        dark: 'rgba(255, 241, 219, 0.16)',
      },
      disabled: {
        light: palette.cream[400],
        dark: palette.wood[600],
      },
    },
    pickState: {
      selected: {
        light: palette.brick[600],
        dark: palette.brick[500],
      },
      current: {
        light: palette.sage[600],
        dark: palette.sage[500],
      },
      active: {
        light: palette.brick[400],
        dark: palette.brick[300],
      },
      available: {
        light: palette.cream[50],
        dark: palette.wood[800],
      },
      unavailable: {
        light: palette.cream[300],
        dark: palette.wood[600],
      },
    },
  },
};

export default vintageBallpark;
