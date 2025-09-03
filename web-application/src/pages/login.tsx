// web-application/src/pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { setCredentials } from '../store/slices/authSlice';
import { useAppDispatch } from '../hooks/redux';
import { getErrorMessage } from '../utils/apiUtils';

export default function LoginPage() {
  const [credentials, setCredentialsState] = useState({
    email: '', // Changed from username to email to match backend
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>(''); // Explicitly type as string
  
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/workspace-selector');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(''); // Clear previous errors

    try {
      // Make sure to call the correct backend URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email, // Backend expects email field
          password: credentials.password,
        }),
      });

      const data = await response.json();
      console.log('Login response:', data); // Debug log

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem('auth_token', data.token);
        
        // Store auth data in Redux - updated to match backend response structure
        dispatch(setCredentials({
          user: data.user,
          token: data.token,
          workspace: null, // Set later when workspace is selected
          permissions: [], // Will be loaded when workspace is selected
        }));

        // Handle workspace selection based on available workspaces
        if (data.workspaces && data.workspaces.length === 1) {
          // User has only one workspace, redirect there
          router.push(`/workspace/${data.workspaces[0].slug}`);
        } else if (data.workspaces && data.workspaces.length > 1) {
          // User has multiple workspaces, show selector
          router.push('/workspace-selector');
        } else {
          // No workspaces available
          setError('No workspaces available for your account');
        }
      } else {
        // Handle different error cases - ensure error is always a string
        let errorMessage = 'Login failed';
        
        if (response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (response.status === 429) {
          errorMessage = 'Too many login attempts. Please try again later.';
        } else if (data && typeof data === 'object') {
          // Extract error message from response data
          errorMessage = data.error || data.message || 'Login failed';
          
          // Handle error arrays
          if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            errorMessage = data.errors[0].message || data.errors[0].code || 'Login failed';
          }
        }
        
        setError(String(errorMessage)); // Ensure it's a string
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Use the utility function to format error message
      const errorMessage = getErrorMessage(err) || 'Unable to connect to server. Please try again.';
      setError(String(errorMessage)); // Ensure it's a string
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentialsState(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            BI Platform
          </Typography>
          <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
            Sign in to your account
          </Typography>

          {/* Fixed Alert component - only show if error exists and is a non-empty string */}
          {error && typeof error === 'string' && error.trim() !== '' && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Username or Email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={credentials.email}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={handleChange}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !credentials.email || !credentials.password}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
            
            {/* Optional: Add forgot password link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Forgot your password?{' '}
                <Typography
                  component="a"
                  href="/forgot-password"
                  variant="body2"
                  sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Reset it here
                </Typography>
              </Typography>
            </Box>

            {/* Development helper */}
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ textAlign: 'center', mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Development: Try <strong>admin@localhost.com</strong> / <strong>admin123</strong>
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}