// web-application/src/pages/login.tsx - COMPLETE VERSION WITH CONSOLIDATED LOCALSTORAGE
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useLoginMutation } from '../store/api/authApi';
import { setCredentials } from '../store/slices/authSlice';
import { setCurrentWorkspace } from '../store/slices/workspaceSlice';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Card,
  CardContent,
  Chip,
  Grid,
  Avatar,
  Fade,
  Slide,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Person,
  Lock,
  Login as LoginIcon,
  Business,
  Dashboard,
  Security,
  Analytics,
} from '@mui/icons-material';

// Updated interface to support both email and username
interface LoginForm {
  emailOrUsername: string;
  password: string;
}

interface TestCredential {
  email: string;
  password: string;
  role: string;
  description: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
}

// ✅ FIXED: Proper types matching backend response
interface LoginMutationResult {
  data?: {
    success: boolean;
    message: string;
    data?: {
      token: string;
      user: any;
      workspace?: any;
      permissions?: string[];
    };
  };
  error?: {
    status: number;
    data: {
      message?: string;
      error?: string;
    };
  };
}

// ✅ CONSOLIDATED STORAGE KEYS - SINGLE WORKSPACE KEY
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  CURRENT_WORKSPACE: 'currentWorkspace', // ✅ Single workspace key
  PERMISSIONS: 'permissions',
} as const;

