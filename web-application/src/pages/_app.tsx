// web-application/src/pages/_app.tsx (or where you initialize your app)
import React from 'react';
import { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store, persistor } from '../store';
//import { AuthProvider } from '../context/AuthContext';
import { PersistGate } from 'redux-persist/integration/react';
import { AuthProvider } from '../components/providers/AuthProvider';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Component {...pageProps} />
        </ThemeProvider>
      </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

export default MyApp;