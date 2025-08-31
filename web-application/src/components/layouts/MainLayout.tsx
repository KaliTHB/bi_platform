// web-application/src/components/layouts/MainLayout.tsx
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
  Link as MuiLink,
  Collapse,
  Tooltip
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
  Home,
  ExpandLess,
  ExpandMore,
  Build,
  AdminPanelSettings,
  Storage,
  Edit,
  Visibility
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
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
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [expandedMenuItems, setExpandedMenuItems] = useState<Set<string>>(new Set());

  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { currentWorkspace } = useAppSelector((state) => state.workspace);

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
      icon: <Build />,
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
      icon: <Edit />,
      path: `/workspace/${currentWorkspace?.slug}/sql-editor`,
      permission: 'dataset.query'
    },
    {
      title: 'Administration',
      icon: <AdminPanelSettings />,
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
          icon: <Storage />,
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

  const handleMenuItemToggle = (itemTitle: string) => {
    const newExpanded = new Set(expandedMenuItems);
    if (newExpanded.has(itemTitle)) {
      newExpanded.delete(itemTitle);
    } else {
      newExpanded.add(itemTitle);
    }
    setExpandedMenuItems(newExpanded);
  };

  const generateBreadcrumbs = () => {
    if (!currentWorkspace || !pathname) return [];
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [
      {
        label: currentWorkspace.name,
        href: `/workspace/${currentWorkspace.slug}`,
        current: pathSegments.length <= 2
      }
    ];

    // Generate breadcrumbs based on path segments
    if (pathSegments.length > 2) {
      const section = pathSegments[2];
      const subsection = pathSegments[3];
      
      switch (section) {
        case 'dashboards':
          breadcrumbs.push({
            label: 'Dashboards',
            href: `/workspace/${currentWorkspace.slug}/dashboards`,
            current: !subsection
          });
          if (subsection) {
            breadcrumbs.push({
              label: 'Dashboard Details',
              href: pathname,
              current: true
            });
          }
          break;
        case 'dashboard-builder':
          breadcrumbs.push({
            label: 'Dashboard Builder',
            href: pathname,
            current: true
          });
          break;
        case 'datasets':
          breadcrumbs.push({
            label: 'Datasets',
            href: `/workspace/${currentWorkspace.slug}/datasets`,
            current: !subsection
          });
          break;
        case 'sql-editor':
          breadcrumbs.push({
            label: 'SQL Editor',
            href: pathname,
            current: true
          });
          break;
        case 'admin':
          breadcrumbs.push({
            label: 'Administration',
            href: `/workspace/${currentWorkspace.slug}/admin`,
            current: !subsection
          });
          if (subsection) {
            const adminLabels = {
              users: 'Users & Roles',
              'data-sources': 'Data Sources',
              settings: 'Settings'
            };
            breadcrumbs.push({
              label: adminLabels[subsection as keyof typeof adminLabels] || 'Admin',
              href: pathname,
              current: true
            });
          }
          break;
      }
    }

    return breadcrumbs;
  };

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    if (item.permission) {
      return (
        <PermissionGate key={item.path} permission={item.permission}>
          {renderNavigationItemContent(item, depth)}
        </PermissionGate>
      );
    }
    
    return renderNavigationItemContent(item, depth);
  };

  const renderNavigationItemContent = (item: NavigationItem, depth = 0) => {
    const isActive = pathname === item.path;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenuItems.has(item.title);

    return (
      <React.Fragment key={item.path}>
        <ListItem disablePadding sx={{ pl: depth * 2 }}>
          <ListItemButton
            selected={isActive}
            onClick={() => {
              if (hasChildren) {
                handleMenuItemToggle(item.title);
              } else {
                handleNavigation(item.path);
              }
            }}
            sx={{
              minHeight: 48,
              px: 2.5,
              '&.Mui-selected': {
                backgroundColor: theme.palette.primary.main + '20',
                borderRight: `3px solid ${theme.palette.primary.main}`,
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.main,
                },
                '& .MuiListItemText-primary': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 3,
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.title}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
              }}
            />
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children?.map((childItem) => renderNavigationItem(childItem, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <div>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            BI Platform
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      
      {/* Workspace Switcher */}
      <Box sx={{ p: 2 }}>
        <WorkspaceSwitcher />
      </Box>
      <Divider />
      
      {/* Navigation */}
      <List>
        {navigationItems.map((item) => renderNavigationItem(item))}
      </List>
    </div>
  );

  const breadcrumbs = generateBreadcrumbs();

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: theme.shadows[1],
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar>
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
            <Breadcrumbs
              separator={<ChevronRight fontSize="small" />}
              aria-label="breadcrumb"
            >
              {breadcrumbs.map((crumb, index) => (
                <MuiLink
                  key={crumb.href}
                  underline={crumb.current ? 'none' : 'hover'}
                  color={crumb.current ? 'text.primary' : 'text.secondary'}
                  href={crumb.current ? undefined : crumb.href}
                  onClick={crumb.current ? undefined : (e) => {
                    e.preventDefault();
                    router.push(crumb.href);
                  }}
                  sx={{ 
                    cursor: crumb.current ? 'default' : 'pointer',
                    fontWeight: crumb.current ? 600 : 400,
                  }}
                >
                  {crumb.label}
                </MuiLink>
              ))}
            </Breadcrumbs>
          </Box>

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                onClick={handleNotificationOpen}
                sx={{ ml: 1 }}
              >
                <Badge badgeContent={0} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton
                color="inherit"
                onClick={handleUserMenuOpen}
                sx={{ ml: 1 }}
              >
                <Avatar
                  sx={{ width: 32, height: 32 }}
                  src={user?.avatar_url}
                >
                  {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
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
            minWidth: 200,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem>
          <Avatar
            src={user?.avatar_url}
            sx={{ width: 32, height: 32 }}
          >
            {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2">
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => router.push('/profile')}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profile & Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
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