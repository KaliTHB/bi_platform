// ===================================================================
// COMPLETE LIVE USER MANAGEMENT WITH FULL CRUD FOR ALL TABS
// File: web-application/src/pages/workspace/admin/user-management.tsx
// ===================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tab,
  Tabs,
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
  Snackbar,
  Chip,
  Avatar,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Badge,
  FormGroup,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TablePagination,
  Tooltip,
  Menu
} from '@mui/material';
import {
  Person as PersonIcon,
  Security as RoleIcon,
  VpnKey as PermissionIcon,
  PersonAdd as PersonAddIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Assignment as AssignIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

// ===================================================================
// ENHANCED INTERFACES WITH COMPLETE DATA STRUCTURE
// ===================================================================

interface UserListItem {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  last_login?: string;
  roles: string[];
  role_assignments?: Array<{
    role_id: string;
    role_name: string;
    assigned_at: string;
    assigned_by?: string;
    expires_at?: string;
  }>;
  avatar_url?: string;
  user_type: 'internal' | 'external' | 'service_account';
  created_at: string;
  updated_at: string;
}

interface RoleListItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  permissions: string[];
  user_count: number;
  color?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface PermissionItem {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  usage_count?: number;
}

// Form Data Interfaces
interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role_ids: string[];
  send_invitation: boolean;
  user_type: 'internal' | 'external' | 'service_account';
  password?: string; // For new users
}

interface RoleFormData {
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  color?: string;
}

interface PermissionFormData {
  name: string;
  display_name: string;
  description: string;
  category: string;
}

// Stats Interface
interface ManagementStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  customRoles: number;
  totalPermissions: number;
  customPermissions: number;
  totalCategories: number;
  adminUsers: number;
}

// ===================================================================
// TAB PANEL COMPONENT
// ===================================================================

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

// ===================================================================
// MAIN COMPONENT
// ===================================================================

