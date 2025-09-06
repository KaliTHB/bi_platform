// web-application/src/pages/workspace/admin/user-management.tsx
import React, { useState, useEffect } from 'react';
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
  Paper
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
  Group as GroupIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import CommonTableLayout, { 
  BaseListItem, 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

// User interfaces
interface UserListItem extends BaseListItem {
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login?: string;
  role_assignments: Array<{
    role_id: string;
    role_name: string;
    assigned_at: string;
  }>;
  invitation_status?: 'pending' | 'accepted' | 'expired';
  avatar_url?: string;
}

// Role interfaces
interface RoleListItem extends BaseListItem {
  is_system: boolean;
  permissions: string[];
  user_count: number;
  color?: string;
}

// Permission interfaces
interface PermissionItem extends BaseListItem {
  display_name: string;
  category: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box>{children}</Box>}
  </div>
);

const UserManagementPage: React.FC = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    username: '',
    role_ids: [] as string[],
    send_invitation: true
  });

  // Roles state
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: [] as string[]
  });

  // Permissions state
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<string[]>([]);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Simulate API calls
        setTimeout(() => {
          // Mock users
          setUsers([
            {
              id: '1',
              username: 'john.doe',
              email: 'john.doe@company.com',
              full_name: 'John Doe',
              name: 'John Doe',
              display_name: 'John Doe',
              description: 'System Administrator',
              is_active: true,
              last_login: '2024-01-15T10:30:00Z',
              role_assignments: [
                { role_id: 'admin', role_name: 'Administrator', assigned_at: '2024-01-01T00:00:00Z' }
              ],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-15T10:30:00Z'
            },
            {
              id: '2',
              username: 'jane.smith',
              email: 'jane.smith@company.com',
              full_name: 'Jane Smith',
              name: 'Jane Smith',
              display_name: 'Jane Smith',
              description: 'Data Analyst',
              is_active: true,
              last_login: '2024-01-14T15:45:00Z',
              role_assignments: [
                { role_id: 'analyst', role_name: 'Analyst', assigned_at: '2024-01-05T00:00:00Z' }
              ],
              created_at: '2024-01-05T00:00:00Z',
              updated_at: '2024-01-14T15:45:00Z'
            },
            {
              id: '3',
              username: 'mike.johnson',
              email: 'mike.johnson@company.com',
              full_name: 'Mike Johnson',
              name: 'Mike Johnson',
              display_name: 'Mike Johnson',
              description: 'Sales Manager',
              is_active: false,
              invitation_status: 'pending',
              role_assignments: [
                { role_id: 'viewer', role_name: 'Viewer', assigned_at: '2024-01-10T00:00:00Z' }
              ],
              created_at: '2024-01-10T00:00:00Z',
              updated_at: '2024-01-12T00:00:00Z'
            }
          ]);

          // Mock roles
          setRoles([
            {
              id: 'admin',
              name: 'administrator',
              display_name: 'Administrator',
              description: 'Full system access and user management',
              is_system: true,
              permissions: [
                'workspace.admin', 'user.create', 'user.update', 'user.delete',
                'dashboard.admin', 'dataset.admin', 'role.admin'
              ],
              user_count: 1,
              color: '#f44336',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            {
              id: 'analyst',
              name: 'analyst',
              display_name: 'Data Analyst',
              description: 'Create and manage dashboards and datasets',
              is_system: false,
              permissions: [
                'workspace.read', 'dashboard.create', 'dashboard.update',
                'dataset.create', 'dataset.update', 'chart.create'
              ],
              user_count: 5,
              color: '#2196f3',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-10T00:00:00Z'
            },
            {
              id: 'viewer',
              name: 'viewer',
              display_name: 'Viewer',
              description: 'View-only access to dashboards',
              is_system: true,
              permissions: [
                'workspace.read', 'dashboard.read', 'chart.read'
              ],
              user_count: 15,
              color: '#4caf50',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]);

          // Mock permissions
          setPermissions([
            // Workspace permissions
            { 
              id: 'workspace.read', 
              name: 'workspace.read', 
              display_name: 'View Workspace', 
              description: 'View workspace information', 
              category: 'Workspace',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'workspace.update', 
              name: 'workspace.update', 
              display_name: 'Update Workspace', 
              description: 'Modify workspace settings', 
              category: 'Workspace',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'workspace.admin', 
              name: 'workspace.admin', 
              display_name: 'Administer Workspace', 
              description: 'Full workspace control', 
              category: 'Workspace',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            
            // User management permissions
            { 
              id: 'user.read', 
              name: 'user.read', 
              display_name: 'View Users', 
              description: 'View user information', 
              category: 'User Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'user.create', 
              name: 'user.create', 
              display_name: 'Create Users', 
              description: 'Add new users', 
              category: 'User Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'user.update', 
              name: 'user.update', 
              display_name: 'Update Users', 
              description: 'Modify user information', 
              category: 'User Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'user.delete', 
              name: 'user.delete', 
              display_name: 'Delete Users', 
              description: 'Remove users', 
              category: 'User Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            
            // Dashboard permissions
            { 
              id: 'dashboard.read', 
              name: 'dashboard.read', 
              display_name: 'View Dashboards', 
              description: 'View dashboards', 
              category: 'Dashboard',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dashboard.create', 
              name: 'dashboard.create', 
              display_name: 'Create Dashboards', 
              description: 'Create new dashboards', 
              category: 'Dashboard',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dashboard.update', 
              name: 'dashboard.update', 
              display_name: 'Update Dashboards', 
              description: 'Modify dashboards', 
              category: 'Dashboard',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dashboard.delete', 
              name: 'dashboard.delete', 
              display_name: 'Delete Dashboards', 
              description: 'Remove dashboards', 
              category: 'Dashboard',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dashboard.admin', 
              name: 'dashboard.admin', 
              display_name: 'Administer Dashboards', 
              description: 'Full dashboard control', 
              category: 'Dashboard',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            
            // Dataset permissions
            { 
              id: 'dataset.read', 
              name: 'dataset.read', 
              display_name: 'View Datasets', 
              description: 'View datasets', 
              category: 'Dataset',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dataset.create', 
              name: 'dataset.create', 
              display_name: 'Create Datasets', 
              description: 'Create new datasets', 
              category: 'Dataset',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dataset.update', 
              name: 'dataset.update', 
              display_name: 'Update Datasets', 
              description: 'Modify datasets', 
              category: 'Dataset',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dataset.delete', 
              name: 'dataset.delete', 
              display_name: 'Delete Datasets', 
              description: 'Remove datasets', 
              category: 'Dataset',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'dataset.admin', 
              name: 'dataset.admin', 
              display_name: 'Administer Datasets', 
              description: 'Full dataset control', 
              category: 'Dataset',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            
            // Chart permissions
            { 
              id: 'chart.read', 
              name: 'chart.read', 
              display_name: 'View Charts', 
              description: 'View charts', 
              category: 'Chart',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'chart.create', 
              name: 'chart.create', 
              display_name: 'Create Charts', 
              description: 'Create new charts', 
              category: 'Chart',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'chart.update', 
              name: 'chart.update', 
              display_name: 'Update Charts', 
              description: 'Modify charts', 
              category: 'Chart',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'chart.delete', 
              name: 'chart.delete', 
              display_name: 'Delete Charts', 
              description: 'Remove charts', 
              category: 'Chart',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            
            // Role permissions
            { 
              id: 'role.read', 
              name: 'role.read', 
              display_name: 'View Roles', 
              description: 'View roles', 
              category: 'Role Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'role.create', 
              name: 'role.create', 
              display_name: 'Create Roles', 
              description: 'Create custom roles', 
              category: 'Role Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'role.update', 
              name: 'role.update', 
              display_name: 'Update Roles', 
              description: 'Modify roles', 
              category: 'Role Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'role.delete', 
              name: 'role.delete', 
              display_name: 'Delete Roles', 
              description: 'Remove custom roles', 
              category: 'Role Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            { 
              id: 'role.admin', 
              name: 'role.admin', 
              display_name: 'Administer Roles', 
              description: 'Full role control', 
              category: 'Role Management',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]);

          setPermissionCategories([
            'Workspace', 'User Management', 'Dashboard', 'Dataset', 'Chart', 'Role Management'
          ]);

          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    if (workspace) {
      fetchData();
    }
  }, [workspace]);

  // User management columns and actions
  const userColumns: TableColumn<UserListItem>[] = [
    {
      key: 'full_name',
      label: 'User',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            {item.avatar_url ? (
              <img src={item.avatar_url} alt={item.full_name} />
            ) : (
              item.full_name.charAt(0).toUpperCase()
            )}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {item.full_name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {item.email}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (item) => (
        <Typography variant="body2" fontFamily="monospace">
          {item.username}
        </Typography>
      )
    },
    {
      key: 'role_assignments',
      label: 'Roles',
      sortable: false,
      render: (item) => (
        <Box display="flex" gap={1} flexWrap="wrap">
          {item.role_assignments.map((assignment) => (
            <Chip
              key={assignment.role_id}
              label={assignment.role_name}
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
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          {item.invitation_status === 'pending' ? (
            <>
              <EmailIcon fontSize="small" color="warning" />
              <Typography variant="body2" color="warning.main">Pending</Typography>
            </>
          ) : item.is_active ? (
            <>
              <ActiveIcon fontSize="small" color="success" />
              <Typography variant="body2" color="success.main">Active</Typography>
            </>
          ) : (
            <>
              <BlockIcon fontSize="small" color="error" />
              <Typography variant="body2" color="error.main">Inactive</Typography>
            </>
          )}
        </Box>
      )
    },
    {
      key: 'last_login',
      label: 'Last Login',
      sortable: true,
      render: (item) => item.last_login ? (
        <Typography variant="body2">
          {new Date(item.last_login).toLocaleDateString()}
        </Typography>
      ) : (
        <Typography variant="body2" color="textSecondary">Never</Typography>
      )
    }
  ];

  const userActions: TableAction<UserListItem>[] = [
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: (item) => console.log('Edit user:', item.id),
      requiresPermission: 'user.update'
    },
    {
      label: item => item.is_active ? 'Deactivate' : 'Activate',
      icon: <BlockIcon fontSize="small" />,
      onClick: (item) => {
        setUsers(prev => prev.map(u => 
          u.id === item.id ? { ...u, is_active: !u.is_active } : u
        ));
      },
      requiresPermission: 'user.update'
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (item) => {
        if (confirm(`Are you sure you want to delete user "${item.full_name}"?`)) {
          setUsers(prev => prev.filter(u => u.id !== item.id));
        }
      },
      requiresPermission: 'user.delete',
      color: 'error'
    }
  ];

  const userFilterOptions: FilterOption[] = [
    {
      key: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    {
      key: 'invitation_status',
      label: 'Invitation',
      type: 'select',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'accepted', label: 'Accepted' }
      ]
    }
  ];

  // Role management columns and actions
  const roleColumns: TableColumn<RoleListItem>[] = [
    {
      key: 'display_name',
      label: 'Role',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar 
            variant="rounded" 
            sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: item.color || 'primary.main' 
            }}
          >
            <RoleIcon />
          </Avatar>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle2" fontWeight="bold">
                {item.display_name || item.name}
              </Typography>
              {item.is_system && (
                <Chip label="System" size="small" variant="outlined" />
              )}
            </Box>
            {item.description && (
              <Typography variant="caption" color="textSecondary">
                {item.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'permissions',
      label: 'Permissions',
      sortable: false,
      render: (item) => (
        <Typography variant="body2">
          {item.permissions.length} permissions
        </Typography>
      )
    },
    {
      key: 'user_count',
      label: 'Users',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          <GroupIcon fontSize="small" color="disabled" />
          <Typography variant="body2">{item.user_count}</Typography>
        </Box>
      )
    }
  ];

  const roleActions: TableAction<RoleListItem>[] = [
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: (item) => console.log('Edit role:', item.id),
      requiresPermission: 'role.update',
      disabled: (item) => item.is_system
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (item) => {
        if (confirm(`Are you sure you want to delete role "${item.display_name}"?`)) {
          setRoles(prev => prev.filter(r => r.id !== item.id));
        }
      },
      requiresPermission: 'role.delete',
      color: 'error',
      disabled: (item) => item.is_system
    }
  ];

  const roleFilterOptions: FilterOption[] = [
    {
      key: 'is_system',
      label: 'Role Type',
      type: 'select',
      options: [
        { value: 'true', label: 'System Roles' },
        { value: 'false', label: 'Custom Roles' }
      ]
    }
  ];

  // Permission management columns
  const permissionColumns: TableColumn<PermissionItem>[] = [
    {
      key: 'display_name',
      label: 'Permission',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
            <PermissionIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {item.display_name}
            </Typography>
            <Typography variant="caption" color="textSecondary" fontFamily="monospace">
              {item.name}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.category}
          size="small"
          variant="outlined"
          color="primary"
        />
      )
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (item) => (
        <Typography variant="body2" color="textSecondary">
          {item.description}
        </Typography>
      )
    }
  ];

  const permissionFilterOptions: FilterOption[] = [
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: permissionCategories.map(cat => ({
        value: cat,
        label: cat
      }))
    }
  ];

  const handleCreateUser = async () => {
    try {
      console.log('Create user:', newUser);
      setUserDialogOpen(false);
      setNewUser({
        email: '',
        full_name: '',
        username: '',
        role_ids: [],
        send_invitation: true
      });
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      console.log('Create role:', newRole);
      setRoleDialogOpen(false);
      setNewRole({
        name: '',
        display_name: '',
        description: '',
        permissions: []
      });
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              User Management
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Manage users, roles, and permissions for this workspace
            </Typography>
          </Box>
        </Box>

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              icon={<PersonIcon />} 
              label="Users" 
              iconPosition="start"
            />
            <Tab 
              icon={<RoleIcon />} 
              label="Roles" 
              iconPosition="start"
            />
            <Tab 
              icon={<PermissionIcon />} 
              label="Permissions" 
              iconPosition="start"
            />
          </Tabs>

          {/* Users Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                <Typography variant="h6">Workspace Users</Typography>
                <PermissionGate permission="user.create">
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setUserDialogOpen(true)}
                  >
                    Invite User
                  </Button>
                </PermissionGate>
              </Box>
              
              <CommonTableLayout
                data={users}
                columns={userColumns}
                actions={userActions}
                filterOptions={userFilterOptions}
                loading={loading}
                searchPlaceholder="Search users..."
                emptyMessage="No users found in this workspace."
              />
            </Box>
          </TabPanel>

          {/* Roles Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                <Typography variant="h6">Workspace Roles</Typography>
                <PermissionGate permission="role.create">
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setRoleDialogOpen(true)}
                  >
                    Create Role
                  </Button>
                </PermissionGate>
              </Box>
              
              <CommonTableLayout
                data={roles}
                columns={roleColumns}
                actions={roleActions}
                filterOptions={roleFilterOptions}
                loading={loading}
                searchPlaceholder="Search roles..."
                emptyMessage="No roles found in this workspace."
              />
            </Box>
          </TabPanel>

          {/* Permissions Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  System Permissions
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Below are all available permissions in the system, organized by category.
                </Typography>
              </Box>
              
              <CommonTableLayout
                data={permissions}
                columns={permissionColumns}
                filterOptions={permissionFilterOptions}
                loading={loading}
                searchPlaceholder="Search permissions..."
                emptyMessage="No permissions found."
                showActions={false}
                defaultPageSize={50}
              />
            </Box>
          </TabPanel>
        </Paper>

        {/* Create User Dialog */}
        <Dialog 
          open={userDialogOpen} 
          onClose={() => setUserDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Invite New User</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                autoFocus
                label="Email Address"
                type="email"
                fullWidth
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                helperText="User will receive an invitation email"
              />
              <TextField
                label="Full Name"
                fullWidth
                value={newUser.full_name}
                onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
              />
              <TextField
                label="Username"
                fullWidth
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                helperText="Optional - will be generated from email if not provided"
              />
              <FormControl fullWidth>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={newUser.role_ids}
                  onChange={(e) => setNewUser({...newUser, role_ids: e.target.value as string[]})}
                  renderValue={(selected) => (
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {(selected as string[]).map((roleId) => {
                        const role = roles.find(r => r.id === roleId);
                        return (
                          <Chip key={roleId} label={role?.display_name || roleId} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Checkbox checked={newUser.role_ids.includes(role.id)} />
                      <Box display="flex" alignItems="center" gap={1}>
                        {role.display_name}
                        {role.is_system && (
                          <Chip label="System" size="small" variant="outlined" />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={newUser.send_invitation}
                    onChange={(e) => setNewUser({...newUser, send_invitation: e.target.checked})}
                  />
                }
                label="Send invitation email"
              />
              {!newUser.send_invitation && (
                <Alert severity="warning">
                  User will be created but won't receive an invitation. You'll need to share login credentials manually.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateUser}
              variant="contained"
              disabled={!newUser.email || !newUser.full_name || newUser.role_ids.length === 0}
            >
              {newUser.send_invitation ? 'Send Invitation' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Role Dialog */}
        <Dialog 
          open={roleDialogOpen} 
          onClose={() => setRoleDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Role</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                autoFocus
                label="Role Name"
                fullWidth
                value={newRole.name}
                onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                helperText="Internal identifier (lowercase, no spaces)"
              />
              <TextField
                label="Display Name"
                fullWidth
                value={newRole.display_name}
                onChange={(e) => setNewRole({...newRole, display_name: e.target.value})}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={newRole.description}
                onChange={(e) => setNewRole({...newRole, description: e.target.value})}
              />
              
              <Typography variant="h6" sx={{ mt: 2 }}>Permissions</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Select the permissions for this role. Permissions are organized by category.
              </Typography>
              
              {permissionCategories.map((category) => {
                const categoryPermissions = permissions.filter(p => p.category === category);
                const selectedCount = newRole.permissions.filter(p => categoryPermissions.some(cp => cp.name === p)).length;
                
                return (
                  <Box key={category} sx={{ mb: 3 }}>
                    <Box display="flex" alignItems="center" justifyContent="between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {category}
                      </Typography>
                      <Chip 
                        label={`${selectedCount}/${categoryPermissions.length}`}
                        size="small"
                        variant="outlined"
                        color={selectedCount > 0 ? 'primary' : 'default'}
                      />
                    </Box>
                    <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={1}>
                      {categoryPermissions.map((permission) => (
                        <FormControlLabel
                          key={permission.name}
                          control={
                            <Checkbox
                              checked={newRole.permissions.includes(permission.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewRole({
                                    ...newRole,
                                    permissions: [...newRole.permissions, permission.name]
                                  });
                                } else {
                                  setNewRole({
                                    ...newRole,
                                    permissions: newRole.permissions.filter(p => p !== permission.name)
                                  });
                                }
                              }}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {permission.display_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {permission.description}
                              </Typography>
                            </Box>
                          }
                        />
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateRole}
              variant="contained"
              disabled={!newRole.name || !newRole.display_name || newRole.permissions.length === 0}
            >
              Create Role
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default UserManagementPage;