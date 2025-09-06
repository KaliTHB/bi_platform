// web-application/src/pages/workspace/dashboard/new.tsx
import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography, Container, Alert, Button } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

// Import your existing components
import DashboardBuilder   from '@/components/builder/DashboardBuilder';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';

const DashboardBuilderPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // Extract any query parameters for editing existing dashboard
  const dashboardId = router.query.id as string | undefined;
  
  const handleSaveDashboard = async (dashboardData: any) => {
    try {
      console.log('Dashboard saved:', dashboardData);
      // The DashboardBuilder component should handle the navigation
      if (dashboardData.id) {
        router.push(`/workspace/${workspace?.slug}/dashboard/${dashboardData.slug || dashboardData.id}`);
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handlePreviewDashboard = (dashboardData: any) => {
    console.log('Preview dashboard:', dashboardData);
    // Handle preview logic
  };

  // Loading state
  if (authLoading || permissionsLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#f8fafc"
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading dashboard builder...</Typography>
      </Box>
    );
  }

  // Check workspace
  if (!workspace) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          No workspace selected. Please select a workspace first.
        </Alert>
        <Button
          variant="outlined"
          onClick={() => router.push('/workspace')}
          startIcon={<HomeIcon />}
        >
          Select Workspace
        </Button>
      </Container>
    );
  }

  return (
    <PermissionGate 
      permissions={dashboardId ? ['dashboard.update'] : ['dashboard.create']}
      fallback={
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning">
            You don't have permission to {dashboardId ? 'edit' : 'create'} dashboards.
            Contact your administrator for access.
          </Alert>
          <Button
            variant="outlined"
            onClick={() => router.push(`/workspace/${workspace.slug}`)}
            startIcon={<HomeIcon />}
            sx={{ mt: 2 }}
          >
            Back to Workspace
          </Button>
        </Container>
      }
    >
      <Box sx={{ height: '100vh', bgcolor: '#f8fafc' }}>
        <DashboardBuilder
          dashboardId={dashboardId}
          workspaceId={workspace.id}
          onSave={handleSaveDashboard}
          onCancel={handleCancel}
          onPreview={handlePreviewDashboard}
        />
      </Box>
    </PermissionGate>
  );
};

export default DashboardBuilderPage;