// src/components/builder/ChartCustomizationPanel.tsx
// ENHANCED VERSION - Uses Chart Factory and Plugin Configurations Dynamically

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Slider,
  FormGroup,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ExpandMore, 
  Refresh, 
  Warning, 
  Info, 
  Palette,
  Settings,
  BarChart,
  PieChart as PieChartIcon,
  ShowChart
} from '@mui/icons-material';

import { 
  isNumericType, 
  isCategoricalType, 
  isDateType, 
  getExpectedDataTypes,
  validateFieldType 
} from '@/utils/dataTypeUtils';

import { ChartRegistry } from '@/plugins/charts/registry/ChartRegistry';
import { ChartFactoryService } from '@/services/ChartFactoryService';
import { ConfigMappingService } from '@/plugins/charts/services/ConfigMappingService';
import { ChartConfigHelper } from '@/plugins/charts/helpers/ChartConfigHelper';


// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface ChartCustomizationPanelProps {
  chartType: string;
  chartLibrary: string;
  configuration: any;
  dataColumns?: Array<{
    name: string;
    display_name?: string;
    data_type: string;
  }>;
  onChange: (config: any) => void;
  onReset?: () => void;
  onPreview?: (config: any) => void;
}

interface ConfigSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: any;
  enum?: string[] | { label: string; value: any }[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  items?: any;
  properties?: any;
  group?: string;
  conditional?: {
    field: string;
    value: any;
  };
}

interface ConfigSchema {
  type: string;
  properties: Record<string, ConfigSchemaProperty>;
  required?: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning';
  }>;
}

