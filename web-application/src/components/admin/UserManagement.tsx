// File: web-application/src/components/admin/UserManagement.tsx

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
import { User, Role, TableColumn } from '../../types';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeleteUserMutation } from '../../store/api/userApi';

interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
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
    is_active: true
  });

  const { data: usersData, isLoading } = useGetUsersQuery({});
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const columns: TableColumn<User>[] = [
    {
      key: 'avatar',
      title: '',
      dataIndex: 'avatar_url',
      width: 60,
      render: (avatar_url, user) => (
        <Avatar src={avatar_url} sx={{ width: 32, height: 32 }}>
          {user.first_name?.[0] || user.username[0]}
        </Avatar>
      )
    },
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'first_name',
      sortable: true,
      render: (_, user) => (
        <Box>
          <Typography variant="subtitle2">
            {user.first_name} {user.last_name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            @{user.username}
          </Typography>
        </Box>
      )
    },
    {
      key: 'email',
      title: 'Email',
      dataIndex: 'email',
      sortable: true,
      render: (email) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Email fontSize="small" color="action" />
          {email}
        </Box>
      )
    },
    {
      key: 'roles',
      title: 'Roles',
      dataIndex: 'roles',
      render: (roles: Role[]) => (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {roles?.map(role => (
            <Chip
              key={role.id}
              label={role.name}
              size="small"
              color={role.is_system_role ? 'primary' : 'default'}
              variant="outlined"
            />
          ))}
        </Box>
      )
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'is_active',
      render: (is_active) => (
        <Chip
          label={is_active ? 'Active' : 'Inactive'}
          color={is_active ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      key: 'last_login',
      title: 'Last Login',
      dataIndex: 'last_login',
      sortable: true,
      render: (last_login) => 
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
      is_active: true
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
      is_active: user.is_active
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
        await updateUser({
          id: editingUser.id,
          updates: formData
        }).unwrap();
      } else {
        await createUser(formData).unwrap();
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const actions = [
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
          data={usersData?.data || []}
          columns={columns}
          loading={isLoading}
          totalCount={usersData?.metadata?.total}
          searchable
          actions={actions}
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
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                fullWidth
                required
              />
              
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                fullWidth
                required
              />
              
              <Box display="flex" gap={2}>
                <TextField
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  fullWidth
                />
                
                <TextField
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  fullWidth
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={formData.roles}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    roles: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value 
                  }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
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
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active User"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  );
};
