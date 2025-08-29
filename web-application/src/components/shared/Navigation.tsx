// web-application/src/components/shared/Navigation.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Dashboard,
  DataObject,
  Settings,
  AccountCircle,
  Menu as MenuIcon,
  Analytics,
  Category,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspace } from '../providers/WorkspaceProvider';
import PermissionGate from './PermissionGate';

export const Navigation: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = () => {
    signOut();
    handleProfileMenuClose();
  };

  const navigationItems = [
    {
      label: 'Dashboards',
      icon: <Dashboard />,
      path: `/workspace/${currentWorkspace?.slug}`,
      permissions: ['dashboard.read']
    },
    {
      label: 'Datasets',
      icon: <DataObject />,
      path: `/workspace/${currentWorkspace?.slug}/datasets`,
      permissions: ['dataset.read']
    },
    {
      label: 'Dashboard Builder',
      icon: <Analytics />,
      path: `/workspace/${currentWorkspace?.slug}/dashboard-builder`,
      permissions: ['dashboard.create']
    },
    {
      label: 'SQL Editor',
      icon: <DataObject />,
      path: `/workspace/${currentWorkspace?.slug}/sql-editor`,
      permissions: ['sql_editor.access']
    },
    {
      label: 'Categories',
      icon: <Category />,
      path: `/workspace/${currentWorkspace?.slug}/admin/categories`,
      permissions: ['category.read']
    },
    {
      label: 'Admin',
      icon: <Settings />,
      path: `/workspace/${currentWorkspace?.slug}/admin`,
      permissions: ['workspace.admin']
    },
  ];

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BI Platform - {currentWorkspace?.display_name}
          </Typography>

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, mr: 2 }}>
            {navigationItems.map((item) => (
              <PermissionGate key={item.path} permissions={item.permissions}>
                <Button
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => router.push(item.path)}
                  sx={{ mx: 1 }}
                >
                  {item.label}
                </Button>
              </PermissionGate>
            ))}
          </Box>

          <IconButton
            size="large"
            edge="end"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
      >
        <MenuItem onClick={() => router.push('/profile')}>
          Profile
        </MenuItem>
        <MenuItem onClick={() => router.push('/workspace-selector')}>
          Switch Workspace
        </MenuItem>
        <MenuItem onClick={handleSignOut}>
          Sign Out
        </MenuItem>
      </Menu>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { sm: 'none' } }}
      >
        <Box sx={{ width: 250 }} onClick={() => setDrawerOpen(false)}>
          <List>
            {navigationItems.map((item) => (
              <PermissionGate key={item.path} permissions={item.permissions}>
                <ListItem button onClick={() => router.push(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItem>
              </PermissionGate>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation;