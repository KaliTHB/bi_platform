// web-application/src/components/layout/CollapsibleSidebar.tsx
// MINIMAL FIXES - Admin users see all menus, fix navigation

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
  const { hasPermission } = usePermissions();

  const drawerWidth = isOpen ? 280 : 64;

  // FIX: Check if user is admin - admin users see ALL menus
  const isAdmin = user?.role === 'admin' || 
                 hasPermission('admin.all') || 
                 user?.roles?.some((role: any) => role.name === 'admin');

  // FIX: Updated sidebar items with correct paths and permissions
  const sidebarItems: SidebarItem[] = [
    // Overview Section
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/overview` : '/workspace-selector'
    },
    
    // Main List Pages (as per your requirements)
    {
      id: 'dashboard-list',
      label: 'Dashboard List',
      icon: <ViewList />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/dashboards` : '#',
      permissions: ['dashboard.read']
    },
    {
      id: 'dataset-list',
      label: 'Dataset List',
      icon: <TableChart />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/datasets` : '#',
      permissions: ['dataset.read']
    },
    {
      id: 'datasource-list',
      label: 'Data Source List',
      icon: <Storage />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/datasources` : '#',
      permissions: ['datasource.read']
    },
    {
      id: 'chart-list',
      label: 'Chart List',
      icon: <BarChart />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/charts` : '#',
      permissions: ['chart.read'],
      divider: true
    },

    // Builder Tools
    {
      id: 'dashboard-builder',
      label: 'Dashboard Builder',
      icon: <Analytics />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/dashboard-builder` : '#',
      permissions: ['dashboard.create']
    },
    {
      id: 'sql-editor',
      label: 'SQL Editor',
      icon: <DataObject />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/sql-editor` : '#',
      permissions: ['sql_editor.access'],
      divider: true
    },

    // Quick Access
    {
      id: 'recent',
      label: 'Recent',
      icon: <Assessment />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/recent` : '#'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: <Star />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/favorites` : '#',
      divider: true
    },

    // Administration
    {
      id: 'categories',
      label: 'Categories',
      icon: <Category />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/categories` : '#',
      permissions: ['category.read']
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Group />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/users` : '#',
      permissions: ['user.read']
    },
    {
      id: 'workspace-settings',
      label: 'Workspace',
      icon: <Business />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/workspace` : '#',
      permissions: ['workspace.admin']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/settings` : '#',
      permissions: ['workspace.admin']
    }
  ];

  // FIX: Better navigation handler
  const handleNavigation = (item: SidebarItem) => {
    if (item.path && item.path !== '#' && workspaceSlug) {
      console.log('🚀 Navigating to:', item.path); // DEBUG
      router.push(item.path);
    } else {
      console.warn('❌ Navigation blocked:', { path: item.path, workspaceSlug }); // DEBUG
    }
  };

  // FIX: Better active page detection
  const isActivePage = (itemPath: string): boolean => {
    if (!itemPath || itemPath === '#' || !router.isReady) return false;
    return router.asPath === itemPath || router.asPath.startsWith(itemPath + '/');
  };

  const renderSidebarItem = (item: SidebarItem) => {
    // FIX: Admin users see ALL menus, regular users need permissions
    const hasRequiredPermissions = isAdmin || !item.permissions || 
      item.permissions.some(permission => hasPermission(permission));
    
    if (!hasRequiredPermissions) {
      console.log(`🔒 Hiding ${item.label} - missing permissions:`, item.permissions);
      return null;
    }

    const isActive = isActivePage(item.path);
    const isDisabled = item.path === '#' || !workspaceSlug;

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
            }
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: isOpen ? 3 : 'auto',
              justifyContent: 'center',
              color: isActive ? 'primary.contrastText' : 'inherit'
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
          borderColor: 'divider'
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
            {/* ADD: Admin indicator */}
            {isAdmin && (
              <Typography variant="caption" color="primary" noWrap sx={{ fontWeight: 'bold' }}>
                Admin Access
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
        {sidebarItems.map(renderSidebarItem)}
      </List>

      {/* Footer when expanded */}
      {isOpen && (
        <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="textSecondary" display="block">
            BI Platform v1.0
          </Typography>
          {isAdmin && (
            <Typography variant="caption" color="primary" display="block" sx={{ fontWeight: 'bold' }}>
              Administrator
            </Typography>
          )}
        </Box>
      )}
    </Drawer>
  );
};

export default CollapsibleSidebar;