import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <ErrorIcon color="error" sx={{ fontSize: 64 }} />
            </Box>
            <Typography variant="h4" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Paper sx={{ p: 2, mt: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="caption" component="pre" sx={{ textAlign: 'left' }}>
                  {this.state.error.message}
                </Typography>
              </Paper>
            )}
            <Button
              variant="contained"
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;