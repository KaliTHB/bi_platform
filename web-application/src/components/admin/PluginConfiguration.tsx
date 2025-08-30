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
import { usePluginConfiguration } from '../../hooks/usePluginConfiguration';
import { usePerformanceTracker } from '../../hooks/usePerformanceTracker';

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

// Plugin Card Component (Memoized for performance)
const PluginCard = React.memo<{ plugin: PluginConfig; onToggle: (name: string, type: string, enabled: boolean) => void; onConfigure: (plugin: PluginConfig) => void; onTest: (plugin: PluginConfig, config: any) => void; testResults: Record<string, { success: boolean; message: string }> }>(({
  plugin,
  onToggle,
  onConfigure,
  onTest,
  testResults
}) => {
  const handleToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(plugin.plugin_name, plugin.plugin_type, event.target.checked);
  }, [plugin.plugin_name, plugin.plugin_type, onToggle]);

  const handleConfigure = useCallback(() => {
    onConfigure(plugin);
  }, [plugin, onConfigure]);

  const handleTest = useCallback(() => {
    onTest(plugin, plugin.configuration);
  }, [plugin, onTest]);

  return (
    <Card 
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'elevation 0.2s',
        '&:hover': { elevation: 2 }
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="h3" noWrap>
            {plugin.display_name || plugin.plugin_name}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={plugin.is_enabled}
                onChange={handleToggle}
                size="small"
              />
            }
            label=""
          />
        </Box>
        
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {plugin.description || 'No description available'}
        </Typography>
        
        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <Chip label={plugin.category} size="small" color="primary" variant="outlined" />
          <Chip label={`v${plugin.version}`} size="small" />
          
          {testResults[plugin.plugin_name] && (
            <Tooltip title={testResults[plugin.plugin_name].message}>
              <IconButton size="small">
                {testResults[plugin.plugin_name].success ? (
                  <CheckCircle color="success" />
                ) : (
                  <Error color="error" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardContent>
      
      <CardActions>
        <Button
          size="small"
          startIcon={<Settings />}
          onClick={handleConfigure}
          disabled={!plugin.is_enabled}
        >
          Configure
        </Button>
        
        {plugin.plugin_type === 'datasource' && (
          <Button
            size="small"
            onClick={handleTest}
            disabled={!plugin.is_enabled}
          >
            Test
          </Button>
        )}
      </CardActions>
    </Card>
  );
});

PluginCard.displayName = 'PluginCard';

// Skeleton loader for better UX
const PluginCardSkeleton: React.FC = () => (
  <Card variant="outlined">
    <CardContent>
      <Skeleton variant="text" width="80%" height={32} />
      <Skeleton variant="text" width="60%" height={20} />
      <Box display="flex" gap={1} mt={1}>
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={40} height={24} />
      </Box>
    </CardContent>
    <CardActions>
      <Skeleton variant="rounded" width={80} height={32} />
      <Skeleton variant="rounded" width={60} height={32} />
    </CardActions>
  </Card>
);

// Main Component
export const PluginConfiguration: React.FC<PluginConfigurationProps> = ({ workspaceId }) => {
  usePerformanceTracker('PluginConfiguration');
  
  const {
    availablePlugins,
    workspaceConfigs,
    loading,
    error,
    loadConfigurations,
    updatePluginConfig,
    testConnection
  } = usePluginConfiguration(workspaceId);

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
      const result = await testConnection(plugin.plugin_name, configuration);
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
          message: error instanceof Error ? (error as Error).message : 'Connection test failed'
        }
      }));
    }
  }, [testConnection]);

  const handleRefresh = useCallback(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  // Loading state
  if (loading && !availablePlugins.length) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Plugin Configuration</Typography>
          <Button startIcon={<CircularProgress size={16} />} disabled>
            Loading...
          </Button>
        </Box>
        <Grid container spacing={2}>
          {Array.from({ length: 6 }, (_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <PluginCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={handleRefresh}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Plugin Configuration</Typography>
        <Button startIcon={<Refresh />} onClick={handleRefresh}>
          Refresh
        </Button>
      </Box>

      {/* Plugin Categories */}
      {Object.entries(groupedPlugins).map(([category, plugins]) => (
        <Accordion key={category} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6">{category}</Typography>
              <Chip 
                label={`${plugins.length} plugins`} 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={2}>
              {plugins.map((plugin) => (
                <Grid item xs={12} sm={6} md={4} key={`${plugin.plugin_type}-${plugin.plugin_name}`}>
                  <PluginCard
                    plugin={plugin}
                    onToggle={handleTogglePlugin}
                    onConfigure={handleConfigurePlugin}
                    onTest={handleTestConnection}
                    testResults={testResults}
                  />
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Configuration Dialog - Lazy loaded */}
      <Suspense fallback={<CircularProgress />}>
        <PluginConfigDialog
          open={configDialog.open}
          plugin={configDialog.plugin}
          onClose={() => setConfigDialog({ open: false })}
          onSave={handleSaveConfig}
          onTest={handleTestConnection}
        />
      </Suspense>
    </Box>
  );
};

export default PluginConfiguration;