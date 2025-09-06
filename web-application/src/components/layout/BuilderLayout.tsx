// web-application/src/components/layout/BuilderLayout.tsx
import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Breadcrumbs,
  Link,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip
} from '@mui/material';
import {
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  BarChart as ChartIcon,
  Storage as DatasetIcon,
  Visibility as PreviewIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  AccountCircle,
  ExitToApp,
  Settings
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

export interface BuilderLayoutProps {
  builderType: 'dashboard' | 'chart' | 'dataset';
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  
  // Action buttons
  showPreview?: boolean;
  showSave?: boolean;
  showCancel?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  previewLabel?: string;
  
  // Loading/disabled states
  saving?: boolean;
  hasChanges?: boolean;
  canSave?: boolean;
  
  // Event handlers
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  onPreview?: () => void;
  
  // Builder-specific props
  entityName?: string; // Name of the dashboard/chart/dataset being edited
  workspaceSlug?: string;
}

const BuilderLayout: React.FC<BuilderLayoutProps> = ({
  builderType,
  title,
  subtitle,
  children,
  showPreview = true,
  showSave = true,
  showCancel = true,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  previewLabel = 'Preview',
  saving = false,
  hasChanges = false,
  canSave = true,
  onSave,
  onCancel,
  onPreview,
  entityName,
  workspaceSlug
}) => {
  const router = useRouter();
  const { user, workspace, signOut } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);

  // Get effective workspace slug
  const effectiveWorkspaceSlug = workspaceSlug || workspace?.slug || router.query.workspaceSlug as string;

  // Builder configuration
  const builderConfig = {
    dashboard: {
      icon: <DashboardIcon />,
      title: title || (entityName ? `Edit Dashboard: ${entityName}` : 'Dashboard Builder'),
      defaultSaveLabel: 'Save Dashboard',
      breadcrumbLabel: 'Dashboard Builder',
      homePath: `/workspace/${effectiveWorkspaceSlug}/dashboards`
    },
    chart: {
      icon: <ChartIcon />,
      title: title || (entityName ? `Edit Chart: ${entityName}` : 'Chart Builder'),
      defaultSaveLabel: 'Save Chart',
      breadcrumbLabel: 'Chart Builder',
      homePath: `/workspace/${effectiveWorkspaceSlug}/charts`
    },
    dataset: {
      icon: <DatasetIcon />,
      title: title || (entityName ? `Edit Dataset: ${entityName}` : 'Dataset Builder'),
      defaultSaveLabel: 'Save Dataset',
      breadcrumbLabel: 'Dataset Builder',
      homePath: `/workspace/${effectiveWorkspaceSlug}/datasets`
    }
  };

  const config = builderConfig[builderType];

  // User menu handlers
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProfile = () => {
    router.push(`/workspace/${effectiveWorkspaceSlug}/profile`);
    handleUserMenuClose();
  };

  const handleSettings = () => {
    router.push(`/workspace/${effectiveWorkspaceSlug}/admin`);
    handleUserMenuClose();
  };

  const handleLogout = () => {
    signOut();
    handleUserMenuClose();
  };

  // Navigation handlers
  const handleGoHome = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push(`/workspace/${effectiveWorkspaceSlug}`);
      }
    } else {
      router.push(`/workspace/${effectiveWorkspaceSlug}`);
    }
  };

  const handleGoToBreadcrumb = (path: string) => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push(path);
      }
    } else {
      router.push(path);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      if (hasChanges) {
        if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
          router.push(config.homePath);
        }
      } else {
        router.push(config.homePath);
      }
    }
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
      } catch (error) {
        console.error('Save failed:', error);
      }
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview();
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'grey.50' }}>
      {/* Builder Navigation Bar */}
      <AppBar 
        position="static" 
        elevation={1}
        sx={{ 
          bgcolor: 'background.paper', 
          color: 'text.primary',
          borderBottom: '1px solid',
          borderBottomColor: 'divider'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {/* Left Side - Breadcrumbs and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mr: 3 }}>
              <Link
                color="inherit"
                onClick={handleGoHome}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Workspace
              </Link>
              
              <Link
                color="inherit"
                onClick={() => handleGoToBreadcrumb(config.homePath)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {builderType === 'dashboard' ? 'Dashboards' : 
                 builderType === 'chart' ? 'Charts' : 'Datasets'}
              </Link>
              
              <Typography 
                color="text.primary" 
                sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}
              >
                {config.icon}
                <Box sx={{ ml: 0.5 }}>
                  {config.breadcrumbLabel}
                  {hasChanges && (
                    <Chip 
                      label="Unsaved" 
                      size="small" 
                      color="warning" 
                      sx={{ ml: 1, height: 20, fontSize: '0.75rem' }} 
                    />
                  )}
                </Box>
              </Typography>
            </Breadcrumbs>

            <Box sx={{ ml: 2 }}>
              <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
                {config.title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Right Side - Action Buttons and User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Preview Button */}
            {showPreview && (
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {previewLabel}
              </Button>
            )}

            {/* Cancel Button */}
            {showCancel && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {cancelLabel}
              </Button>
            )}

            {/* Save Button */}
            {showSave && (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!canSave || saving}
                sx={{ 
                  textTransform: 'none',
                  minWidth: 120
                }}
              >
                {saving ? 'Saving...' : (saveLabel || config.defaultSaveLabel)}
              </Button>
            )}

            {/* User Menu */}
            <Box sx={{ ml: 2 }}>
              <IconButton
                size="large"
                onClick={handleUserMenuOpen}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {user?.display_name?.[0]?.toUpperCase() || 
                   user?.username?.[0]?.toUpperCase() || 
                   'U'}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                onClick={handleUserMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: { mt: 1.5, minWidth: 200 }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {/* User Info */}
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" noWrap>
                    {user?.display_name || user?.username || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {workspace?.display_name || workspace?.name}
                  </Typography>
                </Box>

                <MenuItem onClick={handleProfile}>
                  <AccountCircle sx={{ mr: 2 }} />
                  Profile
                </MenuItem>
                
                <MenuItem onClick={handleSettings}>
                  <Settings sx={{ mr: 2 }} />
                  Settings
                </MenuItem>
                
                <Divider />
                
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 2 }} />
                  Sign Out
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Builder Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
};

export default BuilderLayout;