interface ChartPlugin {
  name: string;
  displayName: string;
  category: string;
  library: string;
  configSchema: ConfigSchema;
  dataRequirements: {
    minColumns: number;
    maxColumns?: number;
    requiredFields: string[];
    optionalFields?: string[];
    supportedTypes: string[];
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ChartCustomizationPanel: React.FC<ChartCustomizationPanelProps> = ({
  chartType,
  chartLibrary,
  configuration,
  dataColumns = [], // Default to empty array
  onChange,
  onReset,
  onPreview
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [chartPlugin, setChartPlugin] = useState<ChartPlugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: []
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'data-mapping': true,
    'appearance': true,
    'behavior': false,
    'advanced': false
  });

  // ADD THIS DEBUG LOG HERE - at the very start of the component
  console.log('🔍 ChartCustomizationPanel Debug:', {
    chartType,
    chartLibrary,
    dataColumns: dataColumns?.length || 'undefined/empty',
    dataColumnsActual: dataColumns,
    configuration
  });

  // ============================================================================
  // CHART PLUGIN LOADING AND CONFIGURATION
  // ============================================================================

  // Check if we have data columns available
  const hasDataColumns = dataColumns && Array.isArray(dataColumns) && dataColumns.length > 0;

  // Generate chart plugin key
  const chartPluginKey = useMemo(() => {
    return `${chartType}`;
  }, [chartType]);

  // Load chart plugin configuration
  useEffect(() => {
    loadChartPlugin();
  }, [chartPluginKey]);

  const loadChartPlugin = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Loading chart plugin: ${chartPluginKey}`);
      
      // Initialize ChartRegistry if not already done
      await ChartRegistry.initialize();
      
      // Get plugin from registry
      const plugin = ChartRegistry.getPlugin(chartPluginKey);
      
      if (plugin) {
        console.log(`✅ Chart plugin loaded:`, plugin);
        setChartPlugin({
          name: plugin.name,
          displayName: plugin.displayName,
          category: plugin.category,
          library: plugin.library,
          configSchema: plugin.configSchema,
          dataRequirements: plugin.dataRequirements
        });
      } else {
        // Fallback: Create basic plugin configuration
        console.warn(`⚠️ Plugin ${chartPluginKey} not found, creating fallback`);
        const fallbackPlugin = createFallbackPlugin(chartType, chartLibrary);
        setChartPlugin(fallbackPlugin);
      }
      
    } catch (err) {
      console.error('❌ Failed to load chart plugin:', err);
      setError(`Failed to load chart configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Create fallback plugin even on error
      const fallbackPlugin = createFallbackPlugin(chartType, chartLibrary);
      setChartPlugin(fallbackPlugin);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  // Safe configuration with dynamic defaults
  const safeConfiguration = useMemo(() => {
    if (configuration && Object.keys(configuration).length > 0) {
      return configuration;
    }

    if (!chartPlugin) {
      return {};
    }

    // Create default configuration from schema
    return ChartConfigHelper.createDefaultConfigurationFromSchema(chartPlugin.configSchema, chartType);
  }, [configuration, chartPlugin, chartType]);

  // Validate configuration when it changes
  useEffect(() => {
    if (chartPlugin && safeConfiguration) {
      validateConfiguration();
    }
  }, [chartPlugin, safeConfiguration]);

  const validateConfiguration = () => {
    if (!chartPlugin) return;

    const errors: ValidationResult['errors'] = [];

    try {
      // Validate using ChartFactoryService if available
      const factoryService = ChartFactoryService.getInstance();
      
      // Validate required fields from schema
      if (chartPlugin.configSchema.required) {
        chartPlugin.configSchema.required.forEach(field => {
          const value = getNestedValue(safeConfiguration, field);
          if (value === undefined || value === null || value === '') {
            errors.push({
              field,
              message: `${chartPlugin.configSchema.properties[field]?.title || field} is required`,
              code: 'REQUIRED_FIELD_MISSING',
              severity: 'error'
            });
          }
        });
      }

      // Validate data field assignments
      validateDataFields(errors);

      // Validate data type compatibility
      validateDataTypes(errors);

    } catch (err) {
      console.error('Validation error:', err);
      errors.push({
        field: 'general',
        message: 'Configuration validation failed',
        code: 'VALIDATION_ERROR',
        severity: 'warning'
      });
    }

    setValidation({ 
      isValid: errors.filter(e => e.severity === 'error').length === 0, 
      errors 
    });
  };

  const validateDataFields = (errors: ValidationResult['errors']) => {
    if (!chartPlugin) return;

    const requiredFields = chartPlugin.dataRequirements.requiredFields || [];
    
    // Check if chart needs field mappings
    if (needsFieldMapping(chartType)) {
      const mappingFields = getRequiredMappingFields(chartType);
      
      mappingFields.forEach(field => {
        const value = getFieldMapping(field);
        if (!value) {
          errors.push({
            field,
            message: `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} field is required`,
            code: 'FIELD_MAPPING_MISSING',
            severity: 'error'
          });
        }
      });
    }
  };

  const validateDataTypes = (errors: ValidationResult['errors']) => {
    if (!chartPlugin || !dataColumns || !Array.isArray(dataColumns)) return;

    // Get field mappings and validate their data types
    const mappings = getFieldMappings();
    
    Object.entries(mappings).forEach(([mappingType, fieldName]) => {
      if (fieldName && typeof fieldName === 'string') {
        const column = dataColumns.find(col => col.name === fieldName);
        if (column) {
          const isValidType = validateFieldType(
            column.data_type, 
            getExpectedDataTypes(mappingType)
          );
          
          if (!isValidType) {
            errors.push({
              field: mappingType,
              message: `${fieldName} (${column.data_type}) may not be suitable for ${mappingType}`,
              code: 'FIELD_TYPE_WARNING',
              severity: 'warning'
            });
          }
        }
      }
    });
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleConfigChange = useCallback((path: string, value: any) => {
    if (!onChange) return;

    try {
      console.log(`🔧 Config change: ${path} =`, value);
      
      const newConfig = { ...safeConfiguration };
      setNestedValue(newConfig, path, value);
      
      // If this is a field mapping, update the fieldAssignments object too
      if (isFieldMappingPath(path)) {
        if (!newConfig.fieldAssignments) {
          newConfig.fieldAssignments = {};
        }
        newConfig.fieldAssignments[path] = value;
      }
      
      onChange(newConfig);
      
      // Trigger preview if available
      if (onPreview) {
        onPreview(newConfig);
      }
      
    } catch (error) {
      console.error('Error in handleConfigChange:', error);
    }
  }, [safeConfiguration, onChange, onPreview]);

  const handleReset = useCallback(() => {
    try {
      if (onReset) {
        onReset();
      } else if (onChange && chartPlugin) {
        const defaultConfig = createDefaultConfigurationFromSchema(
          chartPlugin.configSchema, 
          chartType
        );
        onChange(defaultConfig);
      }
    } catch (error) {
      console.error('Error in handleReset:', error);
    }
  }, [onReset, onChange, chartPlugin, chartType]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ============================================================================
  // FIELD OPTIONS AND MAPPINGS
  // ============================================================================

  const fieldOptions = useMemo(() => {
  if (!dataColumns || !Array.isArray(dataColumns)) {
    console.warn('No dataColumns available for field options');
    return [];
  }

  return dataColumns.map(col => ({
    label: col.display_name,
    value: col.name,
    type: col.data_type,
    isNumeric: isNumericType(col.data_type),
    isCategorical: isCategoricalType(col.data_type),
    isDate: isDateType(col.data_type)
  }));
}, [dataColumns]);

  const getFieldOptionsForMapping = (mappingType: string) => {
    const expectedTypes = getExpectedDataTypes(mappingType);
    
    return fieldOptions.filter(option => 
      expectedTypes.some(type => {
        switch (type) {
          case 'numeric': return option.isNumeric;
          case 'categorical': return option.isCategorical;
          case 'date': return option.isDate;
          default: return true;
        }
      })
    );
  };

  // ============================================================================
  // FORM FIELD RENDERERS
  // ============================================================================

  const renderFormField = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
      // Check conditional rendering
      if (property.conditional) {
        const conditionValue = getNestedValue(safeConfiguration, property.conditional.field);
        if (conditionValue !== property.conditional.value) {
          return null;
        }
      }

      // Force field-selector rendering for axis fields even if type is not explicitly set
      const shouldRenderAsFieldSelector = 
        property.type === 'selector' ||
        key === 'xField' || key === 'yField' ||
        key === 'x-axis' || key === 'y-axis' ||
        key.includes('Field') && (key.includes('x') || key.includes('y') || key.includes('X') || key.includes('Y'));
        // Add more comprehensive y-axis detection
        key.includes('yAxis') || key.includes('Y-Axis') || key.includes('y_axis') ||
        key === 'valueField' || key === 'value' || // Common aliases for y-axis
        property.title?.toLowerCase().includes('y-axis') ||
        property.title?.toLowerCase().includes('value');

      if (shouldRenderAsFieldSelector) {
        return renderFieldSelector(key, property, currentValue);
      }

      switch (property.type) {
        case 'string':
          return renderStringField(key, property, currentValue);
        case 'number':
          return renderNumberField(key, property, currentValue);
        case 'boolean':
          return renderBooleanField(key, property, currentValue);
        case 'color':
          return renderColorField(key, property, currentValue);
        case 'select':
        case 'enum':
          return renderSelectField(key, property, currentValue);
        case 'range':
          return renderRangeField(key, property, currentValue);
        case 'array':
          return renderArrayField(key, property, currentValue);
        default:
          return renderGenericField(key, property, currentValue);
      }
    };
  
  
  const renderFieldSelector = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
  // Improve mapping type detection for axis fields
  let mappingType = 'any';
  
  // Enhanced detection for axis fields
  if (key === 'xField' || key === 'x-axis' || key.includes('xAxis') || key.includes('X-Axis') || key.includes('x_axis')) {
      mappingType = 'x-axis';
    } else if (
      key === 'yField' || 
      key === 'y-axis' || 
      key.includes('yAxis') || 
      key.includes('Y-Axis') || 
      key.includes('y_axis') ||
      key === 'valueField' ||
      key === 'value'
    ) {
      mappingType = 'y-axis';
    }
      
  const options = getFieldOptionsForMapping(mappingType);
  
  // Show warning if no data columns available
  if (!dataColumns || !Array.isArray(dataColumns) || dataColumns.length === 0) {
    return (
      <Box key={key}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {property.title || key}
        </Typography>
        <Alert severity="warning" sx={{ mt: 1 }}>
          No data columns available. Please select a dataset first.
        </Alert>
      </Box>
    );
  }
  
  return (
    <FormControl fullWidth size="small" key={key}>
      <InputLabel>{property.title || key}</InputLabel>
      <Select
        value={currentValue || ''}
        label={property.title || key}
        onChange={(e) => handleConfigChange(key, e.target.value)}
      >
        <MenuItem value="">
          <em>Select field...</em>
        </MenuItem>
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            <Box display="flex" justifyContent="space-between" width="100%">
              <span>{option.label}</span>
              <Chip 
                label={option.type} 
                size="small" 
                variant="outlined"
                color={option.isNumeric ? 'primary' : option.isCategorical ? 'secondary' : 'default'}
                sx={{ ml: 1, fontSize: '0.7rem', height: '20px' }}
              />
            </Box>
          </MenuItem>
        ))}
      </Select>
      {property.description && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
          {property.description}
        </Typography>
      )}
    </FormControl>
  );
};

  const renderStringField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <TextField
      key={key}
      fullWidth
      size="small"
      label={property.title || key}
      value={currentValue || property.default || ''}
      onChange={(e) => handleConfigChange(key, e.target.value)}
      helperText={property.description}
      multiline={property.title?.toLowerCase().includes('description') || key.toLowerCase().includes('description')}
      rows={property.title?.toLowerCase().includes('description') ? 3 : 1}
    />
  );

  const renderNumberField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <TextField
      key={key}
      fullWidth
      size="small"
      type="number"
      label={property.title || key}
      value={currentValue ?? property.default ?? 0}
      inputProps={{
        min: property.minimum,
        max: property.maximum,
      }}
      onChange={(e) => handleConfigChange(key, Number(e.target.value))}
      helperText={property.description}
    />
  );

  const renderBooleanField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <FormControlLabel
      key={key}
      control={
        <Switch
          checked={currentValue ?? property.default ?? false}
          onChange={(e) => handleConfigChange(key, e.target.checked)}
        />
      }
      label={
        <Box>
          <Typography variant="body2">{property.title || key}</Typography>
          {property.description && (
            <Typography variant="caption" color="textSecondary">
              {property.description}
            </Typography>
          )}
        </Box>
      }
    />
  );

  const renderColorField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <Box key={key}>
      <Typography variant="body2" gutterBottom>
        {property.title || key}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <input
          type="color"
          value={currentValue || property.default || '#1976d2'}
          onChange={(e) => handleConfigChange(key, e.target.value)}
          style={{ width: 40, height: 32, border: 'none', borderRadius: 4 }}
        />
        <TextField
          size="small"
          value={currentValue || property.default || '#1976d2'}
          onChange={(e) => handleConfigChange(key, e.target.value)}
          sx={{ flex: 1 }}
        />
      </Box>
      {property.description && (
        <Typography variant="caption" color="textSecondary">
          {property.description}
        </Typography>
      )}
    </Box>
  );

  const renderSelectField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <FormControl fullWidth size="small" key={key}>
      <InputLabel>{property.title || key}</InputLabel>
      <Select
        value={currentValue || property.default || ''}
        label={property.title || key}
        onChange={(e) => handleConfigChange(key, e.target.value)}
      >
        {(property.enum || []).map((option, index) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          
          return (
            <MenuItem key={index} value={optionValue}>
              {optionLabel}
            </MenuItem>
          );
        })}
      </Select>
      {property.description && (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
          {property.description}
        </Typography>
      )}
    </FormControl>
  );

  const renderRangeField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <Box key={key}>
      <Typography variant="body2" gutterBottom>
        {property.title || key}: {currentValue ?? property.default ?? 0}
      </Typography>
      <Slider
        value={currentValue ?? property.default ?? 0}
        onChange={(_, value) => handleConfigChange(key, value)}
        min={property.minimum || 0}
        max={property.maximum || 100}
        step={1}
        valueLabelDisplay="auto"
      />
      {property.description && (
        <Typography variant="caption" color="textSecondary">
          {property.description}
        </Typography>
      )}
    </Box>
  );

  const renderArrayField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <TextField
      key={key}
      fullWidth
      size="small"
      label={property.title || key}
      value={Array.isArray(currentValue) ? currentValue.join(', ') : currentValue || ''}
      onChange={(e) => {
        const arrayValue = e.target.value.split(',').map(v => v.trim()).filter(v => v);
        handleConfigChange(key, arrayValue);
      }}
      helperText={property.description || 'Enter comma-separated values'}
      multiline
    />
  );

  const renderGenericField = (key: string, property: ConfigSchemaProperty, currentValue: any) => (
    <TextField
      key={key}
      fullWidth
      size="small"
      label={property.title || key}
      value={typeof currentValue === 'object' ? JSON.stringify(currentValue) : (currentValue || '')}
      onChange={(e) => {
        try {
          const parsed = JSON.parse(e.target.value);
          handleConfigChange(key, parsed);
        } catch {
          handleConfigChange(key, e.target.value);
        }
      }}
      multiline={typeof currentValue === 'object'}
      rows={typeof currentValue === 'object' ? 3 : 1}
      helperText={property.description}
    />
  );

  // ============================================================================
  // CONFIGURATION SECTION BUILDERS
  // ============================================================================

  const buildConfigurationSections = () => {
    if (!chartPlugin?.configSchema?.properties) {
      return {};
    }

    const sections: Record<string, ConfigSchemaProperty[]> = {
      'data-mapping': [],
      'appearance': [],
      'behavior': [],
      'advanced': []
    };

    Object.entries(chartPlugin.configSchema.properties).forEach(([key, property]) => {
      const sectionKey = getSectionForProperty(key, property);
      sections[sectionKey].push({ ...property, key } as ConfigSchemaProperty & { key: string });
    });

    return sections;
  };

  const getSectionForProperty = (key: string, property: ConfigSchemaProperty): string => {
    // Use explicit group if provided
    if (property.group) {
      return property.group;
    }

    // Categorize by key patterns
    if (key.includes('Field') || key.includes('field') || key === 'xField' || key === 'yField') {
      return 'data-mapping';
    }
    
    if (key.includes('color') || key.includes('Color') || key === 'colors' || key.includes('style')) {
      return 'appearance';
    }
    
    if (key.includes('animation') || key.includes('interaction') || key.includes('zoom')) {
      return 'behavior';
    }
    
    if (key.includes('title') || key.includes('legend') || key.includes('show')) {
      return 'appearance';
    }
    
    return 'advanced';
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  // Helper functions for configuration management
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) return obj;
    
    const target = keys.reduce((current, key) => {
      if (current[key] === undefined) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
    return obj;
  };

  const needsFieldMapping = (type: string): boolean => {
    const mappingCharts = ['bar', 'line', 'scatter', 'area', 'column'];
    return mappingCharts.includes(type.toLowerCase());
  };

  const getRequiredMappingFields = (type: string): string[] => {
    switch (type.toLowerCase()) {
      case 'bar':
      case 'line':
      case 'scatter':
      case 'area':
      case 'column':
        return ['xField', 'yField'];
      case 'pie':
      case 'doughnut':
        return ['nameField', 'valueField'];
      default:
        return [];
    }
  };

  const getFieldMapping = (field: string): string | null => {
    return safeConfiguration[field] || 
           safeConfiguration.fieldAssignments?.[field] || 
           null;
  };

  const getFieldMappings = (): Record<string, string> => {
    const mappings: Record<string, string> = {};
    const fields = getRequiredMappingFields(chartType);
    
    fields.forEach(field => {
      const value = getFieldMapping(field);
      if (value) {
        mappings[field] = value;
      }
    });
    
    return mappings;
  };

  const isFieldMappingPath = (path: string): boolean => {
    return path.includes('Field') || path.includes('field');
  };

  // ============================================================================
  // FALLBACK AND DEFAULT CONFIGURATIONS
  // ============================================================================

  const createFallbackPlugin = (chartType: string, chartLibrary: string): ChartPlugin => {
    return {
      name: `${chartLibrary}-${chartType}`,
      displayName: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
      category: 'basic',
      library: chartLibrary,
      configSchema: ChartConfigHelper.createDefaultConfigSchema(chartType),
      dataRequirements: {
        minColumns: 1,
        maxColumns: 10,
        requiredFields: [],
        supportedTypes: ['string', 'number']
      }
    };
  };

  const createDefaultConfigurationFromSchema = (schema: ConfigSchema, chartType: string) => {
    const config: Record<string, any> = {
      chartType,
      fieldAssignments: {}
    };

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, property]) => {
        if (property.default !== undefined) {
          config[key] = property.default;
        }
      });
    }

    return config;
  };

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
        <CircularProgress size={32} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading {chartType} configuration...
        </Typography>
      </Paper>
    );
  }

  if (error && !chartPlugin) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={loadChartPlugin} startIcon={<Refresh />}>
          Retry
        </Button>
      </Paper>
    );
  }

  const configSections = buildConfigurationSections();

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            {getChartIcon(chartType)}
            <Box>
              <Typography variant="h6">
                {chartPlugin?.displayName || `${chartType} Chart`}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {chartPlugin?.library} • {chartPlugin?.category}
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" gap={1}>
            {onPreview && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ShowChart />}
                onClick={() => onPreview(safeConfiguration)}
              >
                Preview
              </Button>
            )}
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Box>
        </Box>
        
        {/* Data Columns Warning */}
        {!hasDataColumns && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              No data columns available
            </Typography>
            <Typography variant="body2">
              Please select a dataset to configure field mappings and see chart-specific options.
            </Typography>
          </Alert>
        )}
        
        {/* Validation Status */}
        {validation.errors.length > 0 && (
          <Alert 
            severity={validation.isValid ? "warning" : "error"} 
            sx={{ mt: 2 }}
          >
            <Typography variant="body2" fontWeight="bold">
              {validation.errors.filter(e => e.severity === 'error').length} error(s), {' '}
              {validation.errors.filter(e => e.severity === 'warning').length} warning(s)
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
              {validation.errors.slice(0, 3).map((error, index) => (
                <li key={index}>
                  <Typography variant="body2">
                    {error.message}
                  </Typography>
                </li>
              ))}
              {validation.errors.length > 3 && (
                <li>
                  <Typography variant="body2" color="textSecondary">
                    ... and {validation.errors.length - 3} more
                  </Typography>
                </li>
              )}
            </Box>
          </Alert>
        )}
      </Box>

      {/* Configuration Form */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {Object.entries(configSections).map(([sectionKey, properties]) => {
          if (properties.length === 0) return null;
          
          return (
            <Accordion 
              key={sectionKey}
              expanded={expandedSections[sectionKey]}
              onChange={() => toggleSection(sectionKey)}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  {getSectionIcon(sectionKey)}
                  <Typography variant="subtitle1">
                    {getSectionTitle(sectionKey)}
                  </Typography>
                  <Chip 
                    label={properties.length} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexDirection="column" gap={2}>
                  {properties.map((property: any) => {
                    const currentValue = getNestedValue(safeConfiguration, property.key);
                    return (
                      <Box key={property.key}>
                        {renderFormField(property.key, property, currentValue)}
                      </Box>
                    );
                  })}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Paper>
  );
};

// ============================================================================
// HELPER FUNCTIONS FOR ICONS AND TITLES
// ============================================================================

const getChartIcon = (chartType: string) => {
  switch (chartType.toLowerCase()) {
    case 'bar':
    case 'column':
      return <BarChart color="primary" />;
    case 'pie':
    case 'doughnut':
      return <PieChartIcon color="primary" />;
    case 'line':
    case 'area':
      return <ShowChart color="primary" />;
    default:
      return <BarChart color="primary" />;
  }
};

const getSectionIcon = (sectionKey: string) => {
  switch (sectionKey) {
    case 'data-mapping':
      return <BarChart fontSize="small" />;
    case 'appearance':
      return <Palette fontSize="small" />;
    case 'behavior':
      return <Settings fontSize="small" />;
    case 'advanced':
      return <Settings fontSize="small" />;
    default:
      return <Info fontSize="small" />;
  }
};

const getSectionTitle = (sectionKey: string): string => {
  switch (sectionKey) {
    case 'data-mapping':
      return 'Data Mapping';
    case 'appearance':
      return 'Appearance';
    case 'behavior':
      return 'Behavior';
    case 'advanced':
      return 'Advanced';
    default:
      return sectionKey.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export default ChartCustomizationPanel;