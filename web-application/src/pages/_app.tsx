import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store, persistor } from '../store';
import { AuthProvider } from '../components/providers/AuthProvider';
import { WorkspaceProvider } from '../components/providers/WorkspaceProvider';
import { NotificationProvider } from '../components/providers/NotificationProvider';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import '../styles/globals.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <NotificationProvider>
              <AuthProvider>
                <WorkspaceProvider>
                  <Component {...pageProps} />
                </WorkspaceProvider>
              </AuthProvider>
            </NotificationProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}