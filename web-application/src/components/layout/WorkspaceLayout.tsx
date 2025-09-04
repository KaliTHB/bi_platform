// web-application/src/components/layout/WorkspaceLayout.tsx
// MINIMAL CHANGES - Use CollapsibleSidebar component, keep existing structure

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
  TextField,
  InputAdornment,
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
import CollapsibleSidebar from './CollapsibleSidebar'; // CHANGE: Use separate component

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showFilter?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
  addButtonText?: string;
  currentPage?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  title,
  showSearch = true,
  showFilter = true,
  showAddButton = true,
  onAddClick,
  addButtonText = "Add New",
  currentPage,
  breadcrumbs
}) => {
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
  
  // FIX: Start collapsed as requested
  const [sidebarOpen, setSidebarOpen] = useState(false); // CHANGE: false = collapsed initially
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // CALCULATE: Sidebar width for main content adjustment
  const sidebarWidth = sidebarOpen ? 280 : 64;

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* CHANGE: Use CollapsibleSidebar component */}
      <CollapsibleSidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        workspaceSlug={workspace?.slug}
      />

      {/* KEEP: Your existing main content structure */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* KEEP: Your existing AppBar */}
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
            {/* KEEP: Your existing toolbar content */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              {/* ADD: Support for breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <Box>
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && <Typography color="textSecondary" sx={{ mx: 1 }}>/</Typography>}
                      <Typography 
                        variant={index === breadcrumbs.length - 1 ? "h6" : "body2"}
                        color={index === breadcrumbs.length - 1 ? "textPrimary" : "textSecondary"}
                        sx={{ 
                          fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                          display: 'inline'
                        }}
                      >
                        {crumb.label}
                      </Typography>
                    </React.Fragment>
                  ))}
                </Box>
              ) : (
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {title}
                </Typography>
              )}
            </Box>

            {/* KEEP: Your existing action buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {showSearch && (
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              {showFilter && (
                <IconButton onClick={() => setFilterOpen(!filterOpen)} sx={{ color: 'text.primary' }}>
                  <FilterList />
                </IconButton>
              )}

              {showAddButton && onAddClick && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onAddClick}
                  sx={{ textTransform: 'none' }}
                >
                  {addButtonText}
                </Button>
              )}

              <IconButton sx={{ color: 'text.primary' }}>
                <Notifications />
              </IconButton>

              <IconButton onClick={handleUserMenuOpen} sx={{ color: 'text.primary' }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user?.display_name?.[0]?.toUpperCase() || 
                   user?.username?.[0]?.toUpperCase() || 
                   user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>

              {/* KEEP: Your existing user menu */}
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  elevation: 8,
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    '& .MuiMenuItem-root': {
                      px: 2,
                      py: 1.5,
                    }
                  }
                }}
              >
                <MenuItem onClick={handleUserMenuClose}>
                  <ListItemIcon>
                    <AccountCircle fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                
                <MenuItem onClick={handleUserMenuClose}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Settings</ListItemText>
                </MenuItem>

                <Divider />
                
                <MenuItem onClick={handleUserMenuClose}>
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
            </Box>
          </Toolbar>
        </AppBar>

        {/* KEEP: Your existing content area */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            bgcolor: '#f8fafc',
            p: 3,
            overflow: 'auto'
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default WorkspaceLayout;