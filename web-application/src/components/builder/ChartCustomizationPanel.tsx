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

// Chart Factory and Registry - with error handling
let ChartFactory: any = null;
let ChartRegistry: any = null;

// Safe imports with fallbacks
try {
  ChartFactory = require('@/plugins/charts/factory/ChartFactory').ChartFactory;
} catch (e) {
  console.warn('ChartFactory not available:', e.message);
}

try {
  ChartRegistry = require('@/plugins/charts/registry/ChartRegistry').ChartRegistry;
} catch (e) {
  console.warn('ChartRegistry not available:', e.message);
}

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
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadChartSchema();
  }, [chartType, configuration?.library]);

  // ============================================================================
  // SCHEMA LOADING
  // ============================================================================

  const loadChartSchema = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading chart schema for type:', chartType);
      
      // Always create default schema first as fallback
      const defaultSchema = createDefaultSchema(chartType);
      console.log('Created default schema:', defaultSchema);
      setChartSchema(defaultSchema);

      // Try to get enhanced schema from ChartFactory (optional)
      try {
        // Check if ChartFactory is available
        if (ChartFactory && typeof ChartFactory.isReady === 'function') {
          console.log('ChartFactory available, checking if ready...');
          
          // Try to initialize if not ready
          if (!ChartFactory.isReady()) {
            console.log('ChartFactory not ready, initializing...');
            await ChartFactory.initialize().catch((initError: any) => {
              // Initialization failed, but we have fallback schema
              console.warn('ChartFactory initialization failed:', initError);
            });
          }

          // If factory is ready, try to get enhanced schema
          if (ChartFactory.isReady && ChartFactory.isReady()) {
            console.log('ChartFactory ready, getting charts...');
            const library = configuration?.library || chart?.chart_library || 'echarts';
            const chartKey = `${library}-${chartType}`;
            console.log('Looking for chart with key:', chartKey);

            const availableCharts = await ChartFactory.getAllCharts();
            console.log('Available charts:', availableCharts?.map((c: any) => c.name));
            
            const chartInfo = availableCharts?.find((c: any) => 
              c.name === chartKey || 
              c.name === chartType ||
              c.displayName?.toLowerCase().includes(chartType.toLowerCase())
            );

            if (chartInfo && chartInfo.configSchema) {
              console.log('Found enhanced schema from factory:', chartInfo.configSchema);
              // Merge factory schema with default schema
              const factorySchema = chartInfo.configSchema as ConfigSchema;
              const mergedSchema = {
                ...defaultSchema,
                properties: {
                  ...defaultSchema.properties,
                  ...factorySchema.properties
                },
                required: [
                  ...(defaultSchema.required || []),
                  ...(factorySchema.required || [])
                ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
              };
              console.log('Merged schema:', mergedSchema);
              setChartSchema(mergedSchema);
            } else {
              console.log('No enhanced schema found, using default');
            }
          } else {
            console.log('ChartFactory not ready after initialization attempt');
          }
        } else {
          console.log('ChartFactory not available or missing methods');
        }
      } catch (factoryError) {
        // Factory error - continue with default schema
        console.warn('ChartFactory error, using default schema:', factoryError);
      }
      
    } catch (err) {
      console.error('Error in loadChartSchema:', err);
      // Even if everything fails, we still have a basic schema
      setChartSchema(createDefaultSchema(chartType));
      setError(`Schema loading issue (using defaults): ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // DEFAULT SCHEMA CREATION - Enhanced with more chart types
  // ============================================================================

  const createDefaultSchema = (type: string): ConfigSchema => {
    const baseSchema: ConfigSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Chart Title',
          description: 'The main title of the chart',
          default: ''
        },
        colors: {
          type: 'array',
          title: 'Color Palette',
          description: 'Colors used in the chart',
          items: {
            type: 'string'
          }
        }
      },
      required: []
    };

    // Add chart-specific fields based on type
    switch (type.toLowerCase()) {
      case 'bar':
      case 'column':
        baseSchema.properties = {
          ...baseSchema.properties,
          xField: {
            type: 'string',
            title: 'X-Axis Field',
            description: 'Field to use for categories'
          },
          yField: {
            type: 'string',
            title: 'Y-Axis Field',
            description: 'Field to use for values'
          },
          orientation: {
            type: 'string',
            title: 'Orientation',
            enum: ['vertical', 'horizontal'],
            default: 'vertical'
          },
          stacked: {
            type: 'boolean',
            title: 'Stacked Bars',
            default: false
          },
          showValues: {
            type: 'boolean',
            title: 'Show Values on Bars',
            default: false
          }
        };
        baseSchema.required = ['xField', 'yField'];
        break;

      case 'line':
      case 'area':
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
          showSymbol: {
            type: 'boolean',
            title: 'Show Data Points',
            default: true
          },
          symbolSize: {
            type: 'number',
            title: 'Symbol Size',
            minimum: 2,
            maximum: 20,
            default: 6
          }
        };
        baseSchema.required = ['xField', 'yField'];
        break;

      case 'pie':
      case 'doughnut':
        baseSchema.properties = {
          ...baseSchema.properties,
          categoryField: {
            type: 'string',
            title: 'Category Field'
          },
          valueField: {
            type: 'string',
            title: 'Value Field'
          },
          innerRadius: {
            type: 'number',
            title: 'Inner Radius (%)',
            minimum: 0,
            maximum: 80,
            default: type.toLowerCase() === 'doughnut' ? 40 : 0
          },
          showPercentage: {
            type: 'boolean',
            title: 'Show Percentages',
            default: true
          },
          labelPosition: {
            type: 'string',
            title: 'Label Position',
            enum: ['outside', 'inside', 'center', 'none'],
            default: 'outside'
          }
        };
        baseSchema.required = ['categoryField', 'valueField'];
        break;

      case 'gauge':
      case 'speedometer':
        baseSchema.properties = {
          ...baseSchema.properties,
          valueField: {
            type: 'string',
            title: 'Value Field'
          },
          nameField: {
            type: 'string',
            title: 'Name Field (Optional)'
          },
          min: {
            type: 'number',
            title: 'Minimum Value',
            default: 0
          },
          max: {
            type: 'number',
            title: 'Maximum Value',
            default: 100
          },
          unit: {
            type: 'string',
            title: 'Unit',
            default: ''
          },
          precision: {
            type: 'number',
            title: 'Decimal Places',
            minimum: 0,
            maximum: 5,
            default: 1
          }
        };
        baseSchema.required = ['valueField'];
        break;

      case 'scatter':
      case 'bubble':
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
          sizeField: {
            type: 'string',
            title: 'Size Field (Optional)'
          },
          symbolSize: {
            type: 'number',
            title: 'Symbol Size',
            minimum: 4,
            maximum: 50,
            default: 10
          }
        };
        baseSchema.required = ['xField', 'yField'];
        break;

      case 'heatmap':
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
          valueField: {
            type: 'string',
            title: 'Value Field'
          }
        };
        baseSchema.required = ['xField', 'yField', 'valueField'];
        break;

      case 'radar':
      case 'spider':
        baseSchema.properties = {
          ...baseSchema.properties,
          nameField: {
            type: 'string',
            title: 'Name Field'
          },
          valueField: {
            type: 'string',
            title: 'Value Field'
          },
          maxValue: {
            type: 'number',
            title: 'Maximum Value',
            default: 100
          }
        };
        baseSchema.required = ['nameField', 'valueField'];
        break;

      default:
        // Generic chart - minimal configuration
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
  // HANDLERS - with error handling
  // ============================================================================

  const handleConfigChange = useCallback((path: string, value: any) => {
    try {
      console.log('Config change:', path, value);
      const pathParts = path.split('.');
      const newConfig = { ...configuration };
      
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
  }, [configuration, onChange]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    try {
      console.log('Field change:', field, value);
      const newConfig = {
        ...configuration,
        fieldAssignments: {
          ...configuration.fieldAssignments,
          [field]: value
        }
      };
      console.log('New field config:', newConfig);
      onChange(newConfig);
    } catch (error) {
      console.error('Error in handleFieldChange:', error);
    }
  }, [configuration, onChange]);

  const handleReset = useCallback(() => {
    try {
      if (onReset) {
        console.log('Resetting configuration');
        onReset();
      }
    } catch (error) {
      console.error('Error in handleReset:', error);
    }
  }, [onReset]);

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
                  value={configuration.fieldAssignments?.[key] || ''}
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

        case 'array':
          if (key === 'colors') {
            return renderColorPalette(currentValue);
          }
          return null;

        default:
          console.warn('Unknown property type:', property.type, 'for key:', key);
          return null;
      }
    } catch (error) {
      console.error('Error rendering form field:', key, error);
      return (
        <Alert severity="warning" key={key}>
          Error rendering field: {key}
        </Alert>
      );
    }
  };

  const renderColorPalette = (currentColors: string[]) => {
    return (
      <Box key="colors">
        <Typography variant="subtitle2" gutterBottom>
          Color Palette
        </Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {COLOR_PALETTES.map((palette, index) => (
            <Grid item key={palette.name}>
              <Tooltip title={palette.name}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: 'transparent',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                  onClick={() => handleConfigChange('customConfig.colors', palette.colors)}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" spacing={0.5}>
                      {palette.colors.slice(0, 4).map((color, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 16,
                            height: 16,
                            backgroundColor: color,
                            borderRadius: 0.5,
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
        
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
                {renderFormField(key, property, configuration.fieldAssignments?.[key])}
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
              renderFormField(key, property, configuration.customConfig?.[key])
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
          value={configuration.customConfig?.title || ''}
          onChange={(e) => handleConfigChange('customConfig.title', e.target.value)}
        />

        {chartSchema.properties.colors && renderColorPalette(configuration.customConfig?.colors)}

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Width"
              type="number"
              value={configuration.dimensions?.width || 600}
              onChange={(e) => handleConfigChange('dimensions.width', parseInt(e.target.value) || 600)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Height"
              type="number"
              value={configuration.dimensions?.height || 400}
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
          Configure {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
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
          Using default configuration schema for {chartType} chart.
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
        <Chip label={`Library: ${configuration?.library || 'echarts'}`} size="small" />
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