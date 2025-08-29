// web-application/src/pages/workspace/[workspace-slug]/index.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Container, Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import { Dashboard, DataObject, Analytics, Settings } from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import Navigation from '../../../components/shared/Navigation';
import PermissionGate from '../../../components/shared/PermissionGate';

export default function WorkspaceDashboard() {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { user, workspace } = useAuth();
  const { canCreateDashboard, canAccessAdmin, canManageCategories } = usePermissions();

  const quickActions = [
    {
      title: 'Dashboard Builder',
      description: 'Create and design interactive dashboards',
      icon: <Analytics sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/dashboard-builder`),
      permissions: ['dashboard.create'],
    },
    {
      title: 'SQL Editor',
      description: 'Write and execute SQL queries',
      icon: <DataObject sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/sql-editor`),
      permissions: ['sql_editor.access'],
    },
    {
      title: 'Manage Categories',
      description: 'Organize dashboards with categories',
      icon: <Dashboard sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/admin/categories`),
      permissions: ['category.read'],
    },
    {
      title: 'Administration',
      description: 'Manage users, roles, and workspace settings',
      icon: <Settings sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/admin`),
      permissions: ['workspace.admin'],
    },
  ];

  return (
    <Box>
      <Navigation />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to {workspace?.display_name}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Get started with your business intelligence workspace
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {quickActions.map((action, index) => (
            <PermissionGate key={index} permissions={action.permissions}>
              <Grid item xs={12} sm={6} md={3}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={action.action}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ mb: 2, color: 'primary.main' }}>
                      {action.icon}
                    </Box>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </PermissionGate>
          ))}
        </Grid>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Recent Activity
          </Typography>
          <Card>
            <CardContent>
              <Typography variant="body1" color="textSecondary" align="center" sx={{ py: 4 }}>
                No recent activity to display
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
}