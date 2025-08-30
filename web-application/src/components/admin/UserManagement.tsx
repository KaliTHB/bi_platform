// File: ./src/components/admin/UserManagement.tsx

import React, { useState, useEffect } from 'react';
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
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  FormHelperText
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Email,
  Business,
  AdminPanelSettings,
  Visibility,
  VisibilityOff,
  Save,
  Cancel
} from '@mui/icons-material';
import { DataTable } from '../shared/DataTable';
import { PermissionGate } from '../shared/PermissionGate';
import { 
  User, 
  Role, 
  TableColumn, 
  CreateUserRequest, 
  UpdateUserRequest 
} from '../../types';
import { 
  useGetUsersQuery, 
  useCreateUserMutation, 
  useUpdateUserMutation, 
  useDeleteUserMutation 
} from '../../store/api/userApi';

interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
  password?: string;
}

interface UserManagementProps {
  workspaceId?: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ workspaceId }) => {
  // State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    roles: [],
    is_active: true,
    password: ''
  });

  // API hooks
  const { 
    data: usersData, 
    isLoading, 
    error,
    refetch 
  } = useGetUsersQuery({
    page: 1,
    limit: 50
  });

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  // Available roles (this should ideally come from a roles API)
  const availableRoles: Role[] = [
    { id: '1', name: 'admin', display_name: 'Administrator', description: 'Full system access', is_system_role: true },
    { id: '2', name: 'editor', display_name: 'Editor', description: 'Can create and edit content', is_system_role: true },
    { id: '3', name: 'viewer', display_name: 'Viewer', description: 'Read-only access', is_system_role: true }
  ];

  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      roles: [],
      is_active: true,
      password: ''
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  // Handle create new user
  const handleCreateNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Handle edit user
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: user.roles?.map(role => role.id) || [],
      is_active: user.is_active,
      password: '' // Don't populate existing password
    });
    setDialogOpen(true);
  };

  // Handle delete user
  const handleDelete = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      try {
        await deleteUser(user.id).unwrap();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  // Handle form save
  const handleSave = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData: UpdateUserRequest = {
          username: formData.username,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role_ids: formData.roles,
          is_active: formData.is_active
        };
        
        // Only include password if it's provided
        if (formData.password && formData.password.trim()) {
          updateData.password = formData.password;
        }

        await updateUser({
          id: editingUser.id,
          data: updateData
        }).unwrap();
      } else {
        // Create new user
        if (!formData.password || !formData.password.trim()) {
          alert('Password is required for new users');
          return;
        }
        
        const createData: CreateUserRequest = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role_ids: formData.roles,
          is_active: formData.is_active
        };

        await createUser(createData).unwrap();
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      alert(error?.data?.message || 'Failed to save user');
    }
  };

  // Handle form close
  const handleClose = () => {
    setDialogOpen(false);
    resetForm();
  };

  // Table columns configuration
  const columns: TableColumn<User>[] = [
    {
      key: 'avatar',
      title: '',
      dataIndex: 'avatar_url',
      width: 60,
      render: (avatar_url, user) => (
        <Avatar src={avatar_url} sx={{ width: 40, height: 40 }}>
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
          <Typography variant="subtitle2" fontWeight="medium">
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
          <Typography variant="body2">{email}</Typography>
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
              label={role.display_name || role.name}
              size="small"
              color={role.is_system_role ? 'primary' : 'default'}
              variant="outlined"
            />
          )) || <Chip label="No roles" size="small" color="default" />}
        </Box>
      )
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'is_active',
      render: (is_active: boolean) => (
        <Chip
          label={is_active ? 'Active' : 'Inactive'}
          color={is_active ? 'success' : 'default'}
          size="small"
        />
      )
    },
    {
      key: 'last_login',
      title: 'Last Login',
      dataIndex: 'last_login',
      render: (last_login: string) => (
        <Typography variant="body2" color="textSecondary">
          {last_login ? new Date(last_login).toLocaleDateString() : 'Never'}
        </Typography>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      dataIndex: 'id',
      width: 120,
      render: (_, user) => (
        <Box display="flex" gap={1}>
          <PermissionGate permission="user.update">
            <Tooltip title="Edit User">
              <IconButton size="small" onClick={() => handleEdit(user)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          </PermissionGate>
          
          <PermissionGate permission="user.delete">
            <Tooltip title="Delete User">
              <IconButton 
                size="small" 
                color="error" 
                onClick={() => handleDelete(user)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </PermissionGate>
        </Box>
      )
    }
  ];

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={() => refetch()}>
          Retry
        </Button>
      }>
        Failed to load users. Please try again.
      </Alert>
    );
  }

  const users = usersData?.users || [];

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">User Management</Typography>
        <PermissionGate permission="user.create">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateNew}
          >
            Add User
          </Button>
        </PermissionGate>
      </Box>

      {/* Users Table */}
      <Card>
        <DataTable
          columns={columns}
          data={users}
          loading={isLoading}
          pagination={{
            current: 1,
            pageSize: 50,
            total: users.length
          }}
          rowKey="id"
        />
      </Card>

      {/* User Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Username"
                fullWidth
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
                helperText="Unique username for login"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                helperText="User's email address"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                fullWidth
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={formData.password || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required={!editingUser}
                helperText={editingUser ? "Leave blank to keep current password" : "Required for new users"}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={formData.roles}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    roles: typeof e.target.value === 'string' 
                      ? e.target.value.split(',') 
                      : e.target.value 
                  }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((roleId) => {
                        const role = availableRoles.find(r => r.id === roleId);
                        return (
                          <Chip 
                            key={roleId} 
                            label={role?.display_name || roleId} 
                            size="small" 
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {availableRoles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {role.is_system_role && <AdminPanelSettings fontSize="small" />}
                        <Box>
                          <Typography variant="body2">{role.display_name}</Typography>
                          {role.description && (
                            <Typography variant="caption" color="textSecondary">
                              {role.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl>
                  <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active User"
              />
               <FormHelperText>Inactive users cannot log in</FormHelperText>

              </FormControl>
              
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={isCreating || isUpdating}>
            <Cancel sx={{ mr: 1 }} />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={isCreating || isUpdating || !formData.username || !formData.email}
            startIcon={isCreating || isUpdating ? <CircularProgress size={16} /> : <Save />}
          >
            {isCreating || isUpdating 
              ? 'Saving...' 
              : editingUser ? 'Update User' : 'Create User'
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;