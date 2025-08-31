// File: bi_platform/web-application/src/hooks/usePlugins.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useCache } from './useCache';
import { useOptimisticState } from './useOptimisticState';
import { pluginAPI } from '../services/pluginAPI';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes' | 'apis' | 'files';
  version: string;
  description?: string;
  configSchema: Record<string, SchemaProperty>;
  capabilities: DataSourceCapabilities;
  icon?: string;
  tags?: string[];
}

export interface ChartPlugin {
  name: string;
  displayName: string;
  category: 'basic' | 'advanced' | 'statistical' | 'geographic' | 'custom';
  library: 'echarts' | 'd3' | 'plotly' | 'chartjs' | 'custom';
  version: string;
  description?: string;
  configSchema: Record<string, SchemaProperty>;
  supportedDataTypes: DataType[];
  minColumns: number;
  maxColumns: number;
  icon?: string;
  preview?: string;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'password' | 'select' | 'multi-select' | 'textarea';
  required?: boolean;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  description?: string;
  title?: string;
  placeholder?: string;
  group?: string;
}

export interface DataSourceCapabilities {
  supportsBulkInsert: boolean;
  supportsTransactions: boolean;
  supportsStoredProcedures: boolean;
  supportsStreaming: boolean;
  supportsCaching: boolean;
  maxConcurrentConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

export interface PluginConfiguration {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  configuration: Record<string, any>;
  is_enabled: boolean;
  last_used?: Date;
  usage_count: number;
  enabled_by?: string;
  enabled_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectionTestResult {
  connection_valid: boolean;
  message: string;
  response_time?: number;
  error_code?: string;
  details?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface PluginStatistics {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  usage_count: number;
  last_used?: Date;
  error_count: number;
  avg_response_time?: number;
  success_rate: number;
}

export type DataType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'datetime' 
  | 'boolean' 
  | 'json' 
  | 'array' 
  | 'object';

// ============================================================================
// Hook Return Type
// ============================================================================

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
  loadConfigurations: () => Promise<void>;
  getDataSourcePlugin: (name: string) => DataSourcePlugin | undefined;
  getChartPlugin: (name: string) => ChartPlugin | undefined;
  
  // Configuration management
  updatePluginConfig: (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any>,
    isEnabled?: boolean
  ) => Promise<PluginConfiguration>;
  
  enablePlugin: (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration?: Record<string, any>
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
  
  // Statistics and analytics
  getPluginStatistics: (workspaceId?: string) => Promise<PluginStatistics[]>;
  
  // Helper methods
  getPluginsByCategory: (
    pluginType: 'datasource' | 'chart',
    category: string
  ) => (DataSourcePlugin | ChartPlugin)[];
  
  isPluginEnabled: (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => boolean;
  
  getPluginConfig: (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => PluginConfiguration | undefined;
  
  // Cache management
  invalidatePluginCache: () => void;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export const usePlugins = (workspaceId?: string): UsePluginsResult => {
  // ============================================================================
  // State Management
  // ============================================================================
  
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
  
  // Use provided workspaceId or current workspace
  const effectiveWorkspaceId = workspaceId || currentWorkspace?.id;

  // Performance optimizations
  const { getCached, setCached, invalidateCache } = useCache();
  const { optimisticUpdate, rollback } = useOptimisticState();

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getAuthHeaders = useCallback(() => {
    const token = auth.token || localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [auth.token]);

  // ============================================================================
  // Plugin Loading Functions
  // ============================================================================

  // Load available plugins (cached for 1 hour)
  const loadAvailablePlugins = useCallback(async () => {
    const cacheKey = 'available-plugins';
    const cached = getCached(cacheKey);
    
    if (cached) {
      setDataSourcePlugins(cached.dataSourcePlugins || []);
      setChartPlugins(cached.chartPlugins || []);
      return cached;
    }

    try {
      const plugins = await pluginAPI.getAvailablePlugins();
      
      const dsPlugins = plugins.filter(p => p.plugin_type === 'datasource') as DataSourcePlugin[];
      const chartPluginsData = plugins.filter(p => p.plugin_type === 'chart') as ChartPlugin[];
      
      setDataSourcePlugins(dsPlugins);
      setChartPlugins(chartPluginsData);
      
      const cacheData = { dataSourcePlugins: dsPlugins, chartPlugins: chartPluginsData };
      setCached(cacheKey, cacheData, 3600); // 1 hour
      
      return cacheData;
    } catch (error) {
      console.error('Failed to load available plugins:', error);
      throw error;
    }
  }, [getCached, setCached]);

  // Load workspace configurations (cached for 5 minutes)
  const loadWorkspaceConfigurations = useCallback(async () => {
    if (!effectiveWorkspaceId) return [];

    const cacheKey = `workspace-configs-${effectiveWorkspaceId}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
      setDataSourceConfigs(cached.dataSourceConfigs || []);
      setChartConfigs(cached.chartConfigs || []);
      return cached;
    }

    try {
      const configs = await pluginAPI.getWorkspaceConfigurations(effectiveWorkspaceId);
      
      const dsConfigs = configs.filter(c => c.plugin_type === 'datasource');
      const chartConfigs = configs.filter(c => c.plugin_type === 'chart');
      
      setDataSourceConfigs(dsConfigs);
      setChartConfigs(chartConfigs);
      
      const cacheData = { dataSourceConfigs: dsConfigs, chartConfigs };
      setCached(cacheKey, cacheData, 300); // 5 minutes
      
      return cacheData;
    } catch (error) {
      console.error('Failed to load workspace configurations:', error);
      throw error;
    }
  }, [effectiveWorkspaceId, getCached, setCached]);

  // Load all configurations
  const loadConfigurations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadAvailablePlugins(),
        loadWorkspaceConfigurations()
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load plugins';
      setError(errorMessage);
      console.error('Plugin loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [loadAvailablePlugins, loadWorkspaceConfigurations]);

  // ============================================================================
  // Configuration Management
  // ============================================================================

  const updatePluginConfig = useCallback(async (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any>,
    isEnabled: boolean = true
  ): Promise<PluginConfiguration> => {
    if (!effectiveWorkspaceId) {
      throw new Error('No workspace selected');
    }

    // Client-side validation
    const validation = validatePluginConfig(pluginType, pluginName, configuration);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Optimistic update
    const optimisticId = `${pluginType}-${pluginName}`;
    const configs = pluginType === 'datasource' ? dataSourceConfigs : chartConfigs;
    const setConfigs = pluginType === 'datasource' ? setDataSourceConfigs : setChartConfigs;
    
    const existingConfig = configs.find(c => c.plugin_name === pluginName);
    const optimisticConfig: PluginConfiguration = {
      ...existingConfig,
      plugin_name: pluginName,
      plugin_type: pluginType,
      configuration,
      is_enabled: isEnabled,
      updated_at: new Date(),
      created_at: existingConfig?.created_at || new Date(),
      usage_count: existingConfig?.usage_count || 0,
    };

    optimisticUpdate(optimisticId, () => {
      if (existingConfig) {
        setConfigs(prev => prev.map(c => 
          c.plugin_name === pluginName ? optimisticConfig : c
        ));
      } else {
        setConfigs(prev => [...prev, optimisticConfig]);
      }
    });

    try {
      const updatedConfig = await pluginAPI.updatePluginConfiguration(
        effectiveWorkspaceId,
        pluginType,
        pluginName,
        configuration,
        isEnabled
      );

      // Update with server response
      setConfigs(prev => 
        prev.map(c => c.plugin_name === pluginName ? updatedConfig : c)
      );

      // Invalidate cache
      invalidateCache(`workspace-configs-${effectiveWorkspaceId}`);

      return updatedConfig;
    } catch (error) {
      // Rollback optimistic update
      rollback(optimisticId);
      throw error;
    }
  }, [effectiveWorkspaceId, dataSourceConfigs, chartConfigs, optimisticUpdate, rollback, invalidateCache]);

  const enablePlugin = useCallback(async (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any> = {}
  ) => {
    await updatePluginConfig(pluginType, pluginName, configuration, true);
  }, [updatePluginConfig]);

  const disablePlugin = useCallback(async (
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => {
    const configs = pluginType === 'datasource' ? dataSourceConfigs : chartConfigs;
    const existingConfig = configs.find(c => c.plugin_name === pluginName);
    
    await updatePluginConfig(
      pluginType, 
      pluginName, 
      existingConfig?.configuration || {}, 
      false
    );
  }, [updatePluginConfig, dataSourceConfigs, chartConfigs]);

  // ============================================================================
  // Testing and Validation
  // ============================================================================

  const testDataSourceConnection = useCallback(async (
    pluginName: string,
    configuration: Record<string, any>
  ): Promise<ConnectionTestResult> => {
    if (!effectiveWorkspaceId) {
      throw new Error('No workspace selected');
    }

    setTestingConnection(true);
    
    try {
      const result = await pluginAPI.testPluginConnection(
        effectiveWorkspaceId,
        pluginName,
        configuration
      );
      return result;
    } catch (error) {
      return {
        connection_valid: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        error_code: 'TEST_FAILED'
      };
    } finally {
      setTestingConnection(false);
    }
  }, [effectiveWorkspaceId]);

  const validatePluginConfig = useCallback((
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: Record<string, any>
  ): ValidationResult => {
    const plugins = pluginType === 'datasource' ? dataSourcePlugins : chartPlugins;
    const plugin = plugins.find(p => p.name === pluginName);
    
    if (!plugin) {
      return {
        valid: false,
        errors: [`Plugin '${pluginName}' not found`]
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate against schema
    Object.entries(plugin.configSchema).forEach(([key, schema]) => {
      const value = configuration[key];
      
      // Required field validation
      if (schema.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${key}' is required`);
        return;
      }

      if (value === undefined || value === null) return;

      // Type validation
      switch (schema.type) {
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`Field '${key}' must be a valid number`);
          } else {
            if (schema.validation?.min !== undefined && value < schema.validation.min) {
              errors.push(`Field '${key}' must be at least ${schema.validation.min}`);
            }
            if (schema.validation?.max !== undefined && value > schema.validation.max) {
              errors.push(`Field '${key}' must be at most ${schema.validation.max}`);
            }
          }
          break;
          
        case 'string':
        case 'password':
        case 'textarea':
          if (typeof value !== 'string') {
            errors.push(`Field '${key}' must be a string`);
          } else {
            if (schema.validation?.minLength && value.length < schema.validation.minLength) {
              errors.push(`Field '${key}' must be at least ${schema.validation.minLength} characters`);
            }
            if (schema.validation?.maxLength && value.length > schema.validation.maxLength) {
              errors.push(`Field '${key}' must be at most ${schema.validation.maxLength} characters`);
            }
            if (schema.validation?.pattern) {
              const regex = new RegExp(schema.validation.pattern);
              if (!regex.test(value)) {
                errors.push(`Field '${key}' format is invalid`);
              }
            }
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Field '${key}' must be a boolean`);
          }
          break;
          
        case 'select':
          if (schema.options && !schema.options.some(opt => opt.value === value)) {
            errors.push(`Field '${key}' must be one of: ${schema.options.map(o => o.value).join(', ')}`);
          }
          break;
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, [dataSourcePlugins, chartPlugins]);

  // ============================================================================
  // Statistics and Analytics
  // ============================================================================

  const getPluginStatistics = useCallback(async (statsWorkspaceId?: string): Promise<PluginStatistics[]> => {
    const targetWorkspaceId = statsWorkspaceId || effectiveWorkspaceId;
    if (!targetWorkspaceId) {
      return [];
    }

    try {
      const stats = await pluginAPI.getPluginStatistics(targetWorkspaceId);
      return stats;
    } catch (error) {
      console.error('Failed to load plugin statistics:', error);
      return [];
    }
  }, [effectiveWorkspaceId]);

  // ============================================================================
  // Helper Methods
  // ============================================================================

  const getDataSourcePlugin = useCallback((name: string) => {
    return dataSourcePlugins.find(plugin => plugin.name === name);
  }, [dataSourcePlugins]);

  const getChartPlugin = useCallback((name: string) => {
    return chartPlugins.find(plugin => plugin.name === name);
  }, [chartPlugins]);

  const getPluginsByCategory = useCallback((
    pluginType: 'datasource' | 'chart',
    category: string
  ) => {
    const plugins = pluginType === 'datasource' ? dataSourcePlugins : chartPlugins;
    return plugins.filter(plugin => plugin.category === category);
  }, [dataSourcePlugins, chartPlugins]);

  const isPluginEnabled = useCallback((
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => {
    const configs = pluginType === 'datasource' ? dataSourceConfigs : chartConfigs;
    const config = configs.find(c => c.plugin_name === pluginName);
    return config?.is_enabled === true;
  }, [dataSourceConfigs, chartConfigs]);

  const getPluginConfig = useCallback((
    pluginType: 'datasource' | 'chart',
    pluginName: string
  ) => {
    const configs = pluginType === 'datasource' ? dataSourceConfigs : chartConfigs;
    return configs.find(c => c.plugin_name === pluginName);
  }, [dataSourceConfigs, chartConfigs]);

  const refreshPlugins = useCallback(async () => {
    await loadConfigurations();
  }, [loadConfigurations]);

  const invalidatePluginCache = useCallback(() => {
    invalidateCache('available-plugins');
    if (effectiveWorkspaceId) {
      invalidateCache(`workspace-configs-${effectiveWorkspaceId}`);
    }
  }, [invalidateCache, effectiveWorkspaceId]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load plugins when workspace changes
  useEffect(() => {
    if (effectiveWorkspaceId) {
      loadConfigurations();
    }
  }, [effectiveWorkspaceId, loadConfigurations]);

  // ============================================================================
  // Memoized Values for Performance
  // ============================================================================

  const memoizedResult = useMemo((): UsePluginsResult => ({
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
    loadConfigurations,
    getDataSourcePlugin,
    getChartPlugin,
    
    // Configuration management
    updatePluginConfig,
    enablePlugin,
    disablePlugin,
    
    // Testing and validation
    testDataSourceConnection,
    validatePluginConfig,
    
    // Statistics and analytics
    getPluginStatistics,
    
    // Helper methods
    getPluginsByCategory,
    isPluginEnabled,
    getPluginConfig,
    
    // Cache management
    invalidatePluginCache,
  }), [
    dataSourcePlugins,
    chartPlugins,
    dataSourceConfigs,
    chartConfigs,
    loading,
    testingConnection,
    error,
    refreshPlugins,
    loadConfigurations,
    getDataSourcePlugin,
    getChartPlugin,
    updatePluginConfig,
    enablePlugin,
    disablePlugin,
    testDataSourceConnection,
    validatePluginConfig,
    getPluginStatistics,
    getPluginsByCategory,
    isPluginEnabled,
    getPluginConfig,
    invalidatePluginCache,
  ]);

  return memoizedResult;
};