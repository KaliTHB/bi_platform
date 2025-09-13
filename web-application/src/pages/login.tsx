// web-application/src/pages/login.tsx - COMPLETE FIXED VERSION (SAME UI)
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

  // ✅ FIXED: Complete handleSubmit with proper typing and data access
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
        
        // ✅ Store in localStorage
        localStorage.setItem('token', token);
        console.log('💾 Token stored in localStorage:', token.substring(0, 20) + '...');
        
        localStorage.setItem('user', JSON.stringify(user));
        console.log('💾 User data stored in localStorage');
        
        if (workspace) {
          localStorage.setItem('workspace', JSON.stringify(workspace));
          console.log('💾 Workspace data stored in localStorage');
        }
        
        // ✅ Update Redux store
        dispatch(setCredentials({ user, token, permissions }));
        console.log('🔄 Redux credentials updated');
        
        if (workspace) {
          dispatch(setCurrentWorkspace(workspace));
          console.log('🔄 Redux workspace updated');
        }
        
        console.log('✅ All data stored successfully, redirecting...');
        
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

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  const handleCredentialClick = async (credential: TestCredential) => {
    setFormData({
      emailOrUsername: credential.email,
      password: credential.password,
    });
  };

  // Show loading screen while checking auth state
  if (authLoading && !loginIsLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6">Checking authentication...</Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
            Please wait while we verify your login status
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      py: 3
    }}>
      <Container maxWidth="xl">
        <Grid container spacing={4} alignItems="center" sx={{ minHeight: '100vh' }}>
          {/* Left Side - Feature Showcase */}
          <Grid item xs={12} md={7}>
            <Fade in timeout={800}>
              <Box sx={{ pr: { md: 4 } }}>
                <Typography 
                  variant="h2" 
                  component="h1" 
                  sx={{ 
                    color: 'white',
                    fontWeight: 'bold',
                    mb: 3,
                    fontSize: { xs: '2.5rem', md: '3.5rem' }
                  }}
                >
                  Business Intelligence Platform
                </Typography>
                
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.9)',
                    mb: 4,
                    lineHeight: 1.6
                  }}
                >
                  Transform your data into actionable insights with our powerful, 
                  multi-tenant BI platform designed for modern enterprises.
                </Typography>

                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {[
                    { icon: <Dashboard />, title: 'Interactive Dashboards', desc: 'Create beautiful, real-time dashboards' },
                    { icon: <Analytics />, title: 'Advanced Analytics', desc: 'Powerful data analysis and visualization' },
                    { icon: <Security />, title: 'Enterprise Security', desc: 'Role-based access and data protection' },
                    { icon: <Business />, title: 'Multi-Tenant', desc: 'Isolated workspaces for teams' }
                  ].map((feature, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Slide in timeout={800 + index * 200} direction="up">
                        <Card sx={{ 
                          background: 'rgba(255,255,255,0.1)', 
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: 'white'
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Avatar sx={{ 
                                bgcolor: 'rgba(255,255,255,0.2)', 
                                color: 'white',
                                mr: 2,
                                width: 32,
                                height: 32
                              }}>
                                {feature.icon}
                              </Avatar>
                              <Typography variant="h6" fontWeight="bold">
                                {feature.title}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              {feature.desc}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Slide>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Fade>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid item xs={12} md={5}>
            <Slide in timeout={1000} direction="left">
              <Paper 
                elevation={10}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  maxWidth: 500,
                  mx: 'auto'
                }}
              >
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Avatar sx={{ 
                    bgcolor: 'primary.main', 
                    width: 60, 
                    height: 60, 
                    mx: 'auto', 
                    mb: 2 
                  }}>
                    <LoginIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
                    Welcome Back
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Sign in to access your dashboard
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
                      <Button 
                        variant="text" 
                        size="small" 
                        onClick={() => router.push('/register')}
                        disabled={loginIsLoading}
                      >
                        Sign up
                      </Button>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <Button 
                        variant="text" 
                        size="small" 
                        onClick={() => router.push('/forgot-password')}
                        disabled={loginIsLoading}
                      >
                        Forgot your password?
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