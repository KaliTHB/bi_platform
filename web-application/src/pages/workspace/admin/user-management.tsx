// web-application/src/pages/workspace/admin/user-management.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  FormGroup,
  LinearProgress,
  Snackbar
} from '@mui/material';
import {
  Add,
  Person,
  Group,
  Security,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  Lock,
  LockOpen,
  PersonAdd,
  AdminPanelSettings,
  Assignment,
  CheckCircle,
  Cancel,
  Info
} from '@mui/icons-material';

import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { CommonTableLayout, TableColumn, TableAction } from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';

// Import corrected RTK Query APIs
import { 
  userApi,
  type User,
  type CreateUserRequest,
  type UpdateUserRequest
} from '../../../store/api/userApi';

import { 
  roleApi,
  type Role,
  type CreateRoleRequest,
  type UpdateRoleRequest
} from '../../../store/api/roleApi';

import { 
  permissionApi,
  type Permission
} from '../../../store/api/permissionApi';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface BaseListItem {
  id: string;
  name: string;
  display_name?: string;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  roles: string[];
  is_active: boolean;
  department?: string;
  position?: string;
}

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  color: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // UI State
  const [currentTab, setCurrentTab] = useState(0);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'user' | 'role'; id: string; name: string } | null>(null);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Form Data
  const [userFormData, setUserFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    roles: [],
    is_active: true,
    department: '',
    position: '',
  });

  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    permissions: [],
    color: '#1976d2',
  });

  // ============================================================================
  // RTK QUERY HOOKS
  // ============================================================================

  // User queries
  const { 
    data: usersResponse, 
    isLoading: usersLoading, 
    error: usersError,
    refetch: refetchUsers 
  } = userApi.useGetUsersQuery({
    include_inactive: false,
    detailed: true
  });

  // Role queries
  const { 
    data: rolesResponse, 
    isLoading: rolesLoading 
  } = roleApi.useGetRolesQuery({
    include_permissions: true
  });

  // Permission queries
  const { 
    data: permissionsResponse, 
    isLoading: permissionsLoading 
  } = permissionApi.useGetPermissionsQuery();

  // Mutation hooks for users
  const [createUser, { isLoading: isCreatingUser }] = userApi.useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = userApi.useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = userApi.useDeleteUserMutation();

  // Mutation hooks for roles
  const [createRole, { isLoading: isCreatingRole }] = roleApi.useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = roleApi.useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeletingRole }] = roleApi.useDeleteRoleMutation();

  // Role assignment mutations
  const [assignRoleToUser] = roleApi.useAssignRoleToUserMutation();
  const [removeRoleAssignment] = roleApi.useRemoveRoleAssignmentMutation();

  // ============================================================================
  // DATA PROCESSING
  // ============================================================================

  const users: User[] = useMemo(() => {
    if (!usersResponse?.success) return [];
    return usersResponse.data.map(user => ({
      ...user,
      display_name: user.first_name && user.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user.username || user.email,
      role_names: user.role_names || []
    }));
  }, [usersResponse]);

  const roles: Role[] = useMemo(() => {
    if (!rolesResponse?.success) return [];
    return rolesResponse.data.map(role => ({
      ...role,
      display_name: role.display_name || role.name,
      user_count: role.user_count || 0,
      color: role.color || '#1976d2'
    }));
  }, [rolesResponse]);

  const permissions: Permission[] = useMemo(() => {
    if (!permissionsResponse?.success) return [];
    return permissionsResponse.data.map(permission => ({
      ...permission,
      display_name: permission.display_name || permission.name,
      category: permission.category || 'General'
    }));
  }, [permissionsResponse]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleShowSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const resetUserForm = () => {
    setUserFormData({
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      roles: [],
      is_active: true,
      department: '',
      position: '',
    });
    setEditingUser(null);
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      display_name: '',
      description: '',
      permissions: [],
      color: '#1976d2',
    });
    setEditingRole(null);
  };

  // User handlers
  const handleCreateUser = () => {
    resetUserForm();
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: '',
      roles: user.role_names || [],
      is_active: user.is_active,
      department: user.department || '',
      position: user.position || '',
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const userData: CreateUserRequest | UpdateUserRequest = {
        email: userFormData.email,
        first_name: userFormData.first_name,
        last_name: userFormData.last_name,
        roles: userFormData.roles,
        is_active: userFormData.is_active,
        department: userFormData.department,
        position: userFormData.position,
      };

      if (editingUser) {
        // Update existing user
        if (userFormData.password) {
          (userData as UpdateUserRequest).password = userFormData.password;
        }
        await updateUser({
          id: editingUser.id,
          updates: userData as UpdateUserRequest
        }).unwrap();
        handleShowSnackbar('User updated successfully', 'success');
      } else {
        // Create new user
        (userData as CreateUserRequest).password = userFormData.password;
        await createUser(userData as CreateUserRequest).unwrap();
        handleShowSnackbar('User created successfully', 'success');
      }
      
      setUserDialogOpen(false);
      resetUserForm();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to save user';
      handleShowSnackbar(errorMessage, 'error');
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingItem({ type: 'user', id: user.id, name: user.display_name || user.email });
    setConfirmDialogOpen(true);
  };

  // Role handlers
  const handleCreateRole = () => {
    resetRoleForm();
    setRoleDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      permissions: role.permissions || [],
      color: role.color || '#1976d2',
    });
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      const roleData: CreateRoleRequest | UpdateRoleRequest = {
        name: roleFormData.name,
        display_name: roleFormData.display_name,
        description: roleFormData.description,
        permissions: roleFormData.permissions,
        color: roleFormData.color,
      };

      if (editingRole) {
        // Update existing role
        await updateRole({
          roleId: editingRole.id,
          ...roleData
        }).unwrap();
        handleShowSnackbar('Role updated successfully', 'success');
      } else {
        // Create new role
        await createRole(roleData as CreateRoleRequest).unwrap();
        handleShowSnackbar('Role created successfully', 'success');
      }
      
      setRoleDialogOpen(false);
      resetRoleForm();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to save role';
      handleShowSnackbar(errorMessage, 'error');
    }
  };

  const handleDeleteRole = (role: Role) => {
    setDeletingItem({ type: 'role', id: role.id, name: role.display_name });
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    try {
      if (deletingItem.type === 'user') {
        await deleteUser(deletingItem.id).unwrap();
        handleShowSnackbar('User deleted successfully', 'success');
      } else {
        await deleteRole(deletingItem.id).unwrap();
        handleShowSnackbar('Role deleted successfully', 'success');
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || `Failed to delete ${deletingItem.type}`;
      handleShowSnackbar(errorMessage, 'error');
    } finally {
      setConfirmDialogOpen(false);
      setDeletingItem(null);
    }
  };

  // ============================================================================
  // TABLE CONFIGURATIONS
  // ============================================================================

  const userColumns: TableColumn<User>[] = [
    {
      key: 'display_name',
      label: 'Name',
      width: 200,
      sortable: true,
      render: (user) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.display_name}
              style={{ width: 32, height: 32, borderRadius: '50%' }}
            />
          ) : (
            <Person sx={{ width: 32, height: 32, color: 'text.secondary' }} />
          )}
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {user.display_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'department',
      label: 'Department',
      width: 150,
      render: (user) => user.department || '-'
    },
    {
      key: 'role_names',
      label: 'Roles',
      width: 250,
      render: (user) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {user.role_names?.map((role, index) => (
            <Chip 
              key={index} 
              label={role} 
              size="small" 
              variant="outlined"
              color="primary"
            />
          ))}
        </Box>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      width: 100,
      render: (user) => (
        <Chip 
          label={user.is_active ? 'Active' : 'Inactive'} 
          color={user.is_active ? 'success' : 'default'} 
          size="small"
          icon={user.is_active ? <CheckCircle /> : <Cancel />}
        />
      )
    },
    {
      key: 'last_login',
      label: 'Last Login',
      width: 120,
      sortable: true,
      render: (user) => user.last_login 
        ? new Date(user.last_login).toLocaleDateString() 
        : 'Never',
    }
  ];

  const roleColumns: TableColumn<Role>[] = [
    {
      key: 'display_name',
      label: 'Role',
      width: 200,
      sortable: true,
      render: (role) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: role.color 
            }} 
          />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {role.display_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {role.name}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'description',
      label: 'Description',
      width: 300,
      render: (role) => role.description || '-'
    },
    {
      key: 'user_count',
      label: 'Users',
      width: 80,
      render: (role) => (
        <Chip 
          label={role.user_count || 0} 
          size="small" 
          variant="outlined"
        />
      )
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
      key: 'display_name',
      label: 'Permission',
      width: 250,
      sortable: true,
      render: (permission) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {permission.display_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {permission.name}
          </Typography>
        </Box>
      )
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
      render: (permission) => permission.resource_type || '-'
    },
    {
      key: 'action',
      label: 'Action',
      width: 100,
      render: (permission) => permission.action || '-'
    },
    {
      key: 'description',
      label: 'Description',
      width: 300,
      render: (permission) => permission.description || '-'
    }
  ];

  // Table Actions
  const userActions: TableAction<User>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (user) => console.log('View user:', user),
      permission: 'user.read',
    },
    {
      label: 'Edit',
      icon: <Edit />,
      onClick: handleEditUser,
      permission: 'user.update',
    },
    {
      label: 'Delete',
      icon: <Delete />,
      onClick: handleDeleteUser,
      permission: 'user.delete',
      color: 'error',
    }
  ];

  const roleActions: TableAction<Role>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (role) => console.log('View role:', role),
      permission: 'role.read',
    },
    {
      label: 'Edit',
      icon: <Edit />,
      onClick: handleEditRole,
      permission: 'role.update',
      disabled: (role) => role.is_system === true,
    },
    {
      label: 'Delete',
      icon: <Delete />,
      onClick: handleDeleteRole,
      permission: 'role.delete',
      color: 'error',
      disabled: (role) => role.is_system === true,
    }
  ];

  const permissionActions: TableAction<Permission>[] = [
    {
      label: 'View',
      icon: <Info />,
      onClick: (permission) => console.log('View permission:', permission),
      permission: 'permission.read',
    }
  ];

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  // Loading and error handling
  if (usersError) {
    return (
      <WorkspaceLayout>
        <Box p={3}>
          <Alert severity="error">
            Error loading users: {usersError && typeof usersError === 'object' && 'message' in usersError 
              ? (usersError as any).message 
              : 'Unknown error'}
          </Alert>
        </Box>
      </WorkspaceLayout>
    );
  }

  const isLoading = usersLoading || rolesLoading || permissionsLoading;

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <WorkspaceLayout>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              User Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage users, roles, and permissions for your workspace
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <PermissionGate permission="role.create">
              <Button
                variant="outlined"
                startIcon={<Group />}
                onClick={handleCreateRole}
              >
                Add Role
              </Button>
            </PermissionGate>
            <PermissionGate permission="user.create">
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={handleCreateUser}
              >
                Add User
              </Button>
            </PermissionGate>
          </Box>
        </Box>

        {/* Loading Progress */}
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

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
              searchPlaceholder="Search users by name or email..."
              emptyStateText="No users found"
              emptyStateIcon={<Person sx={{ fontSize: 48, color: 'text.disabled' }} />}
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
              emptyStateIcon={<Group sx={{ fontSize: 48, color: 'text.disabled' }} />}
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
              emptyStateIcon={<Security sx={{ fontSize: 48, color: 'text.disabled' }} />}
            />
          </TabPanel>
        </Paper>

        {/* User Dialog */}
        <Dialog 
          open={userDialogOpen} 
          onClose={() => setUserDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonAdd />
              {editingUser ? 'Edit User' : 'Create User'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="First Name"
                  value={userFormData.first_name}
                  onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Last Name"
                  value={userFormData.last_name}
                  onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  fullWidth
                  required={!editingUser}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Department"
                  value={userFormData.department}
                  onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Position"
                  value={userFormData.position}
                  onChange={(e) => setUserFormData({ ...userFormData, position: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={userFormData.roles}
                    onChange={(e) => setUserFormData({ 
                      ...userFormData, 
                      roles: Array.isArray(e.target.value) ? e.target.value : []
                    })}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const role = roles.find(r => r.id === value || r.name === value);
                          return (
                            <Chip 
                              key={value} 
                              label={role?.display_name || value} 
                              size="small" 
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        <Checkbox 
                          checked={userFormData.roles.includes(role.id)} 
                        />
                        <ListItemText 
                          primary={role.display_name} 
                          secondary={role.description} 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userFormData.is_active}
                      onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUser}
              variant="contained"
              disabled={isCreatingUser || isUpdatingUser}
            >
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Role Dialog */}
        <Dialog 
          open={roleDialogOpen} 
          onClose={() => setRoleDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Group />
              {editingRole ? 'Edit Role' : 'Create Role'}
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Role Name"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Display Name"
                  value={roleFormData.display_name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, display_name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Color"
                  type="color"
                  value={roleFormData.color}
                  onChange={(e) => setRoleFormData({ ...roleFormData, color: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Permissions
                </Typography>
                <Paper sx={{ maxHeight: 300, overflow: 'auto', p: 1 }}>
                  <FormGroup>
                    {permissions.map((permission) => (
                      <FormControlLabel
                        key={permission.id}
                        control={
                          <Checkbox
                            checked={roleFormData.permissions.includes(permission.id)}
                            onChange={(e) => {
                              const newPermissions = e.target.checked
                                ? [...roleFormData.permissions, permission.id]
                                : roleFormData.permissions.filter(p => p !== permission.id);
                              setRoleFormData({ ...roleFormData, permissions: newPermissions });
                            }}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2">
                              {permission.display_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.description}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </FormGroup>
                </Paper>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRole}
              variant="contained"
              disabled={isCreatingRole || isUpdatingRole}
            >
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>
            Confirm Deletion
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {deletingItem?.type} "{deletingItem?.name}"?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={isDeletingUser || isDeletingRole}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </WorkspaceLayout>
  );
};

export default UserManagement;