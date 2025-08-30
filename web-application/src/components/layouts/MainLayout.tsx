// web-application/src/components/layout/MainLayout.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Divider,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Dataset,
  Analytics,
  Settings,
  People,
  Logout,
  Notifications,
  AccountCircle,
  ChevronRight,
  Home
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { logout } from '@/store/slices/authSlice';
import { setWorkspace } from '@/store/slices/workspaceSlice';
import { WorkspaceSwitcher } from '../shared/WorkspaceSwitcher';
import { NotificationCenter } from '../shared/NotificationCenter';
import { PermissionGate } from '../shared/PermissionGate';

const drawerWidth = 280;

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  title: string;
  icon: React.ReactElement;
  path: string;
  permission?: string;
  children?: NavigationItem[];
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // Navigation items based on current workspace context
  const navigationItems: NavigationItem[] = [
    {
      title: 'Overview',
      icon: <Home />,
      path: `/workspace/${currentWorkspace?.slug}`,
    },
    {
      title: 'Dashboards',
      icon: <Dashboard />,
      path: `/workspace/${currentWorkspace?.slug}/dashboards`,
      permission: 'dashboard.read'
    },
    {
      title: 'Dashboard Builder',
      icon: <Analytics />,
      path: `/workspace/${currentWorkspace?.slug}/dashboard-builder`,
      permission: 'dashboard.write'
    },
    {
      title: 'Datasets',
      icon: <Dataset />,
      path: `/workspace/${currentWorkspace?.slug}/datasets`,
      permission: 'dataset.read'
    },
    {
      title: 'SQL Editor',
      icon: <Analytics />,
      path: `/workspace/${currentWorkspace?.slug}/sql-editor`,
      permission: 'dataset.query'
    },
    {
      title: 'Administration',
      icon: <Settings />,
      path: `/workspace/${currentWorkspace?.slug}/admin`,
      permission: 'workspace.admin',
      children: [
        {
          title: 'Users & Roles',
          icon: <People />,
          path: `/workspace/${currentWorkspace?.slug}/admin/users`,
          permission: 'user.read'
        },
        {
          title: 'Data Sources',
          icon: <Dataset />,
          path: `/workspace/${currentWorkspace?.slug}/admin/data-sources`,
          permission: 'data_source.read'
        },
        {
          title: 'Settings',
          icon: <Settings />,
          path: `/workspace/${currentWorkspace?.slug}/admin/settings`,
          permission: 'workspace.write'
        }
      ]
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
    handleUserMenuClose();
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const generateBreadcrumbs = () => {
    if (!currentWorkspace) return [];

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      {
        label: currentWorkspace.name,
        href: `/workspace/${currentWorkspace.slug}`
      }
    ];

    // Build breadcrumbs based on path
    if (pathSegments.includes('dashboards')) {
      breadcrumbs.push({
        label: 'Dashboards',
        href: `/workspace/${currentWorkspace.slug}/dashboards`
      });
    }
    
    if (pathSegments.includes('dashboard-builder')) {
      breadcrumbs.push({
        label: 'Dashboard Builder',
        href: `/workspace/${currentWorkspace.slug}/dashboard-builder`
      });
    }

    if (pathSegments.includes('datasets')) {
      breadcrumbs.push({
        label: 'Datasets',
        href: `/workspace/${currentWorkspace.slug}/datasets`
      });
    }

    if (pathSegments.includes('admin')) {
      breadcrumbs.push({
        label: 'Administration',
        href: `/workspace/${currentWorkspace.slug}/admin`
      });
    }

    return breadcrumbs;
  };

  const renderNavigationItems = (items: NavigationItem[], level = 0) => {
    return items.map((item) => (
      <PermissionGate key={item.path} permission={item.permission}>
        <ListItem disablePadding sx={{ pl: level * 2 }}>
          <ListItemButton
            onClick={() => handleNavigation(item.path)}
            selected={pathname === item.path}
            sx={{
              borderRadius: 1,
              mx: 1,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main + '15',
                '&:hover': {
                  backgroundColor: theme.palette.primary.main + '25',
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: pathname === item.path ? theme.palette.primary.main : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.title}
              sx={{ 
                color: pathname === item.path ? theme.palette.primary.main : 'inherit',
                '& .MuiListItemText-primary': {
                  fontWeight: pathname === item.path ? 600 : 400
                }
              }}
            />
            {item.children && <ChevronRight />}
          </ListItemButton>
        </ListItem>
        {item.children && renderNavigationItems(item.children, level + 1)}
      </PermissionGate>
    ));
  };

  const drawer = (
    <Box sx={{ overflow: 'auto', mt: 1 }}>
      {/* Workspace Switcher */}
      <Box sx={{ px: 2, py: 1 }}>
        <WorkspaceSwitcher />
      </Box>
      
      <Divider sx={{ my: 1 }} />
      
      {/* Navigation Items */}
      <List>
        {renderNavigationItems(navigationItems)}
      </List>
    </Box>
  );

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}
      >
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumbs */}
          <Box sx={{ flexGrow: 1 }}>
            <Breadcrumbs separator="›" aria-label="breadcrumb">
              {generateBreadcrumbs().map((breadcrumb, index) => (
                <MuiLink
                  key={index}
                  color="inherit"
                  href={breadcrumb.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation(breadcrumb.href);
                  }}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {breadcrumb.label}
                </MuiLink>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationOpen}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* User menu */}
          <IconButton
            color="inherit"
            onClick={handleUserMenuOpen}
            sx={{ p: 0 }}
          >
            <Avatar
              src={user?.avatar_url}
              alt={`${user?.first_name} ${user?.last_name}`}
              sx={{ width: 32, height: 32 }}
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          p: 3,
        }}
      >
        {children}
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleNavigation('/profile')}>
          <AccountCircle sx={{ mr: 1 }} />
          Profile Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Notification Center */}
      <NotificationCenter
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
      />
    </Box>
  );
};

export default MainLayout;