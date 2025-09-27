// src/components/builder/ChartCustomizationPanel.tsx
// FIXED VERSION - With Correct Export and Import Patterns

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
  Chip,
  Slider
} from '@mui/material';
import { 
  ExpandMore, 
  Refresh, 
  Palette,
  Settings,
  BarChart,
  ShowChart
} from '@mui/icons-material';

import {getExpectedDataTypes} from '@/utils/dataTypeUtils'
// ============================================================================
// FALLBACK UTILITY FUNCTIONS
// ============================================================================

const isNumericType = (type: string): boolean => {
  const numericTypes = ['number', 'integer', 'float', 'decimal', 'bigint', 'double'];
  return numericTypes.includes(type?.toLowerCase());
};

const isCategoricalType = (type: string): boolean => {
  const categoricalTypes = ['string', 'text', 'varchar', 'char', 'category'];
  return categoricalTypes.includes(type?.toLowerCase());
};

const isDateType = (type: string): boolean => {
  const dateTypes = ['date', 'datetime', 'timestamp', 'time'];
  return dateTypes.includes(type?.toLowerCase());
};


const createDefaultConfigSchema = (chartType: string) => ({
  type: 'object',
  properties: {
    title: {
      type: 'string',
      title: 'Chart Title',
      default: `${chartType} Chart`,
      description: 'The title of the chart'
    },
    xField: {
      type: 'select',
      title: 'X-Axis Field',
      description: 'Select the field for X-axis',
      required: true
    },
    yField: {
      type: 'select',
      title: 'Y-Axis Field', 
      description: 'Select the field for Y-axis',
      required: true
    },
    showLegend: {
      type: 'boolean',
      title: 'Show Legend',
      default: true,
      description: 'Show or hide the chart legend'
    },
    color: {
      type: 'color',
      title: 'Color',
      default: '#1976d2',
      description: 'Primary color for the chart'
    },
    animation: {
      type: 'boolean',
      title: 'Enable Animation',
      default: true,
      description: 'Enable chart animations'
    },
    showGrid: {
      type: 'boolean',
      title: 'Show Grid',
      default: true,
      description: 'Show or hide grid lines'
    },
    opacity: {
      type: 'range',
      title: 'Opacity',
      default: 80,
      minimum: 0,
      maximum: 100,
      description: 'Chart opacity percentage'
    }
  },
  required: ['xField', 'yField']
});

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface ChartCustomizationPanelProps {
  chartType: string;
  chartLibrary?: string;
  configuration?: any;
  dataColumns?: Array<{
    name: string;
    display_name?: string;
    data_type: string;
  }>;
  onChange: (config: any) => void;
  onReset?: () => void;
  onPreview?: (config: any) => void;
  
  // Alternative prop names that might be used in different contexts
  customization?: any;
}

interface ConfigSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'object' | 'color' | 'select' | 'range' | 'enum';
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

