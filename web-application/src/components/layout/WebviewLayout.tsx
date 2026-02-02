// web-application/src/components/layout/WebviewLayout.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Search as SearchIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { CategorySidebar } from '../webview/CategorySidebar';
import { WebviewNavbar } from '../webview/WebviewNavbar';
import { useWebview } from '../../hooks/useWebview';

// =============================================================================
// INTERFACES
// =============================================================================

export interface WebviewLayoutProps {
  webviewName: string;
  children: React.ReactNode;
  showSidebar?: boolean;
  showNavbar?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const WebviewLayout: React.FC<WebviewLayoutProps> = ({
  webviewName,
  children,
  showSidebar = true,
  showNavbar = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarWidth] = useState(280);

  const {
    webviewConfig,
    categories,
    navigationState,
    toggleCategory,
    selectDashboard,
    handleSearchChange,
    loading,
    error
  } = useWebview(webviewName);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // =============================================================================
  // DERIVED VALUES
  // =============================================================================

  const sidebarContent = showSidebar ? (
    <CategorySidebar
      categories={categories}
      expandedCategories={navigationState?.expandedCategories || new Set()}
      selectedDashboard={navigationState?.selectedDashboard}
      searchQuery={navigationState?.searchQuery || ''}
      loading={loading}
      error={error}
      onCategoryToggle={toggleCategory}
      onDashboardSelect={selectDashboard}
      onSearchChange={handleSearchChange}
    />
  ) : null;

  const appBarHeight = 64;
  const navbarBackgroundColor = webviewConfig?.theme_config?.navbar_style === 'dark' 
    ? '#1f2937' 
    : '#ffffff';
  const navbarTextColor = webviewConfig?.theme_config?.navbar_style === 'dark' 
    ? '#ffffff' 
    : '#1f2937';
  const sidebarBackgroundColor = webviewConfig?.theme_config?.sidebar_style === 'dark' 
    ? '#374151' 
    : '#ffffff';

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        p: 3 
      }}>
        <Alert 
          severity="error" 
          sx={{ maxWidth: 500 }}
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
            >
              <SettingsIcon fontSize="inherit" />
            </IconButton>
          }
        >
          <Typography variant="h6" gutterBottom>
            Webview Error
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  // =============================================================================
  // LOADING STATE
  // =============================================================================

  if (loading && !webviewConfig) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading webview...
        </Typography>
      </Box>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Top Navigation */}
      {showNavbar && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: navbarBackgroundColor,
            color: navbarTextColor,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
        >
          <Toolbar>
            {/* Sidebar Toggle Button */}
            {showSidebar && (
              <IconButton
                color="inherit"
                aria-label="toggle sidebar"
                edge="start"
                onClick={handleSidebarToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {/* Webview Navbar Component */}
            <WebviewNavbar
              webviewConfig={webviewConfig}
              onSearch={handleSearchChange}
              sx={{ flexGrow: 1 }}
            />
            
            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />
            
            {/* User Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton color="inherit" aria-label="search">
                <SearchIcon />
              </IconButton>
              <IconButton color="inherit" aria-label="account">
                <AccountCircle />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar Drawer */}
      {showSidebar && (
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={sidebarOpen}
          onClose={handleSidebarClose}
          sx={{
            width: sidebarOpen ? sidebarWidth : 0,
            flexShrink: 0,
            transition: theme.transitions.create(['width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen
            }),
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              mt: showNavbar ? `${appBarHeight}px` : 0,
              height: showNavbar ? `calc(100% - ${appBarHeight}px)` : '100%',
              borderRight: `1px solid ${theme.palette.divider}`,
              backgroundColor: sidebarBackgroundColor,
              color: webviewConfig?.theme_config?.sidebar_style === 'dark' ? '#ffffff' : 'inherit',
              overflowX: 'hidden'
            }
          }}
          ModalProps={{
            keepMounted: true, // Better mobile performance
            disablePortal: false,
            disableScrollLock: true
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: showNavbar ? `${appBarHeight}px` : 0,
          ml: showSidebar && !isMobile && sidebarOpen ? 0 : 0,
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
          }),
          backgroundColor: webviewConfig?.theme_config?.background_color || '#f9fafb',
          minHeight: showNavbar ? `calc(100vh - ${appBarHeight}px)` : '100vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default WebviewLayout;