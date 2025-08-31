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

export default function LoginPage() {
  const [credentials, setCredentialsState] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem('auth_token', data.data.token);
        
        // Store auth data in Redux
        dispatch(setCredentials({
          user: data.data.user,
          token: data.data.token,
          workspace: data.data.workspace || null,
          permissions: data.data.permissions || [],
        }));

        // Handle different scenarios after login
        if (data.data.workspace) {
          // User has a default workspace, redirect there
          router.push(`/workspace/${data.data.workspace.slug}`);
        } else if (data.data.workspaces?.length === 1) {
          // User has only one workspace, redirect there
          router.push(`/workspace/${data.data.workspaces[0].slug}`);
        } else {
          // User has multiple workspaces or none, show workspace selector
          router.push('/workspace-selector');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentialsState(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username or Email"
              name="username"
              autoComplete="username"
              autoFocus
              value={credentials.username}
              onChange={handleChange}
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
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            {/* Optional: Add forgot password link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Forgot your password? <a href="/forgot-password">Reset it here</a>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}