// web-application/src/components/webview/WebviewNavbar.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Breadcrumbs,
  Link,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Badge
} from '@mui/material';
import {
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Share as ShareIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Settings as SettingsIcon,
  Help as HelpIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useFullscreen } from '../../hooks/useFullscreen';

// =============================================================================
// INTERFACES
// =============================================================================

export interface WebviewConfig {
  id: string;
  webview_name: string;
  display_name: string;
  description?: string;
  workspace_id: string;
  theme_config: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    text_color: string;
    navbar_style: 'light' | 'dark';
    sidebar_style: 'light' | 'dark';
    font_family?: string;
  };
  branding_config: {
    company_name?: string;
    company_logo?: string;
    favicon_url?: string;
    tagline?: string;
  };
  navigation_config: {
    show_breadcrumbs: boolean;
    show_search: boolean;
    show_user_menu: boolean;
    show_share_button: boolean;
    show_fullscreen_button: boolean;
  };
  is_active: boolean;
  public_url: string;
}

export interface WebviewNavbarProps {
  webviewConfig?: WebviewConfig;
  currentDashboard?: {
    id: string;
    name: string;
    display_name: string;
    category_name?: string;
  };
  onSearch?: (query: string) => void;
  onShare?: () => void;
  sx?: any;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WebviewNavbar: React.FC<WebviewNavbarProps> = ({
  webviewConfig,
  currentDashboard,
  onSearch,
  onShare,
  sx
}) => {
  const router = useRouter();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null);
  };

  const handleHomeClick = () => {
    if (webviewConfig) {
      router.push(`/${webviewConfig.webview_name}`);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share functionality
      if (navigator.share) {
        navigator.share({
          title: currentDashboard?.display_name || webviewConfig?.display_name || 'Dashboard',
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    }
  };

  // =============================================================================
  // DERIVED VALUES
  // =============================================================================

  const breadcrumbItems = [
    {
      label: webviewConfig?.display_name || 'Home',
      onClick: handleHomeClick,
      icon: <HomeIcon fontSize="small" />
    }
  ];

  if (currentDashboard) {
    if (currentDashboard.category_name) {
      breadcrumbItems.push({
        label: currentDashboard.category_name,
        onClick: () => {
          // Navigate to category if needed
        }
      });
    }
    
    breadcrumbItems.push({
      label: currentDashboard.display_name,
      onClick: () => {}
    });
  }

  const showBreadcrumbs = webviewConfig?.navigation_config?.show_breadcrumbs !== false;
  const showUserMenu = webviewConfig?.navigation_config?.show_user_menu !== false;
  const showShareButton = webviewConfig?.navigation_config?.show_share_button !== false;
  const showFullscreenButton = webviewConfig?.navigation_config?.show_fullscreen_button !== false;

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...sx
      }}
    >
      {/* Logo and Branding */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {webviewConfig?.branding_config?.company_logo ? (
          <Avatar
            src={webviewConfig.branding_config.company_logo}
            alt={webviewConfig.branding_config.company_name || 'Logo'}
            sx={{ width: 32, height: 32 }}
          />
        ) : (
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {webviewConfig?.branding_config?.company_name?.charAt(0) || 
             webviewConfig?.display_name?.charAt(0) || 'D'}
          </Avatar>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 600,
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '1.1rem'
            }}
          >
            {webviewConfig?.branding_config?.company_name || webviewConfig?.display_name}
          </Typography>
          
          {webviewConfig?.branding_config?.tagline && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ lineHeight: 1 }}
            >
              {webviewConfig.branding_config.tagline}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Breadcrumbs */}
      {showBreadcrumbs && breadcrumbItems.length > 1 && (
        <Box sx={{ ml: 4, display: { xs: 'none', md: 'block' } }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
          >
            {breadcrumbItems.map((item, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {item.icon && item.icon}
                <Link
                  color="inherit"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    item.onClick?.();
                  }}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    },
                    cursor: index === breadcrumbItems.length - 1 ? 'default' : 'pointer'
                  }}
                >
                  <Typography
                    variant="body2"
                    color={index === breadcrumbItems.length - 1 ? 'text.primary' : 'inherit'}
                    sx={{ fontWeight: index === breadcrumbItems.length - 1 ? 500 : 400 }}
                  >
                    {item.label}
                  </Typography>
                </Link>
              </Box>
            ))}
          </Breadcrumbs>
        </Box>
      )}

      {/* Spacer */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Dashboard Status */}
      {currentDashboard && (
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, mr: 2 }}>
          <Chip
            size="small"
            label="Live"
            color="success"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Share Button */}
        {showShareButton && (
          <Tooltip title="Share">
            <IconButton
              color="inherit"
              onClick={handleShare}
              size="small"
            >
              <ShareIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Fullscreen Toggle */}
        {showFullscreenButton && (
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton
              color="inherit"
              onClick={toggleFullscreen}
              size="small"
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Settings Menu */}
        <Tooltip title="Settings">
          <IconButton
            color="inherit"
            onClick={handleSettingsMenuOpen}
            size="small"
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* User Menu */}
        {showUserMenu && (
          <Tooltip title="Account">
            <IconButton
              color="inherit"
              onClick={handleUserMenuOpen}
              size="small"
            >
              <Avatar sx={{ width: 28, height: 28 }}>
                U
              </Avatar>
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={handleSettingsMenuClose}
        PaperProps={{
          sx: { width: 200 }
        }}
      >
        <MenuItem onClick={handleSettingsMenuClose}>
          <LanguageIcon sx={{ mr: 1 }} />
          Language
        </MenuItem>
        <MenuItem onClick={handleSettingsMenuClose}>
          <HelpIcon sx={{ mr: 1 }} />
          Help & Support
        </MenuItem>
      </Menu>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
        PaperProps={{
          sx: { width: 220 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Viewing as Guest
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {webviewConfig?.display_name}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleUserMenuClose}>
          Request Access
        </MenuItem>
        <MenuItem onClick={handleUserMenuClose}>
          Contact Admin
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default WebviewNavbar;