// src/components/builder/ChartCustomizationPanel.tsx
// COMPLETE UPDATED VERSION WITH Y-AXIS DROPDOWN FIX

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

import { getExpectedDataTypes } from '@/utils/dataTypeUtils';

// ============================================================================
// FALLBACK UTILITY FUNCTIONS
// ============================================================================

const isNumericType = (type: string): boolean => {
  if (!type || typeof type !== 'string') return false;
  const lowerType = type.toLowerCase();
  const numericTypes = ['number', 'integer', 'int', 'float', 'decimal', 'bigint', 'double', 'numeric', 'real'];
  return numericTypes.some(numType => lowerType.includes(numType));
};

const isCategoricalType = (type: string): boolean => {
  if (!type || typeof type !== 'string') return false;
  const lowerType = type.toLowerCase();
  const categoricalTypes = ['string', 'text', 'varchar', 'char', 'category'];
  return categoricalTypes.some(catType => lowerType.includes(catType));
};

const isDateType = (type: string): boolean => {
  if (!type || typeof type !== 'string') return false;
  const lowerType = type.toLowerCase();
  const dateTypes = ['date', 'datetime', 'timestamp', 'time'];
  return dateTypes.some(dateType => lowerType.includes(dateType));
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
      type: 'field-selector',
      title: 'X-Axis Field',
      description: 'Select the field for X-axis',
      required: true
    },
    yField: {
      type: 'field-selector',
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
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'array' | 'object' | 'color' | 'field-selector' | 'range' | 'enum';
  title?: string;
  description?: string;
  default?: any;
  enum?: string[] | { label: string; value: any }[];
  options?: string[] | { label: string; value: any }[];
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
    'appearance': false,
    'behavior': false,
    'advanced': false
  });

  // Use the configuration from props, with fallback to customization
  const safeConfiguration = useMemo(() => {
    return configuration || customization || {};
  }, [configuration, customization]);

  const hasDataColumns = dataColumns && dataColumns.length > 0;

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

  const getFieldOptionsForMapping = useCallback((mappingType: string) => {
    const expectedTypes = getExpectedDataTypes(mappingType);
    
    console.log('🔍 Field Options Mapping Debug:', {
      mappingType,
      expectedTypes,
      availableFields: fieldOptions.length,
      fieldOptions: fieldOptions.map(f => ({ 
        name: f.value, 
        type: f.type, 
        isNumeric: f.isNumeric,
        isCategorical: f.isCategorical,
        isDate: f.isDate
      }))
    });
    
    const filteredOptions = fieldOptions.filter(option => 
      expectedTypes.some(type => {
        switch (type.toLowerCase()) {
          case 'numeric': 
          case 'number':
            return option.isNumeric;
          case 'categorical': 
          case 'string':
            return option.isCategorical;
          case 'date': 
          case 'datetime':
            return option.isDate;
          case 'boolean':
          case 'bool':
            return option.type?.toLowerCase().includes('bool');
          case 'any':
          default:
            return true; // Allow all types for 'any' or unknown types
        }
      })
    );
    
    console.log('🔍 Filtered Options Result:', {
      mappingType,
      expectedTypes,
      originalCount: fieldOptions.length,
      filteredCount: filteredOptions.length,
      filteredOptions: filteredOptions.map(f => ({ 
        name: f.value, 
        type: f.type,
        isNumeric: f.isNumeric,
        isCategorical: f.isCategorical,
        isDate: f.isDate
      }))
    });
    
    return filteredOptions;
  }, [fieldOptions]);

  // ============================================================================
  // CHART PLUGIN LOADING
  // ============================================================================

  useEffect(() => {
    const loadChartPlugin = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to load from ChartRegistry first
        let plugin: ChartPlugin | null = null;
        
        try {
          // Dynamically import ChartRegistry if available
          const ChartRegistry = await import('@/plugins/charts/registry/ChartRegistry');
          await ChartRegistry.default.initialize();
          plugin = ChartRegistry.default.getPlugin(`${chartLibrary}-${chartType}`);
          console.log('🔌 Loaded plugin from registry:', plugin?.name);
        } catch (registryError) {
          console.warn('⚠️ Could not load from ChartRegistry:', registryError);
        }

        // If no plugin found, create fallback
        if (!plugin) {
          console.log('🔧 Creating fallback plugin for:', `${chartLibrary}-${chartType}`);
          plugin = createFallbackPlugin(chartType, chartLibrary);
        }

        setChartPlugin(plugin);
      } catch (err) {
        console.error('❌ Failed to load chart plugin:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart configuration');
        // Still create a fallback plugin
        setChartPlugin(createFallbackPlugin(chartType, chartLibrary));
      } finally {
        setLoading(false);
      }
    };

    if (chartType) {
      loadChartPlugin();
    }
  }, [chartType, chartLibrary]);

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

  const handleConfigChange = useCallback((key: string, value: any) => {
    console.log(`🔄 Config change: ${key} = ${value}`);
    
    const newConfig = { ...safeConfiguration };
    setNestedValue(newConfig, key, value);
    
    onChange(newConfig);
  }, [safeConfiguration, onChange]);

  const determinePropertyGroup = (key: string, property: ConfigSchemaProperty): 'data-mapping' | 'appearance' | 'behavior' | 'advanced' => {
    // Data mapping fields
    if (
      property.type === 'field-selector' ||
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

    // Enhanced logging for debugging
    console.log(`🎨 Rendering field ${key}:`, {
      type: property.type,
      title: property.title,
      currentValue,
      hasDefault: property.default !== undefined,
      isFieldSelector: property.type === 'field-selector'
    });

    // CRITICAL FIX: Enhanced field selector detection
    const shouldRenderAsFieldSelector = 
      // PRIMARY: Check for explicit field-selector type
      property.type === 'field-selector' ||
      
      // SECONDARY: Legacy patterns and naming conventions
      (property.type === 'select' && (
        key === 'xField' || key === 'yField' ||
        key === 'x-axis' || key === 'y-axis' ||
        key.includes('Field') && (key.includes('x') || key.includes('y') || key.includes('X') || key.includes('Y')) ||
        key.includes('xAxis') || key.includes('yAxis') ||
        key.includes('X-Axis') || key.includes('Y-Axis') || 
        key.includes('x_axis') || key.includes('y_axis') ||
        key === 'valueField' || key === 'value' ||
        key === 'categoryField' || key === 'category' ||
        key === 'nameField' || key === 'seriesField' ||
        key.includes('.field') || // For nested patterns like 'xAxis.field', 'yAxis.field'
        property.title?.toLowerCase().includes('field') ||
        property.title?.toLowerCase().includes('y-axis') ||
        property.title?.toLowerCase().includes('x-axis') ||
        property.title?.toLowerCase().includes('value')
      ));

    // DEBUG: Log the decision making
    console.log(`🔍 Field Selector Detection for ${key}:`, {
      shouldRenderAsFieldSelector,
      reasons: {
        isFieldSelectorType: property.type === 'field-selector',
        isSelectType: property.type === 'select',
        keyMatches: {
          exactMatch: ['xField', 'yField', 'x-axis', 'y-axis'].includes(key),
          containsField: key.includes('Field'),
          containsAxis: key.includes('Axis') || key.includes('axis'),
          dotField: key.includes('.field'),
          valueField: key === 'valueField' || key === 'value'
        },
        titleMatches: {
          hasField: property.title?.toLowerCase().includes('field'),
          hasAxis: property.title?.toLowerCase().includes('axis'),
          hasValue: property.title?.toLowerCase().includes('value')
        }
      }
    });

    if (shouldRenderAsFieldSelector) {
      return renderFieldSelector(key, property, currentValue);
    }

    // Render based on property type for non-field-selector fields
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
        // Regular select field (not for field selection)
        return renderSelectField(key, property, currentValue);
      case 'range':
        return renderRangeField(key, property, currentValue);
      case 'array':
        return renderArrayField(key, property, currentValue);
      case 'field-selector':
        // This should have been caught above, but just in case
        console.warn(`⚠️ field-selector type not caught by shouldRenderAsFieldSelector for ${key}`);
        return renderFieldSelector(key, property, currentValue);
      default:
        console.log(`⚠️ Unknown field type for ${key}: ${property.type}, rendering as generic`);
        return renderGenericField(key, property, currentValue);
    }
  };

  const renderFieldSelector = (key: string, property: ConfigSchemaProperty, currentValue: any) => {
    // Enhanced mapping type detection
    let mappingType = 'any';
    
    if (key === 'xField' || key === 'x-axis' || key.includes('xAxis') || key.includes('X-Axis') || key.includes('x_axis') || key === 'xAxis.field') {
      mappingType = 'x-axis';
    } else if (
      key === 'yField' || 
      key === 'y-axis' || 
      key.includes('yAxis') || 
      key.includes('Y-Axis') || 
      key.includes('y_axis') ||
      key === 'valueField' ||
      key === 'value' ||
      key === 'yAxis.field' ||
      property.title?.toLowerCase().includes('y-axis') ||
      property.title?.toLowerCase().includes('value')
    ) {
      mappingType = 'y-axis';
    } else if (key === 'seriesField' || key === 'series' || key.includes('series')) {
      mappingType = 'series';
    } else if (key === 'categoryField' || key === 'category' || key === 'nameField') {
      mappingType = 'category';
    }
        
    const options = getFieldOptionsForMapping(mappingType);
    
    console.log('🔍 FIELD SELECTOR RENDER DEBUG:', {
      key,
      propertyTitle: property.title,
      mappingType,
      currentValue,
      optionsCount: options.length,
      hasDataColumns: !!dataColumns && dataColumns.length > 0,
      dataColumnsCount: dataColumns?.length || 0,
      options: options.map(o => ({ label: o.label, value: o.value, type: o.type, isNumeric: o.isNumeric }))
    });
    
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
    
    if (options.length === 0) {
      const expectedTypes = getExpectedDataTypes(mappingType);
      return (
        <Box key={key}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {property.title || key}
          </Typography>
          <Alert severity="warning" sx={{ mt: 1 }}>
            No suitable fields available for {mappingType}.<br/>
            Expected types: {expectedTypes.join(', ')}<br/>
            Available fields: {fieldOptions.map(f => `${f.label} (${f.type})`).join(', ')}
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
        {(property.enum || property.options || []).map((option, index) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          
          return (
            <MenuItem key={optionValue || index} value={optionValue}>
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
        {property.title || key}: {currentValue ?? property.default ?? property.minimum ?? 0}
      </Typography>
      <Slider
        value={currentValue ?? property.default ?? property.minimum ?? 0}
        min={property.minimum ?? 0}
        max={property.maximum ?? 100}
        onChange={(_, value) => handleConfigChange(key, value)}
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
                {propertyGroups['data-mapping'].map(({ component }) => component)}
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
                {propertyGroups['appearance'].map(({ component }) => component)}
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
                {propertyGroups['behavior'].map(({ component }) => component)}
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
                {propertyGroups['advanced'].map(({ component }) => component)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  // ============================================================================
  // DEBUGGING EFFECTS
  // ============================================================================

  // Debug chart plugin loading
  useEffect(() => {
    if (chartPlugin?.configSchema) {
      console.group('🔍 CHART PLUGIN DEBUG');
      console.log('Plugin loaded:', chartPlugin.name);
      console.log('Config schema:', chartPlugin.configSchema);
      console.log('Properties:', Object.keys(chartPlugin.configSchema.properties || {}));
      
      // Find field-selector properties
      const fieldSelectors = Object.entries(chartPlugin.configSchema.properties || {})
        .filter(([key, property]) => property.type === 'field-selector')
        .map(([key, property]) => ({ key, property }));
      console.log('Field selectors found:', fieldSelectors);
      
      // Find Y-axis related properties
      const yAxisProperties = Object.entries(chartPlugin.configSchema.properties || {})
        .filter(([key, property]) => {
          const isYAxisKey = key.includes('y') || key.includes('Y') || key.includes('value') || key.includes('Value');
          const isYAxisTitle = property.title?.toLowerCase().includes('y-axis') || 
                              property.title?.toLowerCase().includes('value');
          return isYAxisKey || isYAxisTitle;
        })
        .map(([key, property]) => ({ key, property }));
      console.log('Y-Axis properties found:', yAxisProperties);
      console.groupEnd();
    }
  }, [chartPlugin]);

  // Debug data columns
  useEffect(() => {
    if (dataColumns && dataColumns.length > 0) {
      console.group('🔍 DATA COLUMNS DEBUG');
      console.log('Data columns count:', dataColumns.length);
      console.log('Columns details:', dataColumns.map(col => ({
        name: col.name,
        type: col.data_type,
        isNumeric: isNumericType(col.data_type),
        isCategorical: isCategoricalType(col.data_type),
        isDate: isDateType(col.data_type)
      })));
      
      // Test Y-axis filtering
      const yAxisTypes = getExpectedDataTypes('y-axis');
      const numericFields = dataColumns.filter(col => isNumericType(col.data_type));
      console.log('Y-axis expected types:', yAxisTypes);
      console.log('Numeric fields available:', numericFields);
      console.groupEnd();
    }
  }, [dataColumns]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress size={24} />
          <Typography>Loading chart configuration...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        {onReset && (
          <Button onClick={onReset} variant="outlined" startIcon={<Refresh />}>
            Try Again
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          {chartPlugin?.displayName || 'Chart Configuration'}
        </Typography>
        <Box display="flex" gap={1}>
          {onPreview && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onPreview(safeConfiguration)}
            >
              Preview
            </Button>
          )}
          {onReset && (
            <Button
              size="small"
              variant="outlined"
              onClick={onReset}
              startIcon={<Refresh />}
            >
              Reset
            </Button>
          )}
        </Box>
      </Box>

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Configuration Errors:
          </Typography>
          {validation.errors.map((error, index) => (
            <Typography key={index} variant="body2">
              • {error.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Configuration Sections */}
      {renderConfigurationSections()}

      {/* Debug Info (in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Box mt={3} p={2} bgcolor="grey.100" borderRadius={1}>
          <Typography variant="caption" color="textSecondary">
            Debug: Chart Type: {chartType}, Library: {chartLibrary}, 
            Data Columns: {dataColumns?.length || 0},
            Config Keys: {Object.keys(safeConfiguration).length}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default ChartCustomizationPanel;