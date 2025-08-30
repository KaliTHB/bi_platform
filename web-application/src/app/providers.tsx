'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { store } from '../store';
import { theme } from '../styles/theme';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { NotificationCenter } from '../components/shared/NotificationCenter';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NotificationCenter />
          {children}
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}