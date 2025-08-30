// File: ./src/components/admin/PluginConfigDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';

// Interfaces
interface PluginConfig {
  plugin_name: string;
  plugin_type: 'datasource' | 'chart';
  display_name: string;
  category: string;
  version: string;
  description?: string;
  configuration: Record<string, any>;
  is_enabled: boolean;
  config_schema: ConfigSchema;
}

interface ConfigSchema {
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select';
  title?: string;
  description?: string;
  default?: any;
  required?: boolean;
  format?: string;
  minimum?: number;
  maximum?: number;
  options?: Array<{ label: string; value: any } | string>;
}

interface TestResult {
  success: boolean;
  message: string;
}

interface PluginConfigDialogProps {
  open: boolean;
  plugin?: PluginConfig;
  onClose: () => void;
  onSave: (plugin: PluginConfig, configuration: Record<string, any>) => Promise<void>;
  onTest: (plugin: PluginConfig, configuration: Record<string, any>) => Promise<void>;
}

const PluginConfigDialog: React.FC<PluginConfigDialogProps> = ({
  open,
  plugin,
  onClose,
  onSave,
  onTest
}) => {
  // State with proper typing
  const [configuration, setConfiguration] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (plugin) {
      setConfiguration(plugin.configuration || {});
      setTestResult(null);
    } else {
      setConfiguration({});
      setTestResult(null);
    }
  }, [plugin]);

  const handleSave = useCallback(async () => {
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
  }, [plugin, configuration, onSave, onClose]);

  const handleTest = useCallback(async () => {
    if (!plugin) return;

    setTesting(true);
    setTestResult(null);
    
    try {
      await onTest(plugin, configuration);
      setTestResult({ success: true, message: 'Connection test successful' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Connection test failed';
      setTestResult({ 
        success: false, 
        message: errorMessage
      });
    } finally {
      setTesting(false);
    }
  }, [plugin, configuration, onTest]);

  const renderConfigField = useCallback((fieldName: string, fieldSchema: SchemaProperty) => {
    const value = configuration[fieldName] ?? fieldSchema.default ?? '';
    
    const handleChange = (newValue: any) => {
      setConfiguration((prev: Record<string, any>) => ({
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
            margin="normal"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            helperText={fieldSchema.description}
            type={fieldSchema.format === 'password' ? 'password' : 'text'}
            required={fieldSchema.required}
          />
        );

      case 'number':
        return (
          <TextField
            key={fieldName}
            label={fieldSchema.title || fieldName}
            fullWidth
            margin="normal"
            type="number"
            value={value}
            onChange={(e) => handleChange(Number(e.target.value))}
            helperText={fieldSchema.description}
            required={fieldSchema.required}
            inputProps={{
              min: fieldSchema.minimum,
              max: fieldSchema.maximum
            }}
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

      case 'select':
        return (
          <FormControl key={fieldName} fullWidth margin="normal">
            <InputLabel>{fieldSchema.title || fieldName}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              required={fieldSchema.required}
              label={fieldSchema.title || fieldName}
            >
              {fieldSchema.options?.map((option, index) => {
                const optionValue = typeof option === 'string' ? option : option.value;
                const optionLabel = typeof option === 'string' ? option : option.label;
                
                return (
                  <MenuItem key={`${optionValue}-${index}`} value={optionValue}>
                    {optionLabel}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        );

      default:
        return (
          <TextField
            key={fieldName}
            label={fieldSchema.title || fieldName}
            fullWidth
            margin="normal"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            helperText={fieldSchema.description}
            required={fieldSchema.required}
          />
        );
    }
  }, [configuration]);

  if (!plugin) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        Configure {plugin.display_name}
      </DialogTitle>
      
      <DialogContent>
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary">
            {plugin.description}
          </Typography>
          <Typography variant="caption" display="block" color="textSecondary">
            Version: {plugin.version} | Type: {plugin.plugin_type} | Category: {plugin.category}
          </Typography>
        </Box>

        {plugin.config_schema?.properties && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuration
            </Typography>
            {Object.entries(plugin.config_schema.properties).map(
              ([fieldName, fieldSchema]) => renderConfigField(fieldName, fieldSchema)
            )}
          </Box>
        )}

        {testResult && (
          <Box mt={2}>
            <Alert severity={testResult.success ? 'success' : 'error'}>
              {testResult.message}
            </Alert>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={saving || testing}>
          Cancel
        </Button>
        
        {plugin.plugin_type === 'datasource' && (
          <Button 
            onClick={handleTest} 
            disabled={testing || saving}
            startIcon={testing ? <CircularProgress size={16} /> : undefined}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        )}
        
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving || testing}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PluginConfigDialog;