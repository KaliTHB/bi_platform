// web-application/src/hooks/useDatasets.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Dataset } from '@/types/dataset.types';

// =============================================================================
// Types and Interfaces
// =============================================================================

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
  createDataset: (data: CreateDatasetData) => Promise<Dataset | null>;
  updateDataset: (id: string, data: UpdateDatasetData) => Promise<Dataset | null>;
  deleteDataset: (id: string) => Promise<boolean>;
  refreshDataset: (id: string) => Promise<boolean>;
  refreshDatasets: () => Promise<boolean>;
  getDatasetById: (id: string) => Dataset | undefined;
  testDatasetQuery: (id: string) => Promise<any>;
  clearError: () => void;
}

// =============================================================================
// Main Hook Implementation
// =============================================================================

export const useDatasets = (): UseDatasetsResult => {
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current workspace from URL or context
  const workspaceSlug = router.query['workspace-slug'] as string;

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') ||
                  localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // Helper function to handle API errors
  const handleApiError = useCallback((error: any, operation: string) => {
    console.error(`${operation} error:`, error);
    
    if (error.message?.includes('token') || error.status === 401) {
      // Token expired - redirect to login
      router.push('/login');
      return 'Authentication expired. Please log in again.';
    }
    
    if (error.status === 403) {
      return 'Access denied. You do not have permission to perform this action.';
    }
    
    if (error.status === 404) {
      return 'Resource not found. Please check if the workspace exists.';
    }
    
    return error.message || `Failed to ${operation.toLowerCase()}`;
  }, [router]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load datasets for the current workspace
  const loadDatasets = useCallback(async (): Promise<boolean> => {
    if (!workspaceSlug) {
      console.warn('No workspace slug available');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/workspaces/${workspaceSlug}/datasets`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      const datasetsArray = data.data || data.datasets || data || [];
      
      if (Array.isArray(datasetsArray)) {
        setDatasets(datasetsArray);
        return true;
      } else {
        console.warn('Invalid datasets response format:', data);
        setDatasets([]);
        return false;
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Load datasets');
      setError(errorMessage);
      setDatasets([]);
      return false;
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, getAuthHeaders, handleApiError]);

  // Create a new dataset
  const createDataset = useCallback(async (data: CreateDatasetData): Promise<Dataset | null> => {
    if (!workspaceSlug) {
      setError('No workspace selected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/workspaces/${workspaceSlug}/datasets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          workspace_id: workspaceSlug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const newDataset = result.data || result.dataset || result;
      
      if (newDataset && newDataset.id) {
        setDatasets(prev => [...prev, newDataset]);
        return newDataset;
      } else {
        throw new Error('Invalid response format for created dataset');
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Create dataset');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, getAuthHeaders, handleApiError]);

  // Update an existing dataset
  const updateDataset = useCallback(async (id: string, data: UpdateDatasetData): Promise<Dataset | null> => {
    if (!workspaceSlug) {
      setError('No workspace selected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/workspaces/${workspaceSlug}/datasets/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const updatedDataset = result.data || result.dataset || result;
      
      if (updatedDataset && updatedDataset.id) {
        setDatasets(prev => 
          prev.map(dataset => 
            dataset.id === id ? updatedDataset : dataset
          )
        );
        return updatedDataset;
      } else {
        throw new Error('Invalid response format for updated dataset');
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Update dataset');
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, getAuthHeaders, handleApiError]);

  // Delete a dataset
  const deleteDataset = useCallback(async (id: string): Promise<boolean> => {
    if (!workspaceSlug) {
      setError('No workspace selected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/workspaces/${workspaceSlug}/datasets/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      // Remove from local state
      setDatasets(prev => prev.filter(dataset => dataset.id !== id));
      return true;
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Delete dataset');
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, getAuthHeaders, handleApiError]);

  // Refresh a specific dataset
  const refreshDataset = useCallback(async (id: string): Promise<boolean> => {
    if (!workspaceSlug) {
      setError('No workspace selected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/workspaces/${workspaceSlug}/datasets/${id}/refresh`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const refreshedDataset = result.data || result.dataset || result;
      
      if (refreshedDataset && refreshedDataset.id) {
        setDatasets(prev => 
          prev.map(dataset => 
            dataset.id === id ? { ...dataset, ...refreshedDataset } : dataset
          )
        );
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Refresh dataset');
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, getAuthHeaders, handleApiError]);

  // Test a dataset query
  const testDatasetQuery = useCallback(async (id: string): Promise<any> => {
    if (!workspaceSlug) {
      throw new Error('No workspace selected');
    }

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/workspaces/${workspaceSlug}/datasets/${id}/test`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (err: any) {
      const errorMessage = handleApiError(err, 'Test dataset query');
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [workspaceSlug, getAuthHeaders, handleApiError]);

  // Refresh all datasets
  const refreshDatasets = useCallback(async (): Promise<boolean> => {
    return await loadDatasets();
  }, [loadDatasets]);

  // Get dataset by ID
  const getDatasetById = useCallback((id: string): Dataset | undefined => {
    return datasets.find(dataset => dataset.id === id);
  }, [datasets]);

  // Load datasets when workspace changes
  useEffect(() => {
    if (workspaceSlug) {
      loadDatasets();
    } else {
      // Clear datasets if no workspace
      setDatasets([]);
      setError(null);
    }
  }, [workspaceSlug, loadDatasets]);

  // Return hook interface
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
    clearError,
  };
};

export default useDatasets;