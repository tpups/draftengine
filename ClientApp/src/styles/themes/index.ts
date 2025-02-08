import { Theme } from './baseTheme';
export * from './baseTheme';

import classicBaseball from './classicBaseball';
import modernAnalytics from './modernAnalytics';
import vintageBallpark from './vintageBallpark';
import performanceMetrics from './performanceMetrics';
import wfbc from './wfbc';

export const THEMES = {
  classicBaseball,
  modernAnalytics,
  vintageBallpark,
  performanceMetrics,
  wfbc,
} as const;

export type ThemeName = keyof typeof THEMES;

export const DEFAULT_THEME: ThemeName = 'classicBaseball';

export const getTheme = (name: ThemeName): Theme => {
  return THEMES[name];
};

export const getThemeNames = (): ThemeName[] => {
  return Object.keys(THEMES) as ThemeName[];
};

export const getNextTheme = (currentTheme: ThemeName): ThemeName => {
  const themes = getThemeNames();
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  return themes[nextIndex];
};

export const getPreviousTheme = (currentTheme: ThemeName): ThemeName => {
  const themes = getThemeNames();
  const currentIndex = themes.indexOf(currentTheme);
  const previousIndex = (currentIndex - 1 + themes.length) % themes.length;
  return themes[previousIndex];
};
