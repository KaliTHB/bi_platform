// web-application/src/components/shared/WorkspaceSwitcher.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import {
  Button,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { KeyboardArrowDown, Business, Add } from '@mui/icons-material';
import { RootState } from '../../store';
import { switchWorkspace } from '../../store/slices/authSlice';

interface Workspace {
  id: string;
  name: string;
  display_name: string;
  slug: string;
}

export const WorkspaceSwitcher: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  
  const router = useRouter();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (auth.token) {
      fetchWorkspaces();
    }
  }, [auth.token]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/auth/workspaces', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setWorkspaces(data.data);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleWorkspaceSelect = (workspace: Workspace) => {
    if (workspace.id !== auth.workspace?.id) {
      dispatch(switchWorkspace({
        workspace,
        permissions: [] // Will be loaded after switch
      }));
      router.push(`/workspace/${workspace.slug}`);
    }
    handleClose();
  };

  const handleCreateWorkspace = () => {
    router.push('/create-workspace');
    handleClose();
  };

  return (
    <>
      <Button
        onClick={handleClick}
        endIcon={<KeyboardArrowDown />}
        startIcon={<Business />}
        sx={{ textTransform: 'none' }}
      >
        {auth.workspace?.display_name || 'Select Workspace'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 250 }
        }}
      >
        {workspaces.map((workspace) => (
          <MenuItem
            key={workspace.id}
            onClick={() => handleWorkspaceSelect(workspace)}
            selected={workspace.id === auth.workspace?.id}
          >
            <ListItemIcon>
              <Business fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={workspace.display_name}
              secondary={workspace.description}
            />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleCreateWorkspace}>
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Create Workspace" />
        </MenuItem>
      </Menu>
    </>
  );
};

export default WorkspaceSwitcher;