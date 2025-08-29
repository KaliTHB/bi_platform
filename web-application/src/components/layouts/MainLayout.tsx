import { useState, ReactNode } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  DataObject,
  Code,
  Settings,
  AccountCircle,
  ExitToApp,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';

interface MainLayoutProps {
  children: ReactNode;
}

const drawerWidth = 240;

export default function MainLayout({ children }: MainLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const { user, workspace, signOut, hasPermission } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await signOut();
  };

  const navigation = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: `/workspace/${workspace?.slug}`,
      permission: 'workspace.read',
    },
    {
      text: 'Dashboard Builder',
      icon: <Dashboard />,
      path: `/workspace/${workspace?.slug}/dashboard-builder`,
      permission: 'dashboard.create',
    },
    {
      text: 'Datasets',
      icon: <DataObject />,
      path: `/workspace/${workspace?.slug}/datasets`,
      permission: 'dataset.read',
    },
    {
      text: 'SQL Editor',
      icon: <Code />,
      path: `/workspace/${workspace?.slug}/sql-editor`,
      permission: 'sql_editor.access',
    },
    {
      text: 'Admin',
      icon: <Settings />,
      path: `/workspace/${workspace?.slug}/admin`,
      permission: 'workspace.update',
    },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          {workspace?.display_name || 'BI Platform'}
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigation
          .filter(item => hasPermission(item.permission))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => router.push(item.path)}
                selected={router.pathname === item.path}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Business Intelligence Platform
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.first_name?.[0]}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            onClick={handleProfileMenuClose}
          >
            <MenuItem onClick={() => router.push('/profile')}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => router.push('/workspace-selector')}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Switch Workspace
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <ExitToApp fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}