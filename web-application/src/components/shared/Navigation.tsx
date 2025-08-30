import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  BarChart,
  Storage,
  Settings,
  ExitToApp,
  Person,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '../../store';
import { useLogoutMutation } from '../../store/api/authApi';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { PermissionGate } from './PermissionGate';

interface NavigationProps {
  children: React.ReactNode;
}

export const Navigation: React.FC<NavigationProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  
  const { user, workspace } = useSelector((state: RootState) => state.auth);
  const [logout] = useLogoutMutation();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigationItems = [
    {
      text: 'Dashboards',
      icon: <Dashboard />,
      path: `/workspace/${workspace?.slug}`,
      permissions: ['dashboard.read'],
    },
    {
      text: 'Charts',
      icon: <BarChart />,
      path: `/workspace/${workspace?.slug}/charts`,
      permissions: ['chart.read'],
    },
    {
      text: 'Datasets',
      icon: <Storage />,
      path: `/workspace/${workspace?.slug}/datasets`,
      permissions: ['dataset.read'],
    },
    {
      text: 'Dashboard Builder',
      icon: <Dashboard />,
      path: `/workspace/${workspace?.slug}/dashboard-builder`,
      permissions: ['dashboard.create', 'dashboard.edit'],
    },
    {
      text: 'SQL Editor',
      icon: <BarChart />,
      path: `/workspace/${workspace?.slug}/sql-editor`,
      permissions: ['dataset.create', 'query.execute'],
    },
  ];

  const adminItems = [
    {
      text: 'User Management',
      icon: <Person />,
      path: `/workspace/${workspace?.slug}/admin/users`,
      permissions: ['user.manage'],
    },
    {
      text: 'Workspace Settings',
      icon: <Settings />,
      path: `/workspace/${workspace?.slug}/admin/settings`,
      permissions: ['workspace.manage'],
    },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ marginRight: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BI Platform
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WorkspaceSwitcher />
            
            <IconButton
              color="inherit"
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.display_name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
      >
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <Person sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ExitToApp sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Toolbar />
        <Box sx={{ width: 250, pt: 1 }}>
          <List>
            {navigationItems.map((item) => (
              <PermissionGate key={item.text} permissions={item.permissions}>
                <ListItem 
                  button 
                  onClick={() => handleNavigation(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              </PermissionGate>
            ))}
          </List>
          
          <PermissionGate permissions={['user.manage', 'workspace.manage']}>
            <>
              <Divider />
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Administration" 
                    primaryTypographyProps={{ variant: 'overline', color: 'textSecondary' }}
                  />
                </ListItem>
                {adminItems.map((item) => (
                  <PermissionGate key={item.text} permissions={item.permissions}>
                    <ListItem 
                      button 
                      onClick={() => handleNavigation(item.path)}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItem>
                  </PermissionGate>
                ))}
              </List>
            </>
          </PermissionGate>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </>
  );
};