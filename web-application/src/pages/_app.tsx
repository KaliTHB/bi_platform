// web-application/src/pages/_app.tsx
import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { store, persistor } from '@/store';
import { restoreAuth } from '@/store/slices/authSlice';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import '@/styles/globals.css';

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: 12,
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },
        elevation2: {
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        },
        elevation3: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Loading component for PersistGate
const PersistGateLoading: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  }}>
    <div style={{
      width: 48,
      height: 48,
      border: '4px solid rgba(255, 255, 255, 0.3)',
      borderTop: '4px solid #ffffff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: 16,
    }} />
    <p style={{ 
      fontSize: '1.1rem', 
      fontWeight: 500,
      margin: 0,
      fontFamily: 'Inter, sans-serif'
    }}>
      Loading BI Platform...
    </p>
    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Auth initialization component
function AuthInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize auth state from localStorage on app start
    const token = localStorage.getItem('auth_token');
    console.log('🚀 App initialization - Token check:', {
      hasToken: !!token,
      isValidToken: token && token !== 'undefined' && token !== 'null',
      timestamp: new Date().toISOString()
    });
    
    if (token && token !== 'undefined' && token !== 'null') {
      console.log('✅ Restoring auth state from localStorage');
      store.dispatch(restoreAuth());
    } else {
      console.log('❌ No valid token found, cleaning up localStorage');
      // Clean up any invalid tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('selected_workspace_id');
      localStorage.removeItem('selected_workspace');
    }

    // Set up token expiration checking
    const checkTokenExpiration = () => {
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken && currentToken !== 'undefined' && currentToken !== 'null') {
        try {
          // Basic JWT expiration check
          const tokenParts = currentToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
              console.log('🕐 Token expired, clearing auth state');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('selected_workspace_id');
              localStorage.removeItem('selected_workspace');
              store.dispatch({ type: 'auth/clearAuth' });
              
              // Redirect to login if not already there
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Error checking token expiration:', error);
        }
      }
    };

    // Initial token check
    checkTokenExpiration();
    
    // Check token expiration every 5 minutes
    const tokenCheckInterval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(tokenCheckInterval);
      console.log('🧹 Auth initializer cleanup completed');
    };
  }, []);

  return <>{children}</>;
}

// Global error handler
function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Global error:', event.error);
      // You can integrate with error reporting services here
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
      // You can integrate with error reporting services here
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>BI Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>

      <GlobalErrorHandler />

      <Provider store={store}>
        <PersistGate loading={<PersistGateLoading />} persistor={persistor}>
          <ThemeProvider theme={theme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <CssBaseline />
              <ErrorBoundary>
                <AuthInitializer>
                  <Component {...pageProps} />
                </AuthInitializer>
              </ErrorBoundary>
            </LocalizationProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </>
  );
}

export default MyApp;