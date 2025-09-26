// bi_platform\web-application\src\pages\workspace\chart-builder.tsx
// FIXED VERSION - Proper data flow for dataset columns

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Card,
  CardContent,
  Alert,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Storage as DatasetIcon,
  BarChart as ChartIcon,
  Edit as EditIcon,
  Settings as CustomizeIcon,
  Code as QueryIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
  Timeline as TrendingIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import  NavbarOnlyLayout  from '@/components/layout/NavbarOnlyLayout';

// Import the components we need
import DatasetSelector from '@/components/builder/DatasetSelector';
import AdvancedChartSelector from '@/components/builder/ChartSelector';
import TimeRangeConfigurator from '@/components/builder/TimeRangeConfigurator';
import ChartCustomizationPanel from '@/components/builder/ChartCustomizationPanel';
import SQLQueryEditor from '@/components/builder/SQLQueryEditor';
import {ChartContainer} from '@/components/dashboard/ChartContainer';

// =============================================================================
// TYPES AND INTERFACES - FIXED
// =============================================================================

interface Dataset {
  id: string;
  name: string;
  display_name?: string;
  type: 'virtual' | 'physical' | 'table' | 'query';
  schema: string;
  connection: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
  // ADDED: Column information
  columns?: ColumnDefinition[];
  row_count?: number;
  last_updated?: string;
}

// ADDED: Column definition interface
interface ColumnDefinition {
  name: string;
  display_name?: string;
  data_type: string;
  nullable?: boolean;
  unique?: boolean;
  description?: string;
}

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  tags: string[];
  library: string;
}

interface TimeRange {
  type: 'relative' | 'specific' | 'no-filter';
  relative?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
    anchor: 'now' | 'start_of_day' | 'start_of_week' | 'start_of_month';
  };
  specific?: {
    start: Date | null;
    end: Date | null;
  };
}

interface ChartCustomization {
  percentageThreshold: number;
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  labelType: 'category_name' | 'value' | 'percentage' | 'category_and_value';
  numberFormat: 'adaptive' | 'fixed' | 'percent' | 'currency';
  dateFormat: 'adaptive' | 'smart_date' | 'custom';
  colorScheme: 'default' | 'custom';
  customColors: string[];
  opacity: number;
  showXAxis: boolean;
  showYAxis: boolean;
  xAxisTitle: string;
  yAxisTitle: string;
  showGrid: boolean;
  gridColor: string;
  showBorder: boolean;
  borderColor: string;
  enableTooltip: boolean;
  enableZoom: boolean;
  enableCrosshair: boolean;
}

// FIXED: Extended chart configuration with proper data flow
interface ExtendedChartConfiguration {
  name: string;
  dataset?: Dataset;
  chartType?: ChartType | string;
  timeRange?: TimeRange;
  customization: ChartCustomization;
  customQuery?: string;
  dimensions: {
    x?: string[];
    y?: string[];
    series?: string;
  };
  metrics: {
    metric: string;
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max';
  }[];
  library: string;
  fieldAssignments: Record<string, any>;
  aggregations: Record<string, any>;
  customConfig: Record<string, any>;
  layout: {
    columns?: number;
    gap?: number;
    padding?: number;
  };
  theme: {
    primary_color?: string;
    background_color?: string;
    text_color?: string;
  };
  // ADDED: Data management
  dataColumns: ColumnDefinition[];
  chartData: any[] | null;
  loadingData: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// =============================================================================
// TAB PANEL COMPONENT
// =============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
  </div>
);

// =============================================================================
// DEFAULT DATA
// =============================================================================

const defaultCustomization: ChartCustomization = {
  percentageThreshold: 5,
  showLegend: true,
  legendPosition: 'right',
  labelType: 'category_name',
  numberFormat: 'adaptive',
  dateFormat: 'adaptive',
  colorScheme: 'default',
  customColors: [],
  opacity: 100,
  showXAxis: true,
  showYAxis: true,
  xAxisTitle: '',
  yAxisTitle: '',
  showGrid: true,
  gridColor: '#e0e0e0',
  showBorder: false,
  borderColor: '#000000',
  enableTooltip: true,
  enableZoom: false,
  enableCrosshair: false
};

// =============================================================================
// MAIN COMPONENT - FIXED DATA FLOW
// =============================================================================

