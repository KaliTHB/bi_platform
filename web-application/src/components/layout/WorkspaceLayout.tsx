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
  Button,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  AccountCircle,
  ExitToApp,
  Notifications,
  Settings as SettingsIcon,
  ContactSupport
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import CollapsibleSidebar from './CollapsibleSidebar';

// Define simplified content types (removed list types)
export type ContentType = 
  | 'overview' 
  | 'dashboard-builder'
  | 'sql-editor'
  | 'recent'
  | 'favorites'
  | 'categories'
  | 'users'
  | 'workspace-settings'
  | 'settings';

interface WorkspaceLayoutProps {
  children?: React.ReactNode; // Overview content
  defaultContent?: ContentType;
  title?: string; // Optional title override
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  defaultContent = 'overview',
  title
}) => {
  const router = useRouter();
  const { user, workspace, logout } = useAuth();
  
  // State to track what content to show
  const [currentContent, setCurrentContent] = useState<ContentType>(defaultContent);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Handle sidebar navigation - now uses direct routing instead of content switching
  const handleContentChange = (contentType: ContentType) => {
    console.log('🔄 Navigating to:', contentType);
    
    // Route to actual pages instead of content switching
    switch (contentType) {
      case 'dashboard-builder':
        router.replace(`/workspace/${workspace?.slug}/dashboard-builder`);
        break;
      case 'sql-editor':
        router.replace(`/workspace/${workspace?.slug}/sql-editor`);
        break;
      case 'workspace-settings':
        router.replace(`/workspace/${workspace?.slug}/admin/settings`);
        break;
      case 'users':
        router.replace(`/workspace/${workspace?.slug}/admin/users`);
        break;
      case 'settings':
        router.replace(`/workspace/${workspace?.slug}/admin`);
        break;
      case 'categories':
        router.replace(`/workspace/${workspace?.slug}/admin/categories`);
        break;
      case 'recent':
      case 'favorites':
        // These could be query parameters on the overview page
        router.replace(`/workspace/${workspace?.slug}?filter=${contentType}`);
        break;
      case 'overview':
      default:
        router.replace(`/workspace/${workspace?.slug}`);
        break;
    }
  };

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Simplified renderMainContent - only handles special cases, children for everything else
  const renderMainContent = () => {
    // For most content, just render children (which will be the page content)
    // Only handle special embedded content cases here if needed
    
    switch (currentContent) {
      case 'dashboard-builder':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Dashboard Builder
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Loading dashboard builder...
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => router.replace(`/workspace/${workspace?.slug}/dashboard-builder`)}
            >
              Go to Dashboard Builder
            </Button>
          </Box>
        );
        
      case 'sql-editor':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              SQL Editor
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Loading SQL editor...
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => router.replace(`/workspace/${workspace?.slug}/sql-editor`)}
            >
              Go to SQL Editor
            </Button>
          </Box>
        );
        
      case 'overview':
      default:
        // Render children (page content) for overview and other cases
        return children || (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              {getPageTitle()}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Welcome to your workspace
            </Typography>
          </Box>
        );
    }
  };

  // Get page title based on current content or provided title
  const getPageTitle = () => {
    if (title) return title;
    
    const titles: Record<ContentType, string> = {
      overview: 'Overview',
      'dashboard-builder': 'Dashboard Builder',
      'sql-editor': 'SQL Editor',
      recent: 'Recent',
      favorites: 'Favorites',
      categories: 'Categories',
      users: 'Users',
      'workspace-settings': 'Workspace Settings',
      settings: 'Settings'
    };
    return titles[currentContent] || 'Workspace';
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Enhanced Sidebar with content change handler */}
      <CollapsibleSidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        workspaceSlug={workspace?.slug}
        onContentChange={handleContentChange}
        currentContent={currentContent}
      />

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <AppBar 
          position="sticky" 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper', 
            borderBottom: '1px solid #e2e8f0',
            zIndex: (theme) => theme.zIndex.drawer - 1
          }}
        >
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <Typography variant="h6" color="textPrimary" sx={{ fontWeight: 600 }}>
                {getPageTitle()}
              </Typography>
            </Box>

            {/* Search and Actions - Optional */}
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <IconButton>
                <Search />
              </IconButton>
              <IconButton>
                <FilterList />
              </IconButton>
              <IconButton>
                <Notifications />
              </IconButton>
            </Box>

            {/* User Menu */}
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>

            <Menu
              id="menu-appbar"
              anchorEl={userMenuAnchor}
              anchorOrigin={{
                vertical: 'top',
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
              <MenuItem onClick={() => {
                handleUserMenuClose();
                router.replace(`/workspace/${workspace?.slug}`);
              }}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => {
                handleUserMenuClose();
                handleContentChange('workspace-settings');
              }}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Workspace Settings</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => {
                handleUserMenuClose();
                router.replace('/support');
              }}>
                <ListItemIcon>
                  <ContactSupport fontSize="small" />
                </ListItemIcon>
                <ListItemText>Support</ListItemText>
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
        </AppBar>

        {/* Dynamic Main Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {renderMainContent()}
        </Box>
      </Box>
    </Box>
  );
};

export default WorkspaceLayout;

export {WorkspaceLayout};