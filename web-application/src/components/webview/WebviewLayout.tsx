// File: web-application/src/components/webview/WebviewLayout.tsx

import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, AccountCircle } from '@mui/icons-material';
import { CategorySidebar } from './CategorySidebar';
import { WebviewNavbar } from './WebviewNavbar';
import { useWebview } from '../../hooks/useWebview';

export interface WebviewLayoutProps {
  webviewName: string;
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const WebviewLayout: React.FC<WebviewLayoutProps> = ({
  webviewName,
  children,
  showSidebar = true
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
    handleSearchChange, // Add this line
    loading,
    error
  } = useWebview(webviewName);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const sidebarContent = showSidebar ? (
  <CategorySidebar
    categories={categories}
    expandedCategories={navigationState.expandedCategories}
    selectedDashboard={navigationState.selectedDashboard}
    searchQuery={navigationState.searchQuery}
    loading={loading}
    error={error}
    onCategoryToggle={toggleCategory}
    onDashboardSelect={selectDashboard}
    onSearchChange={handleSearchChange} // Add this line
  />
) : null;

  if (error) {
    return (
      <Box className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Typography variant="h6" color="error" gutterBottom>
            Webview Error
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {error}
          </Typography>
        </div>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Top Navigation */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: webviewConfig?.theme_config?.navbar_style === 'dark' ? '#1f2937' : '#ffffff',
          color: webviewConfig?.theme_config?.navbar_style === 'dark' ? '#ffffff' : '#1f2937',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar>
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
          
          <WebviewNavbar
            webviewConfig={webviewConfig}
            onSearch={(query) => {
              // Handle search
              console.log('Search:', query);
            }}
          />
          
          <Box sx={{ flexGrow: 1 }} />
          
          <IconButton color="inherit">
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      {showSidebar && (
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={sidebarOpen}
          onClose={handleSidebarToggle}
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              mt: '64px', // Account for app bar height
              height: 'calc(100% - 64px)',
              borderRight: '1px solid #e5e7eb',
              backgroundColor: webviewConfig?.theme_config?.sidebar_style === 'dark' ? '#374151' : '#ffffff'
            }
          }}
          ModalProps={{
            keepMounted: true // Better mobile performance
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '64px', // Account for app bar height
          ml: showSidebar && !isMobile && sidebarOpen ? 0 : 0,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
          }),
          backgroundColor: '#f9fafb',
          minHeight: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};