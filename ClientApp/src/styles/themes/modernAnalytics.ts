import { Theme } from './baseTheme';

// Modern Analytics color palette
const palette = {
  charcoal: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#1A202C',  // Deep charcoal
    600: '#0F172A',
    700: '#0D1424',
    800: '#0B101E',
    900: '#090C18',
  },
  dataBlue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#0284C7',  // Data visualization blue
    600: '#0369A1',
    700: '#075985',
    800: '#0C4A6E',
    900: '#0F3A58',
  },
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',  // Electric teal
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',  // Data highlight orange
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  }
};

const modernAnalytics: Theme = {
  name: 'Modern Analytics',
  description: 'Data-driven design with crisp charcoal, vibrant blue, and electric teal accents',
  preview: {
    primary: palette.dataBlue[500],
    secondary: palette.teal[500],
    accent: palette.orange[500],
  },
  colors: {
    primary: {
      main: palette.dataBlue[500],
      light: palette.dataBlue[300],
      dark: palette.dataBlue[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.teal[500],
      light: palette.teal[300],
      dark: palette.teal[700],
      contrastText: '#ffffff',
    },
    background: {
      default: {
        light: '#ffffff',
        dark: palette.charcoal[900],
      },
      paper: {
        light: palette.charcoal[50],
        dark: palette.charcoal[800],
      },
      elevated: {
        light: '#ffffff',
        dark: palette.charcoal[700],
      },
    },
    text: {
      primary: {
        light: palette.charcoal[900],
        dark: palette.charcoal[50],
      },
      secondary: {
        light: palette.charcoal[700],
        dark: palette.charcoal[300],
      },
      disabled: {
        light: palette.charcoal[400],
        dark: palette.charcoal[600],
      },
    },
    action: {
      active: {
        light: palette.dataBlue[600],
        dark: palette.dataBlue[300],
      },
      hover: {
        light: 'rgba(2, 132, 199, 0.04)',  // dataBlue[500] with opacity
        dark: 'rgba(147, 197, 253, 0.08)',  // dataBlue[300] with opacity
      },
      selected: {
        light: 'rgba(2, 132, 199, 0.08)',
        dark: 'rgba(147, 197, 253, 0.16)',
      },
      disabled: {
        light: palette.charcoal[300],
        dark: palette.charcoal[600],
      },
    },
    pickState: {
      selected: {
        light: palette.dataBlue[600],
        dark: palette.dataBlue[500],
      },
      current: {
        light: palette.orange[600],
        dark: palette.orange[500],
      },
      active: {
        light: palette.teal[600],
        dark: palette.teal[500],
      },
      available: {
        light: '#ffffff',
        dark: palette.charcoal[800],
      },
      unavailable: {
        light: palette.charcoal[200],
        dark: palette.charcoal[600],
      },
    },
  },
};

export default modernAnalytics;