const ChartBuilderPage: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // UI State
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [showDatasetSelector, setShowDatasetSelector] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false);
  
  // FIXED: Chart configuration state with proper data management
  const [chartConfig, setChartConfig] = useState<ExtendedChartConfiguration>({
    name: 'New Chart',
    customization: defaultCustomization,
    dimensions: {},
    metrics: [{ metric: 'COUNT(*)', aggregation: 'count' }],
    chartType: 'bar',
    library: 'echarts',
    fieldAssignments: {},
    aggregations: {},
    customConfig: {},
    layout: {
      columns: 12,
      gap: 16,
      padding: 16
    },
    theme: {
      primary_color: '#1976d2',
      background_color: '#ffffff',
      text_color: '#333333'
    },
    // ADDED: Data management state
    dataColumns: [],
    chartData: null,
    loadingData: false
  });

  const [isAltered, setIsAltered] = useState(false);

  // =============================================================================
  // DATA FETCHING FUNCTIONS - NEW
  // =============================================================================

  // ADDED: Function to fetch dataset columns and preview data
  const fetchDatasetInfo = useCallback(async (datasetId: string) => {
    try {
      setChartConfig(prev => ({ ...prev, loadingData: true }));

      console.log(`🔍 Fetching data for dataset: ${datasetId}`);

      // Fetch dataset columns
      const columnsResponse = await fetch(`/api/datasets/${datasetId}/columns`);
      if (!columnsResponse.ok) {
        throw new Error('Failed to fetch dataset columns');
      }
      const columnsData = await columnsResponse.json();

      // Fetch dataset preview data (optional)
      const previewResponse = await fetch(`/api/datasets/${datasetId}/preview?limit=100`);
      let previewData = null;
      if (previewResponse.ok) {
        const preview = await previewResponse.json();
        previewData = preview.data;
      }

      // Update chart config with fetched data
      setChartConfig(prev => ({
        ...prev,
        dataColumns: columnsData.columns || [],
        chartData: previewData,
        loadingData: false
      }));

      console.log('✅ Dataset info loaded successfully:', {
        columns: columnsData.columns?.length || 0,
        previewRows: previewData?.length || 0
      });

    } catch (error) {
      console.error('❌ Error fetching dataset info:', error);
      setChartConfig(prev => ({ 
        ...prev, 
        loadingData: false,
        dataColumns: [],
        chartData: null
      }));
      
      // You might want to show an error toast here
      alert('Failed to load dataset information. Please try again.');
    }
  }, []);

  // =============================================================================
  // EVENT HANDLERS - FIXED WITH DATA LOADING
  // =============================================================================

  // FIXED: Handle dataset selection with data loading
  const handleDatasetSelect = useCallback(async (dataset: Dataset) => {
    console.log('📊 Dataset selected:', dataset);
    
    setChartConfig(prev => ({
      ...prev,
      dataset,
      // Reset data-related fields when dataset changes
      dataColumns: [],
      chartData: null,
      fieldAssignments: {},
      customQuery: undefined
    }));
    
    setIsAltered(true);
    setShowDatasetSelector(false);

    // ADDED: Automatically fetch dataset columns and data
    if (dataset.id) {
      await fetchDatasetInfo(dataset.id);
    }
  }, [fetchDatasetInfo]);

  // Handle chart type selection
  const handleChartTypeSelect = useCallback((chartType: ChartType) => {
    console.log('🎯 Chart type selected:', chartType);
    
    setChartConfig(prev => ({
      ...prev,
      chartType,
      library: chartType.library || 'echarts',
      // Reset field assignments when chart type changes
      fieldAssignments: {}
    }));
    
    setIsAltered(true);
    setShowChartSelector(false);
  }, []);

  // Handle time range changes
  const handleTimeRangeChange = useCallback((timeRange: TimeRange) => {
    setChartConfig(prev => ({
      ...prev,
      timeRange
    }));
    setIsAltered(true);
    setShowTimeRangeDialog(false);
  }, []);

  // Handle customization changes
  const handleCustomizationChange = useCallback((customization: ChartCustomization) => {
    setChartConfig(prev => ({
      ...prev,
      customization
    }));
    setIsAltered(true);
  }, []);

  // ADDED: Handle configuration changes from ChartCustomizationPanel
  const handleConfigurationChange = useCallback((config: any) => {
    console.log('🔧 Configuration changed:', config);
    
    setChartConfig(prev => ({
      ...prev,
      customConfig: config,
      fieldAssignments: { ...prev.fieldAssignments, ...config.fieldAssignments }
    }));
    setIsAltered(true);
  }, []);

  // ADDED: Handle chart export
  const handleExportChart = useCallback(() => {
    // Logic to export chart as image or PDF
    console.log('🖼️ Exporting chart...');
    // You can implement actual export functionality here
  }, []);

  // ADDED: Handle fullscreen toggle
  const handleFullscreenChart = useCallback(() => {
    console.log('🔍 Toggling fullscreen...');
    // You can implement fullscreen functionality here
  }, []);

  // ADDED: Handle chart save
  const handleSaveChart = useCallback(async () => {
    if (!chartConfig.dataset || !chartConfig.chartType) {
      alert('Please select both dataset and chart type before saving.');
      return;
    }

    setSaving(true);
    try {
      const chartData = {
        name: chartConfig.name,
        type: typeof chartConfig.chartType === 'string' ? chartConfig.chartType : chartConfig.chartType.id,
        library: chartConfig.library,
        dataset_id: chartConfig.dataset.id,
        configuration: chartConfig.customConfig,
        field_assignments: chartConfig.fieldAssignments,
        customization: chartConfig.customization,
        time_range: chartConfig.timeRange,
        custom_query: chartConfig.customQuery,
        workspace_id: workspace?.id
      };

      const response = await fetch('/api/charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chartData)
      });

      if (!response.ok) {
        throw new Error('Failed to save chart');
      }

      const savedChart = await response.json();
      console.log('✅ Chart saved successfully:', savedChart);
      
      // Navigate to charts list or show success message
      router.push('/workspace/charts');
      
    } catch (error) {
      console.error('❌ Error saving chart:', error);
      alert('Failed to save chart. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [chartConfig, workspace?.id, router]);

  // Handle query changes
  const handleQueryChange = useCallback((customQuery: string) => {
    setChartConfig(prev => ({
      ...prev,
      customQuery
    }));
    setIsAltered(true);
  }, []);

  // ADDED: Handle manual data refresh
  const handleRefreshData = useCallback(async () => {
    if (chartConfig.dataset?.id) {
      await fetchDatasetInfo(chartConfig.dataset.id);
    }
  }, [chartConfig.dataset?.id, fetchDatasetInfo]);

  // =============================================================================
  // PREVIEW COMPONENTS - ENHANCED WITH ACTUAL CHART RENDERING
  // =============================================================================

  const ChartPreview = () => {
    // Loading state
    if (chartConfig.loadingData) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading dataset...
          </Typography>
        </Box>
      );
    }

    // Check if we have everything needed for chart rendering
    if (!chartConfig.dataset) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <ChartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Select a Dataset
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a dataset to start building your chart
          </Typography>
        </Box>
      );
    }

    if (!chartConfig.chartType) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <ChartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Select a Chart Type
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose how you want to visualize your data
          </Typography>
        </Box>
      );
    }

    // Render the actual chart using ChartContainer
    return (
      <ChartContainer
        chartType={typeof chartConfig.chartType === 'string' ? chartConfig.chartType : chartConfig.chartType.id || 'bar'}
        chartLibrary={chartConfig.library}
        configuration={{
          ...chartConfig.customConfig,
          ...chartConfig.customization,
          title: chartConfig.name,
          showLegend: chartConfig.customization.showLegend,
          primaryColor: chartConfig.theme.primary_color,
          xAxisTitle: chartConfig.customization.xAxisTitle,
          yAxisTitle: chartConfig.customization.yAxisTitle
        }}
        data={chartConfig.chartData}
        dataColumns={chartConfig.dataColumns}
        width="100%"
        height="100%"
        loading={chartConfig.loadingData}
        onRefresh={handleRefreshData}
        onExport={handleExportChart}
        onFullscreen={handleFullscreenChart}
        onConfigure={() => setTabValue(2)} // Switch to customize tab
        onDataPointClick={(data) => {
          console.log('📊 Chart data point clicked:', data);
        }}
      />
    );
  };

  const breadcrumbs = [
    { label: 'Workspace', href: `/workspace/overview` },
    { label: 'Charts', href: `/workspace/charts` },
    { label: 'Chart Builder' }
  ];

  // =============================================================================
  // RENDER - FIXED WITH PROPER PROPS
  // =============================================================================

  return (
    <NavbarOnlyLayout
      title="Chart Builder"
      subtitle="Create interactive charts with Chart Factory"
      breadcrumbs={breadcrumbs}
    >
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          {/* Left Panel - Configuration */}
          <Box sx={{ width: 350, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Tabs 
              value={tabValue} 
              variant="scrollable" 
              aria-label="chart builder tabs" 
              scrollButtons="auto" 
              onChange={(_, newValue) => setTabValue(newValue)}
            >
              <Tab label="Data" />
              <Tab label="Query" />
              <Tab label="Customize" />
            </Tabs>

            {/* FIXED: Data Loading Progress */}
            {chartConfig.loadingData && (
              <LinearProgress />
            )}

            <TabPanel value={tabValue} index={0}>
              {/* Dataset Selection */}
              <Paper sx={{ m: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatasetIcon />
                  Dataset
                  {chartConfig.dataset && (
                    <IconButton 
                      size="small" 
                      onClick={handleRefreshData}
                      disabled={chartConfig.loadingData}
                      title="Refresh dataset"
                    >
                      <RefreshIcon />
                    </IconButton>
                  )}
                </Typography>
                
                <Card 
                  variant="outlined" 
                  sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                  onClick={() => setShowDatasetSelector(true)}
                >
                  <CardContent sx={{ p: 2 }}>
                    {chartConfig.dataset ? (
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {chartConfig.dataset.display_name || chartConfig.dataset.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {chartConfig.dataset.type} • {chartConfig.dataset.schema}
                        </Typography>
                        {/* ADDED: Column count display */}
                        {chartConfig.dataColumns.length > 0 && (
                          <Chip 
                            label={`${chartConfig.dataColumns.length} columns`}
                            size="small" 
                            color="success"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Click to select a dataset
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Paper>

              {/* Chart Type Selection */}
              <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Chart Type</Typography>
                <Card 
                  variant="outlined" 
                  sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                  onClick={() => setShowChartSelector(true)}
                >
                  <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ChartIcon />
                    <Typography variant="body1">
                      {typeof chartConfig.chartType === 'string' ? 
                        chartConfig.chartType : 
                        chartConfig.chartType?.name || 'Select Chart Type'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Paper>

              {/* Time Range */}
              <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Time Range</Typography>
                <Card 
                  variant="outlined" 
                  sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                  onClick={() => setShowTimeRangeDialog(true)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {chartConfig.timeRange?.type === 'relative' ? 
                        `Last ${chartConfig.timeRange.relative?.value} ${chartConfig.timeRange.relative?.unit}` :
                        chartConfig.timeRange?.type === 'specific' ?
                        'Custom date range' :
                        'No time filter (recommended)'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Paper>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* SQL Query Editor */}
              <Box sx={{ height: '100%', p: 2 }}>
                <SQLQueryEditor
                  value={chartConfig.customQuery || ''}
                  onChange={handleQueryChange}
                  dataset={chartConfig.dataset}
                />
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {/* FIXED: Chart Customization Panel with proper props */}
              <Box sx={{ height: '100%', overflow: 'auto' }}>
                <ChartCustomizationPanel
                  chartType={typeof chartConfig.chartType === 'string' ? chartConfig.chartType : chartConfig.chartType?.id || 'bar'}
                  chartLibrary={chartConfig.library}
                  configuration={chartConfig.customConfig}
                  dataColumns={chartConfig.dataColumns} // ✅ FIXED: Pass the actual data columns
                  onChange={handleConfigurationChange}
                  onReset={() => {
                    setChartConfig(prev => ({
                      ...prev,
                      customConfig: {},
                      fieldAssignments: {}
                    }));
                  }}
                  onPreview={(config) => {
                    console.log('👀 Preview configuration:', config);
                  }}
                />
              </Box>
            </TabPanel>
          </Box>

          {/* Right Panel - Chart Preview */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Preview Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Chart Preview</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PreviewIcon />}
                    disabled={!chartConfig.dataset || !chartConfig.chartType || chartConfig.loadingData}
                    onClick={() => {
                      console.log('👀 Preview button clicked - chart should render automatically');
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    disabled={!chartConfig.dataset || !chartConfig.chartType || chartConfig.loadingData}
                    onClick={handleExportChart}
                  >
                    Export
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    loading={saving}
                    onClick={handleSaveChart}
                    disabled={!isAltered || !chartConfig.dataset || !chartConfig.chartType || saving}
                  >
                    {saving ? 'Saving...' : 'Save Chart'}
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Chart Preview Area - FIXED with actual chart rendering */}
            <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <ChartPreview />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <DatasetSelector
        open={showDatasetSelector}
        onClose={() => setShowDatasetSelector(false)}
        onSelect={handleDatasetSelect}
        selectedDatasetId={chartConfig.dataset?.id}
      />

      <AdvancedChartSelector
        open={showChartSelector}
        onClose={() => setShowChartSelector(false)}
        onSelect={handleChartTypeSelect}
        selectedChartId={typeof chartConfig.chartType === 'string' ? chartConfig.chartType : chartConfig.chartType?.id}
      />

      <TimeRangeConfigurator
        open={showTimeRangeDialog}
        onClose={() => setShowTimeRangeDialog(false)}
        onApply={handleTimeRangeChange}
        initialRange={chartConfig.timeRange}
      />
    </NavbarOnlyLayout>
  );
};

export default ChartBuilderPage;