// ✅ CLEANUP FUNCTION FOR OLD WORKSPACE KEYS (MIGRATION)
const cleanupOldWorkspaceKeys = (): void => {
  if (typeof window === 'undefined') return;
  
  const oldKeys = ['workspace', 'auth_workspace', 'selected_workspace_id'];
  oldKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove old key ${key}:`, error);
    }
  });
};

const getTestCredentials = (): TestCredential[] => {
  const env = process.env.NODE_ENV;
  
  if (env === 'development') {
    return [
      {
        email: 'admin@localhost.com',
        password: 'admin123',
        role: 'Super Admin',
        description: 'Full system access',
        color: 'primary',
      }
    ];
  }
  
  return [];
};

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading: authLoading, user } = useAppSelector((state) => state.auth);
  
  // RTK Query mutation hook with proper typing
  const [loginMutation, { isLoading: loginIsLoading }] = useLoginMutation();
  
  const [formData, setFormData] = useState<LoginForm>({
    emailOrUsername: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<LoginForm>>({});
  const [loginError, setLoginError] = useState<string>('');
  
  const testCredentials = getTestCredentials();
  const isProduction = process.env.NODE_ENV === 'production';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      console.log('✅ Login Page: User already authenticated, redirecting...');
      router.push('/workspace/overview').catch((error) => {
        console.error('❌ Login Page: Redirect failed:', error);
        window.location.href = '/workspace/overview';
      });
    }
  }, [isAuthenticated, user, authLoading, router]);

  // Clear errors when form changes
  useEffect(() => {
    if (loginError) {
      setLoginError('');
    }
  }, [formData, loginError]);

  // Helper function to determine if input looks like an email
  const isEmailFormat = (input: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<LoginForm> = {};
    
    if (!formData.emailOrUsername.trim()) {
      errors.emailOrUsername = 'Email or username is required';
    } else if (formData.emailOrUsername.trim().length < 3) {
      errors.emailOrUsername = 'Email or username must be at least 3 characters';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof LoginForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loginIsLoading) {
      handleSubmit(e as any);
    }
  };

  const handleCredentialClick = (credential: TestCredential) => {
    setFormData({
      emailOrUsername: credential.email,
      password: credential.password,
    });
    setFormErrors({});
    setLoginError('');
  };

  // ✅ UPDATED SUBMIT HANDLER WITH CONSOLIDATED LOCALSTORAGE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoginError('');

    try {
      console.log('🔄 Login Page: Attempting login with:', formData.emailOrUsername);
      
      // Prepare credentials based on input format
      const credentials = {
        password: formData.password,
        ...(isEmailFormat(formData.emailOrUsername.trim()) 
          ? { email: formData.emailOrUsername.trim() }
          : { username: formData.emailOrUsername.trim() }
        )
      };
      
      console.log('📤 Login Page: Sending credentials:', { 
        ...credentials, 
        password: '[REDACTED]' 
      });
      
      // ✅ FIXED: Use RTK Query mutation with proper typing
      const result = await loginMutation(credentials) as LoginMutationResult;
      
      console.log('🐛 DEBUG - Full login mutation result:', result);
      console.log('🐛 DEBUG - Result data:', result.data);
      console.log('🐛 DEBUG - Result error:', result.error);
      
      // ✅ FIXED: Handle RTK Query response structure correctly
      if (result.data && result.data.success && result.data.data) {
        const { user, token, workspace, permissions } = result.data.data;
        
        console.log('✅ Login successful!');
        console.log('🔑 Token received:', token ? 'Present' : 'Missing');
        console.log('👤 User data:', user);
        console.log('🏢 Workspace:', workspace);
        console.log('🔐 Permissions:', permissions);
        
        // Validate we have required data
        if (!token) {
          throw new Error('No authentication token received from server');
        }
        
        if (!user) {
          throw new Error('No user data received from server');
        }
        
        // ✅ STORE IN LOCALSTORAGE USING CONSOLIDATED KEYS
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        console.log('💾 Token stored in localStorage:', token.substring(0, 20) + '...');
        
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        console.log('💾 User data stored in localStorage');
        
        if (workspace) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, JSON.stringify(workspace));
          console.log('💾 Workspace data stored in localStorage using currentWorkspace key');
        }

        if (permissions) {
          localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(permissions));
          console.log('💾 Permissions stored in localStorage');
        }

        // ✅ CLEANUP OLD WORKSPACE KEYS
        cleanupOldWorkspaceKeys();
        console.log('🧹 Cleaned up old workspace keys');
        
        // ✅ Update Redux store
        dispatch(setCredentials({ user, token, permissions }));
        console.log('🔄 Redux credentials updated');
        
        if (workspace) {
          dispatch(setCurrentWorkspace(workspace));
          console.log('🔄 Redux workspace updated');
        }
        
        console.log('✅ All data stored successfully, redirecting...');
        
        // Force redirect with timeout fallback
        setTimeout(() => {
          console.log('⚡ EMERGENCY: Force redirect after delay');
          window.location.replace('/workspace/overview');
        }, 100);
        
      } else if (result.error) {
        // Handle RTK Query error
        console.error('❌ Login Page: RTK Query error:', result.error);
        
        const errorMessage = result.error.data?.message || 
                           result.error.data?.error || 
                           'Login failed. Please check your credentials.';
        setLoginError(errorMessage);
        
      } else {
        // Handle unexpected response structure
        console.error('❌ Login Page: Unexpected response structure:', result);
        setLoginError('Unexpected login response. Please try again.');
      }
      
    } catch (err: any) {
      console.error('❌ Login Page: Login exception:', err);
      setLoginError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Container maxWidth="md">
        <Grid container spacing={4} alignItems="center">
          {/* Left Side - Branding */}
          <Grid item xs={12} md={6}>
            <Slide direction="right" in mountOnEnter timeout={800}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' }, color: 'white', mb: { xs: 4, md: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2, width: 64, height: 64 }}>
                    <Analytics sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', letterSpacing: -1 }}>
                    BI Platform
                  </Typography>
                </Box>
                
                <Typography variant="h5" sx={{ mb: 4, fontWeight: 300, opacity: 0.9 }}>
                  Enterprise Business Intelligence & Analytics
                </Typography>
                
                {/* Feature highlights */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {[
                    { icon: <Dashboard />, title: 'Interactive Dashboards', desc: 'Create and share beautiful visualizations' },
                    { icon: <Business />, title: 'Multi-Tenant', desc: 'Workspace isolation and security' },
                    { icon: <Security />, title: 'Enterprise Security', desc: 'Role-based access control' },
                  ].map((feature, index) => (
                    <Grid item xs={12} key={index}>
                      <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                          <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
                            {feature.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
                              {feature.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                              {feature.desc}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Slide>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid item xs={12} md={6}>
            <Slide direction="left" in mountOnEnter timeout={800}>
              <Paper
                elevation={24}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Welcome Back
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Sign in to access your workspace
                  </Typography>
                </Box>

                {/* Test Credentials (Development Only) */}
                {!isProduction && testCredentials.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Development Test Credentials:
                    </Typography>
                    {testCredentials.map((cred, index) => (
                      <Chip
                        key={index}
                        label={`${cred.role}: ${cred.email}`}
                        color={cred.color}
                        size="small"
                        onClick={() => handleCredentialClick(cred)}
                        sx={{ mr: 1, mb: 1, cursor: 'pointer' }}
                        clickable
                      />
                    ))}
                    <Divider sx={{ mt: 2, mb: 3 }} />
                  </Box>
                )}

                {/* Login Error */}
                {loginError && (
                  <Fade in>
                    <Alert severity="error" sx={{ mb: 3 }} onClose={() => setLoginError('')}>
                      {loginError}
                    </Alert>
                  </Fade>
                )}

                {/* Login Form */}
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <TextField
                    fullWidth
                    id="emailOrUsername"
                    label="Email or Username"
                    name="emailOrUsername"
                    autoComplete="username"
                    autoFocus
                    value={formData.emailOrUsername}
                    onChange={handleInputChange('emailOrUsername')}
                    error={!!formErrors.emailOrUsername}
                    helperText={formErrors.emailOrUsername}
                    disabled={loginIsLoading}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {isEmailFormat(formData.emailOrUsername) ? <Email color="action" /> : <Person color="action" />}
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={!!formErrors.password}
                    helperText={formErrors.password}
                    disabled={loginIsLoading}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleTogglePasswordVisibility}
                            onMouseDown={(e) => e.preventDefault()}
                            edge="end"
                            disabled={loginIsLoading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 3 }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loginIsLoading}
                    sx={{ 
                      mb: 2, 
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
                      }
                    }}
                    startIcon={loginIsLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                  >
                    {loginIsLoading ? 'Signing In...' : 'Sign In'}
                  </Button>

                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Don't have an account?{' '}
                      <Button variant="text" size="small" sx={{ textTransform: 'none' }}>
                        Contact Administrator
                      </Button>
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Slide>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}