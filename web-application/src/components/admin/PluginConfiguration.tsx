// File: web-application/src/components/admin/PluginConfiguration.tsx

import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ExpandMore, 
  Settings, 
  CheckCircle, 
  Error, 
  Info,
  Refresh 
} from '@mui/icons-material';
import { usePluginConfiguration } from '../../hooks/usePluginConfiguration';

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

  useEffect(() => {
    loadConfigurations();
  }, [workspaceId]);

  const handleTogglePlugin = async (pluginName: string, pluginType: string, enabled: boolean) => {
    try {
      await updatePluginConfig(pluginType as 'datasource' | 'chart', pluginName, {}, enabled);
      await loadConfigurations();
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  const handleConfigurePlugin = (plugin: PluginConfig) => {
    setConfigDialog({ open: true, plugin });
  };

  const handleSaveConfig = async (plugin: PluginConfig, configuration: any) => {
    try {
      await updatePluginConfig(
        plugin.plugin_type,
        plugin.plugin_name,
        configuration,
        plugin.is_enabled
      );
      setConfigDialog({ open: false });
      await loadConfigurations();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const handleTestConnection = async (plugin: PluginConfig, configuration: any) => {
    if (plugin.plugin_type !== 'datasource') return;

    try {
      const result = await testConnection(plugin.plugin_name, configuration);
      setTestResults(prev => ({
        ...prev,
        [plugin.plugin_name]: {
          success: result.connection_valid,
          message: result.connection_valid ? 'Connection successful' : 'Connection failed'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [plugin.plugin_name]: {
          success: false,
          message: error instanceof Error ? error.message : 'Connection test failed'
        }
      }));
    }
  };

  const getPluginConfig = (pluginName: string, pluginType: string): PluginConfig | undefined => {
    const availablePlugin = availablePlugins.find(p => p.name === pluginName);
    const workspaceConfig = workspaceConfigs.find(c => 
      c.plugin_name === pluginName && c.plugin_type === pluginType
    );

    if (!availablePlugin) return undefined;

    return {
      plugin_name: pluginName,
      plugin_type: pluginType as 'datasource' | 'chart',
      display_name: availablePlugin.displayName,
      category: availablePlugin.category,
      version: availablePlugin.version,
      description: availablePlugin.description,
      configuration: workspaceConfig?.configuration || {},
      is_enabled: workspaceConfig?.is_enabled || false,
      config_schema: availablePlugin.configSchema
    };
  };

  const groupedPlugins = React.useMemo(() => {
    const groups: Record<string, PluginConfig[]> = {};
    
    availablePlugins.forEach(plugin => {
      const config = getPluginConfig(plugin.name, 'datasource') || 
                    getPluginConfig(plugin.name, 'chart');
      
      if (config) {
        if (!groups[config.category]) {
          groups[config.category] = [];
        }
        groups[config.category].push(config);
      }
    });

    return groups;
  }, [availablePlugins, workspaceConfigs]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={loadConfigurations}>
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
        <Button startIcon={<Refresh />} onClick={loadConfigurations}>
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
                <Grid item xs={12} sm={6} md={4} key={plugin.plugin_name}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Typography variant="h6" component="h3">
                          {plugin.display_name}
                        </Typography>
                        <Chip 
                          label={plugin.version} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Box>
                      
                      {plugin.description && (
                        <Typography variant="body2" color="textSecondary" mb={2}>
                          {plugin.description}
                        </Typography>
                      )}
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={plugin.is_enabled}
                              onChange={(e) => handleTogglePlugin(
                                plugin.plugin_name,
                                plugin.plugin_type,
                                e.target.checked
                              )}
                              color="primary"
                            />
                          }
                          label="Enabled"
                        />
                        
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
                        onClick={() => handleConfigurePlugin(plugin)}
                        disabled={!plugin.is_enabled}
                      >
                        Configure
                      </Button>
                      
                      {plugin.plugin_type === 'datasource' && (
                        <Button
                          size="small"
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
      <PluginConfigDialog
        open={configDialog.open}
        plugin={configDialog.plugin}
        onClose={() => setConfigDialog({ open: false })}
        onSave={handleSaveConfig}
        onTest={handleTestConnection}
      />
    </Box>
  );
};

// Plugin Configuration Dialog Component
interface PluginConfigDialogProps {
  open: boolean;
  plugin?: PluginConfig;
  onClose: () => void;
  onSave: (plugin: PluginConfig, configuration: any) => Promise<void>;
  onTest: (plugin: PluginConfig, configuration: any) => Promise<void>;
}

const PluginConfigDialog: React.FC<PluginConfigDialogProps> = ({
  open,
  plugin,
  onClose,
  onSave,
  onTest
}) => {
  const [configuration, setConfiguration] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (plugin) {
      setConfiguration(plugin.configuration || {});
    }
  }, [plugin]);

  const handleSave = async () => {
    if (!plugin) return;

    setSaving(true);
    try {
      await onSave(plugin, configuration);
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!plugin) return;

    setTesting(true);
    try {
      await onTest(plugin, configuration);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const renderConfigField = (fieldName: string, fieldSchema: any) => {
    const value = configuration[fieldName] || '';
    
    const handleChange = (newValue: any) => {
      setConfiguration(prev => ({
        ...prev,
        [fieldName]: newValue
      }));
    };

    switch (fieldSchema.type) {
      case 'string':
        return (
          <TextField
            key={fieldName}
            label={fieldSchema.title || fieldName}
            fullWidth
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            helperText={fieldSchema.description}
            type={fieldSchema.format === 'password' ? 'password' : 'text'}
            required={plugin?.config_schema?.required?.includes(fieldName)}
            margin="normal"
          />
        );
      
      case 'number':
        return (
          <TextField
            key={fieldName}
            label={fieldSchema.title || fieldName}
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
            helperText={fieldSchema.description}
            required={plugin?.config_schema?.required?.includes(fieldName)}
            margin="normal"
          />
        );
      
      case 'boolean':
        return (
          <FormControlLabel
            key={fieldName}
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleChange(e.target.checked)}
              />
            }
            label={fieldSchema.title || fieldName}
          />
        );
      
      default:
        return null;
    }
  };

  if (!plugin) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Configure {plugin.display_name}
      </DialogTitle>
      
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Configure the settings for this {plugin.plugin_type} plugin.
            {plugin.plugin_type === 'datasource' && ' Use the Test button to verify connectivity.'}
          </Typography>
        </Alert>

        {plugin.config_schema?.properties && Object.entries(plugin.config_schema.properties).map(
          ([fieldName, fieldSchema]) => renderConfigField(fieldName, fieldSchema as any)
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={saving || testing}>
          Cancel
        </Button>
        
        {plugin.plugin_type === 'datasource' && (
          <Button 
            onClick={handleTest} 
            disabled={saving || testing}
            color="info"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        )}
        
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving || testing}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};