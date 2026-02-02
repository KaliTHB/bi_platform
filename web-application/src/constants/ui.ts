// File: web-application/src/constants/ui.ts
// UI and theme-related constants

export const THEME = {
  COLORS: {
    PRIMARY: {
      50: '#e3f2fd',
      100: '#bbdefb',
      500: '#2196f3',
      900: '#0d47a1',
    },
    SECONDARY: {
      50: '#fce4ec',
      500: '#e91e63',
      900: '#880e4f',
    },
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3',
  },
  
  SHADOWS: {
    LIGHT: '0 1px 3px rgba(0,0,0,0.12)',
    MEDIUM: '0 4px 6px rgba(0,0,0,0.16)',
    HEAVY: '0 10px 20px rgba(0,0,0,0.19)',
  },
} as const;

export const BREAKPOINTS = {
  XS: 0,
  SM: 600,
  MD: 960,
  LG: 1280,
  XL: 1920,
} as const;

export const LAYOUT = {
  HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 280,
  SIDEBAR_MINI_WIDTH: 56,
  FOOTER_HEIGHT: 48,
} as const;