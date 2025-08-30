// File: web-application/src/hooks/usePluginConfiguration.ts
import { useState, useCallback, useEffect } from 'react';
import { pluginAPI } from '../services/pluginAPI';
import { useCache } from './useCache';
import { useOptimisticState } from './useOptimisticState';

export interface Plugin {
  name: string;
  displayName: string;
  category: string;
  version: string;
  description?: string;
  configSchema: any;
  plugin_type: 'datasource' | 'chart';
}

export interface PluginConfiguration {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  configuration: any;
  is_enabled: boolean;
  last_used?: Date;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectionTestResult {
  connection_valid: boolean;
  message: string;
  response_time?: number;
  error_code?: string;
}

export const usePluginConfiguration = (workspaceId: string) => {
  // State management
  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [workspaceConfigs, setWorkspaceConfigs] = useState<PluginConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Performance optimizations
  const { getCached, setCached, invalidateCache } = useCache();
  const { optimisticUpdate, rollback } = useOptimisticState();

  // Load available plugins (cached for 1 hour)
  const loadAvailablePlugins = useCallback(async () => {
    const cacheKey = 'available-plugins';
    const cached = getCached(cacheKey);
    
    if (cached) {
      setAvailablePlugins(cached);
      return cached;
    }

    try {
      const plugins = await pluginAPI.getAvailablePlugins();
      setAvailablePlugins(plugins);
      setCached(cacheKey, plugins, 3600); // 1 hour
      return plugins;
    } catch (error) {
      console.error('Failed to load available plugins:', error);
      throw error;
    }
  }, [getCached, setCached]);

  // Load workspace configurations (cached for 5 minutes)
  const loadWorkspaceConfigurations = useCallback(async () => {
    const cacheKey = `workspace-configs-${workspaceId}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
      setWorkspaceConfigs(cached);
      return cached;
    }

    try {
      const configs = await pluginAPI.getWorkspaceConfigurations(workspaceId);
      setWorkspaceConfigs(configs);
      setCached(cacheKey, configs, 300); // 5 minutes
      return configs;
    } catch (error) {
      console.error('Failed to load workspace configurations:', error);
      throw error;
    }
  }, [workspaceId, getCached, setCached]);

  // Load all configurations
  const loadConfigurations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load both in parallel
      await Promise.all([
        loadAvailablePlugins(),
        loadWorkspaceConfigurations()
      ]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  }, [loadAvailablePlugins, loadWorkspaceConfigurations]);

  // Update plugin configuration with optimistic updates
  const updatePluginConfig = useCallback(async (
    pluginType: 'datasource' | 'chart',
    pluginName: string,
    configuration: any,
    isEnabled: boolean
  ) => {
    const updateId = `${pluginName}-${Date.now()}`;
    
    // Optimistic update
    const optimisticConfig = {
      plugin_name: pluginName,
      plugin_type: pluginType,
      configuration,
      is_enabled: isEnabled,
      updated_at: new Date()
    };

    optimisticUpdate(updateId, () => {
      setWorkspaceConfigs(prev => {
        const index = prev.findIndex(c => c.plugin_name === pluginName);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...optimisticConfig };
          return updated;
        } else {
          return [...prev, optimisticConfig as PluginConfiguration];
        }
      });
    });

    try {
      const result = await pluginAPI.updatePluginConfiguration(
        workspaceId,
        pluginType,
        pluginName,
        configuration,
        isEnabled
      );

      // Update with actual result
      setWorkspaceConfigs(prev => {
        const index = prev.findIndex(c => c.plugin_name === pluginName);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = result;
          return updated;
        } else {
          return [...prev, result];
        }
      });

      // Invalidate cache
      invalidateCache(`workspace-configs-${workspaceId}`);

      return result;
    } catch (error) {
      // Rollback optimistic update
      rollback(updateId);
      throw error;
    }
  }, [workspaceId, optimisticUpdate, rollback, invalidateCache]);

  // Test plugin connection
  const testConnection = useCallback(async (
    pluginName: string,
    configuration: any
  ): Promise<ConnectionTestResult> => {
    try {
      return await pluginAPI.testPluginConnection(workspaceId, pluginName, configuration);
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }, [workspaceId]);

  // Load configurations on mount and workspace change
  useEffect(() => {
    if (workspaceId) {
      loadConfigurations();
    }
  }, [workspaceId, loadConfigurations]);

  return {
    availablePlugins,
    workspaceConfigs,
    loading,
    error,
    loadConfigurations,
    updatePluginConfig,
    testConnection
  };
};
