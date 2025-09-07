// web-application/src/components/builder/ChartBuilder.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as LineChartIcon,
  ScatterPlot as ScatterIcon,
  DonutLarge as DonutIcon,
  StackedBarChart as StackedBarIcon,
  AreaChart as AreaIcon,
  Radar as RadarIcon,
  BubbleChart as BubbleIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Storage as DataIcon,
  Palette as StyleIcon,
  Tune as ConfigIcon,
  Preview as PreviewIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import BuilderLayout from '../layout/BuilderLayout';

// ChartFactory integration
import { ChartFactory, ChartFactoryComponent, type ChartPluginInfo } from '@/plugins/charts';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ChartConfig {
  id?: string;
  name: string;
  description?: string;
  chartType: ChartType;
  chartLibrary: string;           // NEW: ChartFactory library
  pluginVersion?: string;         // NEW: Plugin version tracking
  factoryConfig?: any;           // NEW: Plugin-specific configuration
  dataSource: DataSourceConfig;
  chartOptions: ChartOptions;
  styling: ChartStyling;
  interactivity: InteractivityConfig;
}

type ChartType = 
  | 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut' 
  | 'scatter' | 'bubble' | 'radar' | 'funnel' | 'waterfall'
  | 'heatmap' | 'treemap' | 'sankey' | 'gauge' | 'histogram';

interface DataSourceConfig {
  type: 'dataset' | 'sql' | 'api';
  sourceId?: string;
  sqlQuery?: string;
  apiEndpoint?: string;
  refreshInterval?: number;
  filters?: FilterConfig[];
}

interface FilterConfig {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

interface ChartOptions {
  dimensions: {
    x: string[];
    y: string[];
    series?: string;
    color?: string;
    size?: string;
  };
  aggregation: {
    method: 'sum' | 'count' | 'avg' | 'min' | 'max';
    groupBy?: string[];
  };
  sorting: {
    column?: string;
    direction: 'asc' | 'desc';
    limit?: number;
  };
}

interface ChartStyling {
  theme: 'light' | 'dark' | 'custom';
  colors: {
    palette: 'default' | 'viridis' | 'plasma' | 'warm' | 'cool' | 'custom';
    customColors?: string[];
  };
  layout: {
    showLegend: boolean;
    legendPosition: 'top' | 'bottom' | 'left' | 'right';
    showGrid: boolean;
    gridStyle: 'solid' | 'dashed' | 'dotted';
  };
  axes: {
    xAxis: AxisConfig;
    yAxis: AxisConfig;
  };
  labels: {
    showDataLabels: boolean;
    labelFormat: string;
    fontSize: number;
  };
}

interface AxisConfig {
  show: boolean;
  title: string;
  titleRotation?: number;
  min?: number;
  max?: number;
  tickInterval?: number;
}

interface InteractivityConfig {
  enableTooltip: boolean;
  enableZoom: boolean;
  enableBrush: boolean;
  clickAction: 'none' | 'filter' | 'navigate' | 'custom';
  customActions?: any[];
}

// Component Props
interface ChartBuilderProps {
  initialConfig?: Partial<ChartConfig>;
  data?: any[];
  availableColumns?: string[];
  onSave?: (config: ChartConfig) => void;
  onCancel?: () => void;
  onPreview?: (config: ChartConfig) => void;
  workspaceId?: string;
  dashboardId?: string;
}

// =============================================================================
// Enhanced Chart Type Selector with ChartFactory Integration
// =============================================================================

const ChartTypeSelector: React.FC<{
  selectedType?: string;
  selectedLibrary?: string;
  onSelect: (type: string, library: string, pluginInfo: ChartPluginInfo) => void;
}> = ({ selectedType, selectedLibrary, onSelect }) => {
  const [availableCharts, setAvailableCharts] = useState<ChartPluginInfo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCharts, setFilteredCharts] = useState<ChartPluginInfo[]>([]);

