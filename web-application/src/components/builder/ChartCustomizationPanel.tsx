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
  Chip
} from '@mui/material';
import { ExpandMore, Refresh, Warning } from '@mui/icons-material';

interface ChartCustomizationPanelProps {
  chartType: string;
  configuration: any;
  dataColumns: Array<{
    name: string;
    display_name?: string;
    data_type: string;
  }>;
  onChange: (config: any) => void;
  onReset?: () => void;
}

interface ConfigSchemaProperty {
  type: string;
  title?: string;
  default?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  required?: boolean;
  items?: any;
  properties?: any;
}

interface ConfigSchema {
  type: string;
  properties: Record<string, ConfigSchemaProperty>;
  required: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export const ChartCustomizationPanel: React.FC<ChartCustomizationPanelProps> = ({
  chartType,
  configuration,
  dataColumns,
  onChange,
  onReset
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [chartSchema, setChartSchema] = useState<ConfigSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    data: true,
    axes: true,
    styling: false,
    animation: false
  });

  // Safe configuration with fallback
  const safeConfiguration = useMemo(() => {
    return configuration || createDefaultConfiguration(chartType);
  }, [configuration, chartType]);

  // ============================================================================
  // SCHEMA LOADING AND VALIDATION
  // ============================================================================
  
  useEffect(() => {
    loadChartSchema();
  }, [chartType]);

  useEffect(() => {
    if (chartSchema && safeConfiguration) {
      validateConfiguration();
    }
  }, [chartSchema, safeConfiguration]);