const UserManagementPage: NextPage = () => {
  const router = useRouter();
  const { workspace, user: currentUser, isAuthenticated } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();

  // ===================================================================
  // STATE MANAGEMENT
  // ===================================================================

  // UI State
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data State
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roles, setRoles] = useState<RoleListItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<string[]>([]);
  
  // Selection State
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Stats State
  const [stats, setStats] = useState<ManagementStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    customRoles: 0,
    totalPermissions: 0,
    customPermissions: 0,
    totalCategories: 0,
    adminUsers: 0
  });

  // Dialog State
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
  const [editingPermission, setEditingPermission] = useState<PermissionItem | null>(null);

  // Form State
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    role_ids: [],
    send_invitation: true,
    user_type: 'internal'
  });

  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    display_name: '',
    description: '',
    permissions: [],
    color: '#1976d2'
  });

  const [permissionFormData, setPermissionFormData] = useState<PermissionFormData>({
    name: '',
    display_name: '',
    description: '',
    category: ''
  });

  // Pagination State
  const [userPage, setUserPage] = useState(0);
  const [rolePage, setRolePage] = useState(0);
  const [permissionPage, setPermissionPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Menu State
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [roleMenuAnchor, setRoleMenuAnchor] = useState<null | HTMLElement>(null);
  const [permissionMenuAnchor, setPermissionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);

  // Notification State
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setNotification({ open: true, message, severity });
    console.log(`📢 ${severity.toUpperCase()}: ${message}`);
  };

  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-workspace-id': workspace?.id || '',
      ...options.headers
    };

    console.log(`🌐 API Call: ${options.method || 'GET'} /api${endpoint}`);

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status}`, data);
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`✅ API Success: ${endpoint}`, { 
      status: response.status,
      dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
      success: data.success 
    });

    return data;
  };

  // ===================================================================
  // DATA LOADING FUNCTIONS
  // ===================================================================

  const loadUsers = useCallback(async () => {
    if (!workspace?.id) {
      console.log('⏸️ No workspace ID, skipping user load');
      return;
    }

    try {
      console.log('🔄 Loading users from API...');
      const result = await makeApiCall('/admin/users');
      
      if (result.success && result.data) {
        const mappedUsers: UserListItem[] = result.data.map((user: any) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
          is_active: user.is_active ?? true,
          last_login: user.last_login,
          roles: Array.isArray(user.roles) ? user.roles : [],
          role_assignments: user.role_assignments || [],
          avatar_url: user.avatar_url,
          user_type: user.user_type || 'internal',
          created_at: user.created_at,
          updated_at: user.updated_at
        }));

        setUsers(mappedUsers);
        console.log(`✅ Loaded ${mappedUsers.length} users from API`);
        
        return mappedUsers;
      } else {
        throw new Error('No user data received from API');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      showNotification(`Failed to load users: ${error.message}`, 'error');
      
      // Fallback to mock data for development
      const mockUsers: UserListItem[] = [
        {
          id: 'mock-admin-1',
          username: 'admin',
          email: 'admin@example.com',
          first_name: 'System',
          last_name: 'Administrator',
          full_name: 'System Administrator',
          is_active: true,
          roles: ['admin'],
          user_type: 'internal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setUsers(mockUsers);
      return mockUsers;
    }
  }, [workspace?.id]);

  const loadRoles = useCallback(async () => {
    if (!workspace?.id) {
      console.log('⏸️ No workspace ID, skipping roles load');
      return;
    }

    try {
      console.log('🔄 Loading roles from API...');
      const result = await makeApiCall('/admin/roles');
      
      if (result.success && result.data) {
        const mappedRoles: RoleListItem[] = result.data.map((role: any) => ({
          id: role.id,
          name: role.name,
          display_name: role.display_name || role.name,
          description: role.description || '',
          is_system: role.is_system_role ?? role.is_system ?? false,
          permissions: Array.isArray(role.permissions) ? role.permissions : [],
          user_count: role.user_count || 0,
          color: role.color || '#1976d2',
          created_at: role.created_at,
          updated_at: role.updated_at,
          created_by: role.created_by
        }));

        setRoles(mappedRoles);
        console.log(`✅ Loaded ${mappedRoles.length} roles from API`);
        
        return mappedRoles;
      } else {
        throw new Error('No role data received from API');
      }
    } catch (error) {
      console.error('❌ Error loading roles:', error);
      showNotification(`Failed to load roles: ${error.message}`, 'warning');
      
      // Fallback roles
      const fallbackRoles: RoleListItem[] = [
        {
          id: 'system-admin',
          name: 'admin',
          display_name: 'Administrator',
          description: 'Full system access with all permissions',
          is_system: true,
          permissions: ['*'],
          user_count: 1,
          color: '#d32f2f',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'system-editor',
          name: 'editor', 
          display_name: 'Editor',
          description: 'Can create and edit content',
          is_system: true,
          permissions: ['dashboard.create', 'dashboard.update', 'dataset.create', 'dataset.update', 'chart.create', 'chart.update'],
          user_count: 0,
          color: '#f57c00',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'system-viewer',
          name: 'viewer',
          display_name: 'Viewer', 
          description: 'Read-only access to dashboards and data',
          is_system: true,
          permissions: ['dashboard.read', 'dataset.read', 'chart.read'],
          user_count: 0,
          color: '#388e3c',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      setRoles(fallbackRoles);
      return fallbackRoles;
    }
  }, [workspace?.id]);

  const loadPermissions = useCallback(async () => {
    try {
      console.log('🔄 Loading permissions from API...');
      
      try {
        const result = await makeApiCall('/admin/permissions');
        if (result.success && result.data) {
          const mappedPermissions: PermissionItem[] = result.data.map((perm: any) => ({
            id: perm.id,
            name: perm.name,
            display_name: perm.display_name,
            description: perm.description,
            category: perm.category,
            is_system: perm.is_system ?? true,
            created_at: perm.created_at,
            updated_at: perm.updated_at,
            usage_count: perm.usage_count || 0
          }));
          
          setPermissions(mappedPermissions);
          const categories = [...new Set(mappedPermissions.map(p => p.category))].sort();
          setPermissionCategories(categories);
          
          console.log(`✅ Loaded ${mappedPermissions.length} permissions from API`);
          return mappedPermissions;
        }
      } catch (err) {
        console.warn('⚠️ Permissions API not available, using system permissions');
      }

      // Comprehensive system permissions
      const systemPermissions: PermissionItem[] = [
        // Workspace Management (4 permissions)
        { id: 'p1', name: 'workspace.read', display_name: 'View Workspace', description: 'View workspace information and settings', category: 'Workspace Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p2', name: 'workspace.update', display_name: 'Update Workspace', description: 'Modify workspace settings', category: 'Workspace Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p3', name: 'workspace.admin', display_name: 'Administer Workspace', description: 'Full workspace administration', category: 'Workspace Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p4', name: 'workspace.delete', display_name: 'Delete Workspace', description: 'Delete workspace (system admin only)', category: 'Workspace Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // User Management (4 permissions)
        { id: 'p5', name: 'user.read', display_name: 'View Users', description: 'View user information and profiles', category: 'User Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p6', name: 'user.create', display_name: 'Create Users', description: 'Add new users to workspace', category: 'User Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p7', name: 'user.update', display_name: 'Update Users', description: 'Modify user information and roles', category: 'User Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p8', name: 'user.delete', display_name: 'Delete Users', description: 'Remove users from workspace', category: 'User Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // Role Management (5 permissions)
        { id: 'p9', name: 'role.read', display_name: 'View Roles', description: 'View roles and role assignments', category: 'Role Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p10', name: 'role.create', display_name: 'Create Roles', description: 'Create custom roles', category: 'Role Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p11', name: 'role.update', display_name: 'Update Roles', description: 'Modify role permissions and assignments', category: 'Role Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p12', name: 'role.delete', display_name: 'Delete Roles', description: 'Remove custom roles', category: 'Role Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p13', name: 'role.assign', display_name: 'Assign Roles', description: 'Assign roles to users', category: 'Role Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // Permission Management (4 permissions)
        { id: 'p14', name: 'permission.read', display_name: 'View Permissions', description: 'View system permissions', category: 'Permission Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p15', name: 'permission.create', display_name: 'Create Permissions', description: 'Create custom permissions', category: 'Permission Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p16', name: 'permission.update', display_name: 'Update Permissions', description: 'Modify permission details', category: 'Permission Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p17', name: 'permission.delete', display_name: 'Delete Permissions', description: 'Remove custom permissions', category: 'Permission Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // Dashboard Management (6 permissions)
        { id: 'p18', name: 'dashboard.read', display_name: 'View Dashboards', description: 'View dashboards and charts', category: 'Dashboard Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p19', name: 'dashboard.create', display_name: 'Create Dashboards', description: 'Create new dashboards', category: 'Dashboard Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p20', name: 'dashboard.update', display_name: 'Update Dashboards', description: 'Modify dashboards', category: 'Dashboard Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p21', name: 'dashboard.delete', display_name: 'Delete Dashboards', description: 'Remove dashboards', category: 'Dashboard Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p22', name: 'dashboard.publish', display_name: 'Publish Dashboards', description: 'Publish dashboards for wider access', category: 'Dashboard Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p23', name: 'dashboard.share', display_name: 'Share Dashboards', description: 'Share dashboards with other users', category: 'Dashboard Management', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

        // System Administration (additional permissions to reach 23+)
        { id: 'p24', name: 'system.admin', display_name: 'System Administration', description: 'Full system administration access', category: 'System Administration', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'p25', name: 'audit.read', display_name: 'View Audit Logs', description: 'View system audit logs', category: 'System Administration', is_system: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];

      setPermissions(systemPermissions);
      const categories = [...new Set(systemPermissions.map(p => p.category))].sort();
      setPermissionCategories(categories);
      
      console.log(`✅ Loaded ${systemPermissions.length} system permissions`);
      return systemPermissions;

    } catch (error) {
      console.error('❌ Error loading permissions:', error);
      setPermissions([]);
      setPermissionCategories([]);
      return [];
    }
  }, []);

  const updateStats = useCallback((users: UserListItem[], roles: RoleListItem[], permissions: PermissionItem[]) => {
    const newStats: ManagementStats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      totalRoles: roles.length,
      customRoles: roles.filter(r => !r.is_system).length,
      totalPermissions: permissions.length,
      customPermissions: permissions.filter(p => !p.is_system).length,
      totalCategories: [...new Set(permissions.map(p => p.category))].length,
      adminUsers: users.filter(u => u.roles.some(role => role.toLowerCase().includes('admin'))).length
    };
    
    setStats(newStats);
    console.log('📊 Stats updated:', newStats);
  }, []);

  // ===================================================================
  // USER CRUD OPERATIONS
  // ===================================================================

  const createUser = async () => {
    try {
      console.log('🔄 Creating user:', userFormData);
      
      const payload = {
        ...userFormData,
        role_ids: userFormData.role_ids.length > 0 ? userFormData.role_ids : undefined
      };

      const result = await makeApiCall('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        showNotification('User created successfully', 'success');
        setUserDialogOpen(false);
        resetUserForm();
        const updatedUsers = await loadUsers();
        const currentRoles = roles.length > 0 ? roles : await loadRoles();
        const currentPermissions = permissions.length > 0 ? permissions : await loadPermissions();
        updateStats(updatedUsers || [], currentRoles || [], currentPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error creating user:', error);
      showNotification(`Failed to create user: ${error.message}`, 'error');
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;

    try {
      console.log('🔄 Updating user:', editingUser.id, userFormData);
      
      const payload = {
        ...userFormData,
        role_ids: userFormData.role_ids.length > 0 ? userFormData.role_ids : undefined
      };

      const result = await makeApiCall(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        showNotification('User updated successfully', 'success');
        setUserDialogOpen(false);
        setEditingUser(null);
        resetUserForm();
        const updatedUsers = await loadUsers();
        const currentRoles = roles.length > 0 ? roles : await loadRoles();
        const currentPermissions = permissions.length > 0 ? permissions : await loadPermissions();
        updateStats(updatedUsers || [], currentRoles || [], currentPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error updating user:', error);
      showNotification(`Failed to update user: ${error.message}`, 'error');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone.`)) return;

    try {
      console.log('🔄 Deleting user:', userId);
      const result = await makeApiCall(`/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        showNotification('User deleted successfully', 'success');
        const updatedUsers = await loadUsers();
        const currentRoles = roles.length > 0 ? roles : await loadRoles();
        const currentPermissions = permissions.length > 0 ? permissions : await loadPermissions();
        updateStats(updatedUsers || [], currentRoles || [], currentPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      showNotification(`Failed to delete user: ${error.message}`, 'error');
    }
  };

  // ===================================================================
  // ROLE CRUD OPERATIONS  
  // ===================================================================

  const createRole = async () => {
    try {
      console.log('🔄 Creating role:', roleFormData);
      
      const result = await makeApiCall('/admin/roles', {
        method: 'POST',
        body: JSON.stringify(roleFormData)
      });

      if (result.success) {
        showNotification('Role created successfully', 'success');
        setRoleDialogOpen(false);
        resetRoleForm();
        const currentUsers = users.length > 0 ? users : await loadUsers();
        const updatedRoles = await loadRoles();
        const currentPermissions = permissions.length > 0 ? permissions : await loadPermissions();
        updateStats(currentUsers || [], updatedRoles || [], currentPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error creating role:', error);
      showNotification(`Failed to create role: ${error.message}`, 'error');
    }
  };

  const updateRole = async () => {
    if (!editingRole) return;

    try {
      console.log('🔄 Updating role:', editingRole.id, roleFormData);
      
      const result = await makeApiCall(`/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        body: JSON.stringify(roleFormData)
      });

      if (result.success) {
        showNotification('Role updated successfully', 'success');
        setRoleDialogOpen(false);
        setEditingRole(null);
        resetRoleForm();
        const currentUsers = users.length > 0 ? users : await loadUsers();
        const updatedRoles = await loadRoles();
        const currentPermissions = permissions.length > 0 ? permissions : await loadPermissions();
        updateStats(currentUsers || [], updatedRoles || [], currentPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error updating role:', error);
      showNotification(`Failed to update role: ${error.message}`, 'error');
    }
  };

  const deleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?\n\nThis will remove the role from all users who have it assigned.\nThis action cannot be undone.`)) return;

    try {
      console.log('🔄 Deleting role:', roleId);
      const result = await makeApiCall(`/admin/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        showNotification('Role deleted successfully', 'success');
        const currentUsers = users.length > 0 ? users : await loadUsers();
        const updatedRoles = await loadRoles();
        const currentPermissions = permissions.length > 0 ? permissions : await loadPermissions();
        updateStats(currentUsers || [], updatedRoles || [], currentPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error deleting role:', error);
      showNotification(`Failed to delete role: ${error.message}`, 'error');
    }
  };

  // ===================================================================
  // PERMISSION CRUD OPERATIONS
  // ===================================================================

  const createPermission = async () => {
    try {
      console.log('🔄 Creating permission:', permissionFormData);
      
      const result = await makeApiCall('/admin/permissions', {
        method: 'POST',
        body: JSON.stringify(permissionFormData)
      });

      if (result.success) {
        showNotification('Permission created successfully', 'success');
        setPermissionDialogOpen(false);
        resetPermissionForm();
        const currentUsers = users.length > 0 ? users : await loadUsers();
        const currentRoles = roles.length > 0 ? roles : await loadRoles();
        const updatedPermissions = await loadPermissions();
        updateStats(currentUsers || [], currentRoles || [], updatedPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error creating permission:', error);
      showNotification(`Failed to create permission: ${error.message}`, 'error');
    }
  };

  const updatePermission = async () => {
    if (!editingPermission) return;

    try {
      console.log('🔄 Updating permission:', editingPermission.id, permissionFormData);
      
      const result = await makeApiCall(`/admin/permissions/${editingPermission.id}`, {
        method: 'PUT',
        body: JSON.stringify(permissionFormData)
      });

      if (result.success) {
        showNotification('Permission updated successfully', 'success');
        setPermissionDialogOpen(false);
        setEditingPermission(null);
        resetPermissionForm();
        const currentUsers = users.length > 0 ? users : await loadUsers();
        const currentRoles = roles.length > 0 ? roles : await loadRoles();
        const updatedPermissions = await loadPermissions();
        updateStats(currentUsers || [], currentRoles || [], updatedPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error updating permission:', error);
      showNotification(`Failed to update permission: ${error.message}`, 'error');
    }
  };

  const deletePermission = async (permissionId: string, permissionName: string) => {
    if (!confirm(`Are you sure you want to delete permission "${permissionName}"?\n\nThis will remove the permission from all roles that use it.\nThis action cannot be undone.`)) return;

    try {
      console.log('🔄 Deleting permission:', permissionId);
      const result = await makeApiCall(`/admin/permissions/${permissionId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        showNotification('Permission deleted successfully', 'success');
        const currentUsers = users.length > 0 ? users : await loadUsers();
        const currentRoles = roles.length > 0 ? roles : await loadRoles();
        const updatedPermissions = await loadPermissions();
        updateStats(currentUsers || [], currentRoles || [], updatedPermissions || []);
      }
    } catch (error) {
      console.error('❌ Error deleting permission:', error);
      showNotification(`Failed to delete permission: ${error.message}`, 'error');
    }
  };

  // ===================================================================
  // BULK OPERATIONS
  // ===================================================================

  const bulkDeletePermissions = async () => {
    if (!selectedPermissions.length) return;
    
    const customPermissions = selectedPermissions.filter(id => {
      const perm = permissions.find(p => p.id === id);
      return perm && !perm.is_system;
    });

    if (customPermissions.length === 0) {
      showNotification('Cannot delete system permissions', 'warning');
      return;
    }

    if (!confirm(`Delete ${customPermissions.length} custom permissions?\n\nSystem permissions will be skipped.\nThis action cannot be undone.`)) return;

    let successCount = 0;
    let errorCount = 0;

    for (const permId of customPermissions) {
      try {
        await makeApiCall(`/admin/permissions/${permId}`, { method: 'DELETE' });
        successCount++;
      } catch (error) {
        console.error('Error deleting permission:', permId, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      showNotification(`${successCount} permissions deleted successfully`, 'success');
    }
    if (errorCount > 0) {
      showNotification(`${errorCount} permissions failed to delete`, 'warning');
    }

    setSelectedPermissions([]);
    const currentUsers = users.length > 0 ? users : await loadUsers();
    const currentRoles = roles.length > 0 ? roles : await loadRoles();
    const updatedPermissions = await loadPermissions();
    updateStats(currentUsers || [], currentRoles || [], updatedPermissions || []);
  };

  const bulkActivateUsers = async () => {
    if (!selectedUsers.length) return;

    try {
      const promises = selectedUsers.map(userId => 
        makeApiCall(`/admin/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ is_active: true })
        })
      );

      await Promise.all(promises);
      showNotification(`${selectedUsers.length} users activated`, 'success');
      setSelectedUsers([]);
      
      const updatedUsers = await loadUsers();
      const currentRoles = roles.length > 0 ? roles : await loadRoles();
      const currentPermissions = permissions.length > 0 ? permissions : await loadPermissions();
      updateStats(updatedUsers || [], currentRoles || [], currentPermissions || []);
    } catch (error) {
      console.error('❌ Error bulk activating users:', error);
      showNotification('Failed to activate some users', 'error');
    }
  };

  // ===================================================================
  // FORM HELPERS
  // ===================================================================

  const resetUserForm = () => {
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
  };

  const resetRoleForm = () => {
    setRoleFormData({
      name: '',
      display_name: '',
      description: '',
      permissions: [],
      color: '#1976d2'
    });
  };

  const resetPermissionForm = () => {
    setPermissionFormData({
      name: '',
      display_name: '',
      description: '',
      category: ''
    });
  };

  const validatePermissionName = (name: string): string | null => {
    const permissionRegex = /^[a-z_]+(\.[a-z_]+)+$/;
    
    if (!name) return 'Permission name is required';
    if (!permissionRegex.test(name)) {
      return 'Permission name must use dot notation (e.g., resource.action)';
    }
    if (name.length > 100) return 'Permission name is too long (max 100 characters)';
    
    return null;
  };

  // ===================================================================
  // EVENT HANDLERS
  // ===================================================================

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>, user: UserListItem) => {
    setUserMenuAnchor(event.currentTarget);
    setSelectedMenuItem(user);
  };

  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>, role: RoleListItem) => {
    setRoleMenuAnchor(event.currentTarget);
    setSelectedMenuItem(role);
  };

  const handlePermissionMenuOpen = (event: React.MouseEvent<HTMLElement>, permission: PermissionItem) => {
    setPermissionMenuAnchor(event.currentTarget);
    setSelectedMenuItem(permission);
  };

  const handleRefreshAll = async () => {
    setLoading(true);
    try {
      const [loadedUsers, loadedRoles, loadedPermissions] = await Promise.all([
        loadUsers(),
        loadRoles(),
        loadPermissions()
      ]);
      
      updateStats(
        loadedUsers || [], 
        loadedRoles || [], 
        loadedPermissions || []
      );
      
      showNotification('All data refreshed successfully', 'success');
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      showNotification('Failed to refresh some data', 'warning');
    } finally {
      setLoading(false);
    }
  };

  // ===================================================================
  // EFFECTS
  // ===================================================================

  // Initial data load
  useEffect(() => {
    const loadAllData = async () => {
      if (!workspace?.id || !isAuthenticated || permissionsLoading) {
        console.log('⏸️ Waiting for auth/workspace...', { 
          workspaceId: workspace?.id, 
          isAuthenticated, 
          permissionsLoading 
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🚀 Starting complete data load for workspace:', workspace.id);
        
        const [loadedUsers, loadedRoles, loadedPermissions] = await Promise.all([
          loadUsers(),
          loadRoles(), 
          loadPermissions()
        ]);
        
        updateStats(
          loadedUsers || [], 
          loadedRoles || [], 
          loadedPermissions || []
        );
        
        console.log('✅ All management data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading management data:', error);
        setError(`Failed to load user management data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [workspace?.id, isAuthenticated, permissionsLoading, loadUsers, loadRoles, loadPermissions, updateStats]);

  // Pre-fill forms when editing
  useEffect(() => {
    if (editingUser) {
      setUserFormData({
        username: editingUser.username,
        email: editingUser.email,
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        is_active: editingUser.is_active,
        role_ids: editingUser.roles,
        send_invitation: false,
        user_type: editingUser.user_type
      });
    }
  }, [editingUser]);

  useEffect(() => {
    if (editingRole) {
      setRoleFormData({
        name: editingRole.name,
        display_name: editingRole.display_name,
        description: editingRole.description,
        permissions: editingRole.permissions,
        color: editingRole.color || '#1976d2'
      });
    }
  }, [editingRole]);

  useEffect(() => {
    if (editingPermission) {
      setPermissionFormData({
        name: editingPermission.name,
        display_name: editingPermission.display_name,
        description: editingPermission.description,
        category: editingPermission.category
      });
    }
  }, [editingPermission]);

  // ===================================================================
  // RENDER GUARDS
  // ===================================================================

  if (!isAuthenticated || permissionsLoading) {
    return (
      <WorkspaceLayout title="User Management">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress size={40} />
          <Typography variant="body1" sx={{ ml: 2 }} color="text.secondary">
            Loading authentication...
          </Typography>
        </Box>
      </WorkspaceLayout>
    );
  }

  if (!hasPermission('user.read')) {
    return (
      <WorkspaceLayout title="Access Denied">
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>Access Denied</Typography>
            <Typography>You don't have permission to view user management.</Typography>
          </Alert>
        </Box>
      </WorkspaceLayout>
    );
  }

  if (loading) {
    return (
      <WorkspaceLayout title="User Management">
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ ml: 2 }} color="text.secondary">
              Loading user management data...
            </Typography>
          </Box>
        </Box>
      </WorkspaceLayout>
    );
  }

  // ===================================================================
  // MAIN RENDER
  // ===================================================================

  return (
    <WorkspaceLayout title="User Management">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                User Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage users, roles, and permissions for {workspace?.display_name || workspace?.name}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshAll}
              disabled={loading}
            >
              Refresh All
            </Button>
          </Box>

          {/* Enhanced Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <PersonIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" color="primary" fontWeight={700}>
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {stats.activeUsers} active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <RoleIcon color="secondary" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" color="secondary.main" fontWeight={700}>
                    {stats.totalRoles}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Roles
                  </Typography>
                  <Typography variant="caption" color="info.main">
                    {stats.customRoles} custom
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <PermissionIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" color="info.main" fontWeight={700}>
                    {stats.totalPermissions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Permissions
                  </Typography>
                  <Typography variant="caption" color="warning.main">
                    {stats.customPermissions} custom
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <CategoryIcon color="warning" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" color="warning.main" fontWeight={700}>
                    {stats.totalCategories}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Categories
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" color="success.main" fontWeight={700}>
                    {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <AdminIcon color="error" sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" color="error.main" fontWeight={700}>
                    {stats.adminUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Admins
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              icon={<Badge badgeContent={stats.totalUsers} color="primary"><PersonIcon /></Badge>} 
              label="USERS" 
              iconPosition="start"
            />
            <Tab 
              icon={<Badge badgeContent={stats.totalRoles} color="secondary"><RoleIcon /></Badge>} 
              label="ROLES" 
              iconPosition="start"
            />
            <Tab 
              icon={<Badge badgeContent={stats.totalPermissions} color="info" max={99}><PermissionIcon /></Badge>} 
              label="PERMISSIONS" 
              iconPosition="start"
            />
          </Tabs>

          {/* Users Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Workspace Users ({users.length})</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {selectedUsers.length > 0 && (
                    <Button
                      variant="outlined"
                      startIcon={<CheckCircleIcon />}
                      onClick={bulkActivateUsers}
                    >
                      Activate Selected ({selectedUsers.length})
                    </Button>
                  )}
                  {hasPermission('user.create') && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        resetUserForm();
                        setEditingUser(null);
                        setUserDialogOpen(true);
                      }}
                    >
                      Add User
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Users Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                          checked={users.length > 0 && selectedUsers.length === users.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(users.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Roles</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users
                      .slice(userPage * rowsPerPage, userPage * rowsPerPage + rowsPerPage)
                      .map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%' }} />
                              ) : (
                                user.full_name.charAt(0).toUpperCase() || 'U'
                              )}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {user.full_name || user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                @{user.username}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{user.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {user.roles.length > 0 ? (
                              user.roles.slice(0, 2).map((role) => (
                                <Chip
                                  key={role}
                                  label={role}
                                  size="small"
                                  color={role === 'admin' ? 'error' : 'default'}
                                  variant="outlined"
                                />
                              ))
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                No roles
                              </Typography>
                            )}
                            {user.roles.length > 2 && (
                              <Chip
                                label={`+${user.roles.length - 2}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            color={user.is_active ? 'success' : 'error'}
                            size="small"
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {user.last_login ? 
                              new Date(user.last_login).toLocaleDateString() : 
                              'Never'
                            }
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleUserMenuOpen(e, user)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={users.length}
                rowsPerPage={rowsPerPage}
                page={userPage}
                onPageChange={(_, newPage) => setUserPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setUserPage(0);
                }}
              />
            </Box>
          </TabPanel>

          {/* Roles Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Workspace Roles ({roles.length})</Typography>
                {hasPermission('role.create') && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetRoleForm();
                      setEditingRole(null);
                      setRoleDialogOpen(true);
                    }}
                  >
                    Create Role
                  </Button>
                )}
              </Box>

              {/* Roles Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Role</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Permissions</TableCell>
                      <TableCell>Users</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roles
                      .slice(rolePage * rowsPerPage, rolePage * rowsPerPage + rowsPerPage)
                      .map((role) => (
                      <TableRow key={role.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar 
                              variant="rounded" 
                              sx={{ 
                                width: 36, 
                                height: 36, 
                                bgcolor: role.color || 'secondary.main' 
                              }}
                            >
                              <RoleIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {role.display_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {role.name}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {role.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${role.permissions.length} permissions`}
                            size="small"
                            color="info"
                            variant="outlined"
                            icon={<PermissionIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <GroupIcon fontSize="small" color="disabled" />
                            <Typography variant="body2">{role.user_count}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {role.is_system ? (
                            <Chip label="System" size="small" color="primary" variant="outlined" />
                          ) : (
                            <Chip label="Custom" size="small" color="success" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handleRoleMenuOpen(e, role)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={roles.length}
                rowsPerPage={rowsPerPage}
                page={rolePage}
                onPageChange={(_, newPage) => setRolePage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setRolePage(0);
                }}
              />
            </Box>
          </TabPanel>

          {/* Permissions Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6">System Permissions ({permissions.length})</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage system and custom permissions across {permissionCategories.length} categories
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {selectedPermissions.length > 0 && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={bulkDeletePermissions}
                    >
                      Delete Selected ({selectedPermissions.length})
                    </Button>
                  )}
                  {hasPermission('permission.create') && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        resetPermissionForm();
                        setEditingPermission(null);
                        setPermissionDialogOpen(true);
                      }}
                    >
                      Create Permission
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Permission Categories Overview */}
              {permissionCategories.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>Permission Categories</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {permissionCategories.map((category) => {
                      const categoryCount = permissions.filter(p => p.category === category).length;
                      return (
                        <Chip
                          key={category}
                          label={`${category} (${categoryCount})`}
                          variant="outlined"
                          color="primary"
                          size="small"
                          icon={<CategoryIcon />}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Permissions Table */}
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedPermissions.length > 0 && selectedPermissions.length < permissions.length}
                          checked={permissions.length > 0 && selectedPermissions.length === permissions.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions(permissions.map(p => p.id));
                            } else {
                              setSelectedPermissions([]);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>Permission</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {permissions
                      .slice(permissionPage * rowsPerPage, permissionPage * rowsPerPage + rowsPerPage)
                      .map((permission) => (
                      <TableRow key={permission.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPermissions([...selectedPermissions, permission.id]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {permission.display_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {permission.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {permission.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={permission.category}
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<CategoryIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          {permission.is_system ? (
                            <Chip label="System" size="small" color="primary" variant="outlined" />
                          ) : (
                            <Chip label="Custom" size="small" color="success" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => handlePermissionMenuOpen(e, permission)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={permissions.length}
                rowsPerPage={rowsPerPage}
                page={permissionPage}
                onPageChange={(_, newPage) => setPermissionPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPermissionPage(0);
                }}
              />
            </Box>
          </TabPanel>
        </Paper>

        {/* Context Menus */}
        
        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setEditingUser(selectedMenuItem);
              setUserDialogOpen(true);
              setUserMenuAnchor(null);
            }}
            disabled={!hasPermission('user.update')}
          >
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit User
          </MenuItem>
          <MenuItem
            onClick={() => {
              deleteUser(selectedMenuItem?.id, selectedMenuItem?.full_name);
              setUserMenuAnchor(null);
            }}
            disabled={!hasPermission('user.delete') || selectedMenuItem?.id === currentUser?.id}
          >
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Delete User
          </MenuItem>
        </Menu>

        {/* Role Menu */}
        <Menu
          anchorEl={roleMenuAnchor}
          open={Boolean(roleMenuAnchor)}
          onClose={() => setRoleMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setEditingRole(selectedMenuItem);
              setRoleDialogOpen(true);
              setRoleMenuAnchor(null);
            }}
            disabled={!hasPermission('role.update') || selectedMenuItem?.is_system}
          >
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit Role
          </MenuItem>
          <MenuItem
            onClick={() => {
              deleteRole(selectedMenuItem?.id, selectedMenuItem?.display_name);
              setRoleMenuAnchor(null);
            }}
            disabled={!hasPermission('role.delete') || selectedMenuItem?.is_system}
          >
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Delete Role
          </MenuItem>
        </Menu>

        {/* Permission Menu */}
        <Menu
          anchorEl={permissionMenuAnchor}
          open={Boolean(permissionMenuAnchor)}
          onClose={() => setPermissionMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setEditingPermission(selectedMenuItem);
              setPermissionDialogOpen(true);
              setPermissionMenuAnchor(null);
            }}
            disabled={!hasPermission('permission.update') || selectedMenuItem?.is_system}
          >
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Edit Permission
          </MenuItem>
          <MenuItem
            onClick={() => {
              deletePermission(selectedMenuItem?.id, selectedMenuItem?.display_name);
              setPermissionMenuAnchor(null);
            }}
            disabled={!hasPermission('permission.delete') || selectedMenuItem?.is_system}
          >
            <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
            Delete Permission
          </MenuItem>
        </Menu>

        {/* DIALOGS */}
        
        {/* User Dialog */}
        <Dialog 
          open={userDialogOpen} 
          onClose={() => {
            setUserDialogOpen(false);
            setEditingUser(null);
            resetUserForm();
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingUser ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              <TextField
                label="Username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                required
                fullWidth
                disabled={!!editingUser}
                helperText={editingUser ? "Username cannot be changed after creation" : "Unique username for login"}
              />
              <TextField
                label="Email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                required
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="First Name"
                  value={userFormData.first_name}
                  onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Last Name"
                  value={userFormData.last_name}
                  onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                  fullWidth
                />
              </Box>
              <FormControl fullWidth>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={userFormData.user_type}
                  onChange={(e) => setUserFormData({ ...userFormData, user_type: e.target.value as any })}
                >
                  <MenuItem value="internal">Internal User</MenuItem>
                  <MenuItem value="external">External User</MenuItem>
                  <MenuItem value="service_account">Service Account</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Assign Roles</InputLabel>
                <Select
                  multiple
                  value={userFormData.role_ids}
                  onChange={(e) => setUserFormData({ ...userFormData, role_ids: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const role = roles.find(r => r.id === value || r.name === value);
                        return (
                          <Chip 
                            key={value} 
                            label={role?.display_name || value} 
                            size="small"
                            color={value === 'admin' ? 'error' : 'default'}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Avatar 
                          sx={{ width: 24, height: 24, bgcolor: role.color }} 
                          variant="rounded"
                        >
                          <RoleIcon sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2">{role.display_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {role.permissions.length} permissions
                          </Typography>
                        </Box>
                        {role.is_system && (
                          <Chip label="System" size="small" variant="outlined" />
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {!editingUser && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={userFormData.send_invitation}
                      onChange={(e) => setUserFormData({ ...userFormData, send_invitation: e.target.checked })}
                    />
                  }
                  label="Send invitation email"
                />
              )}
              <FormControlLabel
                control={
                  <Switch
                    checked={userFormData.is_active}
                    onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                  />
                }
                label="Active user"
              />
              {editingUser && (
                <Alert severity="info">
                  <Typography variant="body2">
                    Role changes will take effect immediately. The user may need to log in again to see updated permissions.
                  </Typography>
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setUserDialogOpen(false);
              setEditingUser(null);
              resetUserForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingUser ? updateUser : createUser}
              variant="contained"
              disabled={!userFormData.username || !userFormData.email}
            >
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Role Dialog */}
        <Dialog 
          open={roleDialogOpen} 
          onClose={() => {
            setRoleDialogOpen(false);
            setEditingRole(null);
            resetRoleForm();
          }}
          maxWidth="md"
          fullWidth
          maxHeight="lg"
        >
          <DialogTitle>
            {editingRole ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              <TextField
                label="Role Name"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                required
                fullWidth
                disabled={editingRole?.is_system}
                helperText="Internal name for the role (lowercase, no spaces)"
              />
              <TextField
                label="Display Name"
                value={roleFormData.display_name}
                onChange={(e) => setRoleFormData({ ...roleFormData, display_name: e.target.value })}
                fullWidth
                helperText="Human-readable name shown in the interface"
              />
              <TextField
                label="Description"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
                helperText="Brief description of what this role can do"
              />
              
              <Typography variant="subtitle1" gutterBottom>
                Role Color
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#5d4037', '#455a64'].map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: color,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: roleFormData.color === color ? '3px solid #000' : '1px solid #ccc'
                    }}
                    onClick={() => setRoleFormData({ ...roleFormData, color })}
                  />
                ))}
              </Box>
              
              <Typography variant="subtitle1" gutterBottom>
                Permissions ({roleFormData.permissions.length} selected)
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                {Object.entries(
                  permissions.reduce((acc, perm) => {
                    if (!acc[perm.category]) acc[perm.category] = [];
                    acc[perm.category].push(perm);
                    return acc;
                  }, {} as Record<string, PermissionItem[]>)
                ).map(([category, perms]) => (
                  <Accordion key={category}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {category}
                        </Typography>
                        <Chip 
                          label={`${perms.filter(p => roleFormData.permissions.includes(p.name)).length}/${perms.length}`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={perms.every(p => roleFormData.permissions.includes(p.name))}
                              indeterminate={
                                perms.some(p => roleFormData.permissions.includes(p.name)) && 
                                !perms.every(p => roleFormData.permissions.includes(p.name))
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRoleFormData({
                                    ...roleFormData,
                                    permissions: [...new Set([...roleFormData.permissions, ...perms.map(p => p.name)])]
                                  });
                                } else {
                                  setRoleFormData({
                                    ...roleFormData,
                                    permissions: roleFormData.permissions.filter(p => !perms.map(perm => perm.name).includes(p))
                                  });
                                }
                              }}
                            />
                          }
                          label={<Typography variant="body2" fontWeight={600}>Select All in {category}</Typography>}
                        />
                        <Divider sx={{ my: 1 }} />
                        {perms.map((perm) => (
                          <FormControlLabel
                            key={perm.id}
                            control={
                              <Checkbox
                                checked={roleFormData.permissions.includes(perm.name)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRoleFormData({
                                      ...roleFormData,
                                      permissions: [...roleFormData.permissions, perm.name]
                                    });
                                  } else {
                                    setRoleFormData({
                                      ...roleFormData,
                                      permissions: roleFormData.permissions.filter(p => p !== perm.name)
                                    });
                                  }
                                }}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2">{perm.display_name}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                  {perm.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  {perm.description}
                                </Typography>
                              </Box>
                            }
                          />
                        ))}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
              
              {editingRole?.is_system && (
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>System Role:</strong> This is a system-defined role. 
                    Some properties cannot be modified to ensure system stability.
                  </Typography>
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setRoleDialogOpen(false);
              setEditingRole(null);
              resetRoleForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingRole ? updateRole : createRole}
              variant="contained"
              disabled={!roleFormData.name || !roleFormData.display_name}
            >
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Permission Dialog */}
        <Dialog 
          open={permissionDialogOpen} 
          onClose={() => {
            setPermissionDialogOpen(false);
            setEditingPermission(null);
            resetPermissionForm();
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingPermission ? 'Edit Permission' : 'Create New Permission'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              <TextField
                label="Permission Name"
                value={permissionFormData.name}
                onChange={(e) => setPermissionFormData({ ...permissionFormData, name: e.target.value })}
                required
                fullWidth
                disabled={!!editingPermission}
                helperText="Use dot notation, e.g., 'report.create' or 'user.delete'"
                error={!!validatePermissionName(permissionFormData.name)}
              />
              <TextField
                label="Display Name"
                value={permissionFormData.display_name}
                onChange={(e) => setPermissionFormData({ ...permissionFormData, display_name: e.target.value })}
                required
                fullWidth
                helperText="Human-readable name for this permission"
              />
              <TextField
                label="Description"
                value={permissionFormData.description}
                onChange={(e) => setPermissionFormData({ ...permissionFormData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
                helperText="Describe what this permission allows users to do"
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={permissionFormData.category}
                  onChange={(e) => setPermissionFormData({ ...permissionFormData, category: e.target.value })}
                  required
                >
                  {permissionCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem value="Custom">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AddIcon fontSize="small" />
                      <Typography>Create New Category</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              {permissionFormData.category === 'Custom' && (
                <TextField
                  label="New Category Name"
                  onChange={(e) => setPermissionFormData({ ...permissionFormData, category: e.target.value })}
                  required
                  fullWidth
                  helperText="Enter name for the new permission category"
                />
              )}
              
              {!editingPermission && (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Permission Naming Convention:</strong>
                    <br />• Use dot notation: resource.action (e.g., report.create)
                    <br />• Be specific and descriptive
                    <br />• Follow existing patterns in your system
                    <br />• Avoid spaces and special characters
                  </Typography>
                </Alert>
              )}
              
              {editingPermission?.is_system && (
                <Alert severity="warning">
                  <Typography variant="body2">
                    <strong>System Permission:</strong> This is a system-defined permission. 
                    Only the display name and description can be modified.
                  </Typography>
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setPermissionDialogOpen(false);
              setEditingPermission(null);
              resetPermissionForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingPermission ? updatePermission : createPermission}
              variant="contained"
              disabled={
                !permissionFormData.name || 
                !permissionFormData.display_name || 
                !permissionFormData.category ||
                !!validatePermissionName(permissionFormData.name)
              }
            >
              {editingPermission ? 'Update Permission' : 'Create Permission'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          <Alert 
            onClose={() => setNotification({ ...notification, open: false })} 
            severity={notification.severity}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </WorkspaceLayout>
  );
};

export default UserManagementPage;