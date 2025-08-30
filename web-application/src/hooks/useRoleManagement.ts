// File: ./src/hooks/useRoleManagement.ts

import { useState, useCallback, useEffect } from 'react';

// Interfaces
interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
  display_name?: string;
  resource_type?: string;
  is_system?: boolean;
}

interface Role {
  id?: string;
  name: string;
  display_name?: string;
  description: string;
  permissions: string[];
  is_system_role: boolean;
  level?: number;
  workspace_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}

// Default system permissions
const DEFAULT_PERMISSIONS: Permission[] = [
  // Workspace permissions
  { id: 'workspace.read', name: 'workspace.read', category: 'Workspace Management', description: 'View workspace information and settings' },
  { id: 'workspace.create', name: 'workspace.create', category: 'Workspace Management', description: 'Create new workspaces' },
  { id: 'workspace.update', name: 'workspace.update', category: 'Workspace Management', description: 'Modify workspace settings' },
  { id: 'workspace.delete', name: 'workspace.delete', category: 'Workspace Management', description: 'Delete workspaces' },
  { id: 'workspace.admin', name: 'workspace.admin', category: 'Workspace Management', description: 'Full workspace administration' },

  // User management
  { id: 'user.read', name: 'user.read', category: 'User Management', description: 'View user information' },
  { id: 'user.create', name: 'user.create', category: 'User Management', description: 'Create new user accounts' },
  { id: 'user.update', name: 'user.update', category: 'User Management', description: 'Update user profiles and settings' },
  { id: 'user.delete', name: 'user.delete', category: 'User Management', description: 'Delete user accounts' },
  { id: 'user.invite', name: 'user.invite', category: 'User Management', description: 'Invite users to workspace' },

  // Role management
  { id: 'role.read', name: 'role.read', category: 'Role Management', description: 'View roles and assignments' },
  { id: 'role.create', name: 'role.create', category: 'Role Management', description: 'Create custom roles' },
  { id: 'role.update', name: 'role.update', category: 'Role Management', description: 'Update role permissions' },
  { id: 'role.delete', name: 'role.delete', category: 'Role Management', description: 'Delete custom roles' },
  { id: 'role.assign', name: 'role.assign', category: 'Role Management', description: 'Assign roles to users' },

  // Dashboard permissions
  { id: 'dashboard.read', name: 'dashboard.read', category: 'Dashboard Management', description: 'View dashboards' },
  { id: 'dashboard.create', name: 'dashboard.create', category: 'Dashboard Management', description: 'Create dashboards' },
  { id: 'dashboard.update', name: 'dashboard.update', category: 'Dashboard Management', description: 'Edit dashboards' },
  { id: 'dashboard.delete', name: 'dashboard.delete', category: 'Dashboard Management', description: 'Delete dashboards' },
  { id: 'dashboard.publish', name: 'dashboard.publish', category: 'Dashboard Management', description: 'Publish dashboards' },
  { id: 'dashboard.share', name: 'dashboard.share', category: 'Dashboard Management', description: 'Share dashboards' },

  // Dataset permissions
  { id: 'dataset.read', name: 'dataset.read', category: 'Dataset Management', description: 'View and query datasets' },
  { id: 'dataset.create', name: 'dataset.create', category: 'Dataset Management', description: 'Create datasets' },
  { id: 'dataset.update', name: 'dataset.update', category: 'Dataset Management', description: 'Modify datasets' },
  { id: 'dataset.delete', name: 'dataset.delete', category: 'Dataset Management', description: 'Delete datasets' },
  { id: 'dataset.transform', name: 'dataset.transform', category: 'Dataset Management', description: 'Create transformation datasets' },

  // Chart permissions
  { id: 'chart.read', name: 'chart.read', category: 'Chart Management', description: 'View charts' },
  { id: 'chart.create', name: 'chart.create', category: 'Chart Management', description: 'Create charts' },
  { id: 'chart.update', name: 'chart.update', category: 'Chart Management', description: 'Edit charts' },
  { id: 'chart.delete', name: 'chart.delete', category: 'Chart Management', description: 'Delete charts' },

  // Data source permissions
  { id: 'data_source.read', name: 'data_source.read', category: 'Data Source Management', description: 'View data sources' },
  { id: 'data_source.create', name: 'data_source.create', category: 'Data Source Management', description: 'Create data sources' },
  { id: 'data_source.update', name: 'data_source.update', category: 'Data Source Management', description: 'Modify data sources' },
  { id: 'data_source.delete', name: 'data_source.delete', category: 'Data Source Management', description: 'Delete data sources' },
  { id: 'data_source.test', name: 'data_source.test', category: 'Data Source Management', description: 'Test data source connections' },

  // Export permissions
  { id: 'export.pdf', name: 'export.pdf', category: 'Export Permissions', description: 'Export as PDF' },
  { id: 'export.excel', name: 'export.excel', category: 'Export Permissions', description: 'Export as Excel' },
  { id: 'export.csv', name: 'export.csv', category: 'Export Permissions', description: 'Export as CSV' },
  { id: 'export.image', name: 'export.image', category: 'Export Permissions', description: 'Export as image' },

  // System administration
  { id: 'admin.audit', name: 'admin.audit', category: 'System Administration', description: 'View audit logs' },
  { id: 'admin.plugins', name: 'admin.plugins', category: 'System Administration', description: 'Manage plugins' },
  { id: 'admin.system', name: 'admin.system', category: 'System Administration', description: 'System administration' }
];

