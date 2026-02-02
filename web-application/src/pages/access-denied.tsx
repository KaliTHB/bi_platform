// web-application/src/pages/access-denied.tsx
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useRouter } from 'next/router';

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 6, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <LockIcon color="error" sx={{ fontSize: 64 }} />
        </Box>
        <Typography variant="h4" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          You don't have permission to access this resource. Please contact your administrator if you believe this is an error.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => router.back()}
            sx={{ mr: 2 }}
          >
            Go Back
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => router.replace('/workspace-selector')}
          >
            Select Workspace
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}