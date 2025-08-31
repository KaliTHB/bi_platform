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
import { Workspace } from '@/types/auth.types';

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

  const handleWorkspaceSwitch = (workspace: Workspace) => {
    dispatch(setWorkspace(workspace));
    router.push(`/workspace/${workspace.slug}`);
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
  const getRoleLabel = (workspace: Workspace) => {
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

  const getRoleColor = (workspace: Workspace): 'error' | 'warning' | 'info' | 'success' | 'default' => {
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
            backgroundColor: theme.palette.action.hover,
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <Avatar
            src={currentWorkspace.logo_url}
            sx={{ 
              width: 24, 
              height: 24, 
              mr: 1,
              bgcolor: theme.palette.primary.main 
            }}
          >
            {currentWorkspace.name[0]}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant="body2" 
              fontWeight={600}
              noWrap
              sx={{ color: theme.palette.text.primary }}
            >
              {currentWorkspace.name}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.text.secondary,
                display: 'block',
                lineHeight: 1
              }}
            >
              {getRoleLabel(currentWorkspace)}
            </Typography>
          </Box>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1,
            minWidth: 300,
            maxHeight: 400,
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {/* Current workspace info */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: theme.palette.action.hover }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar
              src={currentWorkspace.logo_url}
              sx={{ 
                width: 32, 
                height: 32, 
                mr: 1.5,
                bgcolor: theme.palette.primary.main 
              }}
            >
              {currentWorkspace.name[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {currentWorkspace.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip 
                  label={getRoleLabel(currentWorkspace)}
                  size="small"
                  color={getRoleColor(currentWorkspace)}
                  variant="outlined"
                />
                {currentWorkspace.user_count !== undefined && (
                  <Typography variant="caption" color="text.secondary">
                    {currentWorkspace.user_count} users
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          
          {/* Workspace stats */}
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            {currentWorkspace.dashboard_count !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Dashboard fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {currentWorkspace.dashboard_count} dashboards
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {workspaces && workspaces.length > 1 && (
          <>
            <Divider />
            <Typography 
              variant="overline" 
              sx={{ 
                px: 2, 
                py: 1, 
                display: 'block',
                color: theme.palette.text.secondary,
                fontWeight: 600
              }}
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