  const loadChartSchema = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Generate schema based on chart type
      const schema = generateFallbackSchema(chartType);
      setChartSchema(schema);
    } catch (err) {
      console.error('Failed to load chart schema:', err);
      setError(`Failed to load configuration schema: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setChartSchema(generateFallbackSchema(chartType));
    } finally {
      setLoading(false);
    }
  };

  const validateConfiguration = () => {
    if (!chartSchema) return;

    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: Array<{ field: string; message: string; code: string }> = [];

    // Validate required fields
    chartSchema.required?.forEach(field => {
      const value = getNestedValue(safeConfiguration, field);
      if (value === undefined || value === null || value === '') {
        errors.push({
          field,
          message: `${field} is required`,
          code: 'REQUIRED_FIELD_MISSING'
        });
      }
    });

    // Validate field assignments for axis fields
    const xAxisField = safeConfiguration['xAxis.field'] || safeConfiguration.xAxis?.field || safeConfiguration.xField;
    const yAxisField = safeConfiguration['yAxis.field'] || safeConfiguration.yAxis?.field || safeConfiguration.yField;

    if (!xAxisField) {
      errors.push({
        field: 'xAxis.field',
        message: 'X-Axis field is required',
        code: 'AXIS_FIELD_MISSING'
      });
    }

    if (!yAxisField) {
      errors.push({
        field: 'yAxis.field', 
        message: 'Y-Axis field is required',
        code: 'AXIS_FIELD_MISSING'
      });
    }

    // Validate field types
    if (xAxisField && !validateFieldType(xAxisField, ['string', 'varchar', 'text', 'date', 'datetime', 'timestamp'])) {
      warnings.push({
        field: 'xAxis.field',
        message: 'X-Axis field should typically be categorical or date type',
        code: 'FIELD_TYPE_WARNING'
      });
    }

    if (yAxisField && !validateFieldType(yAxisField, ['number', 'integer', 'decimal', 'float', 'double', 'bigint'])) {
      errors.push({
        field: 'yAxis.field',
        message: 'Y-Axis field must be numeric',
        code: 'INVALID_FIELD_TYPE'
      });
    }

    setValidation({ isValid: errors.length === 0, errors, warnings });
  };

  const validateFieldType = (fieldName: string, allowedTypes: string[]): boolean => {
    const field = dataColumns.find(col => col.name === fieldName);
    return field ? allowedTypes.some(type => field.data_type.toLowerCase().includes(type.toLowerCase())) : false;
  };

  // ============================================================================
  // CONFIGURATION HANDLERS
  // ============================================================================

  const handleConfigChange = useCallback((path: string, value: any) => {
    if (!safeConfiguration || !onChange) return;

    try {
      console.log('Config change:', path, value);
      const pathParts = path.split('.');
      const newConfig = { ...safeConfiguration };
      
      // Handle nested path configuration
      let current: any = newConfig;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      current[pathParts[pathParts.length - 1]] = value;
      
      // Also set the dot-notation path for compatibility
      newConfig[path] = value;
      
      // Update field assignments for axis fields
      if (path.includes('.field') || path.includes('Field')) {
        newConfig.fieldAssignments = {
          ...newConfig.fieldAssignments,
          [path]: value
        };
        
        // Also update the simplified field mapping for compatibility
        if (path === 'xAxis.field' || path === 'xField') {
          newConfig.xField = value;
          newConfig['xAxis.field'] = value;
          if (!newConfig.xAxis) newConfig.xAxis = {};
          newConfig.xAxis.field = value;
        } else if (path === 'yAxis.field' || path === 'yField') {
          newConfig.yField = value;
          newConfig['yAxis.field'] = value;
          if (!newConfig.yAxis) newConfig.yAxis = {};
          newConfig.yAxis.field = value;
        }
      }
      
      console.log('New config:', newConfig);
      onChange(newConfig);
    } catch (error) {
      console.error('Error in handleConfigChange:', error);
    }
  }, [safeConfiguration, onChange]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    if (!safeConfiguration || !onChange) return;

    try {
      console.log('Field change:', field, value);
      const newConfig = {
        ...safeConfiguration,
        [field]: value,
        fieldAssignments: {
          ...(safeConfiguration.fieldAssignments || {}),
          [field]: value
        }
      };
      
      // Handle nested field assignments and ensure all formats are synchronized
      if (field === 'xAxis.field' || field === 'xField') {
        newConfig.xField = value;
        newConfig['xAxis.field'] = value;
        if (!newConfig.xAxis) newConfig.xAxis = {};
        newConfig.xAxis.field = value;
        newConfig.fieldAssignments['xAxis.field'] = value;
        newConfig.fieldAssignments['xField'] = value;
      } else if (field === 'yAxis.field' || field === 'yField') {
        newConfig.yField = value;
        newConfig['yAxis.field'] = value;
        if (!newConfig.yAxis) newConfig.yAxis = {};
        newConfig.yAxis.field = value;
        newConfig.fieldAssignments['yAxis.field'] = value;
        newConfig.fieldAssignments['yField'] = value;
      } else if (field === 'nameField') {
        newConfig.nameField = value;
        newConfig.fieldAssignments.nameField = value;
      } else if (field === 'valueField') {
        newConfig.valueField = value;
        newConfig.fieldAssignments.valueField = value;
      }
      
      console.log('New field config:', newConfig);
      onChange(newConfig);
    } catch (error) {
      console.error('Error in handleFieldChange:', error);
    }
  }, [safeConfiguration, onChange]);

  const handleReset = useCallback(() => {
    try {
      if (onReset) {
        console.log('Resetting configuration');
        onReset();
      } else if (onChange) {
        onChange(createDefaultConfiguration(chartType));
      }
    } catch (error) {
      console.error('Error in handleReset:', error);
    }
  }, [onReset, onChange, chartType]);

  // ============================================================================
  // FIELD OPTIONS
  // ============================================================================

  const fieldOptions = useMemo(() => {
    return dataColumns.map(col => ({
      value: col.name,
      label: col.display_name || col.name,
      type: col.data_type
    }));
  }, [dataColumns]);

  const numericFieldOptions = useMemo(() => {
    return fieldOptions.filter(f => 
      ['number', 'integer', 'decimal', 'float', 'double', 'bigint'].some(type => 
        f.type.toLowerCase().includes(type)
      )
    );
  }, [fieldOptions]);

  const categoricalFieldOptions = useMemo(() => {
    return fieldOptions.filter(f => 
      ['string', 'varchar', 'text', 'date', 'datetime', 'timestamp'].some(type => 
        f.type.toLowerCase().includes(type)
      )
    );
  }, [fieldOptions]);

  // ============================================================================
  // FORM FIELD RENDERERS
  // ============================================================================

  const renderFieldSelector = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
    const isYAxis = key.includes('yAxis') || key.includes('yField') || key.includes('value');
    const isPieChart = chartType.toLowerCase() === 'pie' || chartType.toLowerCase() === 'doughnut';
    
    let options = fieldOptions;
    if (isYAxis || (isPieChart && key.includes('value'))) {
      options = numericFieldOptions;
    } else if (key.includes('Field') || key.includes('field') || (isPieChart && key.includes('name'))) {
      if (isYAxis) {
        options = numericFieldOptions;
      } else {
        options = categoricalFieldOptions.length > 0 ? categoricalFieldOptions : fieldOptions;
      }
    }

    return (
      <FormControl fullWidth key={key} error={validation.errors.some(e => e.field === key)}>
        <InputLabel>{property.title || property.label || key}</InputLabel>
        <Select
          value={currentValue || ''}
          onChange={(e) => handleFieldChange(key, e.target.value as string)}
          label={property.title || property.label || key}
        >
          <MenuItem value="">
            <em>Select a field</em>
          </MenuItem>
          {options.map(option => (
            <MenuItem key={option.value} value={option.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>{option.label}</Typography>
                <Chip size="small" label={option.type} variant="outlined" />
              </Box>
            </MenuItem>
          ))}
        </Select>
        {validation.errors.find(e => e.field === key) && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
            {validation.errors.find(e => e.field === key)?.message}
          </Typography>
        )}
        {options.length === 0 && (
          <Typography variant="caption" color="warning" sx={{ mt: 0.5 }}>
            No compatible fields available
          </Typography>
        )}
      </FormControl>
    );
  };

  const renderFormField = (key: string, property: ConfigSchemaProperty, value: any) => {
    try {
      const currentValue = value !== undefined ? value : property.default;
      const hasError = validation.errors.some(e => e.field === key);

      // Handle field-selector type or fields containing 'field' or 'Field'
      if (property.type === 'field-selector' || key.toLowerCase().includes('field') || 
          key.includes('Field') || key === 'nameField' || key === 'valueField') {
        return renderFieldSelector(key, property, currentValue);
      }

      switch (property.type) {
        case 'string':
          if (property.enum) {
            return (
              <FormControl fullWidth key={key} error={hasError}>
                <InputLabel>{property.title || key}</InputLabel>
                <Select
                  value={currentValue || ''}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                  label={property.title || key}
                >
                  {property.enum.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          
          return (
            <TextField
              key={key}
              fullWidth
              label={property.title || key}
              value={currentValue || ''}
              onChange={(e) => handleConfigChange(key, e.target.value)}
              error={hasError}
              helperText={hasError ? validation.errors.find(e => e.field === key)?.message : ''}
            />
          );

        case 'number':
          return (
            <TextField
              key={key}
              fullWidth
              type="number"
              label={property.title || key}
              value={currentValue !== undefined ? currentValue : ''}
              onChange={(e) => handleConfigChange(key, Number(e.target.value))}
              inputProps={{
                min: property.minimum,
                max: property.maximum
              }}
              error={hasError}
              helperText={hasError ? validation.errors.find(e => e.field === key)?.message : ''}
            />
          );

        case 'boolean':
          return (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={Boolean(currentValue)}
                  onChange={(e) => handleConfigChange(key, e.target.checked)}
                />
              }
              label={property.title || key}
            />
          );

        case 'color':
          return (
            <TextField
              key={key}
              fullWidth
              type="color"
              label={property.title || key}
              value={currentValue || '#000000'}
              onChange={(e) => handleConfigChange(key, e.target.value)}
              error={hasError}
            />
          );

        default:
          return (
            <TextField
              key={key}
              fullWidth
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
              error={hasError}
              multiline={typeof currentValue === 'object'}
              rows={typeof currentValue === 'object' ? 3 : 1}
            />
          );
      }
    } catch (error) {
      console.error('Error rendering form field:', key, error);
      return null;
    }
  };

  // ============================================================================
  // SCHEMA GENERATION
  // ============================================================================

  const generateFallbackSchema = (type: string): ConfigSchema => {
    const baseSchema: ConfigSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Chart Title',
          default: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`
        }
      },
      required: []
    };

    // Add chart-specific properties based on type
    switch (type?.toLowerCase()) {
      case 'bar':
      case 'column':
      case 'line':
        baseSchema.properties = {
          ...baseSchema.properties,
          'xAxis.field': {
            type: 'field-selector',
            title: 'X-Axis Field',
            required: true
          },
          'yAxis.field': {
            type: 'field-selector',
            title: 'Y-Axis Field',
            required: true
          },
          'xAxis.label': {
            type: 'string',
            title: 'X-Axis Label',
            default: ''
          },
          'yAxis.label': {
            type: 'string',
            title: 'Y-Axis Label',
            default: ''
          },
          showGrid: {
            type: 'boolean',
            title: 'Show Grid',
            default: true
          },
          showLegend: {
            type: 'boolean',
            title: 'Show Legend',
            default: true
          }
        };
        baseSchema.required = ['xAxis.field', 'yAxis.field'];
        break;

      case 'pie':
      case 'doughnut':
        baseSchema.properties = {
          ...baseSchema.properties,
          nameField: {
            type: 'field-selector',
            title: 'Name Field',
            required: true
          },
          valueField: {
            type: 'field-selector',
            title: 'Value Field',
            required: true
          },
          innerRadius: {
            type: 'number',
            title: 'Inner Radius (%)',
            minimum: 0,
            maximum: 80,
            default: type === 'doughnut' ? 40 : 0
          },
          showLabels: {
            type: 'boolean',
            title: 'Show Labels',
            default: true
          }
        };
        baseSchema.required = ['nameField', 'valueField'];
        break;

      default:
        baseSchema.properties = {
          ...baseSchema.properties,
          'xAxis.field': {
            type: 'field-selector',
            title: 'X-Axis Field',
            required: true
          },
          'yAxis.field': {
            type: 'field-selector',
            title: 'Y-Axis Field',
            required: true
          }
        };
        baseSchema.required = ['xAxis.field', 'yAxis.field'];
        break;
    }

    // Add common styling options
    baseSchema.properties = {
      ...baseSchema.properties,
      colors: {
        type: 'array',
        title: 'Color Palette',
        default: ['#1976d2', '#dc004e', '#388e3c', '#f57c00']
      },
      animation: {
        type: 'boolean',
        title: 'Enable Animation',
        default: true
      }
    };

    return baseSchema;
  };

  const createDefaultConfiguration = (type: string) => {
    const config = {
      chartType: type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      fieldAssignments: {},
      colors: ['#1976d2', '#dc004e', '#388e3c', '#f57c00'],
      animation: true,
      showLegend: true
    };

    // Add type-specific defaults
    if (['bar', 'column', 'line'].includes(type.toLowerCase())) {
      Object.assign(config, {
        'xAxis.field': '',
        'yAxis.field': '',
        'xAxis.label': '',
        'yAxis.label': '',
        xAxis: { field: '', label: '' },
        yAxis: { field: '', label: '' },
        xField: '',
        yField: '',
        showGrid: true
      });
    } else if (['pie', 'doughnut'].includes(type.toLowerCase())) {
      Object.assign(config, {
        nameField: '',
        valueField: '',
        innerRadius: type === 'doughnut' ? 40 : 0,
        showLabels: true
      });
    }

    return config;
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const groupPropertiesByGroup = (properties: Record<string, ConfigSchemaProperty>) => {
    const groups: Record<string, Array<[string, ConfigSchemaProperty]>> = {
      general: [],
      data: [],
      axes: [],
      styling: [],
      animation: [],
      other: []
    };

    Object.entries(properties).forEach(([key, prop]) => {
      let group = 'other';
      
      if (key.includes('title') || key.includes('Title')) group = 'general';
      else if (key.includes('field') || key.includes('Field')) group = 'data';
      else if (key.includes('axis') || key.includes('Axis') || key.includes('label') || key.includes('Label')) group = 'axes';
      else if (key.includes('color') || key.includes('Color') || key.includes('show') || key.includes('Show') || key.includes('radius')) group = 'styling';
      else if (key.includes('animation') || key.includes('Animation')) group = 'animation';
      
      groups[group].push([key, prop]);
    });

    return groups;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={loadChartSchema} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!chartSchema) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No configuration schema available for this chart type.
      </Alert>
    );
  }

  const propertyGroups = groupPropertiesByGroup(chartSchema.properties);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Chart Configuration</Typography>
        <Button startIcon={<Refresh />} onClick={handleReset} size="small">
          Reset
        </Button>
      </Box>

      {/* Field Assignment Quick Section */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="subtitle2" gutterBottom>
          Required Field Assignments
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {chartSchema.required?.map(fieldKey => {
            const property = chartSchema.properties[fieldKey];
            const value = getNestedValue(safeConfiguration, fieldKey) ?? safeConfiguration[fieldKey];
            return renderFieldSelector(fieldKey, property, value);
          })}
        </Box>
      </Paper>

      {/* Validation Summary */}
      {!validation.isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Configuration Issues:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {validation.errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Warnings:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Configuration Sections */}
      {Object.entries(propertyGroups).map(([groupName, properties]) => {
        if (properties.length === 0 || groupName === 'data') return null; // Skip data group since it's shown above

        return (
          <Accordion
            key={groupName}
            expanded={expandedSections[groupName] ?? false}
            onChange={(_, expanded) => 
              setExpandedSections(prev => ({ ...prev, [groupName]: expanded }))
            }
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                {groupName}
              </Typography>
              {validation.errors.some(e => 
                properties.some(([key]) => e.field === key)
              ) && (
                <Warning color="error" sx={{ ml: 1 }} />
              )}
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {properties.map(([key, property]) => {
                  const value = getNestedValue(safeConfiguration, key) ?? safeConfiguration[key];
                  return renderFormField(key, property, value);
                })}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Auto-Assignment Helper */}
      {!validation.isValid && dataColumns.length > 0 && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
          <Typography variant="subtitle2" gutterBottom>
            Quick Setup
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const stringFields = dataColumns.filter(col => 
                ['string', 'varchar', 'text'].some(type => col.data_type.toLowerCase().includes(type))
              );
              const numericFields = dataColumns.filter(col => 
                ['number', 'integer', 'decimal', 'float', 'double'].some(type => col.data_type.toLowerCase().includes(type))
              );

              const newConfig = { ...safeConfiguration };
              
              if (['bar', 'column', 'line'].includes(chartType.toLowerCase())) {
                if (stringFields.length > 0 && !newConfig['xAxis.field']) {
                  handleFieldChange('xAxis.field', stringFields[0].name);
                }
                if (numericFields.length > 0 && !newConfig['yAxis.field']) {
                  handleFieldChange('yAxis.field', numericFields[0].name);
                }
              } else if (['pie', 'doughnut'].includes(chartType.toLowerCase())) {
                if (stringFields.length > 0 && !newConfig.nameField) {
                  handleFieldChange('nameField', stringFields[0].name);
                }
                if (numericFields.length > 0 && !newConfig.valueField) {
                  handleFieldChange('valueField', numericFields[0].name);
                }
              }
            }}
          >
            Auto-Assign Fields
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Automatically assigns compatible fields based on data types
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ChartCustomizationPanel;