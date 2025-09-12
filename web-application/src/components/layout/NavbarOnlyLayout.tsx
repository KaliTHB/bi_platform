// web-application/src/components/layout/NavbarOnlyLayout.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  Settings as SettingsIcon,
  Home as HomeIcon,
  KeyboardArrowRight as ArrowRightIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

interface NavbarOnlyLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  actions?: React.ReactNode;
}

const NavbarOnlyLayout: React.FC<NavbarOnlyLayoutProps> = ({
  children,
  title = 'Workspace',
  subtitle,
  breadcrumbs = [],
  actions
}) => {
  const router = useRouter();
  const { user, workspace, logout } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
  };

  const handleNavigateHome = () => {
    router.push(`/workspace/${workspace?.slug}`);
  };

  const handleNavigateSettings = () => {
    router.push(`/workspace/${workspace?.slug}/settings`);
    handleUserMenuClose();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Navigation Bar */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: 'background.paper', 
          borderBottom: '1px solid #e2e8f0',
          zIndex: (theme) => theme.zIndex.appBar
        }}
      >
        <Toolbar>
          {/* Left side - Home button and breadcrumbs */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <IconButton
              onClick={handleNavigateHome}
              sx={{ mr: 1 }}
              color="primary"
            >
              <HomeIcon />
            </IconButton>
            
            {breadcrumbs.length > 0 ? (
              <Breadcrumbs
                separator={<ArrowRightIcon fontSize="small" />}
                aria-label="breadcrumb"
              >
                {breadcrumbs.map((breadcrumb, index) => (
                  <Link
                    key={index}
                    color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
                    href={breadcrumb.href}
                    onClick={(e) => {
                      if (breadcrumb.href) {
                        e.preventDefault();
                        router.push(breadcrumb.href);
                      }
                    }}
                    sx={{ 
                      cursor: breadcrumb.href ? 'pointer' : 'default',
                      textDecoration: 'none',
                      '&:hover': breadcrumb.href ? { textDecoration: 'underline' } : {}
                    }}
                  >
                    {breadcrumb.label}
                  </Link>
                ))}
              </Breadcrumbs>
            ) : (
              <Typography variant="h6" color="textPrimary" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
            )}
          </Box>

          {/* Center - Actions */}
          {actions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
              {actions}
            </Box>
          )}

          {/* Right side - User menu */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleUserMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.display_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={userMenuAnchor}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
          >
            <MenuItem onClick={handleUserMenuClose}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="subtitle2">{user?.display_name || user?.username}</Typography>
                <Typography variant="caption" color="textSecondary">{user?.email}</Typography>
              </ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleNavigateSettings}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Workspace Settings</ListItemText>
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <ExitToApp fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* Subtitle bar if provided */}
        {subtitle && (
          <Box sx={{ px: 3, py: 1, bgcolor: 'grey.50', borderBottom: '1px solid #e2e8f0' }}>
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          </Box>
        )}
      </AppBar>

      {/* Main Content Area - Full Width */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
};

export default NavbarOnlyLayout;