  // Initialize ChartFactory and load available charts
  useEffect(() => {
    const loadCharts = async () => {
      try {
        setLoading(true);
        
        // Ensure ChartFactory is initialized
        await ChartFactory.initialize();
        
        // Load all available charts dynamically
        const charts = await ChartFactory.getAllCharts();
        const chartCategories = await ChartFactory.getCategories();
        
        setAvailableCharts(charts);
        setFilteredCharts(charts);
        setCategories(chartCategories.length > 0 ? chartCategories : ['basic', 'advanced', 'statistical']);
      } catch (error) {
        console.error('Failed to load chart plugins:', error);
        // Fallback to empty state
        setAvailableCharts([]);
        setCategories(['basic']);
      } finally {
        setLoading(false);
      }
    };

    loadCharts();
  }, []);

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setFilteredCharts(availableCharts);
        return;
      }

      try {
        const searchResults = await ChartFactory.searchCharts(searchQuery);
        setFilteredCharts(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        // Fallback to client-side filtering
        const filtered = availableCharts.filter(chart =>
          chart.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chart.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredCharts(filtered);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, availableCharts]);

  // Get chart icon based on type
  const getChartIcon = (chartType: string, library: string) => {
    const iconMap: Record<string, React.ReactElement> = {
      'bar': <BarChartIcon />,
      'column': <BarChartIcon />,
      'line': <LineChartIcon />,
      'area': <AreaIcon />,
      'pie': <PieChartIcon />,
      'donut': <DonutIcon />,
      'scatter': <ScatterIcon />,
      'bubble': <BubbleIcon />,
      'radar': <RadarIcon />,
      'waterfall': <StackedBarIcon />,
      'gauge': <DonutIcon />
    };
    
    return iconMap[chartType] || <BarChartIcon />;
  };

  // Render charts by category
  const renderChartsByCategory = (category: string) => {
    const categoryCharts = filteredCharts.filter(chart => 
      chart.category === category || (!chart.category && category === 'basic')
    );
    
    if (categoryCharts.length === 0) return null;

    return (
      <Accordion key={category} defaultExpanded={category === 'basic'}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">
            {category.charAt(0).toUpperCase() + category.slice(1)} Charts
          </Typography>
          <Chip 
            label={categoryCharts.length} 
            size="small" 
            sx={{ ml: 1 }} 
          />
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {categoryCharts.map((chart) => {
              const isSelected = selectedType === chart.name && selectedLibrary === chart.library;
              
              return (
                <Grid item xs={6} key={`${chart.library}-${chart.name}`}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      '&:hover': { 
                        borderColor: 'primary.main',
                        boxShadow: 2
                      },
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => onSelect(chart.name, chart.library, chart)}
                  >
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      {/* Chart icon */}
                      <Box sx={{ mb: 1, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                        {getChartIcon(chart.name, chart.library)}
                      </Box>
                      
                      {/* Chart name */}
                      <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                        {chart.displayName || chart.name}
                      </Typography>
                      
                      {/* Library badge */}
                      <Chip 
                        label={chart.library} 
                        size="small" 
                        variant={isSelected ? 'filled' : 'outlined'}
                        color={isSelected ? 'primary' : 'default'}
                        sx={{ 
                          mt: 0.5, 
                          fontSize: '10px',
                          height: 20
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Loading chart plugins...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Chart Type
      </Typography>

      {/* Search box */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search charts..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
        }}
        sx={{ mb: 2 }}
      />

      {/* Show total charts available */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        {filteredCharts.length} chart{filteredCharts.length !== 1 ? 's' : ''} available
      </Typography>

      {/* Dynamic categories */}
      {categories.map(category => renderChartsByCategory(category))}

      {/* No results message */}
      {filteredCharts.length === 0 && searchQuery && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No charts found for "{searchQuery}". Try a different search term.
        </Alert>
      )}
    </Box>
  );
};

// =============================================================================
// Data Source Selector Component
// =============================================================================

const DataSourceSelector: React.FC<{
  dataSource: DataSourceConfig;
  onChange: (dataSource: DataSourceConfig) => void;
}> = ({ dataSource, onChange }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data Source
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Data Source Type</InputLabel>
        <Select
          value={dataSource.type}
          onChange={(e) => onChange({ ...dataSource, type: e.target.value as any })}
          label="Data Source Type"
        >
          <MenuItem value="dataset">Dataset</MenuItem>
          <MenuItem value="sql">SQL Query</MenuItem>
          <MenuItem value="api">API Endpoint</MenuItem>
        </Select>
      </FormControl>

      {dataSource.type === 'dataset' && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Dataset</InputLabel>
          <Select
            value={dataSource.sourceId || ''}
            onChange={(e) => onChange({ ...dataSource, sourceId: e.target.value })}
            label="Select Dataset"
          >
            <MenuItem value="sales-data">Sales Data</MenuItem>
            <MenuItem value="user-analytics">User Analytics</MenuItem>
            <MenuItem value="financial-reports">Financial Reports</MenuItem>
          </Select>
        </FormControl>
      )}

      {dataSource.type === 'sql' && (
        <TextField
          fullWidth
          multiline
          rows={4}
          label="SQL Query"
          value={dataSource.sqlQuery || ''}
          onChange={(e) => onChange({ ...dataSource, sqlQuery: e.target.value })}
          placeholder="SELECT * FROM your_table WHERE ..."
          sx={{ mb: 2 }}
        />
      )}

      {dataSource.type === 'api' && (
        <TextField
          fullWidth
          label="API Endpoint"
          value={dataSource.apiEndpoint || ''}
          onChange={(e) => onChange({ ...dataSource, apiEndpoint: e.target.value })}
          placeholder="https://api.example.com/data"
          sx={{ mb: 2 }}
        />
      )}
    </Box>
  );
};

// =============================================================================
// Enhanced Chart Options Panel with Plugin Schema Support
// =============================================================================

const ChartOptionsPanel: React.FC<{
  chartType: string;
  chartLibrary: string;
  options: ChartOptions;
  factoryConfig: any;
  availableColumns: string[];
  onChange: (options: ChartOptions, factoryConfig: any) => void;
}> = ({ chartType, chartLibrary, options, factoryConfig, availableColumns, onChange }) => {
  const [pluginSchema, setPluginSchema] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load plugin-specific configuration schema
  useEffect(() => {
    const loadPluginSchema = async () => {
      if (!chartType || !chartLibrary) return;
      
      try {
        setLoading(true);
        const pluginInfo = await ChartFactory.getChartInfo(chartType, chartLibrary);
        if (pluginInfo?.configSchema) {
          setPluginSchema(pluginInfo.configSchema);
        }
      } catch (error) {
        console.error('Failed to load plugin schema:', error);
        setPluginSchema(null);
      } finally {
        setLoading(false);
      }
    };

    loadPluginSchema();
  }, [chartType, chartLibrary]);

  // Handle basic options change
  const handleOptionsChange = (newOptions: Partial<ChartOptions>) => {
    onChange({ ...options, ...newOptions }, factoryConfig);
  };

  // Handle factory config change
  const handleFactoryConfigChange = (key: string, value: any) => {
    onChange(options, { ...factoryConfig, [key]: value });
  };

  // Generate form fields from plugin schema
  const renderPluginConfigFields = () => {
    if (!pluginSchema?.properties) return null;

    return Object.entries(pluginSchema.properties).map(([key, fieldSchema]: [string, any]) => {
      const value = factoryConfig?.[key] ?? fieldSchema.default ?? '';
      
      // Render different field types based on schema
      switch (fieldSchema.type) {
        case 'string':
          if (fieldSchema.enum || fieldSchema.options) {
            return (
              <FormControl fullWidth sx={{ mb: 2 }} key={key}>
                <InputLabel>{fieldSchema.title || key}</InputLabel>
                <Select
                  value={value}
                  onChange={(e) => handleFactoryConfigChange(key, e.target.value)}
                  label={fieldSchema.title || key}
                >
                  {(fieldSchema.enum || fieldSchema.options).map((option: string) => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
          
          return (
            <TextField
              key={key}
              fullWidth
              label={fieldSchema.title || key}
              value={value}
              onChange={(e) => handleFactoryConfigChange(key, e.target.value)}
              helperText={fieldSchema.description}
              sx={{ mb: 2 }}
            />
          );

        case 'number':
          return (
            <TextField
              key={key}
              fullWidth
              type="number"
              label={fieldSchema.title || key}
              value={value}
              onChange={(e) => handleFactoryConfigChange(key, Number(e.target.value))}
              helperText={fieldSchema.description}
              sx={{ mb: 2 }}
            />
          );

        case 'boolean':
          return (
            <FormControlLabel
              key={key}
              control={
                <Switch
                  checked={Boolean(value)}
                  onChange={(e) => handleFactoryConfigChange(key, e.target.checked)}
                />
              }
              label={fieldSchema.title || key}
              sx={{ mb: 2 }}
            />
          );

        default:
          return null;
      }
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Chart Configuration
      </Typography>

      {/* Data Mapping - Standard fields */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Data Mapping</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>X-Axis Field</InputLabel>
            <Select
              multiple={chartType === 'scatter' || chartType === 'bubble'}
              value={options.dimensions?.x || []}
              onChange={(e) => handleOptionsChange({
                dimensions: {
                  ...options.dimensions,
                  x: Array.isArray(e.target.value) ? e.target.value : [e.target.value]
                }
              })}
            >
              {availableColumns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Y-Axis Field</InputLabel>
            <Select
              multiple={chartType !== 'pie' && chartType !== 'donut'}
              value={options.dimensions?.y || []}
              onChange={(e) => handleOptionsChange({
                dimensions: {
                  ...options.dimensions,
                  y: Array.isArray(e.target.value) ? e.target.value : [e.target.value]
                }
              })}
            >
              {availableColumns.map(col => (
                <MenuItem key={col} value={col}>{col}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {(chartType === 'scatter' || chartType === 'bubble') && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Size Field (Optional)</InputLabel>
              <Select
                value={options.dimensions?.size || ''}
                onChange={(e) => handleOptionsChange({
                  dimensions: {
                    ...options.dimensions,
                    size: e.target.value
                  }
                })}
              >
                <MenuItem value="">None</MenuItem>
                {availableColumns.map(col => (
                  <MenuItem key={col} value={col}>{col}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Aggregation Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Aggregation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Aggregation Method</InputLabel>
            <Select
              value={options.aggregation?.method || 'sum'}
              onChange={(e) => handleOptionsChange({
                aggregation: {
                  ...options.aggregation,
                  method: e.target.value as any
                }
              })}
            >
              <MenuItem value="sum">Sum</MenuItem>
              <MenuItem value="count">Count</MenuItem>
              <MenuItem value="avg">Average</MenuItem>
              <MenuItem value="min">Minimum</MenuItem>
              <MenuItem value="max">Maximum</MenuItem>
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Plugin-Specific Configuration */}
      {(chartType && chartLibrary) && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              {chartLibrary.charAt(0).toUpperCase() + chartLibrary.slice(1)} Options
            </Typography>
            {loading && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </AccordionSummary>
          <AccordionDetails>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Loading plugin configuration...
                </Typography>
              </Box>
            ) : pluginSchema ? (
              renderPluginConfigFields()
            ) : (
              <Typography variant="body2" color="text.secondary">
                No additional configuration available for this chart type.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

// =============================================================================
// Chart Styling Panel Component (Unchanged)
// =============================================================================

const ChartStylingPanel: React.FC<{
  styling: ChartStyling;
  chartType: string;
  onChange: (styling: ChartStyling) => void;
}> = ({ styling, chartType, onChange }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Styling & Appearance
      </Typography>

      {/* Theme Selection */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Theme & Colors</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Theme</InputLabel>
            <Select
              value={styling.theme}
              onChange={(e) => onChange({
                ...styling,
                theme: e.target.value as any
              })}
              label="Theme"
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Color Palette</InputLabel>
            <Select
              value={styling.colors.palette}
              onChange={(e) => onChange({
                ...styling,
                colors: { ...styling.colors, palette: e.target.value as any }
              })}
              label="Color Palette"
            >
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="viridis">Viridis</MenuItem>
              <MenuItem value="plasma">Plasma</MenuItem>
              <MenuItem value="warm">Warm</MenuItem>
              <MenuItem value="cool">Cool</MenuItem>
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Layout Options */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Layout</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Switch
                checked={styling.layout.showLegend}
                onChange={(e) => onChange({
                  ...styling,
                  layout: { ...styling.layout, showLegend: e.target.checked }
                })}
              />
            }
            label="Show Legend"
            sx={{ mb: 2 }}
          />

          {styling.layout.showLegend && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Legend Position</InputLabel>
              <Select
                value={styling.layout.legendPosition}
                onChange={(e) => onChange({
                  ...styling,
                  layout: { ...styling.layout, legendPosition: e.target.value as any }
                })}
                label="Legend Position"
              >
                <MenuItem value="top">Top</MenuItem>
                <MenuItem value="bottom">Bottom</MenuItem>
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="right">Right</MenuItem>
              </Select>
            </FormControl>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={styling.layout.showGrid}
                onChange={(e) => onChange({
                  ...styling,
                  layout: { ...styling.layout, showGrid: e.target.checked }
                })}
              />
            }
            label="Show Grid Lines"
          />
        </AccordionDetails>
      </Accordion>

      {/* Labels & Formatting */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Labels & Formatting</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControlLabel
            control={
              <Switch
                checked={styling.labels.showDataLabels}
                onChange={(e) => onChange({
                  ...styling,
                  labels: { ...styling.labels, showDataLabels: e.target.checked }
                })}
              />
            }
            label="Show Data Labels"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            type="number"
            label="Font Size"
            value={styling.labels.fontSize}
            onChange={(e) => onChange({
              ...styling,
              labels: { ...styling.labels, fontSize: parseInt(e.target.value) || 12 }
            })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="X-Axis Title"
            value={styling.axes.xAxis.title}
            onChange={(e) => onChange({
              ...styling,
              axes: { 
                ...styling.axes, 
                xAxis: { ...styling.axes.xAxis, title: e.target.value }
              }
            })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Y-Axis Title"
            value={styling.axes.yAxis.title}
            onChange={(e) => onChange({
              ...styling,
              axes: { 
                ...styling.axes, 
                yAxis: { ...styling.axes.yAxis, title: e.target.value }
              }
            })}
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

// =============================================================================
// Enhanced Chart Preview Panel with ChartFactory Integration
// =============================================================================

const ChartPreviewPanel: React.FC<{
  config: ChartConfig;
  data: any[];
  loading: boolean;
  onRefresh: () => void;
}> = ({ config, data, loading, onRefresh }) => {
  const [chartError, setChartError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{valid: boolean; errors: string[]}>({
    valid: true, 
    errors: []
  });
  const [validationLoading, setValidationLoading] = useState(false);

  // Validate configuration using ChartFactory
  useEffect(() => {
    const validateConfig = async () => {
      if (!config.chartType || !config.chartLibrary) return;
      
      try {
        setValidationLoading(true);
        const result = await ChartFactory.validateConfig(
          config.chartType, 
          config.chartLibrary, 
          config.factoryConfig || {}
        );
        setValidationResult(result);
        
        // Clear previous errors if validation passes
        if (result.valid) {
          setChartError(null);
        }
      } catch (error) {
        console.error('Validation failed:', error);
        setValidationResult({
          valid: false, 
          errors: ['Configuration validation failed']
        });
      } finally {
        setValidationLoading(false);
      }
    };

    validateConfig();
  }, [config.chartType, config.chartLibrary, config.factoryConfig]);

  // Get plugin info for display
  const [pluginInfo, setPluginInfo] = useState<ChartPluginInfo | null>(null);
  useEffect(() => {
    const loadPluginInfo = async () => {
      if (!config.chartType || !config.chartLibrary) return;
      
      try {
        const info = await ChartFactory.getChartInfo(config.chartType, config.chartLibrary);
        setPluginInfo(info);
      } catch (error) {
        console.error('Failed to load plugin info:', error);
      }
    };

    loadPluginInfo();
  }, [config.chartType, config.chartLibrary]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Chart Preview
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Preview your chart configuration before saving. Make sure all settings look correct.
      </Alert>

      {/* Validation warnings */}
      {!validationResult.valid && !validationLoading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Configuration Issues:</Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {validationResult.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Chart info and controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="subtitle2">
            {config.name || 'Untitled Chart'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {pluginInfo?.displayName || config.chartType} • {config.chartLibrary}
            {config.pluginVersion && ` v${config.pluginVersion}`}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {validationLoading && <CircularProgress size={16} />}
          <IconButton
            onClick={onRefresh}
            disabled={loading}
            size="small"
            title="Refresh preview"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Chart rendering area */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 2, 
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={40} />
            <Typography color="text.secondary">Loading chart...</Typography>
          </Box>
        ) : chartError ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            <Typography variant="subtitle2">Chart Rendering Error</Typography>
            <Typography variant="body2">{chartError}</Typography>
            <Button 
              size="small" 
              onClick={() => setChartError(null)}
              sx={{ mt: 1 }}
            >
              Try Again
            </Button>
          </Alert>
        ) : config.chartType && config.chartLibrary && data && data.length > 0 ? (
          /* ChartFactory Component Integration */
          <Box sx={{ width: '100%', height: '400px' }}>
            <ChartFactoryComponent
              chartType={config.chartType}
              chartLibrary={config.chartLibrary}
              data={data}
              config={{
                // Merge standard config with plugin-specific config
                title: config.name,
                ...config.factoryConfig,
                // Map standard fields to plugin format
                xField: config.chartOptions?.dimensions?.x?.[0],
                yField: config.chartOptions?.dimensions?.y?.[0],
                seriesField: config.chartOptions?.dimensions?.series,
                // Apply styling
                theme: config.styling?.theme || 'light',
                showLegend: config.styling?.layout?.showLegend ?? true,
                showGrid: config.styling?.layout?.showGrid ?? true
              }}
              dimensions={{ width: 600, height: 350 }}
              onError={(error) => setChartError(error.message)}
              onInteraction={(event) => console.log('Chart interaction:', event)}
            />
          </Box>
        ) : !config.chartType || !config.chartLibrary ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary" variant="h6">
              Select a chart type to see preview
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Choose from available chart plugins in the sidebar
            </Typography>
          </Box>
        ) : (!data || data.length === 0) ? (
          <Alert severity="warning" sx={{ width: '100%' }}>
            <Typography variant="subtitle2">No Data Available</Typography>
            <Typography variant="body2">
              Please select a data source to preview the chart.
            </Typography>
          </Alert>
        ) : null}
      </Paper>

      {/* Configuration Summary */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Configuration Summary:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Chart Type"
              secondary={pluginInfo?.displayName || config.chartType}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Library"
              secondary={config.chartLibrary}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Data Source"
              secondary={config.dataSource.type === 'dataset' 
                ? `Dataset: ${config.dataSource.sourceId}` 
                : config.dataSource.type
              }
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="X-Axis Fields"
              secondary={config.chartOptions?.dimensions?.x?.join(', ') || 'Not configured'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Y-Axis Fields"
              secondary={config.chartOptions?.dimensions?.y?.join(', ') || 'Not configured'}
            />
          </ListItem>
          {config.chartOptions?.dimensions?.series && (
            <ListItem>
              <ListItemText
                primary="Series Field"
                secondary={config.chartOptions.dimensions.series}
              />
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Chart metadata */}
      <TextField
        fullWidth
        label="Chart Name"
        value={config.name}
        placeholder="Enter a descriptive name for your chart"
        sx={{ mb: 2 }}
        disabled // This would need to be passed up to parent
      />

      <TextField
        fullWidth
        multiline
        rows={2}
        label="Description (Optional)"
        value={config.description || ''}
        placeholder="Describe what this chart shows..."
        disabled // This would need to be passed up to parent
      />
    </Box>
  );
};

// =============================================================================
// Main ChartBuilder Component
// =============================================================================

const ChartBuilder: React.FC<ChartBuilderProps> = ({
  initialConfig,
  data = [],
  availableColumns = [],
  onSave,
  onCancel,
  onPreview,
  workspaceId,
  dashboardId
}) => {
  // State management
  const [config, setConfig] = useState<ChartConfig>({
    name: 'New Chart',
    chartType: 'bar',
    chartLibrary: 'echarts',  // Default to echarts
    factoryConfig: {},
    dataSource: { type: 'dataset' },
    chartOptions: {
      dimensions: { x: [], y: [] },
      aggregation: { method: 'sum' },
      sorting: { direction: 'asc' }
    },
    styling: {
      theme: 'light',
      colors: { palette: 'default' },
      layout: {
        showLegend: true,
        legendPosition: 'bottom',
        showGrid: true,
        gridStyle: 'solid'
      },
      axes: {
        xAxis: { show: true, title: '' },
        yAxis: { show: true, title: '' }
      },
      labels: {
        showDataLabels: false,
        labelFormat: '',
        fontSize: 12
      }
    },
    interactivity: {
      enableTooltip: true,
      enableZoom: false,
      enableBrush: false,
      clickAction: 'none'
    },
    ...initialConfig
  });

  const [activeStep, setActiveStep] = useState(0);
  const [isFactoryReady, setIsFactoryReady] = useState(false);
  const [factoryError, setFactoryError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize ChartFactory
  useEffect(() => {
    const initializeFactory = async () => {
      try {
        await ChartFactory.initialize();
        setIsFactoryReady(true);
        setFactoryError(null);
      } catch (error) {
        console.error('ChartFactory initialization failed:', error);
        setFactoryError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initializeFactory();
  }, []);

  // Extract columns from data if not provided
  const effectiveColumns = availableColumns.length > 0 ? availableColumns : 
    (data && data.length > 0 ? Object.keys(data[0]) : []);

  // Handle chart type selection
  const handleChartSelection = useCallback((type: string, library: string, pluginInfo: ChartPluginInfo) => {
    setConfig(prev => ({
      ...prev,
      chartType: type as ChartType,
      chartLibrary: library,
      pluginVersion: pluginInfo.version,
      factoryConfig: {
        // Set defaults from plugin schema if available
        ...Object.fromEntries(
          Object.entries(pluginInfo.configSchema?.properties || {}).map(([key, field]: [string, any]) => 
            [key, field.default]
          )
        )
      }
    }));
    setHasChanges(true);
  }, []);

  // Handle options change
  const handleOptionsChange = useCallback((options: ChartOptions, factoryConfig: any) => {
    setConfig(prev => ({
      ...prev,
      chartOptions: options,
      factoryConfig
    }));
    setHasChanges(true);
  }, []);

  // Handle styling change
  const handleStylingChange = useCallback((styling: ChartStyling) => {
    setConfig(prev => ({
      ...prev,
      styling
    }));
    setHasChanges(true);
  }, []);

  // Handle save with validation
  const handleSave = useCallback(async () => {
    try {
      // Validate configuration
      if (!config.chartType || !config.chartLibrary) {
        alert('Please select a chart type');
        return;
      }

      // Validate using ChartFactory
      const validation = await ChartFactory.validateConfig(
        config.chartType, 
        config.chartLibrary, 
        config.factoryConfig || {}
      );

      if (!validation.valid) {
        alert(`Configuration errors:\n${validation.errors.join('\n')}`);
        return;
      }

      // Check required data mappings
      if (!config.chartOptions.dimensions.x.length && !['pie', 'donut'].includes(config.chartType)) {
        alert('Please configure X-axis field mapping');
        return;
      }

      if (!config.chartOptions.dimensions.y.length) {
        alert('Please configure Y-axis field mapping');
        return;
      }

      await onSave?.(config);
      setHasChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save chart configuration');
    }
  }, [config, onSave]);

  // Show loading state while factory initializes
  if (!isFactoryReady) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={40} />
        <Typography variant="h6">Initializing Chart Factory...</Typography>
        {factoryError && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 400 }}>
            <Typography variant="subtitle2">Initialization Error</Typography>
            <Typography variant="body2">{factoryError}</Typography>
          </Alert>
        )}
      </Box>
    );
  }

  // Render main component
  return (
    <BuilderLayout
      builderType="chart"
      title="Chart Builder"
      subtitle="Create and customize your chart with dynamic plugins"
      onSave={handleSave}
      onCancel={onCancel}
      onPreview={() => onPreview?.(config)}
      hasChanges={hasChanges}
      canSave={Boolean(config.chartType && config.chartLibrary && effectiveColumns.length > 0)}
      entityName={config.name}
      workspaceSlug={workspaceId}
    >
      <Box sx={{ display: 'flex', height: '100%' }}>
        
        {/* LEFT SIDEBAR - Same structure, enhanced components */}
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflow: 'auto',
            bgcolor: 'background.paper'
          }}
        >
          <div className="sidebar-content">
            
            {/* Chart Type Selection */}
            <div className="sidebar-section">
              <ChartTypeSelector
                selectedType={config.chartType}
                selectedLibrary={config.chartLibrary}
                onSelect={handleChartSelection}
              />
            </div>

            {/* Data Source Configuration */}
            <div className="sidebar-section">
              <DataSourceSelector
                dataSource={config.dataSource}
                onChange={(dataSource) => {
                  setConfig(prev => ({ ...prev, dataSource }));
                  setHasChanges(true);
                }}
              />
            </div>

            {/* Chart Options */}
            <div className="sidebar-section">
              <ChartOptionsPanel
                chartType={config.chartType}
                chartLibrary={config.chartLibrary}
                options={config.chartOptions}
                factoryConfig={config.factoryConfig}
                availableColumns={effectiveColumns}
                onChange={handleOptionsChange}
              />
            </div>

            {/* Styling Options */}
            <div className="sidebar-section">
              <ChartStylingPanel
                styling={config.styling}
                chartType={config.chartType}
                onChange={handleStylingChange}
              />
            </div>
          </div>
        </Box>

        {/* MAIN CONTENT AREA */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, p: 2 }}>
            <ChartPreviewPanel
              config={config}
              data={data}
              loading={false}
              onRefresh={() => {
                // Trigger data refresh
                console.log('Refreshing chart data...');
              }}
            />
          </Box>
        </Box>
      </Box>
    </BuilderLayout>
  );
};

export default ChartBuilder;