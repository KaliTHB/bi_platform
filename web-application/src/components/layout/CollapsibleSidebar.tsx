// web-application/src/components/layout/CollapsibleSidebar.tsx
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
  Category
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
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const drawerWidth = isOpen ? 280 : 64;

  const sidebarItems: SidebarItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/overview` : '/workspace-selector'
    },
    {
      id: 'dashboards',
      label: 'View Dashboard',
      icon: <DashboardIcon />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/dashboards` : '#',
      permissions: ['dashboard.read']
    },
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
    {
      id: 'builder',
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
      permissions: ['sql_editor.access']
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: <Category />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/categories` : '#',
      permissions: ['category.read'],
      divider: true
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Group />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin/users` : '#',
      permissions: ['user.read']
    },
    {
      id: 'workspace',
      label: 'Workspace',
      icon: <Business />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/admin` : '#',
      permissions: ['workspace.admin']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings />,
      path: workspaceSlug ? `/workspace/${workspaceSlug}/settings` : '#'
    }
  ];

  const handleNavigation = (item: SidebarItem) => {
    if (item.path !== '#') {
      router.push(item.path);
    }
  };

  const renderSidebarItem = (item: SidebarItem) => {
    // Check permissions if required
    if (item.permissions && !item.permissions.some(permission => hasPermission(permission))) {
      return null;
    }

    const isActive = router.pathname === item.path;
    const isDisabled = item.path === '#';

    const listItem = (
      <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
        <ListItemButton
          onClick={() => handleNavigation(item)}
          disabled={isDisabled}
          sx={{
            minHeight: 48,
            justifyContent: isOpen ? 'initial' : 'center',
            px: 2.5,
            bgcolor: isActive ? 'action.selected' : 'transparent',
            '&:hover': {
              bgcolor: 'action.hover'
            },
            '&.Mui-disabled': {
              opacity: 0.5
            }
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: isOpen ? 3 : 'auto',
              justifyContent: 'center',
              color: isActive ? 'primary.main' : 'inherit'
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            sx={{ 
              opacity: isOpen ? 1 : 0,
              color: isActive ? 'primary.main' : 'inherit'
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
              {workspace.name}
            </Typography>
            <Typography variant="caption" color="textSecondary" noWrap>
              {workspace.description || 'Workspace'}
            </Typography>
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
        </Box>
      )}
    </Drawer>
  );
};

export default CollapsibleSidebar;