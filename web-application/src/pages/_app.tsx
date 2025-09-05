// web-application/src/pages/_app.tsx - COMPLETE PROVIDER SETUP
import React, { useEffect } from 'react';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';

// Redux store setup
import { store, persistor } from '../store';

// Theme
import { theme } from '../styles/theme';

// Providers
import { AuthProvider } from '../components/providers/AuthProvider';
import { WorkspaceProvider } from '../components/providers/WorkspaceProvider';

// Plugin initialization
import { ChartPluginService } from '../plugins/charts/services/ChartPluginService';

// Global styles (if any)
import '../styles/globals.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Loading component for persist gate
const PersistLoadingComponent = () => (
  <Box 
    display="flex" 
    flexDirection="column"
    justifyContent="center" 
    alignItems="center" 
    minHeight="100vh"
    bgcolor="background.default"
  >
    <CircularProgress size={40} sx={{ mb: 2 }} />
    <Typography variant="body2" color="textSecondary">
      Loading application...
    </Typography>
  </Box>
);

export default function MyApp({ Component, pageProps }: AppProps) {
  // Initialize chart plugins on app start
  useEffect(() => {
    ChartPluginService.initialize().catch(console.error);
  }, []);

  return (
    <>
      <Head>
        <title>BI Platform - Business Intelligence & Analytics</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      
      {/* Redux Provider */}
      <Provider store={store}>
        {/* Redux Persist Gate */}
        <PersistGate loading={<PersistLoadingComponent />} persistor={persistor}>
          {/* Material-UI Theme Provider */}
          <ThemeProvider theme={theme}>
            {/* Material-UI CSS Baseline */}
            <CssBaseline />
            
            {/* Authentication Provider */}
            <AuthProvider>
              {/* Workspace Provider */}
              <WorkspaceProvider>
                {/* Main Application Component */}
                <Component {...pageProps} />
              </WorkspaceProvider>
            </AuthProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </>
  );
}