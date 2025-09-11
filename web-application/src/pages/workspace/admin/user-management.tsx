// bi_platform/web-application/src/pages/workspace/admin/user-management.tsx
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
  Checkbox
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
  Email as EmailIcon
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

// Import API hooks
import { 
  useGetUsersQuery, 
  useCreateUserMutation, 
  useUpdateUserMutation, 
  useDeleteUserMutation 
} from '../../../store/api/userApi';
import { 
  useGetRolesQuery, 
  useCreateRoleMutation, 
  useUpdateRoleMutation, 
  useDeleteRoleMutation 
} from '../../../store/api/roleApi';
import { 
  useGetPermissionsQuery 
} from '../../../store/api/permissionApi';

// Interfaces based on existing architecture
interface UserListItem extends BaseListItem {
  username: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  last_login?: string;
  role_assignments: Array<{
    role_id: string;
    role_name: string;
    assigned_at: string;
  }>;
  invitation_status?: 'pending' | 'accepted' | 'expired';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_seen?: string;
  user_type?: 'internal' | 'external' | 'service_account';
}

interface Role extends BaseListItem {
  display_name?: string;
  description?: string;
  is_system_role: boolean;
  permissions: string[];
  user_count?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface Permission extends BaseListItem {
  category: string;
  description: string;
  action: string;
  resource: string;
  is_system_permission: boolean;
  created_at: string;
}

interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role_ids: string[];
  send_invitation: boolean;
  user_type: 'internal' | 'external' | 'service_account';
}

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  is_system_role: boolean;
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

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Form data states
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    role_ids: [],
    send_invitation: false,
    user_type: 'internal'
  });

  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    permissions: [],
    is_system_role: false
  });

  // API hooks - no workspace filtering
  const { data: usersData, isLoading: usersLoading, error: usersError } = useGetUsersQuery({});
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useGetRolesQuery({});
  const { data: permissionsData, isLoading: permissionsLoading, error: permissionsError } = useGetPermissionsQuery();

  // Mutations
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeletingUser }] = useDeleteUserMutation();
  const [createRole, { isLoading: isCreatingRole }] = useCreateRoleMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateRoleMutation();
  const [deleteRole, { isLoading: isDeletingRole }] = useDeleteRoleMutation();

  // Transform API data - no workspace filtering needed
  const users: UserListItem[] = useMemo(() => {
    return (usersData?.data || []).map(user => ({
      ...user,
      name: `${user.first_name} ${user.last_name}`.trim() || user.email,
      full_name: `${user.first_name} ${user.last_name}`.trim(),
      role_assignments: user.roles?.map(role => ({
        role_id: role.id,
        role_name: role.display_name || role.name,
        assigned_at: role.assigned_at || user.created_at
      })) || []
    }));
  }, [usersData]);

  const roles: Role[] = useMemo(() => {
    return (rolesData?.data || []).map(role => ({
      ...role,
      user_count: role.user_assignments?.length || 0
    }));
  }, [rolesData]);

  const permissions: Permission[] = useMemo(() => {
    return permissionsData?.data || [];
  }, [permissionsData]);

  // Loading and error states
  const loading = usersLoading || rolesLoading || permissionsLoading;
  const saving = isCreatingUser || isUpdatingUser || isDeletingUser || isCreatingRole || isUpdatingRole || isDeletingRole;
  const error = usersError || rolesError || permissionsError;

  // Handle user save
  const handleUserSave = async () => {
    try {
      if (editingUser) {
        // Update existing user
        await updateUser({
          id: editingUser.id,
          ...userFormData
        }).unwrap();
      } else {
        // Create new user
        await createUser({
          ...userFormData
        }).unwrap();
      }
      
      setUserDialogOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      console.error('Failed to save user:', err);
      // Error handling would typically show a toast notification
    }
  };

  // Handle role save
  const handleRoleSave = async () => {
    try {
      if (editingRole) {
        // Update existing role
        await updateRole({
          id: editingRole.id,
          ...roleFormData
        }).unwrap();
      } else {
        // Create new role
        await createRole({
          ...roleFormData
        }).unwrap();
      }
      
      setRoleDialogOpen(false);
      setEditingRole(null);
    } catch (err: any) {
      console.error('Failed to save role:', err);
      // Error handling would typically show a toast notification
    }
  };

  // Handle user delete
  const handleUserDelete = async (user: UserListItem) => {
    if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
      try {
        await deleteUser({
          id: user.id
        }).unwrap();
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        // Error handling would typically show a toast notification
      }
    }
  };

  // Handle role delete
  const handleRoleDelete = async (role: Role) => {
    if (role.is_system_role) {
      alert('System roles cannot be deleted');
      return;
    }
    if (confirm(`Are you sure you want to delete role ${role.display_name || role.name}?`)) {
      try {
        await deleteRole({
          id: role.id
        }).unwrap();
      } catch (err: any) {
        console.error('Failed to delete role:', err);
        // Error handling would typically show a toast notification
      }
    }
  };

  // User table columns
  const userColumns: TableColumn<UserListItem>[] = [
    {
      label: '',
      sortable: false,
      width: 60,
      render: (user) => (
        <Avatar sx={{ width: 32, height: 32 }}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} />
          ) : (
            user.first_name?.charAt(0) || user.email.charAt(0)
          )}
        </Avatar>
      )
    },
    {
      label: 'Name',
      sortable: true,
      render: (user) => (
        <Box>
          <Typography variant="subtitle2">{user.full_name || user.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            @{user.username}
          </Typography>
        </Box>
      )
    },
    {
      label: 'Email',
      sortable: true,
      render: (user) => (
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon fontSize="small" color="action" />
          <Typography variant="body2">{user.email}</Typography>
        </Box>
      )
    },
    {
      label: 'Roles',
      sortable: false,
      render: (user) => (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {user.role_assignments.map((role) => (
            <Chip
              key={role.role_id}
              label={role.role_name}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )
    },
    {
      label: 'Status',
      sortable: true,
      render: (user) => (
        <Chip
          icon={user.is_active ? <ActiveIcon /> : <BlockIcon />}
          label={user.is_active ? 'Active' : 'Inactive'}
          color={user.is_active ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      label: 'Type',
      sortable: true,
      render: (user) => (
        <Chip
          label={user.user_type === 'internal' ? 'Internal' : user.user_type === 'external' ? 'External' : 'Service'}
          size="small"
          color={user.user_type === 'internal' ? 'primary' : 'secondary'}
          variant="outlined"
        />
      )
    },
    {
      label: 'Last Login',
      sortable: true,
      render: (user) => (
        <Typography variant="body2" color="textSecondary">
          {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
        </Typography>
      )
    }
  ];

  // Role table columns  
  const roleColumns: TableColumn<Role>[] = [
    {
      label: 'Role Name',
      sortable: true,
      render: (role) => (
        <Box display="flex" alignItems="center" gap={1}>
          <RoleIcon color={role.is_system_role ? 'primary' : 'action'} />
          <Box>
            <Typography variant="subtitle2">{role.display_name || role.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {role.name}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      label: 'Description',
      sortable: false,
      render: (role) => (
        <Typography variant="body2">{role.description}</Typography>
      )
    },
    {
      label: 'Permissions',
      sortable: true,
      render: (role) => (
        <Chip
          label={`${role.permissions.length} permissions`}
          size="small"
          color="info"
          variant="outlined"
        />
      )
    },
    {
      label: 'Users',
      sortable: true,
      render: (role) => (
        <Typography variant="body2">{role.user_count || 0} users</Typography>
      )
    },
    {
      label: 'Type',
      sortable: true,
      render: (role) => (
        <Chip
          label={role.is_system_role ? 'System' : 'Custom'}
          size="small"
          color={role.is_system_role ? 'warning' : 'default'}
          variant="outlined"
        />
      )
    }
  ];

  // Permission table columns
  const permissionColumns: TableColumn<Permission>[] = [
    {
      label: 'Permission',
      sortable: true,
      render: (permission) => (
        <Box display="flex" alignItems="center" gap={1}>
          <PermissionIcon fontSize="small" color="action" />
          <Box>
            <Typography variant="subtitle2">{permission.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {permission.resource}.{permission.action}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      label: 'Description',
      sortable: false,
      render: (permission) => (
        <Typography variant="body2">{permission.description}</Typography>
      )
    },
    {
      label: 'Category',
      sortable: true,
      render: (permission) => (
        <Chip
          label={permission.category}
          size="small"
          color="secondary"
          variant="outlined"
        />
      )
    },
    {
      label: 'Resource',
      sortable: true,
      render: (permission) => (
        <Typography variant="body2">{permission.resource}</Typography>
      )
    },
    {
      label: 'Action',
      sortable: true,
      render: (permission) => (
        <Chip
          label={permission.action}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      label: 'Type',
      sortable: true,
      render: (permission) => (
        <Chip
          label={permission.is_system_permission ? 'System' : 'Custom'}
          size="small"
          color={permission.is_system_permission ? 'warning' : 'default'}
          variant="outlined"
        />
      )
    }
  ];

  // User table actions
  const userActions: TableAction<UserListItem>[] = [
    {
      label: 'Edit User',
      icon: <EditIcon />,
      onClick: (user) => {
        setEditingUser(user);
        setUserFormData({
          username: user.username,
          email: user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          is_active: user.is_active,
          role_ids: user.role_assignments.map(ra => ra.role_id),
          send_invitation: false,
          user_type: user.user_type || 'internal'
        });
        setUserDialogOpen(true);
      }
    },
    {
      label: 'Delete User',
      icon: <DeleteIcon />,
      onClick: handleUserDelete,
      color: 'error'
    }
  ];

  // Role table actions
  const roleActions: TableAction<Role>[] = [
    {
      label: 'Edit Role',
      icon: <EditIcon />,
      onClick: (role) => {
        setEditingRole(role);
        setRoleFormData({
          name: role.name,
          display_name: role.display_name || '',
          description: role.description || '',
          permissions: role.permissions,
          is_system_role: role.is_system_role
        });
        setRoleDialogOpen(true);
      }
    },
    {
      label: 'Delete Role',
      icon: <DeleteIcon />,
      onClick: handleRoleDelete,
      color: 'error',
      disabled: (role) => role.is_system_role
    }
  ];

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <WorkspaceLayout>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                User Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage users, roles, and permissions for your workspace
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <PermissionGate permissions={['user_mgmt.create']}>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setEditingUser(null);
                    setUserFormData({
                      username: '',
                      email: '',
                      first_name: '',
                      last_name: '',
                      is_active: true,
                      role_ids: [],
                      send_invitation: true,
                      user_type: 'internal'
                    });
                    setUserDialogOpen(true);
                  }}
                >
                  Add User
                </Button>
              </PermissionGate>
              <PermissionGate permissions={['role.create']}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingRole(null);
                    setRoleFormData({
                      name: '',
                      display_name: '',
                      description: '',
                      permissions: [],
                      is_system_role: false
                    });
                    setRoleDialogOpen(true);
                  }}
                >
                  Add Role
                </Button>
              </PermissionGate>
            </Box>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {typeof error === 'string' ? error : 'Failed to load data. Please try again.'}
            </Alert>
          )}
        </Box>

        {/* Tabs */}
        <Paper sx={{ width: '100%', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="user management tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon />
                  Users ({users.length})
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <RoleIcon />
                  Roles ({roles.length})
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <PermissionIcon />
                  Permissions ({permissions.length})
                </Box>
              }
            />
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        
        {/* Users Tab - Full CRUD with role assignment */}
        <TabPanel value={activeTab} index={0}>
          <PermissionGate permissions={['user_mgmt.read']}>
            <Box>
              <Typography variant="h6" gutterBottom>
                User Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Manage user accounts and assign roles to control access permissions.
              </Typography>
              
              <CommonTableLayout
                data={users}
                columns={userColumns}
                actions={userActions}
                onSelectionChange={setSelectedUsers}
                selectedItems={selectedUsers}
              />
            </Box>
          </PermissionGate>
        </TabPanel>

        {/* Roles Tab - Full CRUD with permission assignment */}
        <TabPanel value={activeTab} index={1}>
          <PermissionGate permissions={['role.read']}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Role Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create and manage roles with specific permission sets. Assign these roles to users.
              </Typography>
              
              <CommonTableLayout
                data={roles}
                columns={roleColumns}
                actions={roleActions}
                onSelectionChange={setSelectedRoles}
                selectedItems={selectedRoles}
              />
            </Box>
          </PermissionGate>
        </TabPanel>

        {/* Permissions Tab - Read-only table */}
        <TabPanel value={activeTab} index={2}>
          <PermissionGate permissions={['role.read']}>
            <Box>
              <Typography variant="h6" gutterBottom>
                System Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                All available permissions in the system. Use the Roles tab to assign these to roles.
              </Typography>
              
              <CommonTableLayout
                data={permissions}
                columns={permissionColumns}
                onSelectionChange={setSelectedPermissions}
                selectedItems={selectedPermissions}
              />
            </Box>
          </PermissionGate>
        </TabPanel>

        {/* User Creation/Edit Dialog */}
        <Dialog
          open={userDialogOpen}
          onClose={() => setUserDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={userFormData.first_name}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={userFormData.last_name}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>User Type</InputLabel>
                  <Select
                    value={userFormData.user_type}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, user_type: e.target.value as any }))}
                  >
                    <MenuItem value="internal">Internal</MenuItem>
                    <MenuItem value="external">External</MenuItem>
                    <MenuItem value="service_account">Service Account</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={userFormData.role_ids}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, role_ids: e.target.value as string[] }))}
                    input={<OutlinedInput label="Roles" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((roleId) => {
                          const role = roles.find(r => r.id === roleId);
                          return <Chip key={roleId} label={role?.display_name || role?.name} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        <Checkbox checked={userFormData.role_ids.indexOf(role.id) > -1} />
                        <ListItemText primary={role.display_name || role.name} secondary={role.description} />
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
                      onChange={(e) => setUserFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                  }
                  label="User Active"
                />
              </Grid>
              {!editingUser && (
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={userFormData.send_invitation}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, send_invitation: e.target.checked }))}
                      />
                    }
                    label="Send Invitation Email"
                  />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleUserSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Role Creation/Edit Dialog */}
        <Dialog
          open={roleDialogOpen}
          onClose={() => setRoleDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingRole ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Role Name (ID)"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={editingRole?.is_system_role}
                  helperText="Used as the role identifier (lowercase, no spaces)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={roleFormData.display_name}
                  onChange={(e) => setRoleFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  required
                  helperText="Friendly name shown to users"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                  helperText="Describe what this role can do"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Permissions</InputLabel>
                  <Select
                    multiple
                    value={roleFormData.permissions}
                    onChange={(e) => setRoleFormData(prev => ({ ...prev, permissions: e.target.value as string[] }))}
                    input={<OutlinedInput label="Permissions" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto' }}>
                        {selected.map((permissionId) => {
                          const permission = permissions.find(p => p.id === permissionId);
                          return <Chip key={permissionId} label={permission?.name} size="small" />;
                        })}
                      </Box>
                    )}
                  >
                    {useMemo(() => {
                      const grouped = permissions.reduce((acc: Record<string, Permission[]>, permission) => {
                        if (!acc[permission.category]) {
                          acc[permission.category] = [];
                        }
                        acc[permission.category].push(permission);
                        return acc;
                      }, {});

                      return Object.entries(grouped).map(([category, categoryPermissions]) => [
                        <MenuItem key={`header-${category}`} disabled>
                          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                            {category}
                          </Typography>
                        </MenuItem>,
                        ...categoryPermissions.map((permission) => (
                          <MenuItem key={permission.id} value={permission.id} sx={{ pl: 3 }}>
                            <Checkbox checked={roleFormData.permissions.indexOf(permission.id) > -1} />
                            <ListItemText 
                              primary={permission.name} 
                              secondary={permission.description}
                            />
                          </MenuItem>
                        ))
                      ]).flat();
                    }, [permissions, roleFormData.permissions])}
                  </Select>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    Selected {roleFormData.permissions.length} of {permissions.length} permissions
                  </Typography>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleRoleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : (editingRole ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </WorkspaceLayout>
  );
};

export default UserManagementPage;