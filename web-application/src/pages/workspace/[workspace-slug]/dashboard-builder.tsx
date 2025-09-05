// web-application/src/pages/workspace/[workspace-slug]/dashboard-builder.tsx
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import DashboardBuilder from '../../../components/builder/DashboardBuilder';
import { PermissionGate } from '../../../components/shared/PermissionGate';

interface DashboardBuilderPageProps {
  // Optional props from getServerSideProps if needed
}

const DashboardBuilderPage: NextPage<DashboardBuilderPageProps> = () => {
  const router = useRouter();
  const { workspaceSlug, dashboardId } = router.query;
  const { user, workspace, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState<string>('New Dashboard');

  // Check authentication and permissions
  useEffect(() => {
    if (!authLoading && !permissionsLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (!hasPermission('dashboard.create') && !dashboardId) {
        router.push('/access-denied');
        return;
      }

      if (dashboardId && !hasPermission('dashboard.update')) {
        router.push('/access-denied');
        return;
      }

      setIsLoading(false);
    }
  }, [isAuthenticated, hasPermission, authLoading, permissionsLoading, dashboardId, router]);

  // Handle workspace mismatch
  useEffect(() => {
    if (workspace && workspaceSlug && workspace.slug !== workspaceSlug) {
      setError(`Workspace mismatch. Expected: ${workspaceSlug}, Current: ${workspace.slug}`);
    }
  }, [workspace, workspaceSlug]);

  const handleSaveDashboard = async (dashboardData: any) => {
    try {
      console.log('Saving dashboard:', dashboardData);
      // TODO: Implement save logic
      // const result = await dashboardAPI.saveDashboard(dashboardData);
      // if (result.success) {
      //   router.push(`/workspace/${workspaceSlug}/dashboard/${result.dashboard.slug}`);
      // }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      setError('Failed to save dashboard');
    }
  };

  const handlePreviewDashboard = (dashboardData: any) => {
    console.log('Previewing dashboard:', dashboardData);
    // TODO: Implement preview logic
  };

  const handleBackToWorkspace = () => {
    router.push(`/workspace/${workspaceSlug}`);
  };

  // Loading states
  if (authLoading || permissionsLoading || isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading dashboard builder...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={handleBackToWorkspace}
          startIcon={<HomeIcon />}
        >
          Back to Workspace
        </Button>
      </Container>
    );
  }

  // Breadcrumbs
  const breadcrumbs = [
    <Link
      key="workspace"
      color="inherit"
      href={`/workspace/${workspaceSlug}`}
      onClick={(e) => {
        e.preventDefault();
        router.push(`/workspace/${workspaceSlug}`);
      }}
      sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
    >
      <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
      {workspace?.display_name || workspace?.name || 'Workspace'}
    </Link>,
    <Typography key="builder" color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
      <DashboardIcon sx={{ mr: 0.5, fontSize: 16 }} />
      {dashboardId ? 'Edit Dashboard' : 'Dashboard Builder'}
    </Typography>
  ];

  return (
    <WorkspaceLayout
      title={dashboardId ? 'Edit Dashboard' : 'Dashboard Builder'}
      breadcrumbs={breadcrumbs}
      maxWidth={false} // Full width for builder
    >
      <PermissionGate 
        permissions={dashboardId ? ['dashboard.update'] : ['dashboard.create']}
        fallback={
          <Container maxWidth="md" sx={{ py: 4 }}>
            <Alert severity="warning">
              You don't have permission to {dashboardId ? 'edit' : 'create'} dashboards.
              Contact your administrator for access.
            </Alert>
          </Container>
        }
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header with actions */}
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              mb: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderRadius: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" component="h1" fontWeight={600}>
                {dashboardId ? `Editing: ${dashboardName}` : 'New Dashboard'}
              </Typography>
              {workspace && (
                <Chip 
                  label={workspace.display_name || workspace.name}
                  color="primary" 
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() => handlePreviewDashboard({})}
                size="small"
              >
                Preview
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => handleSaveDashboard({})}
                size="small"
                color="primary"
              >
                {dashboardId ? 'Update' : 'Save'} Dashboard
              </Button>
            </Box>
          </Paper>

          {/* Dashboard Builder Component */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {/* Check if DashboardBuilder component exists */}
            {typeof DashboardBuilder !== 'undefined' ? (
              <DashboardBuilder
                dashboardId={dashboardId as string}
                workspaceId={workspace?.id}
                onSave={handleSaveDashboard}
                onPreview={handlePreviewDashboard}
                onDashboardNameChange={setDashboardName}
              />
            ) : (
              /* Fallback UI if DashboardBuilder component is not available */
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 4, 
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom color="text.secondary" fontWeight={600}>
                  Dashboard Builder
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
                  The dashboard builder interface will be loaded here. This is a placeholder
                  while the DashboardBuilder component is being developed.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => console.log('Add chart clicked')}
                  >
                    Add Chart
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => console.log('Add text clicked')}
                  >
                    Add Text Widget
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => console.log('Add filter clicked')}
                  >
                    Add Filter
                  </Button>
                </Box>

                <Alert severity="info" sx={{ mt: 3, maxWidth: 600 }}>
                  <Typography variant="body2">
                    <strong>Development Note:</strong> This page is now properly configured as a React component.
                    The DashboardBuilder component can be implemented here to provide the full dashboard creation experience.
                  </Typography>
                </Alert>
              </Paper>
            )}
          </Box>
        </Box>
      </PermissionGate>
    </WorkspaceLayout>
  );
};

export default DashboardBuilderPage;