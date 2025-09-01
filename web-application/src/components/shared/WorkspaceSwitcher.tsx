// web-application/src/components/shared/WorkspaceSwitcher.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Badge,
  useTheme
} from '@mui/material';
import {
  KeyboardArrowDown,
  Business,
  Add,
  Settings,
  People,
  Dashboard
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store/index';
import { setWorkspace } from '@/store/slices/workspaceSlice';
// Fix: Import from workspace.types.ts to match what setWorkspace expects
import { Workspace, WorkspaceSettings } from '@/types/workspace.types';
// Import auth workspace type for input
import { Workspace as AuthWorkspace } from '@/types/auth.types';

export const WorkspaceSwitcher: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const { currentWorkspace, workspaces } = useSelector((state: RootState) => state.workspace);
  const { user, permissions } = useSelector((state: RootState) => state.auth);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Transform workspace from auth format to workspace format
  const transformWorkspace = (authWorkspace: AuthWorkspace): Workspace => {
    // Provide default settings if missing
  const defaultSettings: WorkspaceSettings = {
    theme: 'light',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD',
    number_format: 'en-US',
    language: 'en',
    max_query_timeout: 300,
    max_export_rows: 10000,
    features: {
      sql_editor: true,
      dashboard_builder: true,
      data_exports: true,
      api_access: false,
      webhooks: false,
    },
  };

  // Helper function to validate and transform date format
  const validateDateFormat = (format: string | undefined): 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | undefined => {
    if (!format) return undefined;
    
    const validFormats: ('YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY')[] = [
      'YYYY-MM-DD', 
      'MM/DD/YYYY', 
      'DD/MM/YYYY'
    ];
    
    return validFormats.includes(format as any) ? format as any : 'YYYY-MM-DD';
  };

  // Transform auth settings to workspace settings
  const transformedSettings: WorkspaceSettings = authWorkspace.settings ? {
    theme: authWorkspace.settings.theme,
    timezone: authWorkspace.settings.timezone,
    date_format: validateDateFormat(authWorkspace.settings.date_format),
    number_format: authWorkspace.settings.number_format,
    language: authWorkspace.settings.language,
    currency: authWorkspace.settings.currency,
    max_query_timeout: authWorkspace.settings.max_query_timeout,
    max_export_rows: authWorkspace.settings.max_export_rows,
    features: authWorkspace.settings.features,
  } : defaultSettings;

     return {
    id: authWorkspace.id,
    name: authWorkspace.name,
    slug: authWorkspace.slug,
    description: authWorkspace.description,
    logo_url: authWorkspace.logo_url,
    settings: transformedSettings,
    is_active: authWorkspace.is_active ?? true,
    created_at: authWorkspace.created_at,
    updated_at: authWorkspace.updated_at,
    user_roles: [],
    highest_role_level: 0,
  };
  };

  const handleWorkspaceSwitch = (authWorkspace: AuthWorkspace) => {
    const transformedWorkspace = transformWorkspace(authWorkspace);
    dispatch(setWorkspace(transformedWorkspace));
    router.push(`/workspace/${authWorkspace.slug}`);
    handleClose();
  };

  const handleCreateWorkspace = () => {
    router.push('/workspace-create');
    handleClose();
  };

  const handleWorkspaceSettings = () => {
    if (currentWorkspace) {
      router.push(`/workspace/${currentWorkspace.slug}/admin/settings`);
    }
    handleClose();
  };

  // Get user role based on permissions
  const getRoleLabel = (workspace: AuthWorkspace) => {
    if (!permissions) return 'Member';
    
    // Check permissions to determine role level
    if (permissions.includes('workspace.admin') && 
        permissions.includes('user.admin') && 
        permissions.includes('role.admin')) {
      return 'Owner';
    }
    
    if (permissions.includes('workspace.admin') || 
        permissions.includes('user.create') || 
        permissions.includes('role.create')) {
      return 'Admin';
    }
    
    if (permissions.includes('dashboard.write') && 
        permissions.includes('dataset.write')) {
      return 'Editor';
    }
    
    if (permissions.includes('dashboard.write') || 
        permissions.includes('dataset.query')) {
      return 'Analyst';
    }
    
    if (permissions.includes('dashboard.read')) {
      return 'Viewer';
    }
    
    return 'Member';
  };

  const getRoleColor = (workspace: AuthWorkspace): 'error' | 'warning' | 'info' | 'success' | 'default' => {
    const roleLabel = getRoleLabel(workspace);
    
    switch (roleLabel) {
      case 'Owner': return 'error';
      case 'Admin': return 'warning';
      case 'Editor': return 'info';
      case 'Analyst': return 'success';
      default: return 'default';
    }
  };

  // Check if user can create workspaces based on permissions
  const canCreateWorkspace = () => {
    return permissions?.includes('workspace.create') || false;
  };

  if (!currentWorkspace) {
    return (
      <Button
        variant="outlined"
        startIcon={<Business />}
        onClick={() => router.push('/workspace-selector')}
        fullWidth
      >
        Select Workspace
      </Button>
    );
  }

  return (
    <Box>
      <Button
        variant="outlined"
        onClick={handleClick}
        fullWidth
        endIcon={<KeyboardArrowDown />}
        sx={{
          justifyContent: 'space-between',
          textAlign: 'left',
          py: 1.5,
          borderColor: theme.palette.divider,
          '&:hover': {
            borderColor: theme.palette.primary.main,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar
            src={currentWorkspace.logo_url}
            sx={{ 
              width: 32, 
              height: 32,
              bgcolor: theme.palette.primary.main 
            }}
          >
            {currentWorkspace.name[0]}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant="body2" 
              fontWeight="medium"
              sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentWorkspace.name}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentWorkspace.description || 'Active Workspace'}
            </Typography>
          </Box>
        </Box>
      </Button>

      <Menu
        id="workspace-switcher-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'workspace-switcher-button',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
          }
        }}
      >
        {/* Current Workspace */}
        <MenuItem disabled>
          <ListItemIcon>
            <Avatar
              src={currentWorkspace.logo_url}
              sx={{ 
                width: 24, 
                height: 24,
                bgcolor: theme.palette.primary.main 
              }}
            >
              {currentWorkspace.name[0]}
            </Avatar>
          </ListItemIcon>
          <ListItemText 
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{currentWorkspace.name}</Typography>
                <Chip 
                  label="Current"
                  size="small"
                  color="primary"
                  variant="filled"
                />
              </Box>
            }
            secondary={currentWorkspace.description || 'Active workspace'}
          />
        </MenuItem>

        {/* Available Workspaces */}
        {workspaces.length > 1 && (
          <>
            <Divider />
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ px: 2, py: 1, display: 'block' }}
            >
              SWITCH WORKSPACE
            </Typography>
            
            {workspaces
              .filter(workspace => workspace.id !== currentWorkspace.id)
              .map((workspace) => (
                <MenuItem 
                  key={workspace.id}
                  onClick={() => handleWorkspaceSwitch(workspace)}
                  sx={{ py: 1 }}
                >
                  <ListItemIcon>
                    <Avatar
                      src={workspace.logo_url}
                      sx={{ 
                        width: 24, 
                        height: 24,
                        bgcolor: theme.palette.secondary.main 
                      }}
                    >
                      {workspace.name[0]}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={workspace.name}
                    secondary={workspace.description || 'Workspace'}
                  />
                  <Chip 
                    label={getRoleLabel(workspace)}
                    size="small"
                    color={getRoleColor(workspace)}
                    variant="outlined"
                  />
                </MenuItem>
              ))}
          </>
        )}

        {canCreateWorkspace() && (
          <>
            <Divider />
            <MenuItem onClick={handleCreateWorkspace}>
              <ListItemIcon>
                <Add />
              </ListItemIcon>
              <ListItemText primary="Create New Workspace" />
            </MenuItem>
          </>
        )}

        {permissions?.includes('workspace.admin') && (
          <MenuItem onClick={handleWorkspaceSettings}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Workspace Settings" />
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};