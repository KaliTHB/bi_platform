// web-application/src/components/layout/WorkspaceLayout.tsx
import React, { useState, useEffect } from 'react';
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
  Alert,
  AlertTitle,
  Paper,
  Container
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  AccountCircle,
  ExitToApp,
  Business,
  Notifications
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import CollapsibleSidebar from './CollapsibleSidebar';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showFilter?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
  addButtonText?: string;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  title,
  showSearch = true,
  showFilter = true,
  showAddButton = true,
  onAddClick,
  addButtonText = "Add New"
}) => {
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [noWorkspaceMessage, setNoWorkspaceMessage] = useState(false);

  const workspaceSlug = router.query['workspace-slug'] as string;

  // Check if we're in a "no workspace found" scenario
  useEffect(() => {
    if (user && !workspace && workspaceSlug) {
      setNoWorkspaceMessage(true);
    } else {
      setNoWorkspaceMessage(false);
    }
  }, [user, workspace, workspaceSlug]);

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

  const handleWorkspaceSelector = () => {
    router.push('/workspace-selector');
    handleClose();
  };

  const handleLogout = () => {
    signOut();
    handleClose();
  };

  const sidebarWidth = sidebarOpen ? 280 : 64;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Collapsible Sidebar */}
      <CollapsibleSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        workspaceSlug={workspace?.slug}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${sidebarWidth}px)`,
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Navigation Bar */}
        <AppBar
          position="static"
          elevation={1}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Toolbar>
            {/* Page Title */}
            <Typography variant="h6" sx={{ mr: 3 }}>
              {title || (workspace ? workspace.name : 'BI Platform')}
            </Typography>

            {/* Search Bar */}
            {showSearch && (
              <TextField
                placeholder="Search..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mr: 2, minWidth: 300 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Box sx={{ flexGrow: 1 }} />

            {/* Action Buttons */}
            {showFilter && (
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                sx={{ mr: 2 }}
              >
                Filter
              </Button>
            )}

            {showAddButton && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onAddClick}
                sx={{ mr: 2 }}
              >
                {addButtonText}
              </Button>
            )}

            {/* Notifications */}
            <IconButton sx={{ mr: 1 }}>
              <Notifications />
            </IconButton>

            {/* User Menu */}
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
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
              <MenuItem onClick={handleProfile}>
                <AccountCircle sx={{ mr: 1 }} />
                Profile
              </MenuItem>
              {workspace && (
                <MenuItem onClick={handleSettings}>
                  <Business sx={{ mr: 1 }} />
                  Workspace Settings
                </MenuItem>
              )}
              <MenuItem onClick={handleWorkspaceSelector}>
                <Business sx={{ mr: 1 }} />
                Select Workspace
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Content Area */}
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: 'grey.50' }}>
          {/* No Workspace Found Message */}
          {noWorkspaceMessage && (
            <Container maxWidth="md" sx={{ mb: 4 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <AlertTitle>No Workspace Found</AlertTitle>
                The workspace "{workspaceSlug}" was not found or you don't have access to it. 
                You can browse available workspaces or contact your administrator.
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Business />}
                    onClick={() => router.push('/workspace-selector')}
                  >
                    Browse Workspaces
                  </Button>
                </Box>
              </Alert>
            </Container>
          )}

          {/* Main Content */}
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default WorkspaceLayout;