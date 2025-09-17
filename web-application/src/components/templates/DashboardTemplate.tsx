// web-application/src/components/templates/DashboardTemplate.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Button,
  IconButton,
  Toolbar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Edit as EditIcon,
  Home as HomeIcon
} from '@mui/icons-material';

// Import dashboard components
import WorkspaceLayout from '../layout/WorkspaceLayout';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { authStorage } from '@/utils/storageUtils';

export interface DashboardTemplateProps {
  dashboardId: string;
  workspaceSlug?: string;
  title?: string;
  description?: string;
  showToolbar?: boolean;
  showBreadcrumbs?: boolean;
  allowEdit?: boolean;
  allowShare?: boolean;
  allowExport?: boolean;
  onBack?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onExport?: () => void;
}

interface DashboardData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  workspace_id: string;
  category_id?: string;
  category_name?: string;
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;
  is_featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  view_count?: number;
  last_accessed?: string;
}

const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  dashboardId,
  workspaceSlug,
  title,
  description,
  showToolbar = true,
  showBreadcrumbs = true,
  allowEdit = true,
  allowShare = true,
  allowExport = true,
  onBack,
  onEdit,
  onShare,
  onExport
}) => {
  const router = useRouter();
  const { user, currentWorkspace } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Local state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Load dashboard data
  useEffect(() => {
    const loadDashboard = async () => {
      if (!dashboardId) {
        setError('Dashboard ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(dashboardId,"dashboardId1")
        
        const response = await fetch(`/api/dashboards/${dashboardId}`, {
          headers: {
            'Authorization': `Bearer ${authStorage.getToken()}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load dashboard: ${response.statusText}`);
        }
        
        const dashboardData = await response.json();
        setDashboard(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [dashboardId]);

  // Handle actions
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      router.replace(`/workspace/${workspaceSlug}/dashboard/${dashboard?.slug}/edit`);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Open share dialog
      console.log('Share dashboard:', dashboard?.id);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      // Open export dialog
      console.log('Export dashboard:', dashboard?.id);
    }
  };

  const handleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // Check permissions
  const canEdit = allowEdit && hasPermission('dashboard', 'update', dashboard?.id);
  const canShare = allowShare && hasPermission('dashboard', 'share', dashboard?.id);
  const canExport = allowExport && hasPermission('dashboard', 'export', dashboard?.id);

  if (loading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={60} />
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (error) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Dashboard Error
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
          <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
            Go Back
          </Button>
        </Container>
      </WorkspaceLayout>
    );
  }

  if (!dashboard) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="warning">
            <Typography variant="body2">
              Dashboard not found
            </Typography>
          </Alert>
        </Container>
      </WorkspaceLayout>
    );
  }

  const displayTitle = title || dashboard.display_name || dashboard.name;
  const displayDescription = description || dashboard.description;

  return (
    <WorkspaceLayout>
      <Box sx={{ height: fullscreen ? '100vh' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {!fullscreen && showBreadcrumbs && (
          <Container maxWidth="xl" sx={{ py: 2 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  router.replace(`/workspace/${workspaceSlug}`);
                }}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Workspace
              </Link>
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  router.replace(`/workspace/${workspaceSlug}/dashboards`);
                }}
              >
                Dashboards
              </Link>
              {dashboard.category_name && (
                <Link color="inherit" href="#">
                  {dashboard.category_name}
                </Link>
              )}
              <Typography color="text.primary">
                {displayTitle}
              </Typography>
            </Breadcrumbs>
          </Container>
        )}

        {!fullscreen && showToolbar && (
          <Paper elevation={1} sx={{ mb: 2 }}>
            <Container maxWidth="xl">
              <Toolbar sx={{ px: 0 }}>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={handleBack}
                  sx={{ mr: 2 }}
                >
                  <ArrowBackIcon />
                </IconButton>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" component="h1" noWrap>
                    {displayTitle}
                  </Typography>
                  {displayDescription && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {displayDescription}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    color="inherit"
                    onClick={handleFullscreen}
                    title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    <FullscreenIcon />
                  </IconButton>

                  {canExport && (
                    <IconButton
                      color="inherit"
                      onClick={handleExport}
                      title="Export Dashboard"
                    >
                      <DownloadIcon />
                    </IconButton>
                  )}

                  {canShare && (
                    <IconButton
                      color="inherit"
                      onClick={handleShare}
                      title="Share Dashboard"
                    >
                      <ShareIcon />
                    </IconButton>
                  )}

                  {canEdit && (
                    <IconButton
                      color="inherit"
                      onClick={handleEdit}
                      title="Edit Dashboard"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
              </Toolbar>
            </Container>
          </Paper>
        )}

        <Box sx={{ flex: 1 }}>
          <Container maxWidth="xl" sx={{ py: fullscreen ? 0 : 2, height: '100%' }}>
            <DashboardContainer
              dashboardId={dashboardId}
              fullscreen={fullscreen}
              onFullscreenChange={setFullscreen}
            />
          </Container>
        </Box>
      </Box>
    </WorkspaceLayout>
  );
};

export default DashboardTemplate;