export const useRoleManagement = (workspaceId?: string) => {
  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS);
  const [userRoleAssignments, setUserRoleAssignments] = useState<UserRoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load roles for a workspace
  const loadRoles = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/roles`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw { message: 'Failed to load roles' };
      }

      const data = await response.json();
      setRoles(data.data || data);
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as any).message)
        : 'Failed to load roles';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Load permissions
  const loadPermissions = useCallback(async () => {
    if (!workspaceId) {
      setPermissions(DEFAULT_PERMISSIONS);
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/permissions`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        // Fall back to default permissions if API fails
        setPermissions(DEFAULT_PERMISSIONS);
        return;
      }

      const data = await response.json();
      setPermissions(data.data || data || DEFAULT_PERMISSIONS);
    } catch (error) {
      // Fall back to default permissions
      setPermissions(DEFAULT_PERMISSIONS);
    }
  }, [workspaceId]);

  // Load user role assignments
  const loadUserRoleAssignments = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/user-roles`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw { message: 'Failed to load user role assignments' };
      }

      const data = await response.json();
      setUserRoleAssignments(data.data || data);
    } catch (error) {
      console.error('Failed to load user role assignments:', error);
      setUserRoleAssignments([]);
    }
  }, [workspaceId]);

  // Create or update a role
  const saveRole = useCallback(async (role: Role): Promise<Role> => {
    if (!workspaceId) throw new Error('Workspace ID is required');

    const isUpdate = !!role.id;
    const url = isUpdate 
      ? `/api/workspaces/${workspaceId}/roles/${role.id}`
      : `/api/workspaces/${workspaceId}/roles`;

    const response = await fetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: role.name,
        display_name: role.display_name || role.name,
        description: role.description,
        permissions: role.permissions,
        is_system_role: role.is_system_role,
        level: role.level || 1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to save role' }));
      throw { message: errorData.message || 'Failed to save role' };
    }

    const savedRole = await response.json();
    
    // Update local state
    if (isUpdate) {
      setRoles(prev => prev.map(r => r.id === role.id ? savedRole : r));
    } else {
      setRoles(prev => [...prev, savedRole]);
    }

    return savedRole;
  }, [workspaceId]);

  // Delete a role
  const deleteRole = useCallback(async (roleId: string): Promise<void> => {
    if (!workspaceId) throw new Error('Workspace ID is required');

    const response = await fetch(`/api/workspaces/${workspaceId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete role' }));
      throw { message: errorData.message || 'Failed to delete role' };
    }

    // Update local state
    setRoles(prev => prev.filter(r => r.id !== roleId));
  }, [workspaceId]);

  // Assign role to user
  const assignRoleToUser = useCallback(async (userId: string, roleId: string): Promise<void> => {
    if (!workspaceId) throw new Error('Workspace ID is required');

    const response = await fetch(`/api/workspaces/${workspaceId}/users/${userId}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role_id: roleId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to assign role' }));
      throw { message: errorData.message || 'Failed to assign role' };
    }

    // Refresh user role assignments
    await loadUserRoleAssignments();
  }, [workspaceId, loadUserRoleAssignments]);

  // Remove role from user
  const removeRoleFromUser = useCallback(async (userId: string, roleId: string): Promise<void> => {
    if (!workspaceId) throw new Error('Workspace ID is required');

    const response = await fetch(`/api/workspaces/${workspaceId}/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to remove role' }));
      throw { message: errorData.message || 'Failed to remove role' };
    }

    // Refresh user role assignments
    await loadUserRoleAssignments();
  }, [workspaceId, loadUserRoleAssignments]);

  // Get permissions by category
  const getPermissionsByCategory = useCallback((category: string): Permission[] => {
    return permissions.filter(p => p.category === category);
  }, [permissions]);

  // Get all categories
  const getCategories = useCallback((): string[] => {
    return Array.from(new Set(permissions.map(p => p.category))).sort();
  }, [permissions]);

  // Load data on mount and when workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      loadRoles();
      loadPermissions();
      loadUserRoleAssignments();
    }
  }, [workspaceId, loadRoles, loadPermissions, loadUserRoleAssignments]);

  return {
    // State
    roles,
    permissions,
    userRoleAssignments,
    loading,
    error,

    // Actions
    loadRoles,
    loadPermissions,
    loadUserRoleAssignments,
    saveRole,
    deleteRole,
    assignRoleToUser,
    removeRoleFromUser,

    // Helpers
    getPermissionsByCategory,
    getCategories
  };
};