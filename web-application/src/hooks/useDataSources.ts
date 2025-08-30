// File: ./src/hooks/useDataSources.ts

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { DataSource, CreateDataSourceRequest, UpdateDataSourceRequest, ConnectionTestResult } from '@/types/datasource.types';

interface UseDataSourcesResult {
  dataSources: DataSource[];
  loading: boolean;
  error: string | null;
  createDataSource: (data: CreateDataSourceRequest) => Promise<DataSource>;
  updateDataSource: (id: string, data: UpdateDataSourceRequest) => Promise<DataSource>;
  deleteDataSource: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<ConnectionTestResult>;
  refreshDataSources: () => Promise<void>;
  getDataSourceById: (id: string) => DataSource | undefined;
}

const useDataSources = (): UseDataSourcesResult => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
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

  // Load data sources for the current workspace
  const loadDataSources = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasources`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load data sources');
      }

      const data = await response.json();
      setDataSources(data.data || data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error loading data sources:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Create a new data source
  const createDataSource = useCallback(async (data: CreateDataSourceRequest): Promise<DataSource> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasources`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          workspace_id: currentWorkspace.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create data source');
      }

      const newDataSource = await response.json();
      setDataSources(prev => [...prev, newDataSource]);
      
      return newDataSource;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create data source';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Update an existing data source
  const updateDataSource = useCallback(async (id: string, data: UpdateDataSourceRequest): Promise<DataSource> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasources/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update data source');
      }

      const updatedDataSource = await response.json();
      setDataSources(prev => 
        prev.map(dataSource => 
          dataSource.id === id ? updatedDataSource : dataSource
        )
      );
      
      return updatedDataSource;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data source';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Delete a data source
  const deleteDataSource = useCallback(async (id: string): Promise<void> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasources/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete data source');
      }

      setDataSources(prev => prev.filter(dataSource => dataSource.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data source';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, auth.token]);

  // Test connection for a data source
  const testConnection = useCallback(async (id: string): Promise<ConnectionTestResult> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/datasources/${id}/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to test connection');
      }

      const testResult = await response.json();
      
      // Update the data source with the test result
      setDataSources(prev => 
        prev.map(dataSource => 
          dataSource.id === id ? { 
            ...dataSource, 
            test_status: testResult.success ? 'success' : 'failed',
            test_error_message: testResult.success ? undefined : testResult.message,
            last_tested: new Date().toISOString()
          } : dataSource
        )
      );
      
      return testResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test connection';
      setError(errorMessage);
      
      // Update the data source with failed status
      setDataSources(prev => 
        prev.map(dataSource => 
          dataSource.id === id ? { 
            ...dataSource, 
            test_status: 'failed',
            test_error_message: errorMessage,
            last_tested: new Date().toISOString()
          } : dataSource
        )
      );
      
      throw err;
    }
  }, [currentWorkspace?.id, auth.token]);

  // Refresh all data sources
  const refreshDataSources = useCallback(async (): Promise<void> => {
    await loadDataSources();
  }, [loadDataSources]);

  // Get data source by ID
  const getDataSourceById = useCallback((id: string): DataSource | undefined => {
    return dataSources.find(dataSource => dataSource.id === id);
  }, [dataSources]);

  // Load data sources on mount and when workspace changes
  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  return {
    dataSources,
    loading,
    error,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection,
    refreshDataSources,
    getDataSourceById,
  };
};

export default useDataSources;