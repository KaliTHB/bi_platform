// pages/workspace/admin/users.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
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
  Checkbox,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent
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
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

// Import common components
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  BaseListItem,
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';

// Import hooks and services
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';

// User interfaces
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

interface Role {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  is_system_role: boolean;
  permissions: string[];
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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminUsersPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Dialog states
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    role_ids: [],
    send_invitation: true,
    user_type: 'internal'
  });

  // Stats
  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    pending_invitations: 0,
    external_users: 0
  });

  // Load data on mount
  useEffect(() => {
    loadUsers();
    loadRoles();
    loadUserStats();
  }, [workspace]);

  const loadUsers = async () => {
    if (!workspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspaces/${workspace.id}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.statusText}`);
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    if (!workspace?.id) return;

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/roles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load roles: ${response.statusText}`);
      }

      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const loadUserStats = async () => {
    if (!workspace?.id) return;

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/users/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats || {});
      }
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  };

  // Table columns configuration
  const columns: TableColumn<UserListItem>[] = useMemo(() => [
    {
      id: 'user',
      label: 'User',
      sortable: true,
      render: (user) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={user.avatar_url} 
            sx={{ width: 40, height: 40 }}
          >
            {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
            {user.username && (
              <Typography variant="caption" color="text.secondary" display="block">
                @{user.username}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      render: (user) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Chip
            size="small"
            icon={user.is_active ? <ActiveIcon /> : <BlockIcon />}
            label={user.is_active ? 'Active' : 'Inactive'}
            color={user.is_active ? 'success' : 'default'}
          />
          {user.invitation_status && (
            <Chip
              size="small"
              label={user.invitation_status}
              color={user.invitation_status === 'accepted' ? 'success' : 
                     user.invitation_status === 'pending' ? 'warning' : 'error'}
              variant="outlined"
            />
          )}
          {user.user_type && user.user_type !== 'internal' && (
            <Chip
              size="small"
              label={user.user_type.replace('_', ' ')}
              color="info"
              variant="outlined"
            />
          )}
        </Box>
      )
    },
    {
      id: 'roles',
      label: 'Roles',
      render: (user) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {user.role_assignments.length > 0 ? (
            user.role_assignments.map((assignment) => (
              <Chip
                key={assignment.role_id}
                size="small"
                label={assignment.role_name}
                color="primary"
                variant="outlined"
              />
            ))
          ) : (
            <Typography variant="caption" color="text.secondary">
              No roles assigned
            </Typography>
          )}
        </Box>
      )
    },
    {
      id: 'last_activity',
      label: 'Last Activity',
      sortable: true,
      render: (user) => (
        user.last_login ? (
          <Box>
            <Typography variant="body2">
              {new Date(user.last_login).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(user.last_login).toLocaleTimeString()}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Never logged in
          </Typography>
        )
      )
    },
    {
      id: 'created',
      label: 'Created',
      sortable: true,
      render: (user) => (
        <Typography variant="body2">
          {new Date(user.created_at).toLocaleDateString()}
        </Typography>
      )
    }
  ], []);

  // Table actions
  const actions: TableAction<UserListItem>[] = useMemo(() => [
    {
      label: 'Edit User',
      icon: <EditIcon fontSize="small" />,
      onClick: (user) => handleEditUser(user),
      color: 'primary',
      show: () => hasPermission('user.update')
    },
    {
      label: 'Manage Roles',
      icon: <RoleIcon fontSize="small" />,
      onClick: (user) => handleManageRoles(user),
      color: 'default',
      show: () => hasPermission('role.assign')
    },
    {
      label: 'Reset Password',
      icon: <KeyIcon fontSize="small" />,
      onClick: (user) => handleResetPassword(user),
      color: 'default',
      show: () => hasPermission('user.update')
    },
    {
      label: user => user.is_active ? 'Deactivate' : 'Activate',
      icon: (user) => user.is_active ? <BlockIcon fontSize="small" /> : <ActiveIcon fontSize="small" />,
      onClick: (user) => handleToggleUserStatus(user),
      color: (user) => user.is_active ? 'warning' : 'success',
      show: () => hasPermission('user.update')
    },
    {
      label: 'Delete User',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (user) => handleDeleteUser(user),
      color: 'error',
      show: () => hasPermission('user.delete'),
      disabled: (user) => user.id === user?.id // Can't delete yourself
    }
  ], [hasPermission, user]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      key: 'invitation_status',
      label: 'Invitation Status',
      options: [
        { value: 'accepted', label: 'Accepted' },
        { value: 'pending', label: 'Pending' },
        { value: 'expired', label: 'Expired' }
      ]
    },
    {
      key: 'user_type',
      label: 'User Type',
      options: [
        { value: 'internal', label: 'Internal' },
        { value: 'external', label: 'External' },
        { value: 'service_account', label: 'Service Account' }
      ]
    },
    {
      key: 'role',
      label: 'Role',
      options: roles.map(role => ({ value: role.id, label: role.display_name || role.name }))
    }
  ];

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddUser = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      is_active: true,
      role_ids: [],
      send_invitation: true,
      user_type: 'internal'
    });
    setAddUserDialogOpen(true);
  };

  const handleEditUser = (user: UserListItem) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      is_active: user.is_active,
      role_ids: user.role_assignments.map(r => r.role_id),
      send_invitation: false,
      user_type: user.user_type || 'internal'
    });
    setEditUserDialogOpen(true);
  };

  const handleDeleteUser = (user: UserListItem) => {
    setDeletingUser(user);
    setDeleteUserDialogOpen(true);
  };

  const handleManageRoles = (user: UserListItem) => {
    // Navigate to role management for this user
    router.push(`/workspace/${workspace?.slug}/admin/users/${user.id}/roles`);
  };

  const handleResetPassword = async (user: UserListItem) => {
    try {
      const response = await fetch(`/api/workspaces/${workspace?.id}/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      // Show success message
      setError(null);
      // Could add a success notification here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const handleToggleUserStatus = async (user: UserListItem) => {
    try {
      const response = await fetch(`/api/workspaces/${workspace?.id}/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          is_active: !user.is_active
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      await loadUsers();
      await loadUserStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleSubmitUser = async () => {
    try {
      const isEdit = !!editingUser;
      const url = isEdit 
        ? `/api/workspaces/${workspace?.id}/users/${editingUser.id}`
        : `/api/workspaces/${workspace?.id}/users`;
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} user`);
      }

      await loadUsers();
      await loadUserStats();
      setAddUserDialogOpen(false);
      setEditUserDialogOpen(false);
      setEditingUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingUser ? 'update' : 'create'} user`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      const response = await fetch(`/api/workspaces/${workspace?.id}/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await loadUsers();
      await loadUserStats();
      setDeleteUserDialogOpen(false);
      setDeletingUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Bulk actions
  const bulkActions = [
    {
      label: 'Activate Selected',
      icon: <ActiveIcon />,
      onClick: () => handleBulkAction('activate'),
      permission: 'user.update'
    },
    {
      label: 'Deactivate Selected',
      icon: <BlockIcon />,
      onClick: () => handleBulkAction('deactivate'),
      permission: 'user.update'
    },
    {
      label: 'Assign Role',
      icon: <RoleIcon />,
      onClick: () => handleBulkAction('assign_role'),
      permission: 'role.assign'
    },
    {
      label: 'Delete Selected',
      icon: <DeleteIcon />,
      onClick: () => handleBulkAction('delete'),
      permission: 'user.delete',
      color: 'error' as const
    }
  ];

  const handleBulkAction = (action: string) => {
    // Handle bulk actions
    console.log('Bulk action:', action, 'on users:', selectedUsers);
  };

  // Render user form dialog
  const renderUserDialog = (open: boolean, onClose: () => void, title: string) => (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <TextField
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
            fullWidth
            helperText="Username must be unique across the workspace"
          />
          
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
            fullWidth
            helperText="User will receive an invitation at this email"
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              fullWidth
            />
            
            <TextField
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              fullWidth
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>User Type</InputLabel>
            <Select
              value={formData.user_type}
              onChange={(e) => setFormData({...formData, user_type: e.target.value as 'internal' | 'external' | 'service_account'})}
            >
              <MenuItem value="internal">Internal User</MenuItem>
              <MenuItem value="external">External User</MenuItem>
              <MenuItem value="service_account">Service Account</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth>
            <InputLabel>Roles</InputLabel>
            <Select
              multiple
              value={formData.role_ids}
              onChange={(e) => setFormData({...formData, role_ids: e.target.value as string[]})}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((roleId) => {
                    const role = roles.find(r => r.id === roleId);
                    return (
                      <Chip 
                        key={roleId} 
                        label={role?.display_name || role?.name || roleId} 
                        size="small" 
                      />
                    );
                  })}
                </Box>
              )}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  <Checkbox checked={formData.role_ids.indexOf(role.id) > -1} />
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body2">
                      {role.display_name || role.name}
                    </Typography>
                    {role.description && (
                      <Typography variant="caption" color="text.secondary">
                        {role.description}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
            }
            label="Active User"
          />
          
          {!editingUser && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.send_invitation}
                  onChange={(e) => setFormData({...formData, send_invitation: e.target.checked})}
                />
              }
              label="Send invitation email"
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmitUser} 
          variant="contained"
          disabled={!formData.username || !formData.email}
        >
          {editingUser ? 'Update' : 'Create'} User
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Stats cards component
  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="overline">
                  Total Users
                </Typography>
                <Typography variant="h4">
                  {userStats.total_users}
                </Typography>
              </Box>
              <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="overline">
                  Active Users
                </Typography>
                <Typography variant="h4">
                  {userStats.active_users}
                </Typography>
              </Box>
              <ActiveIcon sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="overline">
                  Pending Invitations
                </Typography>
                <Typography variant="h4">
                  {userStats.pending_invitations}
                </Typography>
              </Box>
              <EmailIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="overline">
                  External Users
                </Typography>
                <Typography variant="h4">
                  {userStats.external_users}
                </Typography>
              </Box>
              <GroupIcon sx={{ fontSize: 40, color: 'info.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <PermissionGate permissions={['user.read']}>
      <WorkspaceLayout>
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              User Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Manage workspace users, roles, and permissions
            </Typography>
          </Box>

          {/* Stats Cards */}
          <StatsCards />

          {/* Main Content */}
          <Paper sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab label="All Users" />
                <Tab label="Active Users" />
                <Tab label="Pending Invitations" />
                <Tab label="External Users" />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <CommonTableLayout
                title="users"
                data={users}
                columns={columns}
                actions={actions}
                filters={filters}
                loading={loading}
                error={error}
                selectedItems={selectedUsers}
                onSelectedItemsChange={setSelectedUsers}
                bulkActions={bulkActions}
                searchPlaceholder="Search users by name, email, or username..."
                primaryAction={{
                  label: 'Add User',
                  icon: <PersonAddIcon />,
                  onClick: handleAddUser,
                  permission: 'user.create'
                }}
                secondaryActions={[
                  {
                    label: 'Refresh',
                    icon: <RefreshIcon />,
                    onClick: loadUsers
                  }
                ]}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <CommonTableLayout
                title="active users"
                data={users.filter(user => user.is_active)}
                columns={columns}
                actions={actions}
                filters={filters.filter(f => f.key !== 'status')}
                loading={loading}
                error={error}
                selectedItems={selectedUsers}
                onSelectedItemsChange={setSelectedUsers}
                bulkActions={bulkActions}
                searchPlaceholder="Search active users..."
                primaryAction={{
                  label: 'Add User',
                  icon: <PersonAddIcon />,
                  onClick: handleAddUser,
                  permission: 'user.create'
                }}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <CommonTableLayout
                title="pending invitations"
                data={users.filter(user => user.invitation_status === 'pending')}
                columns={columns}
                actions={actions}
                filters={filters}
                loading={loading}
                error={error}
                selectedItems={selectedUsers}
                onSelectedItemsChange={setSelectedUsers}
                searchPlaceholder="Search pending invitations..."
              />
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <CommonTableLayout
                title="external users"
                data={users.filter(user => user.user_type === 'external')}
                columns={columns}
                actions={actions}
                filters={filters}
                loading={loading}
                error={error}
                selectedItems={selectedUsers}
                onSelectedItemsChange={setSelectedUsers}
                searchPlaceholder="Search external users..."
                primaryAction={{
                  label: 'Add External User',
                  icon: <PersonAddIcon />,
                  onClick: () => {
                    setFormData({
                      username: '',
                      email: '',
                      first_name: '',
                      last_name: '',
                      is_active: true,
                      role_ids: [],
                      send_invitation: true,
                      user_type: 'external'
                    });
                    setAddUserDialogOpen(true);
                  },
                  permission: 'user.create'
                }}
              />
            </TabPanel>
          </Paper>

          {/* Dialogs */}
          {renderUserDialog(
            addUserDialogOpen,
            () => setAddUserDialogOpen(false),
            'Add New User'
          )}

          {renderUserDialog(
            editUserDialogOpen,
            () => setEditUserDialogOpen(false),
            'Edit User'
          )}

          <Dialog
            open={deleteUserDialogOpen}
            onClose={() => setDeleteUserDialogOpen(false)}
          >
            <DialogTitle>Delete User</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete user "{deletingUser?.full_name || deletingUser?.username}"?
              </Typography>
              <Typography color="error" sx={{ mt: 2 }}>
                This action cannot be undone. The user will lose access to all resources.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteUserDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmDelete} color="error" variant="contained">
                Delete User
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </WorkspaceLayout>
    </PermissionGate>
  );
};

// Export as default - this is crucial for Next.js routing
export default AdminUsersPage;