// web-application/src/components/shared/Navigation.tsx
import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuList,
  Chip
} from '@mui/material';
import { 
  AccountCircle, 
  Settings, 
  ExitToApp, 
  ContactSupport,
  Home,
  Business,
  Web as WebviewIcon,
  Add as AddIcon,
  AdminPanelSettings,
  Dashboard as DashboardIcon,
  Category as CategoryIcon,
  People as PeopleIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGate } from './PermissionGate';

interface NavigationProps {
  title?: string;
}

const Navigation: React.FC<NavigationProps> = ({ title = 'BI Platform' }) => {
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
  const { canAccess } = usePermissions();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/profile`);
    }
    handleClose();
  };

  const handleSettings = () => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/admin`);
    }
    handleClose();
  };

  const handleHome = () => {
    const { workspaceSlug } = router.query;
    
    if (workspace) {
      // If we're on a workspace-specific page, go to workspace-specific overview
      if (workspaceSlug && typeof workspaceSlug === 'string') {
        router.push(`/workspace/${workspaceSlug}/overview`);
      } else {
        // Go to general overview
        router.push('/workspace/overview');
      }
    } else {
      // Redirect to login to get default workspace
      signOut();
    }
    handleClose();
  };

  const handleContactSupport = () => {
    // You can customize this to open email, help desk, or support page
    window.location.href = 'mailto:support@yourcompany.com?subject=Workspace Access Request';
    handleClose();
  };

  const handleLogout = () => {
    signOut();
    handleClose();
  };

  // Handle webview navigation
  const handleWebviewNavigation = (path: string) => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/${path}`);
    }
    handleClose();
  };

  // Handle admin navigation
  const handleAdminNavigation = (path: string) => {
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/admin/${path}`);
    }
    handleClose();
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        {workspace && (
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Chip 
              label={workspace.display_name || workspace.name}
              color="primary"
              variant="outlined"
              size="small"
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'inherit',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }}
            />
          </Box>
        )}

        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
        >
          <Avatar sx={{ width: 32, height: 32 }}>
            {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
          </Avatar>
        </IconButton>

        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: { minWidth: 280, maxHeight: '80vh' }
          }}
        >
          {/* Navigation Section */}
          <MenuItem onClick={handleHome}>
            <ListItemIcon>
              <Home fontSize="small" />
            </ListItemIcon>
            <ListItemText>Home</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>My Profile</ListItemText>
          </MenuItem>

          <Divider />

          {/* Webview Management Section */}
          <PermissionGate permissions={['webview.read']}>
            <MenuItem disabled sx={{ opacity: 0.7 }}>
              <ListItemIcon>
                <WebviewIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  WEBVIEW MANAGEMENT
                </Typography>
              </ListItemText>
            </MenuItem>

            <MenuItem onClick={() => handleWebviewNavigation('webviews')}>
              <ListItemIcon sx={{ pl: 1 }}>
                <WebviewIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>View All Webviews</ListItemText>
            </MenuItem>

            <PermissionGate permissions={['webview.create']}>
              <MenuItem onClick={() => handleWebviewNavigation('webviews/create')}>
                <ListItemIcon sx={{ pl: 1 }}>
                  <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Create New Webview</ListItemText>
              </MenuItem>
            </PermissionGate>

            <PermissionGate permissions={['webview.admin']}>
              <MenuItem onClick={() => handleAdminNavigation('webviews')}>
                <ListItemIcon sx={{ pl: 1 }}>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText>Configure Webviews</ListItemText>
              </MenuItem>
            </PermissionGate>

            <Divider />
          </PermissionGate>

          {/* Workspace Settings Section */}
          {workspace && (
            <PermissionGate permissions={['workspace.admin']}>
              <MenuItem disabled sx={{ opacity: 0.7 }}>
                <ListItemIcon>
                  <AdminPanelSettings fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    WORKSPACE ADMIN
                  </Typography>
                </ListItemText>
              </MenuItem>

              <MenuItem onClick={handleSettings}>
                <ListItemIcon sx={{ pl: 1 }}>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText>Admin Overview</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => handleAdminNavigation('users')}>
                <ListItemIcon sx={{ pl: 1 }}>
                  <PeopleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>User Management</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => handleAdminNavigation('categories')}>
                <ListItemIcon sx={{ pl: 1 }}>
                  <CategoryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Manage Categories</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => handleAdminNavigation('security')}>
                <ListItemIcon sx={{ pl: 1 }}>
                  <SecurityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Security & Audit</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => handleAdminNavigation('settings')}>
                <ListItemIcon sx={{ pl: 1 }}>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText>Workspace Settings</ListItemText>
              </MenuItem>

              <Divider />
            </PermissionGate>
          )}

          {/* General Actions */}
          <MenuItem onClick={handleContactSupport}>
            <ListItemIcon>
              <ContactSupport fontSize="small" />
            </ListItemIcon>
            <ListItemText>Contact Support</ListItemText>
          </MenuItem>

          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <ExitToApp fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export { Navigation };
export default Navigation;