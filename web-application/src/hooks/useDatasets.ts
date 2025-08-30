// File: ./src/hooks/useDatasets.ts

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Dataset } from '@/types/dataset.types';

interface CreateDatasetData {
  name: string;
  display_name?: string;
  description?: string;
  type: 'table' | 'query' | 'transformation';
  base_query?: string;
  datasource_ids?: string[];
  parent_dataset_ids?: string[];
  cache_ttl?: number;
}

interface UpdateDatasetData {
  name?: string;
  display_name?: string;
  description?: string;
  base_query?: string;
  cache_ttl?: number;
  is_active?: boolean;
  refresh_schedule?: any;
}

interface UseDatasetsResult {
  datasets: Dataset[];
  loading: boolean;
  error: string | null;
  createDataset: (data: CreateDatasetData) => Promise<Dataset>;
  updateDataset: (id: string, data: UpdateDatasetData) => Promise<Dataset>;
  deleteDataset: (id: string) => Promise<void>;
  refreshDataset: (id: string) => Promise<void>;
  refreshDatasets: () => Promise<void>;
  getDatasetById: (id: string) => Dataset | undefined;
  testDatasetQuery: (id: string) => Promise<any>;
}

export const useDatasets = (): UseDatasetsResult => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
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

  // Load datasets for the current workspace
  const loadDatasets = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasets`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load datasets');
      }

      const data = await response.json();
      setDatasets(data.data || data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error loading datasets:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Create a new dataset
  const createDataset = useCallback(async (data: CreateDatasetData): Promise<Dataset> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          workspace_id: currentWorkspace.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create dataset');
      }

      const newDataset = await response.json();
      setDatasets(prev => [...prev, newDataset]);
      
      return newDataset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create dataset';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Update an existing dataset
  const updateDataset = useCallback(async (id: string, data: UpdateDatasetData): Promise<Dataset> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasets/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update dataset');
      }

      const updatedDataset = await response.json();
      setDatasets(prev => 
        prev.map(dataset => 
          dataset.id === id ? updatedDataset : dataset
        )
      );
      
      return updatedDataset;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update dataset';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Delete a dataset
  const deleteDataset = useCallback(async (id: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete dataset');
      }

      setDatasets(prev => prev.filter(dataset => dataset.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete dataset';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Refresh a specific dataset
  const refreshDataset = useCallback(async (id: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasets/${id}/refresh`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to refresh dataset');
      }

      // Optionally update the dataset's last_refreshed timestamp
      const refreshedDataset = await response.json();
      if (refreshedDataset) {
        setDatasets(prev => 
          prev.map(dataset => 
            dataset.id === id ? { ...dataset, ...refreshedDataset } : dataset
          )
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh dataset';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Test a dataset query
  const testDatasetQuery = useCallback(async (id: string): Promise<any> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasets/${id}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to test dataset query');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test dataset query';
      setError(errorMessage);
      throw err;
    }
  }, [currentWorkspace?.id, auth.token]);

  // Refresh all datasets
  const refreshDatasets = useCallback(async (): Promise<void> => {
    await loadDatasets();
  }, [loadDatasets]);

  // Get dataset by ID
  const getDatasetById = useCallback((id: string): Dataset | undefined => {
    return datasets.find(dataset => dataset.id === id);
  }, [datasets]);

  // Load datasets on mount and when workspace changes
  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  return {
    datasets,
    loading,
    error,
    createDataset,
    updateDataset,
    deleteDataset,
    refreshDataset,
    refreshDatasets,
    getDatasetById,
    testDatasetQuery,
  };
};