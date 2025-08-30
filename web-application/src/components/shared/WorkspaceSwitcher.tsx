# web-application/src/components/shared/WorkspaceSwitcher.tsx
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
import { RootState } from '@/store/store';
import { setWorkspace } from '@/store/slices/workspaceSlice';
import { Workspace } from '@/types/auth.types';

export const WorkspaceSwitcher: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const { currentWorkspace, workspaces } = useSelector((state: RootState) => state.workspace);
  const { user } = useSelector((state: RootState) => state.auth);

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

  const getRoleLabel = (workspace: Workspace) => {
    const roles = workspace.user_roles || [];
    if (roles.length === 0) return 'Member';
    
    // Get the highest role level
    const highestRole = roles.reduce((prev, current) => 
      (prev.level > current.level) ? prev : current
    );
    
    return highestRole.role_name;
  };

  const getRoleColor = (workspace: Workspace) => {
    const roles = workspace.user_roles || [];
    if (roles.length === 0) return 'default';
    
    const highestRole = roles.reduce((prev, current) => 
      (prev.level > current.level) ? prev : current
    );
    
    switch (highestRole.role_name) {
      case 'owner': return 'error';
      case 'admin': return 'warning';
      case 'editor': return 'info';
      case 'analyst': return 'success';
      default: return 'default';
    }
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
                {currentWorkspace.stats && (
                  <Typography variant="caption" color="text.secondary">
                    {currentWorkspace.stats.dashboard_count} dashboards
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Quick actions for current workspace */}
        <MenuItem 
          onClick={() => {
            router.push(`/workspace/${currentWorkspace.slug}/dashboards`);
            handleClose();
          }}
        >
          <ListItemIcon>
            <Badge 
              badgeContent={currentWorkspace.stats?.dashboard_count || 0} 
              color="primary"
              max={99}
            >
              <Dashboard />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Dashboards" />
        </MenuItem>

        <MenuItem 
          onClick={() => {
            router.push(`/workspace/${currentWorkspace.slug}/admin/users`);
            handleClose();
          }}
        >
          <ListItemIcon>
            <Badge 
              badgeContent={currentWorkspace.stats?.active_users || 0} 
              color="primary"
              max={99}
            >
              <People />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Members" />
        </MenuItem>

        <MenuItem onClick={handleWorkspaceSettings}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Workspace Settings" />
        </MenuItem>

        <Divider />

        {/* Other workspaces */}
        <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
          <Typography 
            variant="caption" 
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
                  secondary={getRoleLabel(workspace)}
                />
                <Chip 
                  label={getRoleLabel(workspace)}
                  size="small"
                  color={getRoleColor(workspace)}
                  variant="outlined"
                />
              </MenuItem>
            ))}
        </Box>

        {user?.role === 'SUPER_ADMIN' && (
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
      </Menu>
    </Box>
  );
};