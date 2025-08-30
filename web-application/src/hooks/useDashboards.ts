// File: ./src/hooks/useDashboards.ts

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Dashboard } from '@/types/dashboard.types';

interface CreateDashboardData {
  name: string;
  description?: string;
  category_id?: string;
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
}

interface UpdateDashboardData {
  name?: string;
  description?: string;
  category_id?: string;
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

interface UseDashboardsResult {
  dashboards: Dashboard[];
  loading: boolean;
  error: string | null;
  createDashboard: (data: CreateDashboardData) => Promise<Dashboard>;
  updateDashboard: (id: string, data: UpdateDashboardData) => Promise<Dashboard>;
  deleteDashboard: (id: string) => Promise<void>;
  duplicateDashboard: (id: string) => Promise<Dashboard>;
  refreshDashboards: () => Promise<void>;
  getDashboardById: (id: string) => Dashboard | undefined;
}

export const useDashboards = (): UseDashboardsResult => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = auth.token || localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Load dashboards for the current workspace
  const loadDashboards = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/dashboards`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboards');
      }

      const data = await response.json();
      setDashboards(data.data || data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error loading dashboards:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Create a new dashboard
  const createDashboard = useCallback(async (data: CreateDashboardData): Promise<Dashboard> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/dashboards`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          workspace_id: currentWorkspace.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create dashboard');
      }

      const newDashboard = await response.json();
      setDashboards(prev => [...prev, newDashboard]);
      
      return newDashboard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create dashboard';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Update an existing dashboard
  const updateDashboard = useCallback(async (id: string, data: UpdateDashboardData): Promise<Dashboard> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/dashboards/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update dashboard');
      }

      const updatedDashboard = await response.json();
      setDashboards(prev => 
        prev.map(dashboard => 
          dashboard.id === id ? updatedDashboard : dashboard
        )
      );
      
      return updatedDashboard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update dashboard';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Delete a dashboard
  const deleteDashboard = useCallback(async (id: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/dashboards/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete dashboard');
      }

      setDashboards(prev => prev.filter(dashboard => dashboard.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete dashboard';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Duplicate a dashboard
  const duplicateDashboard = useCallback(async (id: string): Promise<Dashboard> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/dashboards/${id}/duplicate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate dashboard');
      }

      const duplicatedDashboard = await response.json();
      setDashboards(prev => [...prev, duplicatedDashboard]);
      
      return duplicatedDashboard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate dashboard';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Refresh dashboards
  const refreshDashboards = useCallback(async (): Promise<void> => {
    await loadDashboards();
  }, [loadDashboards]);

  // Get dashboard by ID
  const getDashboardById = useCallback((id: string): Dashboard | undefined => {
    return dashboards.find(dashboard => dashboard.id === id);
  }, [dashboards]);

  // Load dashboards on mount and when workspace changes
  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  return {
    dashboards,
    loading,
    error,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    refreshDashboards,
    getDashboardById,
  };
};