const ChartCustomizationPanel: React.FC<ChartCustomizationPanelProps> = ({
  chartType,
  chartLibrary = 'echarts',
  configuration,
  customization, // Alternative prop name
  dataColumns = [],
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

  // Handle both configuration and customization props
  const activeConfiguration = configuration || customization || {};

  console.log('🔍 ChartCustomizationPanel Debug:', {
    chartType,
    chartLibrary,
    dataColumns: dataColumns?.length || 'undefined/empty',
    dataColumnsActual: dataColumns,
    configuration: activeConfiguration
  });

  // ============================================================================
  // CHART PLUGIN LOADING
  // ============================================================================

  const hasDataColumns = dataColumns && Array.isArray(dataColumns) && dataColumns.length > 0;
  const chartPluginKey = useMemo(() => `${chartType}`, [chartType]);
  
  useEffect(() => {
    loadChartPlugin();
  }, [chartPluginKey]);

  const loadChartPlugin = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Loading chart plugin for: ${chartType}`);
      
      // Try to get plugin from registry (with fallback)
      let plugin: ChartPlugin;
      
      try {
        // Try to import the registry dynamically
        const { ChartRegistry } = await import('@/plugins/charts/registry/ChartRegistry');
        plugin = await ChartRegistry.getPlugin(chartType, chartLibrary);
      } catch (registryError) {
        console.warn('⚠️ Chart registry not available, using fallback plugin');
        plugin = null;
      }
      
      if (!plugin) {
        plugin = createFallbackPlugin(chartType, chartLibrary);
        console.warn(`⚠️ Using fallback plugin for ${chartType}`);
      }
      
      console.log('📋 Loaded chart plugin:', {
        name: plugin.name,
        library: plugin.library,
        schemaProperties: Object.keys(plugin.configSchema?.properties || {}),
        totalProperties: Object.keys(plugin.configSchema?.properties || {}).length
      });
      
      setChartPlugin(plugin);
    } catch (err) {
      console.error('❌ Failed to load chart plugin:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart configuration');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  const safeConfiguration = useMemo(() => {
    return activeConfiguration || {};
  }, [activeConfiguration]);

  const handleConfigChange = useCallback((key: string, value: any) => {
    console.log(`🔧 Config change: ${key} = ${value}`);
    
    const newConfig = { ...safeConfiguration };
    setNestedValue(newConfig, key, value);
    
    onChange(newConfig);
  }, [safeConfiguration, onChange]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getNestedValue = (obj: any, path: string): any => {
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

  const createFallbackPlugin = (chartType: string, chartLibrary: string): ChartPlugin => {
    return {
      name: `${chartLibrary}-${chartType}`,
      displayName: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
      category: 'basic',
      library: chartLibrary,
      configSchema: createDefaultConfigSchema(chartType),
      dataRequirements: {
        minColumns: 1,
        maxColumns: 10,
        requiredFields: [],
        supportedTypes: ['string', 'number']
      }
    };
  };

  // ============================================================================
  // FIELD OPTIONS AND MAPPING
  // ============================================================================

  const fieldOptions = useMemo(() => {
    if (!hasDataColumns) {
      console.warn('⚠️ No data columns available for field options');
      return [];
    }

    return dataColumns.map(col => ({
      label: col.display_name || col.name,
      value: col.name,
      type: col.data_type,
      isNumeric: isNumericType(col.data_type),
      isCategorical: isCategoricalType(col.data_type),
      isDate: isDateType(col.data_type)
    }));
  }, [dataColumns, hasDataColumns]);

  const getFieldOptionsForMapping = (mappingType: string) => {
  const expectedTypes = getExpectedDataTypes(mappingType);
  
  console.log('🔍 Field Options Mapping Debug:', {
    mappingType,
    expectedTypes,
    availableFields: fieldOptions.length,
    fieldOptions: fieldOptions.map(f => ({ name: f.value, type: f.type, isNumeric: f.isNumeric }))
  });
  
  const filteredOptions = fieldOptions.filter(option => 
    expectedTypes.some(type => {
      switch (type) {
        case 'numeric': 
          return option.isNumeric;
        case 'categorical': 
          return option.isCategorical;
        case 'date':  // ← THIS WAS THE MISSING PART!
          return option.isDate;
        default:
          return true; // Allow all types if not specified
      }
    })
  );
  
  console.log('🔍 Filtered Options Result:', {
    mappingType,
    originalCount: fieldOptions.length,
    filteredCount: filteredOptions.length,
    filteredOptions: filteredOptions.map(f => ({ name: f.value, type: f.type }))
  });
  
  return filteredOptions;
};

  // ============================================================================
  // HELPER FUNCTIONS FOR PROPERTY GROUPING
  // ============================================================================

  const determinePropertyGroup = (key: string, property: ConfigSchemaProperty): 'data-mapping' | 'appearance' | 'behavior' | 'advanced' => {
    // Data mapping fields
    if (
      property.type === 'select' ||
      key.includes('Field') || 
      key.includes('field') ||
      key.includes('axis') ||
      key.includes('Axis') ||
      key === 'xField' || key === 'yField' ||
      key === 'categoryField' || key === 'valueField' ||
      key === 'seriesField'
    ) {
      return 'data-mapping';
    }

    // Appearance fields
    if (
      property.type === 'color' ||
      key.includes('color') || key.includes('Color') ||
      key.includes('style') || key.includes('Style') ||
      key.includes('theme') || key.includes('Theme') ||
      key.includes('font') || key.includes('Font') ||
      key === 'title' || key === 'showLegend' || key === 'showGrid' ||
      key.includes('width') || key.includes('height') ||
      key.includes('size') || key.includes('Size')
    ) {
      return 'appearance';
    }

    // Behavior fields
    if (
      property.type === 'boolean' ||
      key.includes('show') || key.includes('Show') ||
      key.includes('enable') || key.includes('Enable') ||
      key.includes('animation') || key.includes('Animation') ||
      key.includes('interaction') || key.includes('Interaction') ||
      key === 'responsive' || key === 'smooth' ||
      key.includes('hover') || key.includes('click')
    ) {
      return 'behavior';
    }

    // Everything else goes to advanced
    return 'advanced';
  };

  const handleSectionToggle = (section: string, isExpanded: boolean) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: isExpanded
    }));
  };

  // ============================================================================
  // FORM FIELD RENDERERS
  // ============================================================================

  const renderFormField = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
    // ONLY hide fields if there's a conditional that fails
    if (property.conditional) {
      const conditionValue = getNestedValue(safeConfiguration, property.conditional.field);
      if (conditionValue !== property.conditional.value) {
        console.log(`🚫 Hiding ${key} due to conditional: ${property.conditional.field} = ${conditionValue} !== ${property.conditional.value}`);
        return null;
      }
    }

    // Log what we're rendering
    console.log(`🎨 Rendering field ${key}:`, {
      type: property.type,
      title: property.title,
      currentValue,
      hasDefault: property.default !== undefined
    });

    // Force select rendering for axis fields
    const shouldRenderAsFieldSelector = 
      property.type === 'select' ||
      key === 'xField' || key === 'yField' ||
      key === 'x-axis' || key === 'y-axis' ||
      key.includes('Field') && (key.includes('x') || key.includes('y') || key.includes('X') || key.includes('Y')) ||
      key.includes('yAxis') || key.includes('Y-Axis') || key.includes('y_axis') ||
      key === 'valueField' || key === 'value' ||
      property.title?.toLowerCase().includes('y-axis') ||
      property.title?.toLowerCase().includes('x-axis') ||
      property.title?.toLowerCase().includes('value');

    if (shouldRenderAsFieldSelector) {
      return renderFieldSelector(key, property, currentValue);
    }

    // Render based on property type
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
        console.log(`⚠️ Unknown field type for ${key}: ${property.type}, rendering as generic`);
        return renderGenericField(key, property, currentValue);
    }
  };

  const renderFieldSelector = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
    let mappingType = 'any';
    
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
        {property.title || key}: {currentValue || property.default || property.minimum || 0}
      </Typography>
      <Slider
        value={currentValue || property.default || property.minimum || 0}
        onChange={(_, value) => handleConfigChange(key, value)}
        min={property.minimum || 0}
        max={property.maximum || 100}
        step={1}
        marks
        valueLabelDisplay="auto"
      />
      {property.description && (
        <Typography variant="caption" color="textSecondary">
          {property.description}
        </Typography>
      )}
    </Box>
  );

  const renderArrayField = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
    const arrayValue = Array.isArray(currentValue) ? currentValue : (property.default || []);
    
    return (
      <Box key={key}>
        <Typography variant="body2" gutterBottom>
          {property.title || key}
        </Typography>
        <TextField
          fullWidth
          size="small"
          multiline
          rows={3}
          value={arrayValue.join(', ')}
          onChange={(e) => {
            const newArray = e.target.value.split(',').map(item => item.trim()).filter(item => item);
            handleConfigChange(key, newArray);
          }}
          helperText={property.description || 'Enter values separated by commas'}
          placeholder="value1, value2, value3"
        />
      </Box>
    );
  };

  const renderGenericField = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
    console.log(`🔧 Rendering generic field for ${key}`);
    
    return (
      <TextField
        key={key}
        fullWidth
        size="small"
        label={property.title || key}
        value={currentValue || property.default || ''}
        onChange={(e) => handleConfigChange(key, e.target.value)}
        helperText={property.description || `Generic field (${property.type})`}
      />
    );
  };

  // ============================================================================
  // CONFIGURATION RENDERING - PROCESS ALL PROPERTIES
  // ============================================================================

  const renderConfigurationSections = () => {
    if (!chartPlugin?.configSchema?.properties) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No configuration options available for this chart type.
        </Alert>
      );
    }

    // **CRITICAL FIX**: Process ALL properties from schema
    const allProperties = chartPlugin.configSchema.properties || {};
    const requiredFields = chartPlugin.configSchema.required || [];
    
    console.log('🔍 Processing All Properties:', {
      totalProperties: Object.keys(allProperties).length,
      allPropertyKeys: Object.keys(allProperties),
      requiredFields: requiredFields,
      currentConfiguration: safeConfiguration
    });

    // Group properties by category
    const propertyGroups = {
      'data-mapping': [] as Array<{ key: string; property: ConfigSchemaProperty; component: React.ReactNode }>,
      'appearance': [] as Array<{ key: string; property: ConfigSchemaProperty; component: React.ReactNode }>,
      'behavior': [] as Array<{ key: string; property: ConfigSchemaProperty; component: React.ReactNode }>,
      'advanced': [] as Array<{ key: string; property: ConfigSchemaProperty; component: React.ReactNode }>
    };

    // **PROCESS ALL PROPERTIES** - This is the key fix
    Object.entries(allProperties).forEach(([key, property]) => {
      console.log(`🔍 Processing property: ${key}`, {
        type: property.type,
        title: property.title,
        required: requiredFields.includes(key),
        hasConditional: !!property.conditional,
        currentValue: getNestedValue(safeConfiguration, key)
      });

      const currentValue = getNestedValue(safeConfiguration, key);
      const fieldComponent = renderFormField(key, property, currentValue);
      
      if (fieldComponent === null) {
        console.log(`⏭️ Skipping property ${key} due to conditional logic`);
        return;
      }

      const group = determinePropertyGroup(key, property);
      
      propertyGroups[group].push({
        key,
        property,
        component: fieldComponent
      });

      console.log(`✅ Added property ${key} to ${group} group`);
    });

    // Log summary
    console.log('📊 Property Processing Summary:', {
      'data-mapping': propertyGroups['data-mapping'].length,
      'appearance': propertyGroups['appearance'].length,
      'behavior': propertyGroups['behavior'].length,
      'advanced': propertyGroups['advanced'].length,
      total: Object.values(propertyGroups).reduce((sum, group) => sum + group.length, 0)
    });

    return (
      <Box sx={{ mt: 2 }}>
        {/* Data Mapping Section */}
        {propertyGroups['data-mapping'].length > 0 && (
          <Accordion 
            expanded={expandedSections['data-mapping']} 
            onChange={(_, isExpanded) => handleSectionToggle('data-mapping', isExpanded)}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <BarChart fontSize="small" />
                <Typography variant="h6">Data Mapping</Typography>
                <Chip size="small" label={propertyGroups['data-mapping'].length} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                {propertyGroups['data-mapping'].map(({ key, component }) => (
                  <Box key={key}>{component}</Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Appearance Section */}
        {propertyGroups['appearance'].length > 0 && (
          <Accordion 
            expanded={expandedSections['appearance']} 
            onChange={(_, isExpanded) => handleSectionToggle('appearance', isExpanded)}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Palette fontSize="small" />
                <Typography variant="h6">Appearance</Typography>
                <Chip size="small" label={propertyGroups['appearance'].length} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                {propertyGroups['appearance'].map(({ key, component }) => (
                  <Box key={key}>{component}</Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Behavior Section */}
        {propertyGroups['behavior'].length > 0 && (
          <Accordion 
            expanded={expandedSections['behavior']} 
            onChange={(_, isExpanded) => handleSectionToggle('behavior', isExpanded)}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Settings fontSize="small" />
                <Typography variant="h6">Behavior</Typography>
                <Chip size="small" label={propertyGroups['behavior'].length} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                {propertyGroups['behavior'].map(({ key, component }) => (
                  <Box key={key}>{component}</Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Advanced Section */}
        {propertyGroups['advanced'].length > 0 && (
          <Accordion 
            expanded={expandedSections['advanced']} 
            onChange={(_, isExpanded) => handleSectionToggle('advanced', isExpanded)}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <ShowChart fontSize="small" />
                <Typography variant="h6">Advanced</Typography>
                <Chip size="small" label={propertyGroups['advanced'].length} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                {propertyGroups['advanced'].map(({ key, component }) => (
                  <Box key={key}>{component}</Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Debug info if no properties */}
        {Object.values(propertyGroups).every(group => group.length === 0) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              No configuration properties were rendered.
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Debug info: Schema has {Object.keys(allProperties).length} properties
            </Typography>
          </Alert>
        )}
      </Box>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Loading chart configuration...
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadChartPlugin}>
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" component="h2">
          Chart Configuration
        </Typography>
        <Box display="flex" gap={1}>
          {onReset && (
            <Button variant="outlined" size="small" onClick={onReset}>
              Reset
            </Button>
          )}
          {onPreview && (
            <Button variant="contained" size="small" onClick={() => onPreview(safeConfiguration)}>
              Preview
            </Button>
          )}
        </Box>
      </Box>

      {/* Chart Plugin Info */}
      {chartPlugin && (
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary">
            {chartPlugin.displayName} ({chartPlugin.library})
          </Typography>
        </Box>
      )}

      {/* Validation Errors */}
      {!validation.isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Configuration validation failed:
          </Typography>
          <ul>
            {validation.errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Configuration Sections */}
      {renderConfigurationSections()}
    </Paper>
  );
};

// ============================================================================
// EXPORTS - THIS IS CRITICAL
// ============================================================================

// Default export
export default ChartCustomizationPanel;

// Named export (for compatibility)
export { ChartCustomizationPanel };