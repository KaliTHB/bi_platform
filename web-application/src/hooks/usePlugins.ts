// File: bi_platform/web-application/src/hooks/usePlugins.ts

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// Plugin Types - Exported for use in other files
export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  version: string;
  description?: string;
  configSchema: Record<string, SchemaProperty>;
  capabilities: DataSourceCapabilities;
}

export interface ChartPlugin {
  name: string;
  displayName: string;
  category: string;
  library: 'echarts' | 'd3' | 'plotly' | 'chartjs';
  version: string;
  configSchema: Record<string, SchemaProperty>;
  supportedDataTypes: string[];
  minColumns: number;
  maxColumns: number;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'password' | 'select';
  required?: boolean;
  default?: any;
  options?: string[];
  validation?: RegExp | string;
  description?: string;
  title?: string;
}

export interface DataSourceCapabilities {
  supportsBulkInsert: boolean;
  supportsTransactions: boolean;
  supportsStoredProcedures: boolean;
  maxConcurrentConnections: number;
}

export interface PluginConfiguration {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  configuration: Record<string, any>;
  is_enabled: boolean;
  last_used?: string;
  usage_count: number;
  enabled_by: string;
  enabled_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface UsePluginsResult {
  // Available plugins (discovered from file system)
  dataSourcePlugins: DataSourcePlugin[];
  chartPlugins: ChartPlugin[];
  
  // Workspace configurations
  dataSourceConfigs: PluginConfiguration[];
  chartConfigs: PluginConfiguration[];
  
  // Loading states
  loading: boolean;
  testingConnection: boolean;
  
  // Error state
  error: string | null;
  
  // Plugin management methods
  refreshPlugins: () => Promise<void>;
  getDataSourcePlugin: (name: string) => DataSourcePlugin | undefined;
  getChartPlugin: (name: string) => ChartPlugin | undefined;
  
  // Configuration management
  updatePluginConfig: (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any>
  ) => Promise<PluginConfiguration>;
  
  enablePlugin: (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => Promise<void>;
  
  disablePlugin: (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => Promise<void>;
  
  // Testing and validation
  testDataSourceConnection: (
    pluginName: string,
    configuration: Record<string, any>
  ) => Promise<ConnectionTestResult>;
  
  validatePluginConfig: (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any>
  ) => ValidationResult;
  
  // Helper methods
  getPluginsByCategory: (
    pluginType: 'datasource' | 'chart',
    category: string
  ) => (DataSourcePlugin | ChartPlugin)[];
  
  isPluginEnabled: (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => boolean;
}

export const usePlugins = (): UsePluginsResult => {
  // State management
  const [dataSourcePlugins, setDataSourcePlugins] = useState<DataSourcePlugin[]>([]);
  const [chartPlugins, setChartPlugins] = useState<ChartPlugin[]>([]);
  const [dataSourceConfigs, setDataSourceConfigs] = useState<PluginConfiguration[]>([]);
  const [chartConfigs, setChartConfigs] = useState<PluginConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redux state
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

  // Load available plugins (discovered from file system)
  const loadAvailablePlugins = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Load data source plugins
      const dsResponse = await fetch('/api/plugins/datasources/available', {
        headers: getAuthHeaders(),
      });

      if (!dsResponse.ok) {
        throw new Error('Failed to load data source plugins');
      }

      const dsData = await dsResponse.json();
      setDataSourcePlugins(dsData.data || dsData);

      // Load chart plugins
      const chartResponse = await fetch('/api/plugins/charts/available', {
        headers: getAuthHeaders(),
      });

      if (!chartResponse.ok) {
        throw new Error('Failed to load chart plugins');
      }

      const chartData = await chartResponse.json();
      setChartPlugins(chartData.data || chartData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plugins';
      setError(errorMessage);
      console.error('Plugin loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  // Load workspace plugin configurations
  const loadPluginConfigurations = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      // Load data source configurations
      const dsConfigResponse = await fetch(
        `/api/workspaces/${currentWorkspace.id}/plugins/datasources`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (dsConfigResponse.ok) {
        const dsConfigData = await dsConfigResponse.json();
        setDataSourceConfigs(dsConfigData.data || dsConfigData);
      }

      // Load chart configurations
      const chartConfigResponse = await fetch(
        `/api/workspaces/${currentWorkspace.id}/plugins/charts`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (chartConfigResponse.ok) {
        const chartConfigData = await chartConfigResponse.json();
        setChartConfigs(chartConfigData.data || chartConfigData);
      }

    } catch (err) {
      console.error('Plugin configuration loading error:', err);
    }
  }, [currentWorkspace]);

  // Update plugin configuration
  const updatePluginConfig = useCallback(async (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any>
  ): Promise<PluginConfiguration> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    // Client-side validation
    const validation = validatePluginConfig(pluginType, pluginName, configuration);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/plugins/${pluginType}/${pluginName}/config`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ configuration }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update plugin configuration');
      }

      const updatedConfig = await response.json();

      // Update local state
      if (pluginType === 'datasource') {
        setDataSourceConfigs(prev =>
          prev.map(config =>
            config.plugin_name === pluginName ? updatedConfig.data : config
          )
        );
      } else {
        setChartConfigs(prev =>
          prev.map(config =>
            config.plugin_name === pluginName ? updatedConfig.data : config
          )
        );
      }

      return updatedConfig.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(errorMessage);
      throw err;
    }
  }, [currentWorkspace, validatePluginConfig]);

  // Enable plugin for workspace
  const enablePlugin = useCallback(async (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/plugins/${pluginType}/${pluginName}/enable`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enable plugin');
      }

      // Refresh configurations
      await loadPluginConfigurations();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable plugin';
      setError(errorMessage);
      throw err;
    }
  }, [currentWorkspace, loadPluginConfigurations]);

  // Disable plugin for workspace
  const disablePlugin = useCallback(async (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace selected');
    }

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/plugins/${pluginType}/${pluginName}/disable`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disable plugin');
      }

      // Refresh configurations
      await loadPluginConfigurations();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable plugin';
      setError(errorMessage);
      throw err;
    }
  }, [currentWorkspace, loadPluginConfigurations]);

  // Test data source connection
  const testDataSourceConnection = useCallback(async (
    pluginName: string,
    configuration: Record<string, any>
  ): Promise<ConnectionTestResult> => {
    setTestingConnection(true);

    try {
      const response = await fetch('/api/plugins/datasources/test-connection', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          plugin_name: pluginName,
          configuration,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test connection');
      }

      const result = await response.json();
      return result.data || result;

    } catch (err) {
      return {
        success: false,
        message: 'Connection test failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    } finally {
      setTestingConnection(false);
    }
  }, []);

  // Validate plugin configuration
  const validatePluginConfig = useCallback((
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any>
  ): ValidationResult => {
    let plugin: DataSourcePlugin | ChartPlugin | undefined;

    if (pluginType === 'datasource') {
      plugin = dataSourcePlugins.find(p => p.name === pluginName);
    } else {
      plugin = chartPlugins.find(p => p.name === pluginName);
    }

    if (!plugin) {
      return {
        valid: false,
        errors: [`Plugin ${pluginName} not found`],
      };
    }

    const errors: string[] = [];

    // Validate required fields
    Object.entries(plugin.configSchema).forEach(([key, schema]) => {
      if (schema.required && (configuration[key] === undefined || configuration[key] === '')) {
        errors.push(`Field "${schema.title || key}" is required`);
      }

      // Type validation
      if (configuration[key] !== undefined) {
        const value = configuration[key];
        switch (schema.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Field "${schema.title || key}" must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`Field "${schema.title || key}" must be a boolean`);
            }
            break;
          case 'select':
            if (schema.options && !schema.options.includes(value)) {
              errors.push(`Field "${schema.title || key}" must be one of: ${schema.options.join(', ')}`);
            }
            break;
        }

        // Regex validation
        if (schema.validation && typeof schema.validation === 'object' && schema.validation.test) {
          if (!schema.validation.test(String(value))) {
            errors.push(`Field "${schema.title || key}" has invalid format`);
          }
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [dataSourcePlugins, chartPlugins]);

  // Helper methods
  const getDataSourcePlugin = useCallback((name: string): DataSourcePlugin | undefined => {
    return dataSourcePlugins.find(plugin => plugin.name === name);
  }, [dataSourcePlugins]);

  const getChartPlugin = useCallback((name: string): ChartPlugin | undefined => {
    return chartPlugins.find(plugin => plugin.name === name);
  }, [chartPlugins]);

  const getPluginsByCategory = useCallback((
    pluginType: 'datasource' | 'chart',
    category: string
  ): (DataSourcePlugin | ChartPlugin)[] => {
    if (pluginType === 'datasource') {
      return dataSourcePlugins.filter(plugin => plugin.category === category);
    } else {
      return chartPlugins.filter(plugin => plugin.category === category);
    }
  }, [dataSourcePlugins, chartPlugins]);

  const isPluginEnabled = useCallback((
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ): boolean => {
    const configs = pluginType === 'datasource' ? dataSourceConfigs : chartConfigs;
    const config = configs.find(c => c.plugin_name === pluginName);
    return config?.is_enabled === true;
  }, [dataSourceConfigs, chartConfigs]);

  const refreshPlugins = useCallback(async () => {
    await Promise.all([
      loadAvailablePlugins(),
      loadPluginConfigurations(),
    ]);
  }, [loadAvailablePlugins, loadPluginConfigurations]);

  // Load plugins when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      refreshPlugins();
    }
  }, [currentWorkspace, refreshPlugins]);

  return {
    // Available plugins
    dataSourcePlugins,
    chartPlugins,
    
    // Workspace configurations
    dataSourceConfigs,
    chartConfigs,
    
    // Loading states
    loading,
    testingConnection,
    
    // Error state
    error,
    
    // Plugin management methods
    refreshPlugins,
    getDataSourcePlugin,
    getChartPlugin,
    
    // Configuration management
    updatePluginConfig,
    enablePlugin,
    disablePlugin,
    
    // Testing and validation
    testDataSourceConnection,
    validatePluginConfig,
    
    // Helper methods
    getPluginsByCategory,
    isPluginEnabled,
  };
};