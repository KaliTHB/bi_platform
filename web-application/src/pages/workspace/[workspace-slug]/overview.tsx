// web-application/src/pages/workspace/[workspace-slug]/overview.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Container,
  Grid,
  Card,
  CardContent,
  Button
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Share,
  Visibility,
  Dashboard as DashboardIcon,
  Analytics,
  DataObject,
  Settings
} from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';

interface DashboardItem {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdOn: string;
  lastModified?: string;
  isStarred?: boolean;
}

const WorkspaceOverviewPage = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const [dashboards, setDashboards] = useState<DashboardItem[]>([
    {
      id: '1',
      title: 'cims_dash',
      description: 'cims trends dashboard',
      createdBy: 'ankit.kumar',
      createdOn: 'Aug 17, 2023 11:47 AM'
    },
    {
      id: '2',
      title: 'ci_cd_app',
      description: 'the ci cd details',
      createdBy: 'kalimuthu',
      createdOn: 'May 24, 2023 10:27 AM'
    },
    {
      id: '3',
      title: 'kaya_dash',
      description: 'kaya monitoring dashboard',
      createdBy: 'ankit.kumar',
      createdOn: 'May 11, 2023 12:21 PM'
    },
    {
      id: '4',
      title: 'medanta_dash',
      description: 'medanta data trends',
      createdBy: 'ankit.kumar',
      createdOn: 'Apr 27, 2023 01:52 PM'
    },
    {
      id: '5',
      title: 'wockhardt_monitoring',
      description: 'wockhardt monitoring dashboard',
      createdBy: 'ankit.kumar',
      createdOn: 'Aug 09, 2022 09:45 AM'
    },
    {
      id: '6',
      title: 'Hemas Dashboard',
      description: 'Hemas health Care Group',
      createdBy: 'admin',
      createdOn: 'Mar 01, 2022 11:47 AM'
    }
  ]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dashboardId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedDashboard(dashboardId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDashboard(null);
  };

  const handleAddNew = () => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder`);
    }
  };

  const handleViewDashboard = (dashboard: DashboardItem) => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/dashboard/${dashboard.id}`);
    }
  };

  const handleEditDashboard = () => {
    if (workspace && selectedDashboard) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder/${selectedDashboard}`);
    }
    handleMenuClose();
  };

  const quickActions = [
    {
      title: 'Dashboard Builder',
      description: 'Create new dashboard',
      icon: <Analytics sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/dashboard-builder`),
      permissions: ['dashboard.create'],
    },
    {
      title: 'SQL Editor',
      description: 'Query your data',
      icon: <DataObject sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/sql-editor`),
      permissions: ['sql_editor.access'],
    },
    {
      title: 'Categories',
      description: 'Manage categories',
      icon: <DashboardIcon sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/admin/categories`),
      permissions: ['category.read'],
    },
    {
      title: 'Settings',
      description: 'Workspace settings',
      icon: <Settings sx={{ fontSize: 40 }} />,
      action: () => router.push(`/workspace/${workspaceSlug}/admin`),
      permissions: ['workspace.admin'],
    },
  ];

  return (
    <WorkspaceLayout
      title="View Dashboard"
      onAddClick={handleAddNew}
      addButtonText="Add New"
    >
      {/* Quick Actions - Show only if workspace exists */}
      {workspace && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            {quickActions.map((action, index) => {
              // Check permissions
              if (action.permissions && !action.permissions.some(permission => hasPermission(permission))) {
                return null;
              }

              return (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card
                    elevation={1}
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        elevation: 3,
                        transform: 'translateY(-1px)',
                      }
                    }}
                    onClick={action.action}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <Box sx={{ mb: 1, color: 'primary.main' }}>
                        {action.icon}
                      </Box>
                      <Typography variant="subtitle2" component="h3" gutterBottom>
                        {action.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {action.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Dashboards Table */}
      <Paper elevation={1}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            {workspace ? `Dashboards (${dashboards.length})` : 'Recent Dashboards'}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell width="50">#</TableCell>
                <TableCell>Dashboard Title</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Created On</TableCell>
                <TableCell width="100">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboards.map((dashboard, index) => (
                <TableRow 
                  key={dashboard.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleViewDashboard(dashboard)}
                >
                  <TableCell>
                    <Typography variant="body2" color="primary">
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {dashboard.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Created by: {dashboard.createdBy}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {dashboard.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {dashboard.createdOn}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuClick(e, dashboard.id);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {dashboards.length === 0 && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Dashboards Found
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {workspace 
                ? "Get started by creating your first dashboard" 
                : "You don't have access to any dashboards in this workspace"}
            </Typography>
            {workspace && hasPermission('dashboard.create') && (
              <Button
                variant="contained"
                startIcon={<Analytics />}
                onClick={handleAddNew}
              >
                Create Dashboard
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewDashboard(dashboards.find(d => d.id === selectedDashboard)!)}>
          <Visibility sx={{ mr: 1 }} />
          View
        </MenuItem>
        {hasPermission('dashboard.update') && (
          <MenuItem onClick={handleEditDashboard}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {hasPermission('dashboard.share') && (
          <MenuItem onClick={handleMenuClose}>
            <Share sx={{ mr: 1 }} />
            Share
          </MenuItem>
        )}
        {hasPermission('dashboard.delete') && (
          <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>
    </WorkspaceLayout>
  );
};

export default WorkspaceOverviewPage;