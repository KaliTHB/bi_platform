// File: web-application/src/pages/workspace/admin/user-management.tsx
// Enhanced version with CommonTableLayout and inline components

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop,
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
  Chip,
  Autocomplete,
  Grid,
  Divider,
  FormGroup,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PersonAdd,
  Group,
  Visibility,
  Edit,
  Delete,
  Info,
  ExpandMore,
  Close,
} from '@mui/icons-material';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { CommonTableLayout, TableColumn, TableAction } from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { authStorage } from '@/utils/storageUtils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
  roles: string[];
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
  action: string;
}

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
  details?: any;
}

interface LoadingStates {
  users: boolean;
  roles: boolean;
  permissions: boolean;
  saving: boolean;
  deleting: boolean;
}

interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
  password?: string;
}

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

// ============================================================================
// PERMISSION CATEGORIES FOR ROLE EDITOR
// ============================================================================

const PERMISSION_CATEGORIES = [
  'Workspace Management',
  'User Management', 
  'Dashboard Management',
  'Dataset Management',
  'Chart Management',
  'Category Management',
  'Webview Management',
  'Export Permissions',
  'System Administration'
];

// ============================================================================
// USER EDITOR COMPONENT
// ============================================================================

interface UserEditorProps {
  open: boolean;
  user?: User | null;
  onClose: () => void;
  onSave: (userData: Partial<User>) => Promise<void>;
  loading?: boolean;
}

