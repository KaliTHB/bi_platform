import React, { useState, useMemo } from 'react';
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
  Autocomplete,
  Tab,
  Tabs,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  Email,
  Business,
  AdminPanelSettings,
  Security,
  Group,
  Assignment,
  Visibility,
  Block
} from '@mui/icons-material';

// Import existing components
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  BaseListItem,
  TableColumn, 
  TableAction
} from '../../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';

// ✅ FIXED: Import RTK Query APIs correctly
import { userApi } from '../../../store/api/userApi';
import { roleApi } from '../../../store/api/roleApi';
import { permissionApi } from '../../../store/api/permissionApi';

// Types extending BaseListItem
interface User extends BaseListItem {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active: boolean;
  roles?: string[];
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
  // For display purposes
  display_name?: string;
  role_names?: string[];
}

interface Role extends BaseListItem {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  is_system?: boolean;
  created_at?: string;
  user_count?: number;
}

interface Permission extends BaseListItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  resource_type?: string;
  action?: string;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  roles: string[];
  is_active: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const UserManagement: React.FC = () => {
  // State management
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    roles: [],
    is_active: true,
  });

  // ✅ FIXED: Use RTK Query hooks correctly from API objects
  const { 
    data: usersData, 
    isLoading: usersLoading, 
    error: usersError,
    refetch: refetchUsers 
  } = userApi.useGetUsersQuery({
    limit: 100,
    is_active: true
  });

  const { 
    data: rolesData, 
    isLoading: rolesLoading 
  } = roleApi.useGetRolesQuery({
    limit: 50,
    include_permissions: true
  });

  const { 
    data: permissionsData, 
    isLoading: permissionsLoading 
  } = permissionApi.useGetPermissionsQuery({
    limit: 100
  });

  // Mutation hooks
  const [createUser, { isLoading: isCreating }] = userApi.useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = userApi.useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = userApi.useDeleteUserMutation();
  const [assignRoleToUser] = roleApi.useAssignRoleToUserMutation();
  const [removeRoleAssignment] = roleApi.useRemoveRoleAssignmentMutation();

  // Data processing with CommonTableLayout format
  const users: User[] = useMemo(() => {
    const rawUsers = usersData?.data || [];
    return rawUsers.map(user => ({
      ...user,
      display_name: user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user.email,
      role_names: user.roles?.map(roleId => {
        const role = (rolesData?.data || []).find(r => r.id === roleId);
        return role?.name || roleId;
      }) || []
    }));
  }, [usersData, rolesData]);

  const roles: Role[] = useMemo(() => rolesData?.data || [], [rolesData]);
  const permissions: Permission[] = useMemo(() => permissionsData?.data || [], [permissionsData]);

  // Event handlers
  const handleCreateUser = async () => {
    try {
      const userData = {
        ...formData,
        ...(formData.password && { password: formData.password })
      };

      let user;
      if (editingUser) {
        const { password, ...updateData } = userData;
        const result = await updateUser({
          id: editingUser.id,
          updates: password ? userData : updateData
        }).unwrap();
        user = result.data;
      } else {
        const result = await createUser(userData).unwrap();
        user = result.data;
      }

      // Handle role assignments
      if (formData.roles.length > 0 && user) {
        for (const roleId of formData.roles) {
          try {
            await assignRoleToUser({
              userId: user.id,
              roleId,
              assignedBy: 'current-user',
            }).unwrap();
          } catch (roleError) {
            console.error(`Failed to assign role ${roleId}:`, roleError);
          }
        }
      }

      setDialogOpen(false);
      resetForm();
      refetchUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      password: '',
      roles: user.roles || [],
      is_active: user.is_active,
    });
    setDialogOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user ${user.email}?`)) {
      try {
        await deleteUser(user.id).unwrap();
        refetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      roles: [],
      is_active: true,
    });
    setEditingUser(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Column definitions for CommonTableLayout
  const userColumns: TableColumn<User>[] = [
    {
      key: 'avatar',
      label: '',
      width: 60,
      render: (user) => (
        <Avatar src={user.avatar_url} sx={{ width: 32, height: 32 }}>
          {user.first_name 
            ? user.first_name.charAt(0).toUpperCase() 
            : user.email.charAt(0).toUpperCase()
          }
        </Avatar>
      )
    },
    {
      key: 'email',
      label: 'Email',
      width: 200,
      sortable: true,
    },
    {
      key: 'display_name',
      label: 'Name',
      width: 180,
      sortable: true,
      render: (user) => user.display_name || user.email
    },
    {
      key: 'roles',
      label: 'Roles',
      width: 250,
      render: (user) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {user.role_names?.map((roleName, index) => (
            <Chip 
              key={`${user.id}-role-${index}`}
              label={roleName} 
              size="small" 
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      width: 100,
      sortable: true,
      render: (user) => (
        <Chip 
          label={user.is_active ? 'Active' : 'Inactive'} 
          color={user.is_active ? 'success' : 'default'} 
          size="small" 
        />
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      width: 120,
      sortable: true,
      render: (user) => user.created_at 
        ? new Date(user.created_at).toLocaleDateString() 
        : '',
    }
  ];

  const roleColumns: TableColumn<Role>[] = [
    {
      key: 'name',
      label: 'Role Name',
      width: 200,
      sortable: true,
    },
    {
      key: 'description',
      label: 'Description',
      width: 300,
    },
    {
      key: 'permissions',
      label: 'Permissions',
      width: 120,
      render: (role) => `${role.permissions?.length || 0} permissions`,
    },
    {
      key: 'is_system',
      label: 'Type',
      width: 100,
      render: (role) => (
        <Chip 
          label={role.is_system ? 'System' : 'Custom'} 
          color={role.is_system ? 'default' : 'primary'} 
          size="small" 
        />
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      width: 120,
      sortable: true,
      render: (role) => role.created_at 
        ? new Date(role.created_at).toLocaleDateString() 
        : '',
    }
  ];

  const permissionColumns: TableColumn<Permission>[] = [
    {
      key: 'name',
      label: 'Permission',
      width: 250,
      sortable: true,
    },
    {
      key: 'category',
      label: 'Category',
      width: 120,
      render: (permission) => (
        <Chip 
          label={permission.category || 'General'} 
          size="small" 
          variant="outlined"
        />
      )
    },
    {
      key: 'resource_type',
      label: 'Resource',
      width: 120,
    },
    {
      key: 'action',
      label: 'Action',
      width: 100,
    },
    {
      key: 'description',
      label: 'Description',
      width: 300,
    }
  ];

  // Actions for CommonTableLayout
  const userActions: TableAction<User>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (user) => console.log('View user:', user),
    },
    {
      label: 'Edit',
      icon: <Edit />,
      onClick: handleEditUser,
      permission: 'user:update',
    },
    {
      label: 'Delete',
      icon: <Delete />,
      onClick: handleDeleteUser,
      permission: 'user:delete',
      color: 'error',
    }
  ];

  const roleActions: TableAction<Role>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (role) => console.log('View role:', role),
    },
    {
      label: 'Edit',
      icon: <Edit />,
      onClick: (role) => console.log('Edit role:', role),
      permission: 'role:update',
    }
  ];

  const permissionActions: TableAction<Permission>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (permission) => console.log('View permission:', permission),
    }
  ];

  // Loading and error handling
  if (usersError) {
    return (
      <WorkspaceLayout>
        <Box p={3}>
          <Alert severity="error">
            Error loading users: {JSON.stringify(usersError)}
          </Alert>
        </Box>
      </WorkspaceLayout>
    );
  }

  const isLoading = usersLoading || rolesLoading || permissionsLoading;

  return (
    <WorkspaceLayout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">User Management</Typography>
          <PermissionGate permission="user:create">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setDialogOpen(true)}
            >
              Add User
            </Button>
          </PermissionGate>
        </Box>

        {/* Tabs */}
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab 
                label={`Users (${users.length})`} 
                icon={<Person />} 
                iconPosition="start"
              />
              <Tab 
                label={`Roles (${roles.length})`} 
                icon={<Group />} 
                iconPosition="start"
              />
              <Tab 
                label={`Permissions (${permissions.length})`} 
                icon={<Security />} 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Users Tab */}
          <TabPanel value={currentTab} index={0}>
            <CommonTableLayout<User>
              title="Users"
              items={users}
              columns={userColumns}
              actions={userActions}
              loading={usersLoading}
              onItemClick={(user) => console.log('Selected user:', user)}
              searchPlaceholder="Search users..."
              emptyStateText="No users found"
            />
          </TabPanel>

          {/* Roles Tab */}
          <TabPanel value={currentTab} index={1}>
            <CommonTableLayout<Role>
              title="Roles"
              items={roles}
              columns={roleColumns}
              actions={roleActions}
              loading={rolesLoading}
              onItemClick={(role) => console.log('Selected role:', role)}
              searchPlaceholder="Search roles..."
              emptyStateText="No roles found"
            />
          </TabPanel>

          {/* Permissions Tab */}
          <TabPanel value={currentTab} index={2}>
            <CommonTableLayout<Permission>
              title="Permissions"
              items={permissions}
              columns={permissionColumns}
              actions={permissionActions}
              loading={permissionsLoading}
              onItemClick={(permission) => console.log('Selected permission:', permission)}
              searchPlaceholder="Search permissions..."
              emptyStateText="No permissions found"
            />
          </TabPanel>
        </Paper>

        {/* Create/Edit User Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person />
              {editingUser ? 'Edit User' : 'Create User'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={editingUser ? "New Password (leave empty to keep current)" : "Password"}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  fullWidth
                  required={!editingUser}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={roles}
                  getOptionLabel={(option) => option.name}
                  value={roles.filter(role => formData.roles.includes(role.id))}
                  onChange={(event, newValue) => {
                    setFormData({ 
                      ...formData, 
                      roles: newValue.map(role => role.id) 
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Roles"
                      placeholder="Select roles"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active User"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateUser} 
              variant="contained"
              disabled={isCreating || isUpdating || !formData.email}
              startIcon={editingUser ? <Edit /> : <Add />}
            >
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default UserManagement;