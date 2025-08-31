import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Typography,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Email,
  Business,
  AdminPanelSettings
} from '@mui/icons-material';
import { DataTable } from '../shared/DataTable';
import { PermissionGate } from '../shared/PermissionGate';
import { User, UpdateUserRequest } from '../../types';
import { Column } from '../shared/DataTable';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation } from '../../store/api/userApi';

// Define action type for better typing
interface ActionItem {
  label: string;
  icon: React.ReactElement;
  onClick: (item: User) => void;
}

interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
  password: string; // Make it required in the form, we'll handle the logic in submission
}

export const UserManagement: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    roles: [],
    is_active: true,
    password: '' // Initialize as empty string, not undefined
  });

  const { data: usersData, isLoading } = useGetUsersQuery({});
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  // Use the correct property - usersData?.data instead of usersData?.users
  const users = usersData?.data || [];

  const columns: Column<User>[] = [
    {
      id: 'avatar_url',
      label: '',
      minWidth: 60,
      format: (avatar_url) => (
        <Avatar src={avatar_url} sx={{ width: 32, height: 32 }}>
          {/* We'll just use first letter of avatar_url or empty */}
          {avatar_url ? avatar_url.charAt(0).toUpperCase() : '?'}
        </Avatar>
      )
    },
    {
      id: 'first_name',
      label: 'Name',
      sortable: true,
      format: (first_name) => (
        <Typography variant="subtitle2">
          {first_name}
        </Typography>
      )
    },
    {
      id: 'email',
      label: 'Email',
      sortable: true,
      format: (email) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Email fontSize="small" color="action" />
          {email}
        </Box>
      )
    },
    {
      id: 'username',
      label: 'Username',
      format: (username) => (
        <Typography variant="caption" color="textSecondary">
          @{username}
        </Typography>
      )
    },
    {
      id: 'is_active',
      label: 'Status',
      format: (is_active) => (
        <Chip
          label={is_active ? 'Active' : 'Inactive'}
          color={is_active ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      id: 'last_login',
      label: 'Last Login',
      sortable: true,
      format: (last_login) => 
        last_login ? new Date(last_login).toLocaleDateString() : 'Never'
    }
  ];

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      roles: [],
      is_active: true,
      password: '' // Empty string for new users (will be required)
    });
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: [], // Would need to fetch user roles
      is_active: user.is_active,
      password: '' // Empty string for editing (optional update)
    });
    setDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(user.id).unwrap();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        // Prepare update data
        const updateData: UpdateUserRequest = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_active: formData.is_active,
        };

        // Only include password if it's provided
        if (formData.password && formData.password.trim()) {
          updateData.password = formData.password;
        }

        await updateUser({
          id: editingUser.id,
          updates: updateData
        }).unwrap();
      } else {
        // For creating users, ensure password is provided
        if (!formData.password || !formData.password.trim()) {
          alert('Password is required for creating new users');
          return;
        }

        // Prepare create data with required password
        const createData = {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role_ids: formData.roles,
          is_active: formData.is_active,
          password: formData.password, // Ensure password is included and not undefined
          send_invitation: false // Add this if required by the API
        };

        await createUser(createData).unwrap();
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const actions: ActionItem[] = [
    {
      label: 'Edit',
      icon: <Edit fontSize="small" />,
      onClick: handleEditUser
    },
    {
      label: 'Delete',
      icon: <Delete fontSize="small" />,
      onClick: handleDeleteUser
    }
  ];

  return (
    <PermissionGate permissions={['user.read']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              User Management
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Manage workspace users, roles, and permissions
            </Typography>
          </Box>
          
          <PermissionGate permissions={['user.create']}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateUser}
            >
              Add User
            </Button>
          </PermissionGate>
        </Box>

        <DataTable
          data={users}
          columns={columns}
          loading={isLoading}
          pagination={{ enabled: true, defaultRowsPerPage: 25 }}
          sorting={{ enabled: true }}
          filtering={{ enabled: true, globalSearch: true }}
          actions={actions}
          emptyMessage="No users found"
        />

        {/* User Form Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create User'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Username"
                value={formData.username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, username: e.target.value })}
                fullWidth
                disabled={!!editingUser} // Disable username editing
              />
              
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
              />
              
              <TextField
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                fullWidth
              />
              
              <TextField
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                fullWidth
              />

              <TextField
                label={editingUser ? "New Password (leave empty to keep current)" : "Password *"}
                type="password"
                value={formData.password || ''} // Ensure it's never undefined
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                fullWidth
                required={!editingUser} // Required only for new users
                error={!editingUser && (!formData.password || formData.password.trim() === '')}
                helperText={!editingUser && (!formData.password || formData.password.trim() === '') ? 'Password is required for new users' : ''}
              />

              <FormControl fullWidth>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={formData.roles}
                  onChange={(e: any) => setFormData({ 
                    ...formData, 
                    roles: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value 
                  })}
                  renderValue={(selected: string[]) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value: string) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="admin">Administrator</MenuItem>
                  <MenuItem value="contributor">Contributor</MenuItem>
                  <MenuItem value="reader">Reader</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  );
};