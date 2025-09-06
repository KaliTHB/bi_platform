// File: ./src/hooks/usePermissionMatrix.ts

import { useState, useCallback } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
  display_name?: string;
}

interface UserPermissions {
  [userId: string]: {
    [permissionId: string]: boolean;
  };
}

interface PermissionChange {
  userId: string;
  permissionId: string;
  granted: boolean;
}

export const usePermissionMatrix = (workspaceId: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PermissionChange[]>([]);

  const hasChanges = pendingChanges.length > 0;

  const loadMatrix = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch users in the workspace
      const usersResponse = await fetch(`/api/workspaces/${workspaceId}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!usersResponse.ok) {
        throw { message: 'Failed to fetch users' };
      }

      const usersData = await usersResponse.json();

      // Fetch available permissions
      const permissionsResponse = await fetch(`/api/workspaces/${workspaceId}/permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!permissionsResponse.ok) {
        throw { message: 'Failed to fetch permissions' };
      }

      const permissionsData = await permissionsResponse.json();

      // Fetch current user permissions
      const userPermissionsResponse = await fetch(`/api/workspaces/${workspaceId}/user-permissions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userPermissionsResponse.ok) {
        throw { message: 'Failed to fetch user permissions' };
      }

      const userPermissionsData = await userPermissionsResponse.json();

      // Process and set the data
      setUsers(usersData.data || usersData);
      setPermissions(permissionsData.data || permissionsData);

      // Convert user permissions to matrix format
      const permissionMatrix: UserPermissions = {};
      (usersData.data || usersData).forEach((user: User) => {
        permissionMatrix[user.id] = {};
        (permissionsData.data || permissionsData).forEach((permission: Permission) => {
          // Check if user has this permission (from API response)
          const hasPermission = userPermissionsData.some((up: any) => 
            up.user_id === user.id && up.permission_id === permission.id
          );
          permissionMatrix[user.id][permission.id] = hasPermission;
        });
      });

      setUserPermissions(permissionMatrix);
      setPendingChanges([]);

    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as any).message)
        : 'An error occurred while loading permission matrix';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const updateUserPermission = useCallback((userId: string, permissionId: string, granted: boolean) => {
    // Update local state immediately
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [permissionId]: granted
      }
    }));

    // Track the change
    setPendingChanges(prev => {
      // Remove any existing change for this user/permission combination
      const filtered = prev.filter(
        change => !(change.userId === userId && change.permissionId === permissionId)
      );

      // Add the new change
      return [...filtered, { userId, permissionId, granted }];
    });
  }, []);

  const saveChanges = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/user-permissions/bulk`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          changes: pendingChanges.map(change => ({
            user_id: change.userId,
            permission_id: change.permissionId,
            granted: change.granted
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save changes' }));
        throw { message: errorData.message || 'Failed to save changes' };
      }

      // Clear pending changes on success
      setPendingChanges([]);

    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as any).message)
        : 'An error occurred while saving changes';
      setError(errorMessage);
      
      // Revert local changes on error
      await loadMatrix();
    } finally {
      setSaving(false);
    }
  }, [workspaceId, pendingChanges, loadMatrix]);

  const resetChanges = useCallback(() => {
    setPendingChanges([]);
    // Reload the matrix to revert any local changes
    loadMatrix();
  }, [loadMatrix]);

  return {
    users,
    permissions,
    userPermissions,
    loading,
    saving,
    error,
    hasChanges,
    pendingChanges: pendingChanges.length,
    loadMatrix,
    updateUserPermission,
    saveChanges,
    resetChanges
  };
};