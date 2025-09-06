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
  Preview as PreviewIcon
} from '@mui/icons-material';
import BuilderLayout from '../layout/BuilderLayout';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ChartConfig {
  id?: string;
  name: string;
  description?: string;
  chartType: ChartType;
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
  format?: string;
  gridLines: boolean;
  tickInterval?: number;
}

interface InteractivityConfig {
  tooltip: {
    enabled: boolean;
    format: string;
    showAllSeries: boolean;
  };
  zoom: {
    enabled: boolean;
    type: 'x' | 'y' | 'xy';
  };
  crossfilter: {
    enabled: boolean;
    linkedCharts: string[];
  };
  drill: {
    enabled: boolean;
    drillPath: string[];
  };
  export: {
    enabled: boolean;
    formats: ('png' | 'svg' | 'pdf' | 'csv')[];
  };
}

const CHART_TYPES: Array<{
  id: ChartType;
  name: string;
  icon: React.ReactNode;
  category: 'basic' | 'advanced' | 'specialized';
  description: string;
  dataDimensions: { minX: number; maxX: number; minY: number; maxY: number; supportsSeries: boolean; };
}> = [
  {
    id: 'bar',
    name: 'Bar Chart',
    icon: <BarChartIcon />,
    category: 'basic',
    description: 'Compare categories with horizontal bars',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 5, supportsSeries: true }
  },
  {
    id: 'column',
    name: 'Column Chart',
    icon: <StackedBarIcon />,
    category: 'basic',
    description: 'Compare categories with vertical columns',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 5, supportsSeries: true }
  },
  {
    id: 'line',
    name: 'Line Chart',
    icon: <LineChartIcon />,
    category: 'basic',
    description: 'Show trends and changes over time',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 10, supportsSeries: true }
  },
  {
    id: 'area',
    name: 'Area Chart',
    icon: <AreaIcon />,
    category: 'basic',
    description: 'Show cumulative values over time',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 5, supportsSeries: true }
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    icon: <PieChartIcon />,
    category: 'basic',
    description: 'Display parts of a whole',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 1, supportsSeries: false }
  },
  {
    id: 'donut',
    name: 'Donut Chart',
    icon: <DonutIcon />,
    category: 'basic',
    description: 'Pie chart with center space',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 1, supportsSeries: false }
  },
  {
    id: 'scatter',
    name: 'Scatter Plot',
    icon: <ScatterIcon />,
    category: 'advanced',
    description: 'Show correlation between two variables',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 1, supportsSeries: true }
  },
  {
    id: 'bubble',
    name: 'Bubble Chart',
    icon: <BubbleIcon />,
    category: 'advanced',
    description: 'Three-dimensional scatter plot',
    dataDimensions: { minX: 1, maxX: 1, minY: 1, maxY: 1, supportsSeries: true }
  },
  {
    id: 'radar',
    name: 'Radar Chart',
    icon: <RadarIcon />,
    category: 'specialized',
    description: 'Compare multiple quantitative variables',
    dataDimensions: { minX: 3, maxX: 10, minY: 1, maxY: 1, supportsSeries: true }
  }
];

const COLOR_PALETTES = {
  default: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'],
  viridis: ['#440154', '#31688e', '#35b779', '#fde725'],
  plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
  warm: ['#ff6b6b', '#ffa726', '#ffcc02', '#66bb6a', '#42a5f5'],
  cool: ['#26c6da', '#66bb6a', '#42a5f5', '#7986cb', '#ab47bc']
};

// =============================================================================
// Chart Builder Component
// =============================================================================

