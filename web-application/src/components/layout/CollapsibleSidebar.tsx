// web-application/src/components/layout/CollapsibleSidebar.tsx
// FIXED VERSION - Addresses permission and icon issues

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Tooltip,
  Divider,
  Typography
} from '@mui/material';
import {
  Home,
  Dashboard as DashboardIcon,
  Analytics,
  DataObject,
  Settings,
  Group,
  Business,
  Assessment,
  Star,
  MenuOpen,
  Menu as MenuIcon,
  Category,
  Storage,
  BarChart,
  TableChart,
  ViewList
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permissions?: string[];
  divider?: boolean;
}

interface CollapsibleSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  workspaceSlug?: string;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  isOpen,
  onToggle,
  workspaceSlug
}) => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const drawerWidth = isOpen ? 280 : 64;

  // FIXED: Better admin role checking
  const isAdmin = React.useMemo(() => {
    if (!user) return false;
    
    // Check multiple admin indicators
    const roleBasedAdmin = user?.role === 'admin' || 
                          user?.roles?.some((role: any) => 
                            role.name === 'admin' || 
                            role.name === 'workspace_admin' ||
                            role.name === 'system_admin'
                          );
    
    const permissionBasedAdmin = hasPermission('workspace.admin') || 
                                hasPermission('admin.all') ||
                                hasPermission('system.admin');
    
    return roleBasedAdmin || permissionBasedAdmin;
  }, [user, hasPermission]);

  // FIXED: Sidebar items with fallback for missing workspaceSlug
  const sidebarItems: SidebarItem[] = React.useMemo(() => [
    // Overview Section - Always accessible
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/overview` : '/workspace-selector'
    },
    
    // Main List Pages
    {
      id: 'dashboard-list',
      label: 'Dashboard List',
      icon: <ViewList />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/dashboards` : '/workspace-selector',
      permissions: ['dashboard.read']
    },
    {
      id: 'dataset-list',
      label: 'Dataset List',
      icon: <TableChart />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/datasets` : '/workspace-selector',
      permissions: ['dataset.read']
    },
    {
      id: 'datasource-list',
      label: 'Data Source List',
      icon: <Storage />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/datasources` : '/workspace-selector',
      permissions: ['datasource.read']
    },
    {
      id: 'chart-list',
      label: 'Chart List',
      icon: <BarChart />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/charts` : '/workspace-selector',
      permissions: ['chart.read'],
      divider: true
    },

    // Builder Tools
    {
      id: 'dashboard-builder',
      label: 'Dashboard Builder',
      icon: <Analytics />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/dashboard-builder` : '/workspace-selector',
      permissions: ['dashboard.create']
    },
    {
      id: 'sql-editor',
      label: 'SQL Editor',
      icon: <DataObject />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/sql-editor` : '/workspace-selector',
      permissions: ['sql_editor.access'],
      divider: true
    },

    // Quick Access - Always accessible
    {
      id: 'recent',
      label: 'Recent',
      icon: <Assessment />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/recent` : '/workspace-selector'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: <Star />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/favorites` : '/workspace-selector',
      divider: true
    },

    // Administration
    {
      id: 'categories',
      label: 'Categories',
      icon: <Category />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/categories` : '/workspace-selector',
      permissions: ['category.read']
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Group />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/users` : '/workspace-selector',
      permissions: ['user.read']
    },
    {
      id: 'workspace-settings',
      label: 'Workspace',
      icon: <Business />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/workspace` : '/workspace-selector',
      permissions: ['workspace.admin']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/settings` : '/workspace-selector',
      permissions: ['workspace.admin']
    }
  ], [workspaceSlug]);

  // FIXED: Navigation handler with better error handling
  const handleNavigation = (item: SidebarItem) => {
    console.log('🚀 Navigation attempt:', { 
      item: item.label, 
      path: item.path, 
      workspaceSlug,
      isAdmin
    });

    if (!item.path || item.path === '#') {
      console.warn('❌ Invalid path for item:', item.label);
      return;
    }

    try {
      router.push(item.path);
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  // FIXED: Better active page detection
  const isActivePage = (itemPath: string): boolean => {
    if (!itemPath || itemPath === '#' || !router.isReady) return false;
    
    const currentPath = router.asPath;
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  // FIXED: Permission checking with admin override
  const hasRequiredPermissions = (item: SidebarItem): boolean => {
    // Admin users see ALL menus
    if (isAdmin) {
      console.log('👑 Admin access granted for:', item.label);
      return true;
    }

    // Items without permissions are always visible
    if (!item.permissions || item.permissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    const hasAccess = hasAnyPermission ? 
      hasAnyPermission(item.permissions) : 
      item.permissions.some(permission => hasPermission(permission));

    console.log(`🔐 Permission check for ${item.label}:`, {
      permissions: item.permissions,
      hasAccess,
      isAdmin
    });

    return hasAccess;
  };

  const renderSidebarItem = (item: SidebarItem) => {
    if (!hasRequiredPermissions(item)) {
      return null;
    }

    const isActive = isActivePage(item.path);
    const isDisabled = !workspaceSlug && item.path.includes('/workspace/');

    const listItem = (
      <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
        <ListItemButton
          onClick={() => handleNavigation(item)}
          disabled={isDisabled}
          sx={{
            minHeight: 48,
            justifyContent: isOpen ? 'initial' : 'center',
            px: 2.5,
            mx: 1,
            borderRadius: 1,
            mb: 0.5,
            backgroundColor: isActive ? 'primary.main' : 'transparent',
            color: isActive ? 'primary.contrastText' : 'text.primary',
            '&:hover': {
              backgroundColor: isActive ? 'primary.dark' : 'action.hover',
            },
            '&.Mui-disabled': {
              opacity: 0.5,
              color: 'text.disabled'
            },
            // FIXED: Ensure clickable area
            cursor: isDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: isOpen ? 3 : 'auto',
              justifyContent: 'center',
              color: isActive ? 'primary.contrastText' : 'inherit',
              // FIXED: Ensure icons are visible
              '& svg': {
                fontSize: '1.25rem'
              }
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            sx={{ 
              opacity: isOpen ? 1 : 0,
              color: isActive ? 'primary.contrastText' : 'inherit'
            }}
          />
        </ListItemButton>
        {item.divider && <Divider sx={{ mt: 1, mb: 1 }} />}
      </ListItem>
    );

    // Wrap with Tooltip when sidebar is collapsed
    if (!isOpen && !isDisabled) {
      return (
        <Tooltip key={item.id} title={item.label} placement="right" arrow>
          {listItem}
        </Tooltip>
      );
    }

    return listItem;
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          borderRight: 1,
          borderColor: 'divider',
          // FIXED: Ensure proper z-index
          zIndex: (theme) => theme.zIndex.drawer
        },
      }}
    >
      {/* Sidebar Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          px: 2,
          py: 1,
          minHeight: 64,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        {isOpen && workspace && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {workspace.display_name || workspace.name}
            </Typography>
            <Typography variant="caption" color="textSecondary" noWrap>
              {workspace.description || 'Workspace'}
            </Typography>
            {/* Admin indicator */}
            {isAdmin && (
              <Typography variant="caption" color="primary" noWrap sx={{ fontWeight: 'bold' }}>
                👑 Admin Access
              </Typography>
            )}
          </Box>
        )}
        <IconButton onClick={onToggle} size="small">
          {isOpen ? <MenuOpen /> : <MenuIcon />}
        </IconButton>
      </Box>

      {/* Navigation Items */}
      <List sx={{ pt: 1 }}>
        {sidebarItems.map(renderSidebarItem).filter(Boolean)}
      </List>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && isOpen && (
        <Box sx={{ mt: 'auto', p: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="textSecondary" display="block">
            Debug: {isAdmin ? 'Admin' : 'User'} | Workspace: {workspaceSlug || 'None'}
          </Typography>
        </Box>
      )}

      {/* Footer when expanded */}
      {isOpen && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="textSecondary" display="block">
            BI Platform v1.0
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default CollapsibleSidebar;