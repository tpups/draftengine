import { Theme } from './baseTheme';

// Performance Metrics color palette
const palette = {
  navy: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#172554',  // Performance navy
    600: '#13204A',
    700: '#0F1B40',
    800: '#0B1636',
    900: '#07112C',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#475569',  // Stat tracking grey
    600: '#334155',
    700: '#1E293B',
    800: '#0F172A',
    900: '#020617',
  },
  cyan: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',  // Data analysis cyan
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
  },
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#EA580C',  // Performance orange
    600: '#C2410C',
    700: '#9A3412',
    800: '#7C2D12',
    900: '#7C2D12',
  }
};

const performanceMetrics: Theme = {
  name: 'Performance Metrics',
  description: 'Professional design focused on data analysis and performance tracking',
  preview: {
    primary: palette.navy[500],
    secondary: palette.cyan[500],
    accent: palette.orange[500],
  },
  colors: {
    primary: {
      main: palette.navy[500],
      light: palette.navy[300],
      dark: palette.navy[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: palette.cyan[500],
      light: palette.cyan[300],
      dark: palette.cyan[700],
      contrastText: '#ffffff',
    },
    background: {
      default: {
        light: '#ffffff',
        dark: palette.navy[900],
      },
      paper: {
        light: palette.slate[50],
        dark: palette.navy[800],
      },
      elevated: {
        light: '#ffffff',
        dark: palette.navy[700],
      },
    },
    text: {
      primary: {
        light: palette.slate[900],
        dark: palette.slate[50],
      },
      secondary: {
        light: palette.slate[700],
        dark: palette.slate[300],
      },
      disabled: {
        light: palette.slate[400],
        dark: palette.slate[600],
      },
    },
    action: {
      active: {
        light: palette.navy[600],
        dark: palette.cyan[300],
      },
      hover: {
        light: 'rgba(23, 37, 84, 0.04)',  // navy[500] with opacity
        dark: 'rgba(103, 232, 249, 0.08)',  // cyan[300] with opacity
      },
      selected: {
        light: 'rgba(23, 37, 84, 0.08)',
        dark: 'rgba(103, 232, 249, 0.16)',
      },
      disabled: {
        light: palette.slate[300],
        dark: palette.slate[700],
      },
    },
    pickState: {
      selected: {
        light: palette.navy[600],
        dark: palette.navy[500],
      },
      current: {
        light: palette.orange[600],
        dark: palette.orange[500],
      },
      active: {
        light: palette.cyan[600],
        dark: palette.cyan[500],
      },
      available: {
        light: '#ffffff',
        dark: palette.navy[800],
      },
      unavailable: {
        light: palette.slate[200],
        dark: palette.navy[600],
      },
    },
  },
};

export default performanceMetrics;
