'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  Chip,
  Grid,
  Stack,
  Paper,
  Tabs,
  Tab,
  Alert,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Restore as RestoreIcon,
  Palette as PaletteIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ColorLens as ColorLensIcon
} from '@mui/icons-material';

// ============================================================================
// CORRECT IMPORTS FOR CHART FACTORY
// ============================================================================

// Use the service instead of direct ChartFactory
import ChartFactoryService from '@/services/ChartFactoryService';

// Alternative: Use the hook approach (uncomment if you prefer this)
// import useChartFactory from '@/hooks/useChartFactory';

// Types
import type {
  ChartConfiguration,
  ChartConfigPanelProps
} from '@/types/chart.types';
import type { ColumnDefinition } from '@/types/dataset.types';

// ============================================================================
// INTERFACES
// ============================================================================

interface ConfigSchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: any;
  required?: boolean;
  enum?: string[];
  items?: ConfigSchemaProperty;
  properties?: Record<string, ConfigSchemaProperty>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

interface ConfigSchema {
  type: string;
  properties: Record<string, ConfigSchemaProperty>;
  required?: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// UTILITIES
// ============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ width: '100%' }}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

// Color palettes for easy selection
const COLOR_PALETTES = [
  { name: 'Default', colors: ['#1976d2', '#dc004e', '#388e3c', '#f57c00', '#7b1fa2', '#00796b'] },
  { name: 'Categorical', colors: ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6'] },
  { name: 'Blues', colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd'] },
  { name: 'Warm', colors: ['#d73027', '#f46d43', '#fdae61', '#fee090', '#e0f3f8', '#abd9e9'] },
  { name: 'Dark', colors: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'] }
];

// Default configuration structure
const createDefaultConfiguration = (): ChartConfiguration => ({
  chartType: '',
  library: 'echarts',
  fieldAssignments: {},
  aggregations: {},
  filters: {},
  customConfig: {},
  dimensions: { width: 600, height: 400 }
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChartCustomizationPanel: React.FC<ChartConfigPanelProps> = ({
  chart,
  chartType,
  configuration,
  dataColumns = [],
  onChange,
  onReset
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [activeTab, setActiveTab] = useState(0);
  const [expandedAccordion, setExpandedAccordion] = useState<string>('fields');
  const [chartSchema, setChartSchema] = useState<ConfigSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // ALTERNATIVE: Using the hook approach (uncomment if you prefer this)
  // ============================================================================
  /*
  const {
    isInitialized,
    isInitializing,
    error: factoryError,
    getConfigSchema
  } = useChartFactory();
  */

  // ============================================================================
  // SAFE CONFIGURATION HANDLING
  // ============================================================================

  // Ensure configuration has safe structure
  const safeConfiguration = useMemo(() => {
    if (!configuration) {
      return createDefaultConfiguration();
    }

    return {
      ...createDefaultConfiguration(),
      ...configuration,
      fieldAssignments: configuration.fieldAssignments || {},
      customConfig: configuration.customConfig || {},
      dimensions: configuration.dimensions || { width: 600, height: 400 }
    };
  }, [configuration]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadSchema();
  }, [chartType]);

  // Initialize configuration if it's incomplete
  useEffect(() => {
    if (onChange && (!configuration || !configuration.fieldAssignments)) {
      onChange(safeConfiguration);
    }
  }, [configuration, onChange, safeConfiguration]);

  // ============================================================================
  // SCHEMA LOADING - FIXED VERSION
  // ============================================================================

  const loadSchema = async () => {
    setLoading(true);
    setError(null);

    try {
      // Always create a fallback schema first
      const fallbackSchema = generateFallbackSchema(chartType);
      setChartSchema(fallbackSchema);

      if (!chartType) {
        setLoading(false);
        return;
      }

      // Try to get enhanced schema from ChartFactoryService
      try {
        const library = safeConfiguration.library || 'echarts';
        console.log(`Loading schema for ${chartType} (${library})`);
        
        // ✅ FIXED: Use ChartFactoryService instead of ChartFactory
        const schema = await ChartFactoryService.getConfigSchema(chartType, library);
        
        if (schema && Object.keys(schema).length > 0) {
          console.log('✅ Got schema from ChartFactoryService:', schema);
          
          // Convert the schema to our expected format if needed
          const enhancedSchema: ConfigSchema = {
            type: 'object',
            properties: schema.properties || schema,
            required: schema.required || []
          };
          
          // Merge with fallback schema to ensure we have all basic properties
          const mergedSchema = {
            ...fallbackSchema,
            properties: {
              ...fallbackSchema.properties,
              ...enhancedSchema.properties
            },
            required: [
              ...(fallbackSchema.required || []),
              ...(enhancedSchema.required || [])
            ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
          };
          
          setChartSchema(mergedSchema);
          console.log('✅ Using enhanced merged schema');
        } else {
          console.log('⚠️ No enhanced schema available, using fallback');
        }
      } catch (serviceError) {
        console.warn('ChartFactoryService error, using fallback schema:', serviceError);
        // Keep the fallback schema that was already set
      }

      // ============================================================================
      // ALTERNATIVE APPROACH: Using the hook (uncomment if you prefer this)
      // ============================================================================
      /*
      if (isInitialized) {
        try {
          const schema = await getConfigSchema(chartType, library);
          if (schema && Object.keys(schema).length > 0) {
            // Process the schema similar to above
            setChartSchema(processedSchema);
          }
        } catch (hookError) {
          console.warn('useChartFactory error:', hookError);
        }
      }
      */

    } catch (err) {
      console.error('Failed to load chart schema:', err);
      setError(`Failed to load chart configuration: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Still provide a basic schema
      setChartSchema(generateFallbackSchema(chartType));
    } finally {
      setLoading(false);
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
          default: ''
        },
        showLegend: {
          type: 'boolean',
          title: 'Show Legend',
          default: true
        },
        colors: {
          type: 'array',
          title: 'Color Palette',
          items: { type: 'string' },
          default: ['#1976d2', '#dc004e', '#388e3c', '#f57c00']
        }
      },
      required: []
    };

    // Add chart-specific properties based on type
    switch (type?.toLowerCase()) {
      case 'bar':
      case 'column':
        baseSchema.properties = {
          ...baseSchema.properties,
          xField: {
            type: 'string',
            title: 'X-Axis Field'
          },
          yField: {
            type: 'string',
            title: 'Y-Axis Field'
          },
          showGrid: {
            type: 'boolean',
            title: 'Show Grid',
            default: true
          }
        };
        baseSchema.required = ['xField', 'yField'];
        break;

      case 'pie':
      case 'doughnut':
        baseSchema.properties = {
          ...baseSchema.properties,
          nameField: {
            type: 'string',
            title: 'Category Field'
          },
          valueField: {
            type: 'string',
            title: 'Value Field'
          },
          innerRadius: {
            type: 'number',
            title: 'Inner Radius',
            minimum: 0,
            maximum: 100,
            default: type === 'doughnut' ? 40 : 0
          }
        };
        baseSchema.required = ['nameField', 'valueField'];
        break;

      case 'line':
        baseSchema.properties = {
          ...baseSchema.properties,
          xField: {
            type: 'string',
            title: 'X-Axis Field'
          },
          yField: {
            type: 'string',
            title: 'Y-Axis Field'
          },
          smooth: {
            type: 'boolean',
            title: 'Smooth Lines',
            default: false
          },
          showPoints: {
            type: 'boolean',
            title: 'Show Data Points',
            default: true
          }
        };
        baseSchema.required = ['xField', 'yField'];
        break;

      default:
        baseSchema.properties = {
          ...baseSchema.properties,
          xField: {
            type: 'string',
            title: 'X-Axis Field'
          },
          yField: {
            type: 'string',
            title: 'Y-Axis Field'
          }
        };
        baseSchema.required = ['xField', 'yField'];
        break;
    }

    return baseSchema;
  };

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
    return fieldOptions.filter(f => f.type === 'number' || f.type === 'integer');
  }, [fieldOptions]);

  // ============================================================================
  // HANDLERS - with improved error handling and null safety
  // ============================================================================

  const handleConfigChange = useCallback((path: string, value: any) => {
    if (!safeConfiguration || !onChange) return;

    try {
      console.log('Config change:', path, value);
      const pathParts = path.split('.');
      const newConfig = { ...safeConfiguration };
      
      let current: any = newConfig;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      current[pathParts[pathParts.length - 1]] = value;
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
        fieldAssignments: {
          ...(safeConfiguration.fieldAssignments || {}), // ✅ Safe access with fallback
          [field]: value
        }
      };
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
        // Reset to default configuration
        onChange(createDefaultConfiguration());
      }
    } catch (error) {
      console.error('Error in handleReset:', error);
    }
  }, [onReset, onChange]);

  // ============================================================================
  // FORM FIELD RENDERERS
  // ============================================================================

  const renderFormField = (key: string, property: ConfigSchemaProperty, value: any) => {
    try {
      const currentValue = value !== undefined ? value : property.default;

      switch (property.type) {
        case 'string':
          if (property.enum) {
            return (
              <FormControl fullWidth key={key}>
                <InputLabel>{property.title || key}</InputLabel>
                <Select
                  value={currentValue || ''}
                  onChange={(e) => handleConfigChange(`customConfig.${key}`, e.target.value)}
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

          // Field selection for chart data fields
          if (key.toLowerCase().includes('field')) {
            const options = key.toLowerCase().includes('value') || key.toLowerCase().includes('y') 
              ? numericFieldOptions 
              : fieldOptions;

            return (
              <FormControl fullWidth key={key}>
                <InputLabel>{property.title || key}</InputLabel>
                <Select
                  value={safeConfiguration?.fieldAssignments?.[key] || ''} // ✅ Safe access
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  label={property.title || key}
                >
                  <MenuItem value="">
                    <em>Select field</em>
                  </MenuItem>
                  {options.map(field => (
                    <MenuItem key={field.value} value={field.value}>
                      {field.label} ({field.type})
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
              onChange={(e) => handleConfigChange(`customConfig.${key}`, e.target.value)}
              helperText={property.description}
              inputProps={{
                minLength: property.minLength,
                maxLength: property.maxLength
              }}
            />
          );

        case 'number':
          if (property.minimum !== undefined && property.maximum !== undefined) {
            return (
              <Box key={key}>
                <Typography gutterBottom>
                  {property.title || key}
                </Typography>
                <Slider
                  value={currentValue || property.default || property.minimum}
                  onChange={(_, value) => handleConfigChange(`customConfig.${key}`, value)}
                  min={property.minimum}
                  max={property.maximum}
                  valueLabelDisplay="auto"
                  marks
                />
                {property.description && (
                  <Typography variant="caption" color="textSecondary">
                    {property.description}
                  </Typography>
                )}
              </Box>
            );
          }

          return (
            <TextField
              key={key}
              fullWidth
              type="number"
              label={property.title || key}
              value={currentValue || ''}
              onChange={(e) => handleConfigChange(`customConfig.${key}`, parseFloat(e.target.value) || 0)}
              helperText={property.description}
              inputProps={{
                min: property.minimum,
                max: property.maximum
              }}
            />
          );

        case 'boolean':
          return (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={currentValue !== undefined ? currentValue : property.default || false}
                  onChange={(e) => handleConfigChange(`customConfig.${key}`, e.target.checked)}
                />
              }
              label={property.title || key}
            />
          );

        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering form field:', key, error);
      return (
        <Alert severity="error" key={key}>
          Error rendering field: {key}
        </Alert>
      );
    }
  };

  const renderColorPalette = (currentColors?: string[]) => {
    const colors = currentColors || COLOR_PALETTES[0].colors;

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Color Palette
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {COLOR_PALETTES.map(palette => (
              <Button
                key={palette.name}
                size="small"
                variant="outlined"
                onClick={() => handleConfigChange('customConfig.colors', palette.colors)}
                sx={{
                  minWidth: 'auto',
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack direction="row" spacing={0.5}>
                  {palette.colors.slice(0, 3).map((color, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 12,
                        height: 12,
                        bgcolor: color,
                        borderRadius: 0.5
                      }}
                    />
                  ))}
                </Stack>
              </Button>
            ))}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {(currentColors || []).map((color, index) => (
              <Chip
                key={index}
                label={color}
                sx={{ bgcolor: color, color: 'white', fontSize: '0.7rem' }}
                size="small"
                onDelete={() => {
                  const newColors = [...(currentColors || [])];
                  newColors.splice(index, 1);
                  handleConfigChange('customConfig.colors', newColors);
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Box>
    );
  };

  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================

  const renderFieldAssignments = () => {
    if (!chartSchema) return null;

    const fieldProperties = Object.entries(chartSchema.properties).filter(
      ([key, property]) => key.toLowerCase().includes('field')
    );

    if (fieldProperties.length === 0) return null;

    return (
      <Accordion 
        expanded={expandedAccordion === 'fields'} 
        onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? 'fields' : '')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Data Fields</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {fieldProperties.map(([key, property]) => (
              <Grid item xs={12} sm={6} key={key}>
                {renderFormField(key, property, safeConfiguration?.fieldAssignments?.[key])} {/* ✅ Safe access */}
              </Grid>
            ))}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderChartOptions = () => {
    if (!chartSchema) return null;

    const optionProperties = Object.entries(chartSchema.properties).filter(
      ([key]) => !key.toLowerCase().includes('field') && key !== 'title' && key !== 'colors'
    );

    if (optionProperties.length === 0) return null;

    return (
      <Accordion 
        expanded={expandedAccordion === 'options'} 
        onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? 'options' : '')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Chart Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {optionProperties.map(([key, property]) => 
              renderFormField(key, property, safeConfiguration?.customConfig?.[key]) // ✅ Safe access
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderStyling = () => {
    if (!chartSchema) return null;

    return (
      <Stack spacing={3}>
        <TextField
          fullWidth
          label="Chart Title"
          value={safeConfiguration?.customConfig?.title || ''}
          onChange={(e) => handleConfigChange('customConfig.title', e.target.value)}
        />

        {chartSchema.properties.colors && renderColorPalette(safeConfiguration?.customConfig?.colors)}

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Width"
              type="number"
              value={safeConfiguration?.dimensions?.width || 600}
              onChange={(e) => handleConfigChange('dimensions.width', parseInt(e.target.value) || 600)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Height"
              type="number"
              value={safeConfiguration?.dimensions?.height || 400}
              onChange={(e) => handleConfigChange('dimensions.height', parseInt(e.target.value) || 400)}
            />
          </Grid>
        </Grid>
      </Stack>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Safety check for configuration
  if (!safeConfiguration) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No configuration available
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          Loading chart configuration...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Configure {chartType?.charAt(0).toUpperCase() + chartType?.slice(1)} Chart
        </Typography>
        <Button
          startIcon={<RestoreIcon />}
          onClick={handleReset}
          size="small"
          color="secondary"
        >
          Reset
        </Button>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Using fallback configuration for {chartType} chart: {error}
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Fields" />
        <Tab label="Options" />
        <Tab label="Style" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        {renderFieldAssignments()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderChartOptions()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderStyling()}
      </TabPanel>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={`Type: ${chartType}`} size="small" />
        <Chip label={`Library: ${safeConfiguration?.library || 'echarts'}`} size="small" />
        {dataColumns.length > 0 && (
          <Chip label={`${dataColumns.length} fields available`} size="small" />
        )}
        {chartSchema?.required && chartSchema.required.length > 0 && (
          <Chip 
            label={`${chartSchema.required.length} required fields`} 
            size="small" 
            color="warning"
          />
        )}
        <Chip 
          label={chartSchema ? 'Schema loaded' : 'Default schema'} 
          size="small" 
          color={chartSchema ? 'success' : 'default'}
        />
      </Box>
    </Box>
  );
};

export default ChartCustomizationPanel;