// web-application/src/pages/_app.tsx
import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Redux store
import { store, persistor } from '@/store';

// ✅ ONLY USE EXISTING PROVIDERS
import { AuthProvider } from '@/components/providers/AuthProvider';
import { WorkspaceProvider } from '@/components/providers/WorkspaceProvider';

// Storage utilities
import { initializeStorage, debugStorageState } from '@/utils/storageUtils';

// Global styles
import '@/styles/globals.css';

// Create theme
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
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

// Loading component for PersistGate
const Loading = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px'
  }}>
    🔄 Loading application...
  </div>
);

function MyApp({ Component, pageProps }: AppProps) {
  
  // ✅ Initialize storage system on app start
  useEffect(() => {
    console.log('🚀 App starting - initializing storage...');
    
    // Initialize storage (cleans old data, sets up new structure)
    initializeStorage();
    
    // Debug storage state in development
    if (process.env.NODE_ENV === 'development') {
      // Debug current storage state
      setTimeout(() => {
        console.log('📊 Initial storage state:');
        debugStorageState();
      }, 1000);
      
      // Add global debug functions for development
      if (typeof window !== 'undefined') {
        (window as any).debugStorage = debugStorageState;
        (window as any).clearStorage = () => {
          localStorage.clear();
          console.log('🧹 Storage cleared');
        };
        console.log('🛠️ Debug functions added: window.debugStorage(), window.clearStorage()');
      }
    }
    
    // Log app initialization
    console.log('✅ App initialized successfully');
  }, []);

  // Handle storage errors gracefully
  useEffect(() => {
    const handleStorageError = (event: StorageEvent) => {
      console.error('❌ Storage error detected:', event);
      
      // Re-initialize storage if there are issues
      if (event.key && event.newValue === null) {
        console.log('🔄 Re-initializing storage due to error...');
        initializeStorage();
      }
    };

    // Listen for storage events (cross-tab synchronization)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageError);
      
      return () => {
        window.removeEventListener('storage', handleStorageError);
      };
    }
  }, []);

  // Handle app errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('localStorage') || event.message?.includes('storage')) {
        console.error('❌ Storage-related error:', event.error);
        // Could trigger storage re-initialization here if needed
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('localStorage')) {
        console.error('❌ Storage promise rejection:', event.reason);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  return (
    <>
      {/* Redux Provider */}
      <Provider store={store}>
        {/* Redux Persist Gate */}
        <PersistGate loading={<Loading />} persistor={persistor}>
          
          {/* Theme Provider */}
          <ThemeProvider theme={theme}>
            <CssBaseline />
            
            {/* ✅ Auth Provider - Handles authentication state and permissions */}
            <AuthProvider>
              
              {/* ✅ Workspace Provider - Handles workspace switching */}
              <WorkspaceProvider>
                
                {/* Main App Component */}
                <Component {...pageProps} />
                
              </WorkspaceProvider>
              
            </AuthProvider>
            
          </ThemeProvider>
          
        </PersistGate>
      </Provider>
      
      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999,
          display: 'none' // Hidden by default, show via console if needed
        }} id="debug-panel">
          <div>🛠️ Dev Mode</div>
          <div>F12 → Console → debugStorage()</div>
        </div>
      )}
    </>
  );
}

export default MyApp;