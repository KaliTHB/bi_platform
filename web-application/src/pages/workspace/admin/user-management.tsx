// src/pages/workspace/admin/user-management.tsx - Updated with Merged RBAC APIs
import React, { useState, useMemo } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Paper,
  Grid,
  CircularProgress,
  OutlinedInput,
  ListItemText,
  Checkbox,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Security as RoleIcon,
  Shield as PermissionIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Key as KeyIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  Assignment as AssignIcon,
  RemoveCircle as RevokeIcon
} from '@mui/icons-material';

// Import existing components
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  BaseListItem,
  TableColumn, 
  TableAction
} from '../../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';

// Import hooks and services
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useWorkspace } from '../../../hooks/useWorkspace';

// Import merged RBAC API hooks
import {
  // Users API hooks
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetUserPermissionsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useDeleteUserMutation,
  useSearchUsersQuery,

  // Merged Roles API hooks (roles + role assignments)
  useGetWorkspaceRolesQuery,
  useGetUserRoleAssignmentsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useAssignRoleToUserMutation,
  useRemoveRoleAssignmentMutation,
  useBulkAssignRolesMutation,
  useGetAssignmentStatsQuery,

  // Merged Permissions API hooks (permissions + permission assignments)
  useGetPermissionsByCategoryQuery,
  useGetRolePermissionAssignmentsQuery,
  useAssignPermissionToRoleMutation,
  useBulkAssignPermissionsMutation,
  useRemovePermissionFromRoleMutation,
} from '../../../store';

import type { 
  User, 
  Role, 
  Permission, 
  UserRoleAssignment,
  CreateUserRequest,
  CreateRoleRequest,
  AssignRoleToUserRequest
} from '../../../types/rbac.types';

// Enhanced interfaces for the component
interface UserListItem extends BaseListItem {
  username: string;
  email: string;
  name: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  user_type?: 'internal' | 'external' | 'service_account';
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  is_active: boolean;
  user_type: 'internal' | 'external' | 'service_account';
}

