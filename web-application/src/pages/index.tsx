// web-application/src/pages/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, workspace } = useAuth();

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) {
      return;
    }

    // If user is authenticated and has a workspace, redirect to overview
    if (isAuthenticated && user) {
      console.log('User authenticated, redirecting to workspace overview');
      router.replace('/workspace/overview');
    } else {
      // If not authenticated, redirect to login
      console.log('User not authenticated, redirecting to login');
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, user, workspace, router]);

  // Show loading screen while determining auth state and redirecting
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      <CircularProgress 
        size={60} 
        sx={{ 
          color: 'white',
          mb: 3
        }} 
      />
      <Typography variant="h5" sx={{ fontWeight: 300, textAlign: 'center' }}>
        BI Platform
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.8, mt: 1, textAlign: 'center' }}>
        {isLoading ? 'Checking authentication...' : 'Redirecting...'}
      </Typography>
    </Box>
  );
}