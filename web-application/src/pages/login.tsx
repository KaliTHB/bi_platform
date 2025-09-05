// web-application/src/pages/login.tsx - FIXED VERSION
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
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
  Person, // CHANGED: Added Person icon for email/username field
  Lock,
  Login as LoginIcon,
  Business,
  Dashboard,
  Security,
  Analytics,
} from '@mui/icons-material';

// FIXED: Updated interface to support both email and username
interface LoginForm {
  emailOrUsername: string; // CHANGED: from 'email' to 'emailOrUsername'
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
  const { login, isAuthenticated, isLoading, user } = useAuth();
  
  const [formData, setFormData] = useState<LoginForm>({
    emailOrUsername: '', // CHANGED: from 'email' to 'emailOrUsername'
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<LoginForm>>({});
  const [loginError, setLoginError] = useState<string>('');
  
  const testCredentials = getTestCredentials();
  const isProduction = process.env.NODE_ENV === 'production';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      console.log('User already authenticated, redirecting to workspace overview');
      const timer = setTimeout(() => {
        router.push('/workspace/overview').catch((error) => {
          console.error('Redirect from login page failed:', error);
          window.location.href = '/workspace/overview';
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isLoading, router]);

  // FIXED: More flexible validation that accepts both email and username formats
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

  // FIXED: Helper function to determine if input looks like an email
  const isEmailFormat = (input: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  };

  const handleInputChange = (field: keyof LoginForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    if (loginError) {
      setLoginError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      console.log('Attempting login with:', formData.emailOrUsername);
      setLoginError('');
      
      // FIXED: Send the appropriate field based on format detection
      const credentials = {
        password: formData.password,
        ...(isEmailFormat(formData.emailOrUsername.trim()) 
          ? { email: formData.emailOrUsername.trim() }
          : { username: formData.emailOrUsername.trim() }
        )
      };
      
      const result = await login(credentials);
      
      if (result.success) {
        console.log('Login successful');
        // useAuth will handle the redirect automatically
      } else {
        console.error('Login failed:', result.error);
        setLoginError(result.error || 'Login failed. Please check your credentials and try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError('An unexpected error occurred. Please try again.');
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
      emailOrUsername: credential.email, // CHANGED: from 'email' to 'emailOrUsername'
      password: credential.password,
    });
  };

  // Show loading screen while checking auth state
  if (isLoading) {
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
                  gutterBottom 
                  sx={{ 
                    color: 'white', 
                    fontWeight: 700,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    mb: 3
                  }}
                >
                  Business Intelligence
                </Typography>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    mb: 4, 
                    lineHeight: 1.4,
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  Transform your data into actionable insights with our comprehensive analytics platform
                </Typography>

                {/* Feature Cards */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {[
                    { icon: <Dashboard />, title: 'Interactive Dashboards', desc: 'Create stunning visualizations' },
                    { icon: <Analytics />, title: 'Advanced Analytics', desc: 'Deep insights from your data' },
                    { icon: <Security />, title: 'Enterprise Security', desc: 'Bank-level data protection' },
                  ].map((feature, index) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Slide direction="up" in timeout={1000 + (index * 200)}>
                        <Card 
                          elevation={8}
                          sx={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            textAlign: 'center',
                            p: 2,
                            height: '100%'
                          }}
                        >
                          <Avatar sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.2)', 
                            color: 'white',
                            width: 48, 
                            height: 48,
                            mx: 'auto',
                            mb: 2 
                          }}>
                            {feature.icon}
                          </Avatar>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {feature.desc}
                          </Typography>
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
                {loginError && (
                  <Alert 
                    severity="error" 
                    sx={{ mb: 3 }} 
                    onClose={() => setLoginError('')}
                  >
                    {loginError}
                  </Alert>
                )}

                {/* Login Form */}
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  {/* FIXED: Updated email field to support both email and username */}
                  <TextField
                    fullWidth
                    id="emailOrUsername"
                    name="emailOrUsername"
                    type="text" // CHANGED: from "email" to "text"
                    label="Email or Username" // CHANGED: Updated label
                    value={formData.emailOrUsername}
                    onChange={handleInputChange('emailOrUsername')}
                    onKeyPress={handleKeyPress}
                    error={!!formErrors.emailOrUsername}
                    helperText={formErrors.emailOrUsername}
                    disabled={isLoading}
                    margin="normal"
                    required
                    autoComplete="username" // CHANGED: More appropriate autocomplete
                    autoFocus
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" /> {/* CHANGED: From Email to Person icon */}
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
                    disabled={isLoading || !formData.emailOrUsername || !formData.password} // CHANGED: Updated field name
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
                          label={`Development - Click to use test credentials`} 
                          color="primary" 
                          variant="outlined" 
                          size="small"
                        />
                      </Divider>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {testCredentials.map((credential, index) => (
                          <Button
                            key={index}
                            variant="outlined"
                            size="small"
                            onClick={() => handleCredentialClick(credential)}
                            sx={{ 
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              p: 2
                            }}
                          >
                            <Box sx={{ textAlign: 'left' }}>
                              <Typography variant="body2" fontWeight={600}>
                                {credential.role}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {credential.email} / {credential.password}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="textSecondary">
                                {credential.description}
                              </Typography>
                            </Box>
                          </Button>
                        ))}
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

                {/* ADDED: Helpful hint for users */}
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.875rem' }}>
                    💡 You can sign in with either your email address or username
                  </Typography>
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