const UserEditor: React.FC<UserEditorProps> = ({
  open,
  user,
  onClose,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    roles: [],
    password: '',
  });

  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      if (user) {
        // Edit mode
        setFormData({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_active: user.is_active,
          roles: user.roles || [],
        });
      } else {
        // Create mode
        setFormData({
          email: '',
          first_name: '',
          last_name: '',
          is_active: true,
          roles: [],
          password: '',
        });
      }
      setErrors({});
    }
  }, [open, user]);

  // Load available roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const token = authStorage.getToken();
        const response = await fetch('/api/admin/roles', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailableRoles(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    };

    if (open) {
      loadRoles();
    }
  }, [open]);

  const handleFieldChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!user && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const userData: Partial<User> = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      is_active: formData.is_active,
      roles: formData.roles,
    };

    if (!user && formData.password) {
      (userData as any).password = formData.password;
    }

    await onSave(userData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {user ? 'Edit User' : 'Create New User'}
          </Typography>
          <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
            <Close />
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              value={formData.first_name}
              onChange={(e) => handleFieldChange('first_name', e.target.value)}
              error={!!errors.first_name}
              helperText={errors.first_name}
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => handleFieldChange('last_name', e.target.value)}
              error={!!errors.last_name}
              helperText={errors.last_name}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
          </Grid>
          
          {!user && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
                required
              />
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={availableRoles}
              getOptionLabel={(role) => role.name}
              value={availableRoles.filter(role => formData.roles.includes(role.name))}
              onChange={(_, newValue) => {
                handleFieldChange('roles', newValue.map(role => role.name));
              }}
              renderTags={(value, getTagProps) =>
                value.map((role, index) => (
                  <Chip
                    key={role.id}
                    label={role.name}
                    {...getTagProps({ index })}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Roles"
                  placeholder="Select roles for this user"
                />
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                />
              }
              label="Active User"
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// ROLE EDITOR COMPONENT
// ============================================================================

interface RoleEditorProps {
  open: boolean;
  role?: Role | null;
  onClose: () => void;
  onSave: (roleData: Partial<Role>) => Promise<void>;
  loading?: boolean;
}

const RoleEditor: React.FC<RoleEditorProps> = ({
  open,
  role,
  onClose,
  onSave,
  loading = false
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [],
  });

  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when dialog opens/closes or role changes
  useEffect(() => {
    if (open) {
      if (role) {
        // Edit mode
        setFormData({
          name: role.name,
          description: role.description,
          permissions: role.permissions || [],
        });
      } else {
        // Create mode
        setFormData({
          name: '',
          description: '',
          permissions: [],
        });
      }
      setErrors({});
    }
  }, [open, role]);

  // Load available permissions
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const token = authStorage.getToken();
        const response = await fetch('/api/permissions', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailablePermissions(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    };

    if (open) {
      loadPermissions();
    }
  }, [open]);

  const handleFieldChange = (field: keyof RoleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Role name must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.permissions.length === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePermissionToggle = (permissionName: string) => {
    const isSelected = formData.permissions.includes(permissionName);
    const newPermissions = isSelected
      ? formData.permissions.filter(p => p !== permissionName)
      : [...formData.permissions, permissionName];
    
    handleFieldChange('permissions', newPermissions);
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = availablePermissions
      .filter(p => p.category === category)
      .map(p => p.name);
    
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p));
    
    if (allSelected) {
      // Deselect all in category
      const newPermissions = formData.permissions.filter(p => !categoryPermissions.includes(p));
      handleFieldChange('permissions', newPermissions);
    } else {
      // Select all in category
      const newPermissions = [...new Set([...formData.permissions, ...categoryPermissions])];
      handleFieldChange('permissions', newPermissions);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const roleData: Partial<Role> = {
      name: formData.name,
      description: formData.description,
      permissions: formData.permissions,
    };

    await onSave(roleData);
  };

  // Group permissions by category
  const permissionsByCategory = availablePermissions.reduce((acc, permission) => {
    const category = permission.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {role ? 'Edit Role' : 'Create New Role'}
          </Typography>
          <Button onClick={onClose} size="small" sx={{ minWidth: 'auto', p: 1 }}>
            <Close />
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Role Name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Permissions
              {errors.permissions && (
                <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                  {errors.permissions}
                </Typography>
              )}
            </Typography>
            
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {Object.entries(permissionsByCategory).map(([category, permissions]) => {
                const allSelected = permissions.every(p => formData.permissions.includes(p.name));
                const someSelected = permissions.some(p => formData.permissions.includes(p.name));
                
                return (
                  <Accordion key={category} defaultExpanded={someSelected}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          onChange={() => handleCategoryToggle(category)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Typography variant="subtitle1" sx={{ ml: 1, flexGrow: 1 }}>
                          {category}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${permissions.filter(p => formData.permissions.includes(p.name)).length}/${permissions.length}`}
                          color={allSelected ? 'primary' : someSelected ? 'secondary' : 'default'}
                        />
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      <FormGroup>
                        {permissions.map((permission) => (
                          <FormControlLabel
                            key={permission.id}
                            control={
                              <Checkbox
                                checked={formData.permissions.includes(permission.name)}
                                onChange={() => handlePermissionToggle(permission.name)}
                                size="small"
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {permission.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {permission.description}
                                </Typography>
                              </Box>
                            }
                          />
                        ))}
                      </FormGroup>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Grid>
          
          {formData.permissions.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Permissions ({formData.permissions.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {formData.permissions.map((permission) => (
                  <Chip
                    key={permission}
                    label={permission}
                    size="small"
                    onDelete={() => handlePermissionToggle(permission)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UserManagement() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { currentWorkspace } = useWorkspace();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Tab state
  const [currentTab, setCurrentTab] = useState(0);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Loading states - comprehensive tracking
  const [loading, setLoading] = useState<LoadingStates>({
    users: false,
    roles: false,
    permissions: false,
    saving: false,
    deleting: false,
  });

  // Error states - comprehensive error tracking
  const [errors, setErrors] = useState<{
    users?: ErrorState;
    roles?: ErrorState;
    permissions?: ErrorState;
    operation?: ErrorState;
  }>({});

  // Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'user' | 'role'; item: User | Role } | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // ============================================================================
  // ERROR HANDLING UTILITIES
  // ============================================================================

  const clearError = useCallback((errorType: keyof typeof errors) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[errorType];
      return newErrors;
    });
  }, []);

  const setError = useCallback((errorType: keyof typeof errors, error: ErrorState) => {
    setErrors(prev => ({
      ...prev,
      [errorType]: error
    }));
  }, []);

  const showNotification = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const handleApiError = useCallback((error: any, operation: string, fallbackMessage: string) => {
    console.error(`${operation} error:`, error);
    
    let errorMessage = fallbackMessage;
    let details = null;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error?.message) {
      errorMessage = error.message;
      details = error.details || error;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      message: errorMessage,
      type: 'error' as const,
      details
    };
  }, []);

  // ============================================================================
  // DATA LOADING WITH ERROR HANDLING
  // ============================================================================

  const loadUsers = useCallback(async () => {
    if (!currentWorkspace?.slug) {
      setError('users', {
        message: 'No workspace selected',
        type: 'warning'
      });
      return;
    }

    setLoading(prev => ({ ...prev, users: true }));
    clearError('users');

    try {
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Slug': currentWorkspace.slug,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load users');
      }

      setUsers(data.data || []);
    } catch (error) {
      const errorState = handleApiError(error, 'Load users', 'Failed to load users');
      setError('users', errorState);
      setUsers([]); // Set empty array to prevent UI issues
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [currentWorkspace?.slug, clearError, setError, handleApiError]);

  const loadRoles = useCallback(async () => {
    if (!currentWorkspace?.slug) {
      setError('roles', {
        message: 'No workspace selected',
        type: 'warning'
      });
      return;
    }

    setLoading(prev => ({ ...prev, roles: true }));
    clearError('roles');

    try {
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/admin/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Slug': currentWorkspace.slug,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load roles');
      }

      setRoles(data.data || []);
    } catch (error) {
      const errorState = handleApiError(error, 'Load roles', 'Failed to load roles');
      setError('roles', errorState);
      setRoles([]); // Set empty array to prevent UI issues
    } finally {
      setLoading(prev => ({ ...prev, roles: false }));
    }
  }, [currentWorkspace?.slug, clearError, setError, handleApiError]);

  const loadPermissions = useCallback(async () => {
    if (!currentWorkspace?.slug) {
      setError('permissions', {
        message: 'No workspace selected',
        type: 'warning'
      });
      return;
    }

    setLoading(prev => ({ ...prev, permissions: true }));
    clearError('permissions');

    try {
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch(`/api/permissions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Slug': currentWorkspace.slug,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load permissions');
      }

      setPermissions(data.data || []);
    } catch (error) {
      const errorState = handleApiError(error, 'Load permissions', 'Failed to load permissions');
      setError('permissions', errorState);
      setPermissions([]); // Set empty array to prevent UI issues
    } finally {
      setLoading(prev => ({ ...prev, permissions: false }));
    }
  }, [currentWorkspace?.slug, clearError, setError, handleApiError]);

  // ============================================================================
  // CRUD OPERATIONS WITH ERROR HANDLING
  // ============================================================================

  const handleCreateUser = useCallback(() => {
    setEditingUser(null);
    setUserDialogOpen(true);
    clearError('operation');
  }, [clearError]);

  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    setUserDialogOpen(true);
    clearError('operation');
  }, [clearError]);

  const handleCreateRole = useCallback(() => {
    setEditingRole(null);
    setRoleDialogOpen(true);
    clearError('operation');
  }, [clearError]);

  const handleEditRole = useCallback((role: Role) => {
    setEditingRole(role);
    setRoleDialogOpen(true);
    clearError('operation');
  }, [clearError]);

  const handleDeleteUser = useCallback((user: User) => {
    setDeletingItem({ type: 'user', item: user });
    setDeleteDialogOpen(true);
    clearError('operation');
  }, [clearError]);

  const handleDeleteRole = useCallback((role: Role) => {
    setDeletingItem({ type: 'role', item: role });
    setDeleteDialogOpen(true);
    clearError('operation');
  }, [clearError]);

  const handleSaveUser = useCallback(async (userData: Partial<User>) => {
    if (!currentWorkspace?.slug) {
      showNotification('No workspace selected', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    clearError('operation');

    try {
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Slug': currentWorkspace.slug,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save user');
      }

      setUserDialogOpen(false);
      setEditingUser(null);
      showNotification(
        editingUser ? 'User updated successfully' : 'User created successfully',
        'success'
      );
      
      // Reload users to get updated data
      await loadUsers();
    } catch (error) {
      const errorState = handleApiError(error, 'Save user', 'Failed to save user');
      setError('operation', errorState);
      showNotification(errorState.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  }, [currentWorkspace?.slug, editingUser, clearError, handleApiError, setError, showNotification, loadUsers]);

  const handleSaveRole = useCallback(async (roleData: Partial<Role>) => {
    if (!currentWorkspace?.slug) {
      showNotification('No workspace selected', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, saving: true }));
    clearError('operation');

    try {
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const url = editingRole 
        ? `/api/admin/roles/${editingRole.id}`
        : '/api/admin/roles';
      
      const method = editingRole ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Workspace-Slug': currentWorkspace.slug,
        },
        body: JSON.stringify(roleData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save role');
      }

      setRoleDialogOpen(false);
      setEditingRole(null);
      showNotification(
        editingRole ? 'Role updated successfully' : 'Role created successfully',
        'success'
      );
      
      // Reload roles to get updated data
      await loadRoles();
    } catch (error) {
      const errorState = handleApiError(error, 'Save role', 'Failed to save role');
      setError('operation', errorState);
      showNotification(errorState.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  }, [currentWorkspace?.slug, editingRole, clearError, handleApiError, setError, showNotification, loadRoles]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingItem || !currentWorkspace?.slug) {
      showNotification('Invalid delete operation', 'error');
      return;
    }

    setLoading(prev => ({ ...prev, deleting: true }));
    clearError('operation');

    try {
      const token = authStorage.getToken();
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const url = deletingItem.type === 'user' 
        ? `/api/admin/users/${deletingItem.item.id}`
        : `/api/admin/roles/${deletingItem.item.id}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-Slug': currentWorkspace.slug,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Failed to delete ${deletingItem.type}`);
      }

      setDeleteDialogOpen(false);
      setDeletingItem(null);
      showNotification(
        `${deletingItem.type === 'user' ? 'User' : 'Role'} deleted successfully`,
        'success'
      );
      
      // Reload appropriate data
      if (deletingItem.type === 'user') {
        await loadUsers();
      } else {
        await loadRoles();
      }
    } catch (error) {
      const errorState = handleApiError(error, `Delete ${deletingItem.type}`, `Failed to delete ${deletingItem.type}`);
      setError('operation', errorState);
      showNotification(errorState.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  }, [deletingItem, currentWorkspace?.slug, clearError, handleApiError, setError, showNotification, loadUsers, loadRoles]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (currentWorkspace?.slug) {
      loadUsers();
      loadRoles();
      loadPermissions();
    }
  }, [currentWorkspace?.slug, loadUsers, loadRoles, loadPermissions]);

  // ============================================================================
  // TABLE CONFIGURATIONS
  // ============================================================================

  const userColumns: TableColumn<User>[] = [
    {
      key: 'avatar',
      label: '',
      width: 50,
      render: (user: User) => (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 'medium',
          }}
        >
          {user.first_name?.[0]}{user.last_name?.[0]}
        </Box>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (user: User) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {user.first_name} {user.last_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.email}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (user: User) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {user.roles?.map((role) => (
            <Chip
              key={role}
              label={role}
              size="small"
              color="primary"
              variant="outlined"
            />
          )) || '-'}
        </Box>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (user: User) => (
        <Chip
          label={user.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={user.is_active ? 'success' : 'error'}
          variant="outlined"
        />
      ),
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (user: User) => user.last_login 
        ? new Date(user.last_login).toLocaleDateString() 
        : 'Never',
    },
  ];

  const roleColumns: TableColumn<Role>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (role: Role) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {role.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {role.description || 'No description'}
          </Typography>
        </Box>
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
    {
      key: 'is_system',
      label: 'Type',
      render: (role: Role) => (
        <Chip
          label={role.is_system ? 'System' : 'Custom'}
          size="small"
          color={role.is_system ? 'info' : 'secondary'}
          variant="outlined"
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (role: Role) => new Date(role.created_at).toLocaleDateString(),
    },
  ];

  const permissionColumns: TableColumn<Permission>[] = [
    {
      key: 'name',
      label: 'Permission',
      sortable: true,
      render: (permission: Permission) => permission.name || '-',
    },
    {
      key: 'category',
      label: 'Category',
      render: (permission: Permission) => permission.category || '-',
    },
    {
      key: 'action',
      label: 'Action',
      render: (permission: Permission) => permission.action || '-',
    },
    {
      key: 'description',
      label: 'Description',
      width: 300,
      render: (permission: Permission) => permission.description || '-',
    },
  ];

  // Table Actions - Users (Full CRUD)
  const userActions: TableAction<User>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (user) => console.log('View user:', user),
      show: () => hasPermission('user.read'),
    },
    {
      label: 'Edit',
      icon: <Edit />,
      onClick: handleEditUser,
      show: () => hasPermission('user.update'),
    },
    {
      label: 'Delete',
      icon: <Delete />,
      onClick: handleDeleteUser,
      show: () => hasPermission('user.delete'),
      color: 'error',
    },
  ];

  // Table Actions - Roles (Full CRUD but system roles protected)
  const roleActions: TableAction<Role>[] = [
    {
      label: 'View',
      icon: <Visibility />,
      onClick: (role) => console.log('View role:', role),
      show: () => hasPermission('role.read'),
    },
    {
      label: 'Edit',
      icon: <Edit />,
      onClick: handleEditRole,
      show: () => hasPermission('role.update'),
      disabled: (role) => role.is_system === true,
    },
    {
      label: 'Delete',
      icon: <Delete />,
      onClick: handleDeleteRole,
      show: () => hasPermission('role.delete'),
      color: 'error',
      disabled: (role) => role.is_system === true,
    },
  ];

  // Table Actions - Permissions (Read-only)
  const permissionActions: TableAction<Permission>[] = [
    {
      label: 'View Details',
      icon: <Info />,
      onClick: (permission) => console.log('View permission:', permission),
      show: () => hasPermission('permission.read'),
    },
  ];

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  // Error display helper
  const renderError = (errorKey: keyof typeof errors) => {
    const error = errors[errorKey];
    if (!error) return null;

    return (
      <Alert 
        severity={error.type} 
        sx={{ mb: 2 }}
        onClose={() => clearError(errorKey)}
      >
        {error.message}
      </Alert>
    );
  };

  // Loading backdrop for operations
  const renderLoadingBackdrop = () => {
    const isOperationLoading = loading.saving || loading.deleting;
    if (!isOperationLoading) return null;

    return (
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isOperationLoading}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
            {loading.saving && 'Saving...'}
            {loading.deleting && 'Deleting...'}
          </Typography>
        </Box>
      </Backdrop>
    );
  };

  // Check if any critical data is still loading
  const isInitialLoading = loading.users && users.length === 0;

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
            <PermissionGate permissions="role.create">
              <Button
                variant="outlined"
                startIcon={<Group />}
                onClick={handleCreateRole}
                disabled={isInitialLoading}
              >
                Add Role
              </Button>
            </PermissionGate>
            <PermissionGate permissions="user.create">
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={handleCreateUser}
                disabled={isInitialLoading}
              >
                Add User
              </Button>
            </PermissionGate>
          </Box>
        </Box>

        {/* Error Display */}
        {renderError('users')}
        {renderError('roles')}
        {renderError('permissions')}
        {renderError('operation')}

        {/* Main Content */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
            <Tab label="Users" disabled={isInitialLoading} />
            <Tab label="Roles" disabled={isInitialLoading} />
            <Tab label="Permissions" disabled={isInitialLoading} />
          </Tabs>
        </Box>

        {/* Tab Content with CommonTableLayout */}
        {currentTab === 0 && (
          <CommonTableLayout
            data={users}
            columns={userColumns}
            actions={userActions}
            loading={loading.users}
            emptyMessage="No users found"
            searchable
            searchPlaceholder="Search users..."
            title="Users"
          />
        )}

        {currentTab === 1 && (
          <CommonTableLayout
            data={roles}
            columns={roleColumns}
            actions={roleActions}
            loading={loading.roles}
            emptyMessage="No roles found"
            searchable
            searchPlaceholder="Search roles..."
            title="Roles"
          />
        )}

        {currentTab === 2 && (
          <CommonTableLayout
            data={permissions}
            columns={permissionColumns}
            actions={permissionActions}
            loading={loading.permissions}
            emptyMessage="No permissions found"
            searchable
            searchPlaceholder="Search permissions..."
            title="Permissions"
            readOnly
          />
        )}

        {/* Inline Component Dialogs */}
        <UserEditor
          open={userDialogOpen}
          user={editingUser}
          onClose={() => {
            setUserDialogOpen(false);
            setEditingUser(null);
            clearError('operation');
          }}
          onSave={handleSaveUser}
          loading={loading.saving}
        />

        <RoleEditor
          open={roleDialogOpen}
          role={editingRole}
          onClose={() => {
            setRoleDialogOpen(false);
            setEditingRole(null);
            clearError('operation');
          }}
          onSave={handleSaveRole}
          loading={loading.saving}
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          title={`Delete ${deletingItem?.type === 'user' ? 'User' : 'Role'}`}
          message={`Are you sure you want to delete this ${deletingItem?.type}? This action cannot be undone.`}
          confirmText="Delete"
          confirmColor="error"
          loading={loading.deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setDeletingItem(null);
            clearError('operation');
          }}
        />

        {/* Loading Backdrop */}
        {renderLoadingBackdrop()}

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        >
          <Alert
            onClose={() => setNotification(prev => ({ ...prev, open: false }))}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </WorkspaceLayout>
  );
}