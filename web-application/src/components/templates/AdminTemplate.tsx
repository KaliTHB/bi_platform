// web-application/src/components/templates/AdminTemplate.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Breadcrumbs,
  Link,
  Button,
  Alert,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  People as UsersIcon,
  Security as RolesIcon,
  Settings as SettingsIcon,
  Category as CategoriesIcon,
  Visibility as WebviewIcon,
  Assessment as AuditIcon,
  Extension as PluginsIcon,
  Storage as DataSourcesIcon,
  Home as HomeIcon,
  Business as WorkspaceIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

// Import layout and shared components
import WorkspaceLayout from '../layout/WorkspaceLayout';
import { PermissionGate } from '../shared/PermissionGate';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

export interface AdminTemplateProps {
  title?: string;
  subtitle?: string;
  activeTab?: string;
  children?: React.ReactNode;
  showTabs?: boolean;
  showQuickActions?: boolean;
  showSystemHealth?: boolean;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  customRoles: number;
  totalCategories: number;
  totalWebviews: number;
  recentActions: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  description: string;
}

const AdminTemplate: React.FC<AdminTemplateProps> = ({
  title = 'Administration',
  subtitle = 'Manage workspace settings and users',
  activeTab,
  children,
  showTabs = true,
  showQuickActions = true,
  showSystemHealth = true
}) => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    customRoles: 0,
    totalCategories: 0,
    totalWebviews: 0,
    recentActions: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(activeTab || 'overview');

  // Load admin statistics
  useEffect(() => {
    const loadAdminStats = async () => {
      if (!workspace?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/workspaces/${workspace.id}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          const stats = await response.json();
          setAdminStats(stats);
        }
      } catch (error) {
        console.error('Failed to load admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminStats();
  }, [workspace?.id]);

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'users',
      label: 'Manage Users',
      icon: <UsersIcon />,
      path: `/workspace/${workspace?.slug}/admin/users`,
      permission: 'user_mgmt.read',
      color: 'primary',
      description: 'Add, edit, and manage user accounts'
    },
    {
      id: 'roles',
      label: 'Roles & Permissions',
      icon: <RolesIcon />,
      path: `/workspace/${workspace?.slug}/admin/roles`,
      permission: 'role.read',
      color: 'secondary',
      description: 'Configure roles and permissions'
    },
    {
      id: 'categories',
      label: 'Dashboard Categories',
      icon: <CategoriesIcon />,
      path: `/workspace/${workspace?.slug}/admin/categories`,
      permission: 'category.read',
      color: 'success',
      description: 'Organize dashboards into categories'
    },
    {
      id: 'webviews',
      label: 'Webview Panels',
      icon: <WebviewIcon />,
      path: `/workspace/${workspace?.slug}/admin/webviews`,
      permission: 'webview.read',
      color: 'info',
      description: 'Configure public dashboard panels'
    },
    {
      id: 'datasources',
      label: 'Data Sources',
      icon: <DataSourcesIcon />,
      path: `/workspace/${workspace?.slug}/admin/datasources`,
      permission: 'datasource.read',
      color: 'warning',
      description: 'Manage database connections'
    },
    {
      id: 'plugins',
      label: 'Plugins',
      icon: <PluginsIcon />,
      path: `/workspace/${workspace?.slug}/admin/plugins`,
      permission: 'plugin.read',
      color: 'secondary',
      description: 'Enable and configure plugins'
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: <AuditIcon />,
      path: `/workspace/${workspace?.slug}/admin/audit`,
      permission: 'audit.read',
      color: 'error',
      description: 'View system activity and security logs'
    },
    {
      id: 'settings',
      label: 'Workspace Settings',
      icon: <SettingsIcon />,
      path: `/workspace/${workspace?.slug}/admin/settings`,
      permission: 'workspace.update',
      color: 'primary',
      description: 'Configure workspace preferences'
    }
  ];

  // Filter actions based on permissions
  const availableActions = quickActions.filter(action => 
    !action.permission || hasPermission(action.permission as any, 'read' as any)
  );

  // Tab definitions
  const adminTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users', permission: 'user_mgmt.read' },
    { id: 'roles', label: 'Roles', permission: 'role.read' },
    { id: 'categories', label: 'Categories', permission: 'category.read' },
    { id: 'webviews', label: 'Webviews', permission: 'webview.read' },
    { id: 'settings', label: 'Settings', permission: 'workspace.update' }
  ].filter(tab => !tab.permission || hasPermission(tab.permission as any, 'read' as any));

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
    
    // Navigate based on tab selection
    const tabRoutes: Record<string, string> = {
      overview: `/workspace/${workspace?.slug}/admin`,
      users: `/workspace/${workspace?.slug}/admin/users`,
      roles: `/workspace/${workspace?.slug}/admin/roles`,
      categories: `/workspace/${workspace?.slug}/admin/categories`,
      webviews: `/workspace/${workspace?.slug}/admin/webviews`,
      settings: `/workspace/${workspace?.slug}/admin/settings`
    };

    if (tabRoutes[newValue]) {
      router.push(tabRoutes[newValue]);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    router.push(action.path);
  };

  return (
    <PermissionGate permissions={['workspace.read']}>
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Breadcrumbs */}
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/workspace/${workspace?.slug}`);
                }}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Workspace
              </Link>
              <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <AdminIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                Administration
              </Typography>
            </Breadcrumbs>
          </Box>

          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>

          {/* System Health Alert */}
          {showSystemHealth && adminStats.systemHealth !== 'healthy' && (
            <Alert 
              severity={adminStats.systemHealth === 'warning' ? 'warning' : 'error'} 
              sx={{ mb: 3 }}
            >
              <Typography variant="subtitle2">
                System Status: {adminStats.systemHealth.toUpperCase()}
              </Typography>
              <Typography variant="body2">
                {adminStats.systemHealth === 'warning' 
                  ? 'Some system components need attention'
                  : 'Critical system issues detected'
                }
              </Typography>
            </Alert>
          )}

          {/* Admin Statistics Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      <UsersIcon />
                    </Box>
                    <Box>
                      <Typography variant="h4" component="div">
                        {adminStats.totalUsers}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      <RolesIcon />
                    </Box>
                    <Box>
                      <Typography variant="h4" component="div">
                        {adminStats.totalRoles}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Roles
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: 'info.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      <CategoriesIcon />
                    </Box>
                    <Box>
                      <Typography variant="h4" component="div">
                        {adminStats.totalCategories}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Categories
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={`System ${adminStats.systemHealth.toUpperCase()}`}
                      color={
                        adminStats.systemHealth === 'healthy' ? 'success' :
                        adminStats.systemHealth === 'warning' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  </Box>
                  <Typography variant="h4" component="div" sx={{ mt: 1 }}>
                    {adminStats.recentActions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recent Actions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Admin Tabs */}
          {showTabs && (
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                {adminTabs.map((tab) => (
                  <Tab
                    key={tab.id}
                    label={tab.label}
                    value={tab.id}
                  />
                ))}
              </Tabs>
            </Paper>
          )}

          {/* Quick Actions Grid */}
          {showQuickActions && !children && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {availableActions.map((action) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={action.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => handleQuickAction(action)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: `${action.color}.main`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            flexShrink: 0
                          }}
                        >
                          {action.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {action.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {action.description}
                          </Typography>
                        </Box>
                        <ArrowForwardIcon color="action" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Content Area */}
          {children && (
            <Box>
              {children}
            </Box>
          )}
        </Container>
      </WorkspaceLayout>
    </PermissionGate>
  );
};

export default AdminTemplate;