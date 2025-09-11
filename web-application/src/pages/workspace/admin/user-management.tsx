// web-application/src/components/admin/UserManagement.tsx
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
  Tooltip,
  Alert,
  Grid,
  SelectChangeEvent
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
  Block,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

// Updated import - using CommonTableLayout instead of DataTable
import CommonTableLayout, { 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';
import { User, UpdateUserRequest } from '@/types';
import { 
  useGetUsersQuery, 
  useCreateUserMutation, 
  useUpdateUserMutation, 
  useDeleteUserMutation 
} from '../../../store/api/userApi';

// Updated interfaces to match CommonTableLayout requirements
interface UserData extends User {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  workspace_id?: string;
  status?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
  password: string;
}

// Available roles for the select dropdown
const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'manager', label: 'Manager' }
];

export const UserManagement: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    roles: [],
    is_active: true,
    password: ''
  });

  const { data: usersData, isLoading, refetch } = useGetUsersQuery({});
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  // Transform users data to match CommonTableLayout requirements
  const users: UserData[] = (usersData?.data || []).map(user => ({
    ...user,
    name: `${user.first_name} ${user.last_name}`.trim() || user.email,
    display_name: `${user.first_name} ${user.last_name}`.trim(),
    status: user.is_active ? 'active' : 'inactive',
    description: user.email
  }));

  // Column definitions for CommonTableLayout
  const columns: TableColumn<UserData>[] = [
    {
      key: 'avatar_url',
      label: '',
      width: 60,
      sortable: false,
      render: (user: UserData) => (
        <Avatar src={user.avatar_url} sx={{ width: 40, height: 40 }}>
          {(user.first_name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
        </Avatar>
      )
    },
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (user: UserData) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {user.display_name || 'Unnamed User'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {user.email}
          </Typography>
        </Box>
      )
    },
    {
      key: 'roles',
      label: 'Roles',
      sortable: false,
      render: (user: UserData) => (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {user.roles?.length > 0 ? (
            user.roles.map(role => (
              <Chip
                key={role}
                size="small"
                label={role}
                variant="outlined"
                color="primary"
                icon={role === 'admin' ? <AdminPanelSettings fontSize="small" /> : <Person fontSize="small" />}
              />
            ))
          ) : (
            <Chip size="small" label="No roles" variant="outlined" color="default" />
          )}
        </Box>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: (user: UserData) => (
        <Chip
          size="small"
          label={user.is_active ? 'Active' : 'Inactive'}
          color={user.is_active ? 'success' : 'default'}
          variant="outlined"
          icon={user.is_active ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
        />
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (user: UserData) => (
        <Typography variant="body2">
          {new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Typography>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Modified',
      sortable: true,
      render: (user: UserData) => (
        <Typography variant="body2">
          {new Date(user.updated_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </Typography>
      )
    }
  ];

  // Action definitions for CommonTableLayout
  const actions: TableAction<UserData>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (user: UserData) => {
        // Handle view user action
        console.log('View user:', user);
      },
      color: 'primary'
    },
    {
      label: 'Edit',
      icon: <Edit />,
      onClick: handleEditUser,
      color: 'secondary'
    },
    {
      label: user => user.is_active ? 'Deactivate' : 'Activate',
      icon: (user: UserData) => user.is_active ? <Block /> : <CheckCircle />,
      onClick: handleToggleUserStatus,
      color: 'warning'
    },
    {
      label: 'Delete',
      icon: <Delete />,
      onClick: (user: UserData) => {
        setUserToDelete(user);
        setDeleteConfirmOpen(true);
      },
      color: 'error'
    }
  ];

  // Filter options for CommonTableLayout
  const filters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Users' },
        { value: 'active', label: 'Active Only' },
        { value: 'inactive', label: 'Inactive Only' }
      ]
    },
    {
      key: 'roles',
      label: 'Role',
      options: [
        { value: 'all', label: 'All Roles' },
        ...AVAILABLE_ROLES.map(role => ({ value: role.value, label: role.label }))
      ]
    }
  ];

  // Event handlers
  function handleEditUser(user: UserData) {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: user.roles || [],
      is_active: user.is_active,
      password: '' // Don't pre-fill password for security
    });
    setDialogOpen(true);
  }

  function handleToggleUserStatus(user: UserData) {
    updateUser({
      id: user.id,
      is_active: !user.is_active
    });
  }

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      roles: [],
      is_active: true,
      password: ''
    });
    setDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData: UpdateUserRequest = {
          id: editingUser.id,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          roles: formData.roles,
          is_active: formData.is_active
        };
        
        // Only include password if it's provided
        if (formData.password.trim()) {
          updateData.password = formData.password;
        }
        
        await updateUser(updateData).unwrap();
      } else {
        // Create new user
        await createUser({
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          roles: formData.roles,
          is_active: formData.is_active,
          password: formData.password
        }).unwrap();
      }
      
      setDialogOpen(false);
      setEditingUser(null);
      refetch();
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      try {
        await deleteUser(userToDelete.id).unwrap();
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
        refetch();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleRoleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      roles: typeof value === 'string' ? [value] : value
    }));
  };

  return (
    <Box>
      <PermissionGate permissions={['user.manage']}>
        {/* Use CommonTableLayout instead of DataTable */}
        <CommonTableLayout
          title="User Management"
          subtitle="Manage workspace users, roles, and permissions"
          data={users}
          columns={columns}
          actions={actions}
          loading={isLoading}
          showCreateButton={true}
          createButtonLabel="Add User"
          onCreateClick={handleCreateUser}
          onRefresh={refetch}
          searchable={true}
          searchPlaceholder="Search users by name or email..."
          filters={filters}
          pagination={true}
          itemsPerPage={25}
          selectable={false}
        />

        {/* User Form Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="First Name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Last Name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    fullWidth
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    fullWidth
                    required={!editingUser}
                    helperText={editingUser ? "Only enter a password if you want to change it" : ""}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Roles</InputLabel>
                    <Select
                      multiple
                      value={formData.roles}
                      onChange={handleRoleChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip
                              key={value}
                              label={AVAILABLE_ROLES.find(r => r.value === value)?.label || value}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {AVAILABLE_ROLES.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      />
                    }
                    label="Active User"
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              variant="contained"
              disabled={isCreating || isUpdating}
            >
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This action cannot be undone.
            </Alert>
            <Typography>
              Are you sure you want to delete the user <strong>{userToDelete?.display_name}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              color="error"
              variant="contained"
              disabled={isDeleting}
            >
              Delete User
            </Button>
          </DialogActions>
        </Dialog>
      </PermissionGate>
    </Box>
  );
};