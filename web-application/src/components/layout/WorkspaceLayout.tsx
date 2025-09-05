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

// Import all the components that can be displayed
import DashboardList from '../builder/DashboardList';
import { DatasetList } from '../builder/DatasetList';
import { DatasourceList } from '../builder/DatasourceList';
import { ChartList } from '../builder/ChartList';

// Define what content can be shown
export type ContentType = 
  | 'overview' 
  | 'dashboards' 
  | 'datasets' 
  | 'datasources' 
  | 'charts'
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
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  defaultContent = 'overview'
}) => {
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
  
  // State to track what content to show
  const [currentContent, setCurrentContent] = useState<ContentType>(defaultContent);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Handle sidebar navigation - this replaces router.push
  const handleContentChange = (contentType: ContentType) => {
    console.log('🔄 Content changing to:', contentType);
    setCurrentContent(contentType);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    signOut();
    handleUserMenuClose();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Function to render the main content based on current selection
  const renderMainContent = () => {
    const { workspaceSlug } = router.query;
    
    switch (currentContent) {
      case 'dashboards':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DashboardList
              onDashboardSelect={(dashboard) => {
                // Navigate to individual dashboard page
                router.push(`/workspace/${workspaceSlug}/dashboard/${dashboard.id}`);
              }}
              showCreateButton={true}
            />
          </Box>
        );
        
      case 'datasets':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DatasetList
              onDatasetSelect={(dataset) => {
                // Navigate to dataset detail page
                router.push(`/workspace/${workspaceSlug}/dataset/${dataset.id}`);
              }}
              showCreateButton={true}
            />
          </Box>
        );
        
      case 'datasources':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <DatasourceList
              onDataSourceSelect={(datasource) => {
                // Navigate to datasource detail page
                router.push(`/workspace/${workspaceSlug}/datasource/${datasource.id}`);
              }}
              showCreateButton={true}
            />
          </Box>
        );
        
      case 'charts':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <ChartList
              charts={[]} // This would come from a hook
              loading={false}
              error={undefined}
              onChartSelect={(chart) => {
                router.push(`/workspace/${workspaceSlug}/chart/${chart.id}`);
              }}
              onChartEdit={(chart) => {
                router.push(`/workspace/${workspaceSlug}/chart-builder?id=${chart.id}`);
              }}
              onChartDelete={async (chartId) => {
                console.log('Delete chart:', chartId);
              }}
              onChartDuplicate={async (chartId) => {
                console.log('Duplicate chart:', chartId);
              }}
              showCreateButton={true}
            />
          </Box>
        );
        
      case 'dashboard-builder':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Dashboard Builder
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Dashboard builder component would go here
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => router.push(`/workspace/${workspaceSlug}/dashboard-builder`)}
            >
              Open Full Dashboard Builder
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
              SQL editor component would go here
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 2 }}
              onClick={() => router.push(`/workspace/${workspaceSlug}/sql-editor`)}
            >
              Open Full SQL Editor
            </Button>
          </Box>
        );
        
      case 'recent':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Recent Items
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Recent dashboards and charts would be listed here
            </Typography>
          </Box>
        );
        
      case 'favorites':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Favorite Items
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Favorite dashboards and charts would be listed here
            </Typography>
          </Box>
        );
        
      case 'overview':
      default:
        return children || (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Workspace Overview
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Welcome to your workspace overview
            </Typography>
          </Box>
        );
    }
  };

  // Get page title based on current content
  const getPageTitle = () => {
    const titles: Record<ContentType, string> = {
      overview: 'Overview',
      dashboards: 'Dashboards',
      datasets: 'Datasets', 
      datasources: 'Data Sources',
      charts: 'Charts',
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
                {user?.display_name?.[0]?.toUpperCase() || 'U'}
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
              <MenuItem onClick={() => handleContentChange('overview')}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => handleContentChange('workspace-settings')}>
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