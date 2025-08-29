// web-application/src/pages/workspace-selector.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { RootState } from '../store';
import { switchWorkspace } from '../store/slices/authSlice';

interface Workspace {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  description?: string;
}

export default function WorkspaceSelectorPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/workspaces', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setWorkspaces(data.data);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    try {
      // Switch to selected workspace
      dispatch(switchWorkspace({
        workspace,
        permissions: [] // Will be loaded after workspace switch
      }));

      // Navigate to workspace
      router.push(`/workspace/${workspace.slug}`);
    } catch (error) {
      console.error('Error switching workspace:', error);
    }
  };

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workspace.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading workspaces...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Select Workspace
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Choose a workspace to continue to the BI Platform
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search workspaces..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/create-workspace')}
        >
          Create Workspace
        </Button>
      </Box>

      {filteredWorkspaces.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h6" color="textSecondary">
            No workspaces found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {searchQuery ? 'Try adjusting your search terms.' : 'Contact your administrator for access.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredWorkspaces.map((workspace) => (
            <Grid item xs={12} sm={6} md={4} key={workspace.id}>
              <Card 
                elevation={2} 
                sx={{ 
                  height: '100%',
                  '&:hover': {
                    elevation: 4,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => handleWorkspaceSelect(workspace)}
                  sx={{ height: '100%', p: 2 }}
                >
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {workspace.display_name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {workspace.description || 'No description available'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Slug: {workspace.slug}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}