interface RoleFormData {
  name: string;
  description: string;
  permission_ids: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab Panel Component
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-management-tabpanel-${index}`}
      aria-labelledby={`user-management-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const UserManagementPage: NextPage = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const { workspace } = useWorkspace();
  const workspaceId = workspace?.id || '';

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleAssignDialogOpen, setRoleAssignDialogOpen] = useState(false);
  const [permissionAssignDialogOpen, setPermissionAssignDialogOpen] = useState(false);

  // Editing states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Form data states
  const [userFormData, setUserFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    is_active: true,
    user_type: 'internal',
  });

  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permission_ids: [],
  });

  // ==================== DATA FETCHING ====================

  // Fetch users with workspace filtering
  const { 
    data: usersResponse, 
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers 
  } = useGetUsersQuery({ 
    workspace_id: workspaceId, 
    is_active: true,
    page: 1,
    limit: 100 
  });

  // Fetch workspace roles
  const { 
    data: rolesResponse, 
    isLoading: rolesLoading,
    refetch: refetchRoles 
  } = useGetWorkspaceRolesQuery(workspaceId);

  // Fetch permissions grouped by category
  const { 
    data: permissionsByCategoryResponse,
    isLoading: permissionsLoading 
  } = useGetPermissionsByCategoryQuery();

  // Fetch user role assignments for selected user
  const { 
    data: userRolesResponse 
  } = useGetUserRoleAssignmentsQuery(
    { userId: selectedUser?.id || '', workspaceId },
    { skip: !selectedUser?.id }
  );

  // Fetch role permissions for selected role
  const { 
    data: rolePermissionsResponse 
  } = useGetRolePermissionAssignmentsQuery(
    selectedRole?.id || '',
    { skip: !selectedRole?.id }
  );

  // Fetch assignment statistics
  const { 
    data: assignmentStatsResponse 
  } = useGetAssignmentStatsQuery(workspaceId);

  // ==================== MUTATIONS ====================

  // User mutations
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [deactivateUser] = useDeactivateUserMutation();
  const [reactivateUser] = useReactivateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  // Role mutations
  const [createRole, { isLoading: isCreatingRole }] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  // Assignment mutations
  const [assignRoleToUser] = useAssignRoleToUserMutation();
  const [removeRoleAssignment] = useRemoveRoleAssignmentMutation();
  const [bulkAssignRoles] = useBulkAssignRolesMutation();
  const [assignPermissionToRole] = useAssignPermissionToRoleMutation();
  const [bulkAssignPermissions] = useBulkAssignPermissionsMutation();
  const [removePermissionFromRole] = useRemovePermissionFromRoleMutation();

  // ==================== DERIVED DATA ====================

  const users = usersResponse?.data || [];
  const roles = rolesResponse?.data || [];
  const permissionsByCategory = permissionsByCategoryResponse?.data || [];
  const userRoles = userRolesResponse?.data || [];
  const rolePermissions = rolePermissionsResponse?.data || [];
  const assignmentStats = assignmentStatsResponse?.data;

  // ==================== HANDLERS ====================

  // User handlers
  const handleCreateUser = async () => {
    try {
      await createUser(userFormData).unwrap();
      setUserDialogOpen(false);
      resetUserForm();
      refetchUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      await updateUser({
        id: editingUser.id,
        ...userFormData
      }).unwrap();
      setUserDialogOpen(false);
      resetUserForm();
      refetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await deactivateUser(userId).unwrap();
      refetchUsers();
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await reactivateUser(userId).unwrap();
      refetchUsers();
    } catch (error) {
      console.error('Failed to reactivate user:', error);
    }
  };

  // Role handlers
  const handleCreateRole = async () => {
    try {
      await createRole({
        workspace_id: workspaceId,
        ...roleFormData
      }).unwrap();
      setRoleDialogOpen(false);
      resetRoleForm();
      refetchRoles();
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      await updateRole({
        id: editingRole.id,
        ...roleFormData
      }).unwrap();
      setRoleDialogOpen(false);
      resetRoleForm();
      refetchRoles();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  // Assignment handlers
  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await assignRoleToUser({
        user_id: userId,
        workspace_id: workspaceId,
        role_id: roleId,
      }).unwrap();
      refetchUsers();
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleRemoveRole = async (assignmentId: string) => {
    try {
      await removeRoleAssignment(assignmentId).unwrap();
      refetchUsers();
    } catch (error) {
      console.error('Failed to remove role:', error);
    }
  };

  const handleAssignPermission = async (roleId: string, permissionId: string) => {
    try {
      await assignPermissionToRole({
        role_id: roleId,
        permission_id: permissionId,
      }).unwrap();
    } catch (error) {
      console.error('Failed to assign permission:', error);
    }
  };

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
    try {
      await removePermissionFromRole({
        role_id: roleId,
        permission_id: permissionId,
      }).unwrap();
    } catch (error) {
      console.error('Failed to remove permission:', error);
    }
  };

  // Form helpers
  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      is_active: true,
      user_type: 'internal',
    });
    setEditingUser(null);
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      description: '',
      permission_ids: [],
    });
    setEditingRole(null);
  };

  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't pre-fill password
        is_active: user.is_active,
        user_type: 'internal', // Default, since this may not be in the user object
      });
    } else {
      resetUserForm();
    }
    setUserDialogOpen(true);
  };

  const openRoleDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        name: role.name,
        description: role.description,
        permission_ids: role.permissions?.map(p => p.id) || [],
      });
    } else {
      resetRoleForm();
    }
    setRoleDialogOpen(true);
  };

  // Table columns configuration
  const userColumns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (user: User) => (
        <Box display="flex" alignItems="center">
          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (user: User) => (
        <Chip
          icon={user.is_active ? <ActiveIcon /> : <BlockIcon />}
          label={user.is_active ? 'Active' : 'Inactive'}
          color={user.is_active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (user: User) => new Date(user.created_at).toLocaleDateString(),
    },
  ];

  const userActions: TableAction[] = [
    {
      label: 'Assign Roles',
      icon: <AssignIcon />,
      onClick: (user: User) => {
        setSelectedUser(user);
        setRoleAssignDialogOpen(true);
      },
      show: (user: User) => hasPermission('role.assign'),
    },
    {
      label: 'Edit',
      icon: <EditIcon />,
      onClick: (user: User) => openUserDialog(user),
      show: (user: User) => hasPermission('user.update'),
    },
    {
      label: user => user.is_active ? 'Deactivate' : 'Activate',
      icon: user => user.is_active ? <BlockIcon /> : <ActiveIcon />,
      onClick: (user: User) => 
        user.is_active ? handleDeactivateUser(user.id) : handleReactivateUser(user.id),
      show: (user: User) => hasPermission('user.update'),
    },
  ];

  const roleColumns: TableColumn[] = [
    {
      key: 'name',
      label: 'Role',
      sortable: true,
      render: (role: Role) => (
        <Box display="flex" alignItems="center">
          <RoleIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {role.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {role.description}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'is_system_role',
      label: 'Type',
      render: (role: Role) => (
        <Chip
          label={role.is_system_role ? 'System' : 'Custom'}
          color={role.is_system_role ? 'primary' : 'secondary'}
          size="small"
        />
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (role: Role) => (
        <Typography variant="body2">
          {role.permissions?.length || 0} permissions
        </Typography>
      ),
    },
  ];

  const roleActions: TableAction[] = [
    {
      label: 'Manage Permissions',
      icon: <PermissionIcon />,
      onClick: (role: Role) => {
        setSelectedRole(role);
        setPermissionAssignDialogOpen(true);
      },
      show: (role: Role) => hasPermission('role.update'),
    },
    {
      label: 'Edit',
      icon: <EditIcon />,
      onClick: (role: Role) => openRoleDialog(role),
      show: (role: Role) => hasPermission('role.update') && !role.is_system_role,
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
      onClick: async (role: Role) => {
        if (window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
          try {
            await deleteRole(role.id).unwrap();
            refetchRoles();
          } catch (error) {
            console.error('Failed to delete role:', error);
          }
        }
      },
      show: (role: Role) => hasPermission('role.delete') && !role.is_system_role,
      color: 'error',
    },
  ];

  if (usersLoading || rolesLoading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <Container maxWidth="xl">
        <Box mb={3}>
          <Typography variant="h4" gutterBottom>
            User & Role Management
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Manage users, roles, and permissions for {workspace?.name}
          </Typography>

          {/* Statistics Cards */}
          {assignmentStats && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{assignmentStats.users_with_roles}</Typography>
                    <Typography variant="body2" color="text.secondary">Users with Roles</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{assignmentStats.active_assignments}</Typography>
                    <Typography variant="body2" color="text.secondary">Active Assignments</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{assignmentStats.total_assignments}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Assignments</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{assignmentStats.recent_activity}</Typography>
                    <Typography variant="body2" color="text.secondary">Recent Activity</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>

        <Paper>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab 
                label={
                  <Box display="flex" alignItems="center">
                    <PersonIcon sx={{ mr: 1 }} />
                    Users ({users.length})
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box display="flex" alignItems="center">
                    <RoleIcon sx={{ mr: 1 }} />
                    Roles ({roles.length})
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box display="flex" alignItems="center">
                    <PermissionIcon sx={{ mr: 1 }} />
                    Permissions
                  </Box>
                } 
              />
            </Tabs>
          </Box>

          {/* Users Tab */}
          <TabPanel value={activeTab} index={0}>
            <PermissionGate permissions={['user.read']} fallback={<Alert severity="warning">Insufficient permissions to view users</Alert>}>
              <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Users</Typography>
                <PermissionGate permissions={['user.create']}>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => openUserDialog()}
                  >
                    Add User
                  </Button>
                </PermissionGate>
              </Box>

              <CommonTableLayout
                title='USERS'
                items={users}
                columns={userColumns}
                actions={userActions}
                loading={usersLoading}
                emptyMessage="No users found"
                searchPlaceholder="Search users..."
              />
            </PermissionGate>
          </TabPanel>

          {/* Roles Tab */}
          <TabPanel value={activeTab} index={1}>
            <PermissionGate permissions={['role.read']} fallback={<Alert severity="warning">Insufficient permissions to view roles</Alert>}>
              <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Roles</Typography>
                <PermissionGate permissions={['role.create']}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openRoleDialog()}
                  >
                    Create Role
                  </Button>
                </PermissionGate>
              </Box>

              <CommonTableLayout
                title='ROLES'
                items={roles}
                columns={roleColumns}
                actions={roleActions}
                loading={rolesLoading}
                emptyMessage="No roles found"
                searchPlaceholder="Search roles..."
              />
            </PermissionGate>
          </TabPanel>

          {/* Permissions Tab */}
          <TabPanel value={activeTab} index={2}>
            <PermissionGate permissions={['role.read']} fallback={<Alert severity="warning">Insufficient permissions to view permissions</Alert>}>
              <Typography variant="h6" gutterBottom>System Permissions</Typography>
              
              {permissionsByCategory.map((category) => (
                <Card key={category.category} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                      {category.category} Permissions
                    </Typography>
                    <Grid container spacing={2}>
                      {category.permissions.map((permission) => (
                        <Grid item xs={12} sm={6} md={4} key={permission.id}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {permission.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.description}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </PermissionGate>
          </TabPanel>
        </Paper>

        {/* User Dialog */}
        <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                label="Full Name"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                fullWidth
                required
              />
              {!editingUser && (
                <TextField
                  label="Password"
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  fullWidth
                  required
                />
              )}
              <FormControlLabel
                control={
                  <Switch
                    checked={userFormData.is_active}
                    onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              variant="contained"
              disabled={isCreatingUser || isUpdatingUser}
            >
              {isCreatingUser || isUpdatingUser ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Role Dialog */}
        <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                label="Role Name"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
              
              <Typography variant="subtitle1" gutterBottom>Permissions</Typography>
              <Box maxHeight={300} overflow="auto">
                {permissionsByCategory.map((category) => (
                  <Box key={category.category} mb={2}>
                    <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 1 }}>
                      {category.category}
                    </Typography>
                    <Grid container spacing={1}>
                      {category.permissions.map((permission) => (
                        <Grid item xs={12} sm={6} key={permission.id}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={roleFormData.permission_ids.includes(permission.id)}
                                onChange={(e) => {
                                  const newPermissionIds = e.target.checked
                                    ? [...roleFormData.permission_ids, permission.id]
                                    : roleFormData.permission_ids.filter(id => id !== permission.id);
                                  setRoleFormData({ ...roleFormData, permission_ids: newPermissionIds });
                                }}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2">{permission.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {permission.description}
                                </Typography>
                              </Box>
                            }
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={editingRole ? handleUpdateRole : handleCreateRole}
              variant="contained"
              disabled={isCreatingRole}
            >
              {isCreatingRole ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Role Assignment Dialog */}
        <Dialog open={roleAssignDialogOpen} onClose={() => setRoleAssignDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Roles to {selectedUser?.name}</DialogTitle>
          <DialogContent>
            <Box pt={1}>
              <Typography variant="subtitle2" gutterBottom>Current Roles</Typography>
              <Box mb={2}>
                {userRoles.map((assignment) => (
                  <Chip
                    key={assignment.id}
                    label={assignment.role?.name}
                    onDelete={() => handleRemoveRole(assignment.id)}
                    deleteIcon={<RevokeIcon />}
                    color="primary"
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
                {userRoles.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No roles assigned</Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>Available Roles</Typography>
              <Box>
                {roles
                  .filter(role => !userRoles.some(assignment => assignment.role_id === role.id))
                  .map((role) => (
                    <Button
                      key={role.id}
                      variant="outlined"
                      size="small"
                      onClick={() => selectedUser && handleAssignRole(selectedUser.id, role.id)}
                      startIcon={<AssignIcon />}
                      sx={{ mr: 1, mb: 1 }}
                    >
                      {role.name}
                    </Button>
                  ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleAssignDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Permission Assignment Dialog */}
        <Dialog open={permissionAssignDialogOpen} onClose={() => setPermissionAssignDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Manage Permissions for {selectedRole?.name}</DialogTitle>
          <DialogContent>
            <Box pt={1}>
              <Typography variant="subtitle2" gutterBottom>Current Permissions</Typography>
              <Box mb={2} maxHeight={200} overflow="auto">
                <Grid container spacing={1}>
                  {rolePermissions.map((assignment) => (
                    <Grid item xs={12} sm={6} key={assignment.id}>
                      <Chip
                        label={assignment.permission?.name}
                        onDelete={() => selectedRole && assignment.permission && 
                          handleRemovePermission(selectedRole.id, assignment.permission.id)}
                        deleteIcon={<RevokeIcon />}
                        color="primary"
                        size="small"
                        sx={{ width: '100%' }}
                      />
                    </Grid>
                  ))}
                </Grid>
                {rolePermissions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No permissions assigned</Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>Available Permissions</Typography>
              <Box maxHeight={300} overflow="auto">
                {permissionsByCategory.map((category) => (
                  <Box key={category.category} mb={2}>
                    <Typography variant="body2" fontWeight="medium" sx={{ textTransform: 'capitalize', mb: 1 }}>
                      {category.category}
                    </Typography>
                    <Grid container spacing={1}>
                      {category.permissions
                        .filter(permission => !rolePermissions.some(rp => rp.permission?.id === permission.id))
                        .map((permission) => (
                          <Grid item xs={12} sm={6} key={permission.id}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => selectedRole && handleAssignPermission(selectedRole.id, permission.id)}
                              startIcon={<AddIcon />}
                              sx={{ width: '100%', justifyContent: 'flex-start' }}
                            >
                              {permission.name}
                            </Button>
                          </Grid>
                        ))}
                    </Grid>
                  </Box>
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPermissionAssignDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </WorkspaceLayout>
  );
};

export default UserManagementPage;