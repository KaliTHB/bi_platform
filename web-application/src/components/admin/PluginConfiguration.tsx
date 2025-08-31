// File: web-application/src/components/admin/PluginConfiguration.tsx
import React, { useState, useCallback, useMemo, Suspense } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Skeleton
} from '@mui/material';
import { 
  ExpandMore, 
  Settings, 
  CheckCircle, 
  Error, 
  Info,
  Refresh 
} from '@mui/icons-material';
import { FixedSizeList as VirtualList } from 'react-window';
// ✅ Updated import - using the consolidated usePlugins hook
import { usePlugins } from '../../hooks/usePlugins';

// Lazy load the configuration dialog
const PluginConfigDialog = React.lazy(() => import('./PluginConfigDialog'));

interface PluginConfig {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  display_name: string;
  category: string;
  version: string;
  description?: string;
  configuration: any;
  is_enabled: boolean;
  config_schema: any;
}

interface PluginConfigurationProps {
  workspaceId: string;
}

export const PluginConfiguration: React.FC<PluginConfigurationProps> = ({ workspaceId }) => {
  // ✅ Updated hook usage - using the consolidated usePlugins hook
  const {
    dataSourcePlugins,
    chartPlugins,
    dataSourceConfigs,
    chartConfigs,
    loading,
    error,
    updatePluginConfig,
    testDataSourceConnection,
    loadConfigurations
  } = usePlugins(workspaceId);

  // Combine all plugins for easier processing
  const availablePlugins = useMemo(() => [
    ...dataSourcePlugins.map(p => ({ ...p, plugin_type: 'datasource' as const })),
    ...chartPlugins.map(p => ({ ...p, plugin_type: 'chart' as const }))
  ], [dataSourcePlugins, chartPlugins]);

  const workspaceConfigs = useMemo(() => [
    ...dataSourceConfigs,
    ...chartConfigs
  ], [dataSourceConfigs, chartConfigs]);

  const [configDialog, setConfigDialog] = useState<{
    open: boolean;
    plugin?: PluginConfig;
  }>({ open: false });

  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Memoize grouped plugins to prevent unnecessary re-renders
  const groupedPlugins = useMemo(() => {
    const pluginMap = new Map<string, PluginConfig>();
    
    // Create plugin configs from available plugins and workspace configs
    availablePlugins.forEach(plugin => {
      const workspaceConfig = workspaceConfigs.find(
        c => c.plugin_name === plugin.name && c.plugin_type === plugin.plugin_type
      );
      
      pluginMap.set(`${plugin.plugin_type}-${plugin.name}`, {
        plugin_name: plugin.name,
        plugin_type: plugin.plugin_type,
        display_name: plugin.displayName,
        category: plugin.category,
        version: plugin.version,
        description: plugin.description,
        configuration: workspaceConfig?.configuration || {},
        is_enabled: workspaceConfig?.is_enabled || false,
        config_schema: plugin.configSchema
      });
    });

    // Group by category
    const groups: Record<string, PluginConfig[]> = {};
    pluginMap.forEach(plugin => {
      if (!groups[plugin.category]) {
        groups[plugin.category] = [];
      }
      groups[plugin.category].push(plugin);
    });

    return groups;
  }, [availablePlugins, workspaceConfigs]);

  // Handlers with useCallback for performance
  const handleTogglePlugin = useCallback(async (pluginName: string, pluginType: string, enabled: boolean) => {
    try {
      await updatePluginConfig(pluginType as 'datasource' | 'chart', pluginName, {}, enabled);
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  }, [updatePluginConfig]);

  const handleConfigurePlugin = useCallback((plugin: PluginConfig) => {
    setConfigDialog({ open: true, plugin });
  }, []);

  const handleSaveConfig = useCallback(async (plugin: PluginConfig, configuration: any) => {
    try {
      await updatePluginConfig(
        plugin.plugin_type,
        plugin.plugin_name,
        configuration,
        plugin.is_enabled
      );
      setConfigDialog({ open: false });
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }, [updatePluginConfig]);

  const handleTestConnection = useCallback(async (plugin: PluginConfig, configuration: any) => {
    if (plugin.plugin_type !== 'datasource') return;

    try {
      const result = await testDataSourceConnection(plugin.plugin_name, configuration);
      setTestResults(prev => ({
        ...prev,
        [plugin.plugin_name]: {
          success: result.connection_valid,
          message: result.connection_valid ? 'Connection successful' : result.message
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [plugin.plugin_name]: {
          success: false,
          message: error instanceof Error ? (error as any).message : 'Connection test failed'
        }
      }));
    }
  }, [testDataSourceConnection]);

  const handleRefresh = useCallback(async () => {
    try {
      await loadConfigurations();
    } catch (error) {
      console.error('Failed to refresh plugins:', error);
    }
  }, [loadConfigurations]);

  // Loading state
  if (loading) {
    return (
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Plugin Configuration</Typography>
          <Skeleton variant="rectangular" width={120} height={36} />
        </Box>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleRefresh}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Plugin Configuration</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {/* Plugin Categories */}
      {Object.entries(groupedPlugins).map(([category, plugins]) => (
        <Accordion key={category} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
              {category} ({plugins.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {plugins.map((plugin) => (
                <Grid item xs={12} sm={6} md={4} key={`${plugin.plugin_type}-${plugin.plugin_name}`}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" component="div">
                          {plugin.display_name}
                        </Typography>
                        <Chip
                          label={plugin.plugin_type}
                          size="small"
                          color={plugin.plugin_type === 'datasource' ? 'primary' : 'secondary'}
                        />
                      </Box>
                      
                      {plugin.description && (
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {plugin.description}
                        </Typography>
                      )}
                      
                      <Typography variant="caption" color="text.secondary">
                        Version: {plugin.version}
                      </Typography>

                      {/* Connection Test Results */}
                      {testResults[plugin.plugin_name] && (
                        <Alert 
                          severity={testResults[plugin.plugin_name].success ? 'success' : 'error'}
                          sx={{ mt: 1, fontSize: '0.75rem' }}
                        >
                          {testResults[plugin.plugin_name].message}
                        </Alert>
                      )}
                    </CardContent>
                    
                    <CardActions>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={plugin.is_enabled}
                            onChange={(e) => handleTogglePlugin(
                              plugin.plugin_name, 
                              plugin.plugin_type, 
                              e.target.checked
                            )}
                          />
                        }
                        label="Enabled"
                      />
                      
                      <Box sx={{ flexGrow: 1 }} />
                      
                      <Tooltip title="Configure Plugin">
                        <IconButton 
                          size="small" 
                          onClick={() => handleConfigurePlugin(plugin)}
                          disabled={!plugin.is_enabled}
                        >
                          <Settings />
                        </IconButton>
                      </Tooltip>
                      
                      {plugin.plugin_type === 'datasource' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleTestConnection(plugin, plugin.configuration)}
                          disabled={!plugin.is_enabled}
                        >
                          Test
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Configuration Dialog */}
      {configDialog.open && configDialog.plugin && (
        <Suspense fallback={<CircularProgress />}>
          <PluginConfigDialog
            open={configDialog.open}
            plugin={configDialog.plugin}
            onClose={() => setConfigDialog({ open: false })}
            onSave={(config) => handleSaveConfig(configDialog.plugin!, config)}
            onTest={(config) => handleTestConnection(configDialog.plugin!, config)}
          />
        </Suspense>
      )}
    </Box>
  );
};