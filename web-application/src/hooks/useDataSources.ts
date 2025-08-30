import { useState, useCallback, useEffect } from 'react';
import { useDataSources } from './useDataSources';
import { usePluginConfiguration } from './usePluginConfiguration';

interface DataSource {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  plugin_name: string;
  connection_config: any;
  test_status: 'pending' | 'success' | 'failed';
  test_error_message?: string;
  last_tested?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseDataSourceConfigReturn {
  dataSources: DataSource[];
  availablePlugins: any[];
  loading: boolean;
  error: string | null;
  loadDataSources: () => Promise<void>;
  createDataSource: (dataSourceData: any) => Promise<any>;
  updateDataSource: (id: string, updates: any) => Promise<any>;
  deleteDataSource: (id: string) => Promise<void>;
  testDataSource: (id: string) => Promise<any>;
}

export const useDataSourceConfig = (workspaceId: string): UseDataSourceConfigReturn => {
  const {
    dataSources,
    loading: dataSourcesLoading,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection: testDataSource,
    refetch: refetchDataSources
  } = useDataSources();

  const {
    availablePlugins,
    loading: pluginsLoading,
    error,
    loadAvailablePlugins
  } = usePluginConfiguration(workspaceId);

  // Combine loading states
  const loading = dataSourcesLoading || pluginsLoading;

  // Load data sources function
  const loadDataSources = useCallback(async () => {
    if (refetchDataSources) {
      await refetchDataSources();
    }
  }, [refetchDataSources]);

  // Load plugins when workspace changes
  useEffect(() => {
    if (workspaceId) {
      loadAvailablePlugins();
    }
  }, [workspaceId, loadAvailablePlugins]);

  return {
    dataSources,
    availablePlugins,
    loading,
    error,
    loadDataSources,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testDataSource
  };
};

export default useDataSources;