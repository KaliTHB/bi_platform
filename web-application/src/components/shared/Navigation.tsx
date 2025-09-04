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
} from '@mui/material';
import { 
  AccountCircle, 
  Settings, 
  ExitToApp, 
  ContactSupport,
  Home,
  Business 
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

interface NavigationProps {
  title?: string;
}

const Navigation: React.FC<NavigationProps> = ({ title = 'BI Platform' }) => {
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
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
    if (workspace) {
      router.push(`/workspace/${workspace.slug}/overview`);
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

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        {workspace && (
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.8 }}>
            {workspace.display_name || workspace.name}
          </Typography>
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
        >
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
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          
          {workspace && (
            <MenuItem onClick={handleSettings}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText>Workspace Settings</ListItemText>
            </MenuItem>
          )}

          <Divider />

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