const ChartBuilder: React.FC<{
  chartId?: string;
  workspaceSlug?: string;
  onSave?: (chart: ChartConfig) => void;
  onCancel?: () => void;
}> = ({ 
  chartId, 
  workspaceSlug,
  onSave, 
  onCancel 
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    name: 'New Chart',
    chartType: 'bar',
    dataSource: {
      type: 'dataset',
      refreshInterval: 300
    },
    chartOptions: {
      dimensions: { x: [], y: [] },
      aggregation: { method: 'sum' },
      sorting: { direction: 'desc' }
    },
    styling: {
      theme: 'light',
      colors: { palette: 'default' },
      layout: {
        showLegend: true,
        legendPosition: 'right',
        showGrid: true,
        gridStyle: 'solid'
      },
      axes: {
        xAxis: { show: true, title: '', gridLines: true },
        yAxis: { show: true, title: '', gridLines: true }
      },
      labels: {
        showDataLabels: false,
        labelFormat: 'auto',
        fontSize: 12
      }
    },
    interactivity: {
      tooltip: { enabled: true, format: 'auto', showAllSeries: false },
      zoom: { enabled: false, type: 'x' },
      crossfilter: { enabled: false, linkedCharts: [] },
      drill: { enabled: false, drillPath: [] },
      export: { enabled: true, formats: ['png', 'csv'] }
    }
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [availableDatasets, setAvailableDatasets] = useState<any[]>([]);
  const [selectedDatasetColumns, setSelectedDatasetColumns] = useState<string[]>([]);

  const steps = [
    { label: 'Chart Type', icon: <BarChartIcon /> },
    { label: 'Data Source', icon: <DataIcon /> },
    { label: 'Configuration', icon: <ConfigIcon /> },
    { label: 'Styling', icon: <StyleIcon /> },
    { label: 'Preview', icon: <PreviewIcon /> }
  ];

  // Update chart config
  const updateChartConfig = useCallback((updates: Partial<ChartConfig>) => {
    setChartConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  // Load available datasets
  useEffect(() => {
    const loadDatasets = async () => {
      // TODO: Load actual datasets from API
      setAvailableDatasets([
        { id: 'dataset1', name: 'Sales Data', columns: ['date', 'amount', 'category', 'region'] },
        { id: 'dataset2', name: 'User Analytics', columns: ['user_id', 'event', 'timestamp', 'value'] },
        { id: 'dataset3', name: 'Product Performance', columns: ['product_id', 'sales', 'rating', 'category'] }
      ]);
    };
    loadDatasets();
  }, []);

  // Load preview data
  const loadPreviewData = useCallback(async () => {
    if (!chartConfig.dataSource.sourceId && chartConfig.dataSource.type === 'dataset') return;
    
    setPreviewLoading(true);
    try {
      // TODO: Load actual preview data based on configuration
      const mockData = generateMockData(chartConfig.chartType);
      setPreviewData(mockData);
    } catch (error) {
      console.error('Failed to load preview data:', error);
    } finally {
      setPreviewLoading(false);
    }
  }, [chartConfig.dataSource, chartConfig.chartType]);

  // Generate mock data for preview
  const generateMockData = (chartType: ChartType) => {
    const categories = ['Q1', 'Q2', 'Q3', 'Q4'];
    const series = ['Sales', 'Marketing', 'Support'];
    
    switch (chartType) {
      case 'pie':
      case 'donut':
        return categories.map(cat => ({
          name: cat,
          value: Math.floor(Math.random() * 100) + 10
        }));
      
      case 'scatter':
      case 'bubble':
        return Array.from({ length: 50 }, (_, i) => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: chartType === 'bubble' ? Math.random() * 30 + 5 : undefined
        }));
      
      default:
        return categories.flatMap(cat =>
          series.map(ser => ({
            category: cat,
            series: ser,
            value: Math.floor(Math.random() * 100) + 10
          }))
        );
    }
  };

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(chartConfig);
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle preview
  const handlePreview = () => {
    loadPreviewData();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <BuilderLayout
      builderType="chart"
      entityName={chartConfig.name}
      workspaceSlug={workspaceSlug}
      onSave={handleSave}
      onCancel={onCancel}
      onPreview={handlePreview}
      saving={saving}
      hasChanges={hasChanges}
      canSave={chartConfig.name.trim().length > 0 && chartConfig.chartType}
    >
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Configuration Panel */}
        <Box sx={{ width: 400, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          {/* Stepper */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stepper activeStep={currentStep} orientation="vertical" sx={{ 
              '& .MuiStepContent-root': { borderLeft: 'none', ml: 2, pl: 0 }
            }}>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel 
                    icon={step.icon}
                    onClick={() => setCurrentStep(index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          {/* Step Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {currentStep === 0 && (
              <ChartTypeSelector
                selectedType={chartConfig.chartType}
                onSelect={(type) => updateChartConfig({ chartType: type })}
              />
            )}

            {currentStep === 1 && (
              <DataSourceSelector
                config={chartConfig.dataSource}
                availableDatasets={availableDatasets}
                selectedColumns={selectedDatasetColumns}
                onConfigChange={(dataSource) => updateChartConfig({ dataSource })}
                onColumnsChange={setSelectedDatasetColumns}
              />
            )}

            {currentStep === 2 && (
              <ChartConfiguration
                chartType={chartConfig.chartType}
                options={chartConfig.chartOptions}
                availableColumns={selectedDatasetColumns}
                onChange={(chartOptions) => updateChartConfig({ chartOptions })}
              />
            )}

            {currentStep === 3 && (
              <ChartStylingPanel
                styling={chartConfig.styling}
                chartType={chartConfig.chartType}
                onChange={(styling) => updateChartConfig({ styling })}
              />
            )}

            {currentStep === 4 && (
              <ChartPreviewPanel
                config={chartConfig}
                data={previewData}
                loading={previewLoading}
                onRefresh={loadPreviewData}
              />
            )}
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              onClick={handleBack} 
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
            >
              Next
            </Button>
          </Box>
        </Box>

        {/* Chart Preview */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Preview Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">
                {chartConfig.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {CHART_TYPES.find(t => t.id === chartConfig.chartType)?.name} Preview
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={loadPreviewData} disabled={previewLoading}>
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={loadPreviewData} disabled={previewLoading}>
                <PlayIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Chart Preview Area */}
          <Box sx={{ flex: 1, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
            {previewLoading ? (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading preview...
                </Typography>
              </Box>
            ) : previewData.length > 0 ? (
              <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" color="text.secondary">
                  {CHART_TYPES.find(t => t.id === chartConfig.chartType)?.icon}
                </Typography>
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6">
                    {chartConfig.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Chart preview would render here with actual data
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Data points: {previewData.length}
                  </Typography>
                </Box>
              </Paper>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Preview Available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure your data source and chart settings to see a preview
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </BuilderLayout>
  );
};

// =============================================================================
// Chart Type Selector Component
// =============================================================================

const ChartTypeSelector: React.FC<{
  selectedType: ChartType;
  onSelect: (type: ChartType) => void;
}> = ({ selectedType, onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<'basic' | 'advanced' | 'specialized'>('basic');

  const categories = {
    basic: CHART_TYPES.filter(t => t.category === 'basic'),
    advanced: CHART_TYPES.filter(t => t.category === 'advanced'),
    specialized: CHART_TYPES.filter(t => t.category === 'specialized')
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Chart Type
      </Typography>

      <Tabs
        value={selectedCategory}
        onChange={(_, newValue) => setSelectedCategory(newValue)}
        sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab label="Basic" value="basic" />
        <Tab label="Advanced" value="advanced" />
        <Tab label="Specialized" value="specialized" />
      </Tabs>

      <Grid container spacing={2}>
        {categories[selectedCategory].map((chartType) => (
          <Grid item xs={12} sm={6} key={chartType.id}>
            <Card 
              variant={selectedType === chartType.id ? "elevation" : "outlined"}
              sx={{ 
                cursor: 'pointer',
                border: selectedType === chartType.id ? 2 : 1,
                borderColor: selectedType === chartType.id ? 'primary.main' : 'divider'
              }}
            >
              <CardActionArea onClick={() => onSelect(chartType.id)}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ fontSize: 40, color: 'primary.main', mb: 1 }}>
                    {chartType.icon}
                  </Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {chartType.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {chartType.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// =============================================================================
// Data Source Selector Component
// =============================================================================

const DataSourceSelector: React.FC<{
  config: DataSourceConfig;
  availableDatasets: any[];
  selectedColumns: string[];
  onConfigChange: (config: DataSourceConfig) => void;
  onColumnsChange: (columns: string[]) => void;
}> = ({ config, availableDatasets, selectedColumns, onConfigChange, onColumnsChange }) => {
  const selectedDataset = availableDatasets.find(d => d.id === config.sourceId);

  const handleDatasetChange = (datasetId: string) => {
    const dataset = availableDatasets.find(d => d.id === datasetId);
    onConfigChange({ ...config, sourceId: datasetId });
    onColumnsChange(dataset?.columns || []);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Data Source
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Source Type</InputLabel>
        <Select
          value={config.type}
          onChange={(e) => onConfigChange({ ...config, type: e.target.value as any })}
          label="Source Type"
        >
          <MenuItem value="dataset">Dataset</MenuItem>
          <MenuItem value="sql">SQL Query</MenuItem>
          <MenuItem value="api">API Endpoint</MenuItem>
        </Select>
      </FormControl>

      {config.type === 'dataset' && (
        <>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Dataset</InputLabel>
            <Select
              value={config.sourceId || ''}
              onChange={(e) => handleDatasetChange(e.target.value)}
              label="Dataset"
            >
              {availableDatasets.map((dataset) => (
                <MenuItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedDataset && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Available Columns:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {selectedDataset.columns.map((column: string) => (
                  <Chip
                    key={column}
                    label={column}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      {config.type === 'sql' && (
        <TextField
          fullWidth
          multiline
          rows={6}
          label="SQL Query"
          value={config.sqlQuery || ''}
          onChange={(e) => onConfigChange({ ...config, sqlQuery: e.target.value })}
          placeholder="SELECT * FROM table_name WHERE..."
          sx={{ mb: 3 }}
        />
      )}

      {config.type === 'api' && (
        <TextField
          fullWidth
          label="API Endpoint"
          value={config.apiEndpoint || ''}
          onChange={(e) => onConfigChange({ ...config, apiEndpoint: e.target.value })}
          placeholder="https://api.example.com/data"
          sx={{ mb: 3 }}
        />
      )}

      <TextField
        fullWidth
        type="number"
        label="Refresh Interval (seconds)"
        value={config.refreshInterval || ''}
        onChange={(e) => onConfigChange({ 
          ...config, 
          refreshInterval: e.target.value ? parseInt(e.target.value) : undefined 
        })}
        helperText="Leave empty to disable auto-refresh"
      />
    </Box>
  );
};

// =============================================================================
// Chart Configuration Component
// =============================================================================

const ChartConfiguration: React.FC<{
  chartType: ChartType;
  options: ChartOptions;
  availableColumns: string[];
  onChange: (options: ChartOptions) => void;
}> = ({ chartType, options, availableColumns, onChange }) => {
  const chartTypeInfo = CHART_TYPES.find(t => t.id === chartType);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Chart Configuration
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Data Mapping</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>X-Axis</InputLabel>
            <Select
              multiple
              value={options.dimensions.x}
              onChange={(e) => onChange({
                ...options,
                dimensions: { ...options.dimensions, x: e.target.value as string[] }
              })}
              label="X-Axis"
            >
              {availableColumns.map((column) => (
                <MenuItem key={column} value={column}>
                  {column}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Y-Axis</InputLabel>
            <Select
              multiple
              value={options.dimensions.y}
              onChange={(e) => onChange({
                ...options,
                dimensions: { ...options.dimensions, y: e.target.value as string[] }
              })}
              label="Y-Axis"
            >
              {availableColumns.map((column) => (
                <MenuItem key={column} value={column}>
                  {column}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {chartTypeInfo?.dataDimensions.supportsSeries && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Series (Optional)</InputLabel>
              <Select
                value={options.dimensions.series || ''}
                onChange={(e) => onChange({
                  ...options,
                  dimensions: { ...options.dimensions, series: e.target.value || undefined }
                })}
                label="Series (Optional)"
              >
                <MenuItem value="">None</MenuItem>
                {availableColumns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Aggregation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Aggregation Method</InputLabel>
            <Select
              value={options.aggregation.method}
              onChange={(e) => onChange({
                ...options,
                aggregation: { ...options.aggregation, method: e.target.value as any }
              })}
              label="Aggregation Method"
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

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Sorting & Limiting</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Sort Column</InputLabel>
                <Select
                  value={options.sorting.column || ''}
                  onChange={(e) => onChange({
                    ...options,
                    sorting: { ...options.sorting, column: e.target.value || undefined }
                  })}
                  label="Sort Column"
                >
                  <MenuItem value="">None</MenuItem>
                  {availableColumns.map((column) => (
                    <MenuItem key={column} value={column}>
                      {column}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Direction</InputLabel>
                <Select
                  value={options.sorting.direction}
                  onChange={(e) => onChange({
                    ...options,
                    sorting: { ...options.sorting, direction: e.target.value as any }
                  })}
                  label="Direction"
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            type="number"
            label="Limit Results"
            value={options.sorting.limit || ''}
            onChange={(e) => onChange({
              ...options,
              sorting: { 
                ...options.sorting, 
                limit: e.target.value ? parseInt(e.target.value) : undefined 
              }
            })}
            sx={{ mt: 2 }}
            helperText="Leave empty for no limit"
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

// =============================================================================
// Chart Styling Panel Component
// =============================================================================

const ChartStylingPanel: React.FC<{
  styling: ChartStyling;
  chartType: ChartType;
  onChange: (styling: ChartStyling) => void;
}> = ({ styling, chartType, onChange }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Chart Styling
      </Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Colors & Theme</Typography>
        </AccordionSummary>
        <AccordionDetails>
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
              {Object.keys(COLOR_PALETTES).map((palette) => (
                <MenuItem key={palette} value={palette}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {COLOR_PALETTES[palette as keyof typeof COLOR_PALETTES].slice(0, 4).map((color, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: color
                          }}
                        />
                      ))}
                    </Box>
                    {palette.charAt(0).toUpperCase() + palette.slice(1)}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
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
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Legend & Grid</Typography>
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
// Chart Preview Panel Component
// =============================================================================

const ChartPreviewPanel: React.FC<{
  config: ChartConfig;
  data: any[];
  loading: boolean;
  onRefresh: () => void;
}> = ({ config, data, loading, onRefresh }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Chart Preview
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Preview your chart configuration before saving. Make sure all settings look correct.
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2">
          Chart: {config.name}
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Configuration Summary:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="Chart Type"
              secondary={CHART_TYPES.find(t => t.id === config.chartType)?.name}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Data Source"
              secondary={config.dataSource.type === 'dataset' ? `Dataset: ${config.dataSource.sourceId}` : config.dataSource.type}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="X-Axis Fields"
              secondary={config.chartOptions.dimensions.x.join(', ') || 'Not configured'}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Y-Axis Fields"
              secondary={config.chartOptions.dimensions.y.join(', ') || 'Not configured'}
            />
          </ListItem>
          {config.chartOptions.dimensions.series && (
            <ListItem>
              <ListItemText
                primary="Series Field"
                secondary={config.chartOptions.dimensions.series}
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <TextField
        fullWidth
        label="Chart Name"
        value={config.name}
        onChange={(e) => {
          // This would need to be passed up to parent component
          // For now, just display
        }}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        multiline
        rows={2}
        label="Description (Optional)"
        value={config.description || ''}
        placeholder="Describe what this chart shows..."
      />
    </Box>
  );
};

export default ChartBuilder;