// src/components/layout/WorkspaceLayout.tsx
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
  Container,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  Tooltip,
  Badge,
  Chip
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  AccountCircle,
  ExitToApp,
  Notifications,
  Settings as SettingsIcon,
  ContactSupport,
  Menu as MenuIcon,
  Home,
  Dashboard as DashboardIcon,
  Storage as DataSourceIcon,
  BarChart as ChartIcon,
  Work as JobsIcon,
  TableView as CsvExploreIcon,
  Group as UsersIcon,
  AdminPanelSettings as RolesIcon,
  Assessment as ReportLogIcon,
  Star as StarIcon,
  History as HistoryIcon,
  BusinessCenter
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  active?: boolean;
}

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showFilter?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
  addButtonText?: string;
  currentPage?: string;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  title,
  showSearch = true,
  showFilter = true,
  showAddButton = true,
  onAddClick,
  addButtonText = "Add New",
  currentPage
}) => {
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 64 : 280;
  const workspaceSlug = workspace?.slug || '';

  // Navigation items based on your screenshots
  const navigationItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home />,
      path: `/workspace/${workspaceSlug}`
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: `/workspace/${workspaceSlug}/dashboards`,
      badge: 5 // Example badge count
    },
    {
      id: 'datasource',
      label: 'Datasource',
      icon: <DataSourceIcon />,
      path: `/workspace/${workspaceSlug}/datasets`
    },
    {
      id: 'chart',
      label: 'Chart',
      icon: <ChartIcon />,
      path: `/workspace/${workspaceSlug}/charts`
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: <JobsIcon />,
      path: `/workspace/${workspaceSlug}/jobs`
    },
    {
      id: 'csv-explore',
      label: 'CSV Explore',
      icon: <CsvExploreIcon />,
      path: `/workspace/${workspaceSlug}/csv-explore`
    },
    {
      id: 'users',
      label: 'Users',
      icon: <UsersIcon />,
      path: `/workspace/${workspaceSlug}/admin/users`
    },
    {
      id: 'roles',
      label: 'Roles',
      icon: <RolesIcon />,
      path: `/workspace/${workspaceSlug}/admin/roles`
    },
    {
      id: 'report-log',
      label: 'Report Log',
      icon: <ReportLogIcon />,
      path: `/workspace/${workspaceSlug}/reports`
    }
  ];

  const handleNavigation = (path: string) => {
    if (path && workspaceSlug) {
      router.push(path);
    }
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
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const isActivePage = (itemPath: string) => {
    if (!itemPath || itemPath === '#') return false;
    return router.asPath.startsWith(itemPath);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
            bgcolor: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
          },
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            minHeight: 64,
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          {!sidebarCollapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <BusinessCenter sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                BI Platform
              </Typography>
            </Box>
          )}
          <IconButton
            onClick={toggleSidebar}
            size="small"
            sx={{ 
              ml: sidebarCollapsed ? 0 : 'auto',
              color: 'text.secondary'
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Navigation Items */}
        <List sx={{ flex: 1, py: 1 }}>
          {navigationItems.map((item) => {
            const isActive = isActivePage(item.path);
            
            return (
              <ListItem key={item.id} disablePadding sx={{ px: 1, mb: 0.5 }}>
                <Tooltip
                  title={sidebarCollapsed ? item.label : ''}
                  placement="right"
                  arrow
                >
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      minHeight: 44,
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                      bgcolor: isActive ? 'primary.main' : 'transparent',
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      '&:hover': {
                        bgcolor: isActive ? 'primary.dark' : 'action.hover',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 'auto',
                        mr: sidebarCollapsed ? 0 : 2,
                        color: 'inherit',
                        '& .MuiSvgIcon-root': {
                          fontSize: 20
                        }
                      }}
                    >
                      {item.badge && !sidebarCollapsed ? (
                        <Badge badgeContent={item.badge} color="error" variant="dot">
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </ListItemIcon>
                    
                    {!sidebarCollapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: isActive ? 600 : 400,
                        }}
                      />
                    )}
                    
                    {!sidebarCollapsed && item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        color="error"
                        sx={{ ml: 1, height: 20 }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        {/* Sidebar Footer - User Info when expanded */}
        {!sidebarCollapsed && user && (
          <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
                {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user.display_name || user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {workspace?.display_name || workspace?.name}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Top Navigation Bar */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <Toolbar>
            {/* Page Title */}
            <Typography variant="h6" sx={{ mr: 3, fontWeight: 500 }}>
              {title || 'View Dashboard'}
            </Typography>

            {/* Search Bar */}
            {showSearch && (
              <TextField
                placeholder="Search..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  mr: 2, 
                  minWidth: 300,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'grey.50',
                    '& fieldset': {
                      borderColor: 'grey.300',
                    },
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
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
                onClick={() => setFilterOpen(!filterOpen)}
                sx={{ mr: 2, textTransform: 'none' }}
              >
                Filter
              </Button>
            )}

            {showAddButton && onAddClick && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onAddClick}
                sx={{ 
                  mr: 2,
                  textTransform: 'none',
                  bgcolor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
              >
                {addButtonText}
              </Button>
            )}

            {/* Notifications */}
            <IconButton sx={{ mr: 1 }}>
              <Badge badgeContent={3} color="error" variant="dot">
                <Notifications />
              </Badge>
            </IconButton>

            {/* User Menu */}
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>

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
          </Toolbar>
        </AppBar>

        {/* Content Area */}
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