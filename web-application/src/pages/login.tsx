// web-application/src/pages/login.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/index';
import { login, clearError } from '@/store/slices/authSlice';
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
  Lock,
  Login as LoginIcon,
  Business,
  Dashboard,
  Security,
  Analytics,
  Speed,
  Group,
  FileCopy,
  CheckCircle,
} from '@mui/icons-material';

interface LoginForm {
  email: string;
  password: string;
}

interface TestCredential {
  email: string;
  password: string;
  role: string;
  description: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
}

const getTestCredentials = (): TestCredential[] => {
  const env = process.env.NODE_ENV;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // Different credentials based on environment
  if (env === 'development' ) {
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
  
  return []; // Production - no test credentials
};

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);
  
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<LoginForm>>({});
  const [showCredentials, setShowCredentials] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const testCredentials = getTestCredentials();
  const isProduction = process.env.NODE_ENV === 'production';

  // Redirect if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (isAuthenticated || (token && token !== 'undefined' && token !== 'null')) {
      console.log('User already authenticated, redirecting to workspace selector');
      router.push('/workspace-selector');
    }
  }, [isAuthenticated, router]);

  // Clear any existing errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const validateForm = (): boolean => {
    const errors: Partial<LoginForm> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
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
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear global error when user starts typing
    if (error) {
      dispatch(clearError());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log('Attempting login with email:', formData.email);
      
      const resultAction = await dispatch(login({
        email: formData.email.trim(),
        password: formData.password,
      }));
      
      if (login.fulfilled.match(resultAction)) {
        console.log('Login successful, redirecting to workspace selector');
        router.push('/workspace-selector');
      } else {
        console.error('Login failed:', resultAction.payload);
      }
    } catch (err: any) {
      console.error('Login error:', err);
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

  const handleCredentialClick = async (credential: TestCredential, index: number) => {
    setFormData({
      email: credential.email,
      password: credential.password,
    });
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${credential.email} / ${credential.password}`);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.log('Clipboard not available');
    }
  };

  // Show loading while checking existing authentication
  if (isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Redirecting...
        </Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      py: 4,
    }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Left Side - Branding & Features */}
          <Grid item xs={12} md={7}>
            <Fade in timeout={800}>
              <Box sx={{ color: 'white', mb: 4 }}>
                <Typography variant="h2" component="h1" gutterBottom sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  mb: 2,
                }}>
                  BI Platform
                </Typography>
                <Typography variant="h5" sx={{ 
                  opacity: 0.9,
                  fontWeight: 400,
                  mb: 4,
                  lineHeight: 1.4,
                }}>
                  Transform your data into actionable insights with our enterprise-grade 
                  business intelligence platform
                </Typography>

                {/* Feature Cards */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <Slide direction="right" in timeout={1000}>
                      <Card sx={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
                              <Dashboard />
                            </Avatar>
                            <Typography variant="h6">Interactive Dashboards</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Create stunning, interactive dashboards with drag-and-drop simplicity
                          </Typography>
                        </CardContent>
                      </Card>
                    </Slide>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Slide direction="right" in timeout={1200}>
                      <Card sx={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
                              <Analytics />
                            </Avatar>
                            <Typography variant="h6">Advanced Analytics</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Powerful analytics tools to uncover hidden patterns in your data
                          </Typography>
                        </CardContent>
                      </Card>
                    </Slide>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Slide direction="right" in timeout={1400}>
                      <Card sx={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
                              <Security />
                            </Avatar>
                            <Typography variant="h6">Enterprise Security</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Bank-level security with role-based access controls
                          </Typography>
                        </CardContent>
                      </Card>
                    </Slide>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Slide direction="right" in timeout={1600}>
                      <Card sx={{ 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 2 }}>
                              <Speed />
                            </Avatar>
                            <Typography variant="h6">Real-time Performance</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Lightning-fast queries and real-time data synchronization
                          </Typography>
                        </CardContent>
                      </Card>
                    </Slide>
                  </Grid>
                </Grid>
              </Box>
            </Fade>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid item xs={12} md={5}>
            <Fade in timeout={600}>
              <Paper elevation={24} sx={{ 
                p: 4, 
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Avatar sx={{ 
                    bgcolor: 'primary.main', 
                    width: 56, 
                    height: 56,
                    mx: 'auto',
                    mb: 2,
                  }}>
                    <Business sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="h4" component="h1" gutterBottom color="primary" sx={{ fontWeight: 600 }}>
                    Welcome Back
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Sign in to access your analytics dashboard
                  </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearError())}>
                    {error}
                  </Alert>
                )}

                {/* Login Form */}
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <TextField
                    fullWidth
                    id="email"
                    name="email"
                    type="email"
                    label="Email Address"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    onKeyPress={handleKeyPress}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    disabled={isLoading}
                    margin="normal"
                    required
                    autoComplete="email"
                    autoFocus
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    onKeyPress={handleKeyPress}
                    error={!!formErrors.password}
                    helperText={formErrors.password}
                    disabled={isLoading}
                    margin="normal"
                    required
                    autoComplete="current-password"
                    sx={{ mb: 3 }}
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
                            edge="end"
                            disabled={isLoading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading || !formData.email || !formData.password}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                    sx={{ 
                      mt: 2, 
                      mb: 3, 
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      boxShadow: '0 3px 10px 2px rgba(102, 126, 234, .3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
                        boxShadow: '0 6px 20px 4px rgba(102, 126, 234, .4)',
                      }
                    }}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                  </Button>

                  {/* Forgot Password */}
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography
                      component="a"
                      href="/forgot-password"
                      variant="body2"
                      sx={{ 
                        color: 'primary.main', 
                        textDecoration: 'none', 
                        '&:hover': { textDecoration: 'underline' } 
                      }}
                    >
                      Forgot your password?
                    </Typography>
                  </Box>

                  {/* Test Credentials Section */}
                  {!isProduction && testCredentials.length > 0 && (
                    <>
                      <Divider sx={{ my: 3 }}>
                        <Chip 
                          label={`Test Credentials (${process.env.NODE_ENV})`} 
                          color="primary" 
                          variant="outlined" 
                          size="small" 
                        />
                      </Divider>

                      <Box sx={{ mb: 2 }}>
                        {showCredentials && (
                          <Fade in>
                            <Box>
                              
                              <Grid container spacing={1}>
                                {testCredentials.map((cred, index) => (
                                  <Grid item xs={12} key={index}>
                                    <Card 
                                      sx={{ 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                          boxShadow: 4,
                                          transform: 'translateY(-1px)',
                                        },
                                        border: copiedIndex === index ? '2px solid' : '1px solid',
                                        borderColor: copiedIndex === index ? 'success.main' : 'divider',
                                      }}
                                      onClick={() => handleCredentialClick(cred, index)}
                                    >
                                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                              <Chip 
                                                label={cred.role} 
                                                color={cred.color} 
                                                size="small" 
                                                sx={{ mr: 1, fontSize: '0.75rem' }}
                                              />
                                              {copiedIndex === index && (
                                                <CheckCircle color="success" sx={{ fontSize: 16 }} />
                                              )}
                                            </Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                              {cred.email}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {cred.description} • Password: {cred.password}
                                            </Typography>
                                          </Box>
                                          <FileCopy sx={{ fontSize: 16, color: 'action.active', ml: 1 }} />
                                        </Box>
                                      </CardContent>
                                    </Card>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          </Fade>
                        )}
                      </Box>
                    </>
                  )}

                  {/* Production Contact Info */}
                  {isProduction && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Need access? Contact your system administrator for account setup.
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </Paper>
            </Fade>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            © 2024 BI Platform. Enterprise Business Intelligence Solution.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1, display: 'block' }}>
            Secure • Scalable • Intelligent
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}