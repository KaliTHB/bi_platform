import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Snackbar,
  Menu,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Dns as DatasetIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  FullscreenExit as ResizeIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  BarChart as ChartIcon,
  TextFields as TextIcon,
  Image as ImageIcon,
  TableChart as TableIcon,
  FilterList as FilterIcon,
  Palette as ThemeIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  MoreVert as MoreVertIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Timeline as MetricsIcon,
  Fullscreen as FullscreenIcon
} from '@mui/icons-material';

// ✅ RTK Query imports for all chart operations
import { 
  useCreateChartMutation,
  useUpdateChartMutation,
  useGetChartQuery,
  useGetChartDataQuery,
  useLazyGetChartDataQuery,
  useExportChartMutation,
  useRefreshChartMutation
} from '@/store/api/chartApi';

import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import NavbarOnlyLayout from '@/components/layout/NavbarOnlyLayout';

// ✅ Import ChartContainer component with all its functionality
import { ChartContainer } from '@/components/dashboard/ChartContainer';

// Import builder components
import DatasetSelector from '@/components/builder/DatasetSelector';
import AdvancedChartSelector from '@/components/builder/ChartSelector';
import TimeRangeConfigurator from '@/components/builder/TimeRangeConfigurator';
import ChartCustomizationPanel from '@/components/builder/ChartCustomizationPanel';
import SQLQueryEditor from '@/components/builder/SQLQueryEditor';

// Import types
import { 
  ChartConfiguration,
  ChartDimensions,
  ChartTheme,
  ChartType as ChartTypeEnum,
  DEFAULT_CHART_CONFIG,
  Chart,
  ChartInteractionEvent,
  ChartError 
} from '@/types/chart.types';
import { Dataset, ColumnDefinition } from '@/types/dataset.types';

// =============================================================================
// TYPES AND INTERFACES - ALL EXISTING TYPES
// =============================================================================

interface Dataset {
  id: string;
  name: string;
  display_name?: string;
  type: 'virtual' | 'physical';
  schema: string;
  connection: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  tags: string[];
}

interface TimeRange {
  type: 'relative' | 'specific' | 'no-filter';
  relative?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
    anchor: 'now' | 'start_of_day' | 'start_of_week' | 'start_of_month';
  };
  specific?: {
    start: Date;
    end: Date;
  };
}

interface ChartCustomization {
  percentageThreshold: number;
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  labelType: 'category_name' | 'value' | 'both';
  numberFormat: 'adaptive' | 'integer' | 'decimal' | 'percentage';
  dateFormat: 'adaptive' | 'iso' | 'locale';
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

interface Widget {
  id: string;
  type: 'chart' | 'text' | 'image' | 'table' | 'metric' | 'filter';
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: {
    chart_id?: string;
    content?: string;
    image_url?: string;
    table_query?: string;
    metric_value?: number;
    metric_label?: string;
    filter_field?: string;
  };
}

interface ExtendedChartConfiguration {
  // Basic chart properties
  name: string;
  title?: string;
  library?: string;
  
  // Builder-specific properties
  dataset?: Dataset;
  chartType?: ChartType | string;
  timeRange?: TimeRange;
  customization: ChartCustomization;
  customQuery?: string;
  
  // Chart configuration properties
  dimensions: {
    x?: string[];
    y?: string[];
    series?: string;
  };
  metrics: {
    metric: string;
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max';
  }[];
  
  // Additional configuration
  fieldAssignments?: Record<string, any>;
  aggregations?: Record<string, any>;
  customConfig?: Record<string, any>;
  
  // Layout and theme
  layout?: {
    columns?: number;
    gap?: number;
    padding?: number;
  };
  theme?: {
    primary_color?: string;
    background_color?: string;
    text_color?: string;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// TabPanel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

// Default customization values
const defaultCustomization: ChartCustomization = {
  percentageThreshold: 1.0,
  showLegend: true,
  legendPosition: 'bottom',
  labelType: 'category_name',
  numberFormat: 'adaptive',
  dateFormat: 'adaptive',
  colorScheme: 'default',
  customColors: ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2'],
  opacity: 1.0,
  showXAxis: true,
  showYAxis: true,
  xAxisTitle: '',
  yAxisTitle: '',
  showGrid: true,
  gridColor: '#e0e0e0',
  showBorder: false,
  borderColor: '#cccccc',
  enableTooltip: true,
  enableZoom: true,
  enableCrosshair: false
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ChartBuilderPage: React.FC = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // Extract chart ID from URL for edit mode
  const chartId = router.query.chartId as string | undefined;
  const isEditMode = Boolean(chartId);

  // ✅ RTK Query hooks for all chart operations
  const [createChart, { 
    isLoading: createLoading, 
    error: createError,
    isSuccess: createSuccess 
  }] = useCreateChartMutation();
  
  const [updateChart, { 
    isLoading: updateLoading, 
    error: updateError,
    isSuccess: updateSuccess 
  }] = useUpdateChartMutation();

  const [exportChart, { 
    isLoading: exportLoading 
  }] = useExportChartMutation();

  // Load existing chart in edit mode
  const {
    data: existingChartResponse,
    isLoading: chartLoading,
    error: chartError,
    refetch: refetchChart
  } = useGetChartQuery(
    chartId!,
    { 
      skip: !chartId || !isEditMode,
      refetchOnMountOrArgChange: true 
    }
  );

  // UI state
  const [tabValue, setTabValue] = useState(0);
  const [showDatasetSelector, setShowDatasetSelector] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  
  // ✅ ChartContainer specific state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(true);
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Chart configuration state
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
    }
  });

  const [activeTab, setActiveTab] = useState(0);
  const [isAltered, setIsAltered] = useState(false);

  // ✅ Create chart object for ChartContainer (when in edit mode)
  const chartForContainer: Chart | null = useMemo(() => {
    if (!isEditMode || !existingChartResponse?.success || !existingChartResponse.chart) {
      return null;
    }

    return {
      id: existingChartResponse.chart.id,
      name: existingChartResponse.chart.name,
      display_name: existingChartResponse.chart.display_name || existingChartResponse.chart.name,
      description: existingChartResponse.chart.description,
      chart_type: existingChartResponse.chart.chart_type,
      chart_library: existingChartResponse.chart.chart_library,
      dataset_ids: existingChartResponse.chart.dataset_ids || [],
      config_json: existingChartResponse.chart.config_json,
      position_json: existingChartResponse.chart.position_json,
      styling_config: existingChartResponse.chart.styling_config,
      query_config: existingChartResponse.chart.query_config,
      is_active: existingChartResponse.chart.is_active,
      created_at: existingChartResponse.chart.created_at,
      updated_at: existingChartResponse.chart.updated_at
    };
  }, [existingChartResponse, isEditMode]);

  // ✅ Load existing chart data when editing (RTK Query integration)
  useEffect(() => {
    if (isEditMode && existingChartResponse?.success && existingChartResponse.chart) {
      const chart = existingChartResponse.chart;
      
      setChartConfig(prev => ({
        ...prev,
        name: chart.display_name || chart.name,
        chartType: chart.chart_type,
        library: chart.chart_library,
        dimensions: chart.config_json?.dimensions || {},
        metrics: chart.config_json?.metrics || prev.metrics,
        fieldAssignments: chart.config_json?.fieldAssignments || {},
        aggregations: chart.config_json?.aggregations || {},
        customConfig: {
          ...chart.config_json,
          polling: chart.config_json?.polling || prev.customConfig?.polling
        },
        customization: chart.config_json?.customization || prev.customization,
        timeRange: chart.config_json?.timeRange,
        customQuery: chart.config_json?.customQuery
      }));

      setIsAltered(false);
    }
  }, [existingChartResponse, isEditMode]);

  // ✅ Handle RTK Query success/error notifications
  useEffect(() => {
    if (createSuccess) {
      setNotification({
        open: true,
        message: 'Chart created successfully!',
        severity: 'success'
      });
      setIsAltered(false);
    }
  }, [createSuccess]);

  useEffect(() => {
    if (updateSuccess) {
      setNotification({
        open: true,
        message: 'Chart updated successfully!',
        severity: 'success'
      });
      setIsAltered(false);
    }
  }, [updateSuccess]);

  useEffect(() => {
    if (createError || updateError) {
      const error = createError || updateError;
      setNotification({
        open: true,
        message: `Failed to ${isEditMode ? 'update' : 'create'} chart: ${
          error && 'data' in error ? error.data?.message || 'Unknown error' : 'Unknown error'
        }`,
        severity: 'error'
      });
    }
  }, [createError, updateError, isEditMode]);

  // =============================================================================
  // EVENT HANDLERS - ALL EXISTING FUNCTIONALITY PRESERVED
  // =============================================================================

  const handleDatasetSelect = (dataset: Dataset) => {
    setChartConfig(prev => ({
      ...prev,
      dataset
    }));
    setIsAltered(true);
  };

  const handleChartTypeSelect = (chartType: ChartType) => {
    setChartConfig(prev => ({
      ...prev,
      chartType
    }));
    setIsAltered(true);
  };

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    setChartConfig(prev => ({
      ...prev,
      timeRange
    }));
    setIsAltered(true);
  };

  const handleCustomizationChange = (customization: ChartCustomization) => {
    setChartConfig(prev => ({
      ...prev,
      customization
    }));
    setIsAltered(true);
  };

  const handleQueryChange = (customQuery: string) => {
    setChartConfig(prev => ({
      ...prev,
      customQuery
    }));
    setIsAltered(true);
  };

  // ✅ ChartContainer event handlers
  const handleChartRefreshComplete = useCallback((success: boolean) => {
    if (success) {
      setNotification({
        open: true,
        message: 'Chart refreshed successfully',
        severity: 'success'
      });
    } else {
      setNotification({
        open: true,
        message: 'Failed to refresh chart',
        severity: 'error'
      });
    }
  }, []);

  const handleChartInteraction = useCallback((event: ChartInteractionEvent) => {
    console.log('Chart interaction:', event);
    // Handle chart interactions like clicks, hovers, etc.
    if (event.type === 'click') {
      setNotification({
        open: true,
        message: `Chart clicked: ${JSON.stringify(event.data)}`,
        severity: 'info'
      });
    }
  }, []);

  // ✅ Manual refresh trigger
  const handleManualRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // ✅ UPDATED: Save chart function with RTK Query
  const handleSaveChart = async () => {
    if (!workspace?.id || !chartConfig.dataset) {
      setNotification({
        open: true,
        message: 'Please select a dataset and ensure you\'re in a workspace',
        severity: 'warning'
      });
      return;
    }

    try {
      // Prepare chart data for API (same structure as before)
      const chartData: Partial<Chart> = {
        name: chartConfig.name,
        display_name: chartConfig.name,
        description: `Chart created from dataset: ${chartConfig.dataset.name}`,
        chart_type: typeof chartConfig.chartType === 'string' 
          ? chartConfig.chartType 
          : chartConfig.chartType?.id || 'bar',
        chart_library: chartConfig.library || 'echarts',
        workspace_id: workspace.id,
        dataset_ids: [chartConfig.dataset.id],
        config_json: {
          dimensions: chartConfig.dimensions,
          metrics: chartConfig.metrics,
          fieldAssignments: chartConfig.fieldAssignments,
          aggregations: chartConfig.aggregations,
          customConfig: chartConfig.customConfig,
          timeRange: chartConfig.timeRange,
          customQuery: chartConfig.customQuery,
          customization: chartConfig.customization
        },
        is_active: true
      };

      if (isEditMode && chartId) {
        // Update existing chart using RTK Query
        await updateChart({ 
          id: chartId, 
          data: chartData 
        }).unwrap();
      } else {
        // Create new chart using RTK Query
        const result = await createChart(chartData).unwrap();
        
        // If creation was successful and we have a new chart ID, navigate to edit mode
        if (result.success && result.chart?.id) {
          router.replace(`/workspace/${workspace.slug}/chart-builder?chartId=${result.chart.id}`);
        }
      }
      
    } catch (error) {
      console.error('Failed to save chart:', error);
      // Error handling is done in useEffect hooks above
    }
  };

  // ✅ Export chart function using RTK Query
  const handleExportChart = async (format: 'png' | 'svg' | 'pdf' | 'json' = 'png') => {
    if (!chartId) {
      setNotification({
        open: true,
        message: 'Please save the chart first before exporting',
        severity: 'warning'
      });
      return;
    }

    try {
      const result = await exportChart({
        id: chartId,
        options: {
          format,
          userId: user?.id || '',
          includeData: format === 'json',
          dimensions: { width: 800, height: 600 }
        }
      }).unwrap();

      if (result.success && result.export?.download_url) {
        // Open download URL in new tab
        window.open(result.export.download_url, '_blank');
        
        setNotification({
          open: true,
          message: 'Chart export started successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to export chart:', error);
      setNotification({
        open: true,
        message: 'Failed to export chart',
        severity: 'error'
      });
    }
  };

  // EXISTING widget functions - NO CHANGES
  const addWidget = (widgetType: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: widgetType,
      title: `New ${widgetType}`,
      position: {
        x: 0,
        y: widgets.length * 2,
        w: widgetType === 'chart' ? 6 : 4,
        h: widgetType === 'chart' ? 4 : 2
      },
      config: {}
    };
    setWidgets([...widgets, newWidget]);
    setIsAltered(true);
  };

  const deleteWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    setIsAltered(true);
  };

  const renderWidget = (widget: Widget, index: number) => {
    return (
      <Grid item xs={12} sm={6} md={4} key={widget.id}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            '&:hover .widget-actions': {
              opacity: 1
            }
          }}
        >
          <IconButton
            className="widget-actions"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              opacity: 0,
              transition: 'opacity 0.2s'
            }}
            onClick={() => deleteWidget(widget.id)}
          >
            <DeleteIcon />
          </IconButton>
          
          {widget.type === 'chart' && <ChartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />}
          {widget.type === 'text' && <TextIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />}
          {widget.type === 'image' && <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />}
          {widget.type === 'table' && <TableIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />}
          
          <Typography variant="body2" color="text.secondary">
            {widget.title}
          </Typography>
        </Paper>
      </Grid>
    );
  };

  // ✅ ENHANCED ChartPreview component with ChartContainer integration
  const ChartPreview = () => {
    // If we have a saved chart (edit mode), use ChartContainer
    if (isEditMode && chartForContainer) {
      return (
        <Box sx={{ height: '100%', minHeight: 400 }}>
          <Paper
            variant="outlined"
            sx={{
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* ✅ INTEGRATED: ChartContainer with all its functionality */}
            <ChartContainer
              chart={chartForContainer}
              refreshTrigger={refreshTrigger}
              onRefreshComplete={handleChartRefreshComplete}
              onInteraction={handleChartInteraction}
              fullscreen={fullscreen}
              workspaceId={workspace?.id}
              maxRetries={3}
              showErrorInCard={true}
              performanceMetrics={showPerformanceMetrics}
              gridItem={false}
              globalFilters={globalFilters}
              dashboardRefreshTrigger={refreshTrigger}
            />
            
            {/* Chart controls overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                p: 0.5,
                boxShadow: 1
              }}
            >
              <Tooltip title="Refresh Chart">
                <IconButton size="small" onClick={handleManualRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Toggle Performance Metrics">
                <IconButton 
                  size="small" 
                  onClick={() => setShowPerformanceMetrics(!showPerformanceMetrics)}
                  color={showPerformanceMetrics ? 'primary' : 'default'}
                >
                  <MetricsIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Toggle Fullscreen">
                <IconButton 
                  size="small" 
                  onClick={() => setFullscreen(!fullscreen)}
                >
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Export Chart">
                <IconButton 
                  size="small" 
                  onClick={() => handleExportChart('png')}
                  disabled={exportLoading}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        </Box>
      );
    }

    // Default preview for new charts
    return (
      <Box
        sx={{
          height: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          flexDirection: 'column',
          gap: 2
        }}
      >
        {chartConfig.chartType ? (
          <Box sx={{ textAlign: 'center' }}>
            <ChartIcon sx={{ fontSize: 64, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              {typeof chartConfig.chartType === 'string' 
                ? chartConfig.chartType 
                : chartConfig.chartType.name || 'Chart'
              } Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Save the chart to see live preview with data
            </Typography>
            {/* Show configuration status */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={chartConfig.dataset ? `Dataset: ${chartConfig.dataset.name}` : 'No Dataset'}
                color={chartConfig.dataset ? 'success' : 'default'}
                size="small"
              />
              <Chip 
                label={`Type: ${typeof chartConfig.chartType === 'string' ? chartConfig.chartType : chartConfig.chartType?.name || 'Unknown'}`}
                color="info"
                size="small"
              />
              {chartConfig.timeRange && (
                <Chip 
                  label="Time Filter Applied"
                  color="warning"
                  size="small"
                />
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center' }}>
            <ChartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Select a chart type to preview
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // EXISTING breadcrumbs - NO CHANGES
  const breadcrumbs = [
    { label: 'Workspace', href: `/workspace/overview` },
    { label: 'Charts', href: `/workspace/charts` },
    { label: isEditMode ? 'Edit Chart' : 'Chart Builder' }
  ];

  // Loading state for initial chart load in edit mode
  if (isEditMode && chartLoading) {
    return (
      <NavbarOnlyLayout
        title="Chart Builder"
        subtitle="Loading chart..."
        breadcrumbs={breadcrumbs}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      </NavbarOnlyLayout>
    );
  }

  // =============================================================================
  // RENDER - WITH CHARTCONTAINER INTEGRATION
  // =============================================================================

  return (
    <NavbarOnlyLayout
      title={isEditMode ? `Edit Chart: ${chartConfig.name}` : "Chart Builder"}
      subtitle="Create interactive charts with Chart Factory"
      breadcrumbs={breadcrumbs}
    >
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Loading indicator during save operations */}
        {(createLoading || updateLoading) && (
          <Box sx={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 1300 }}>
            <LinearProgress />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          {/* Left Panel - Configuration - NO CHANGES TO STRUCTURE */}
          <Box sx={{ width: 350, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header with Save Button - ENHANCED */}
            <Box sx={{ 
              p: 3, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'background.paper'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">
                  {chartConfig.name}
                </Typography>
                {isAltered && (
                  <Chip 
                    label="Unsaved" 
                    color="warning" 
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<PreviewIcon />}
                  size="small"
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  Preview
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<SaveIcon />}
                  onClick={handleSaveChart}
                  disabled={createLoading || updateLoading || !chartConfig.dataset}
                  size="small"
                >
                  {createLoading || updateLoading ? 'Saving...' : 'Save'}
                </Button>
                {isEditMode && chartId && (
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => handleExportChart('png')}
                    disabled={exportLoading}
                  >
                    Export
                  </Button>
                )}
              </Box>
            </Box>

            {/* Tabs - NO CHANGES */}
            <Tabs 
              value={tabValue} 
              variant="scrollable" 
              aria-label="scrollable tabs" 
              scrollButtons="auto" 
              onChange={(_, newValue) => setTabValue(newValue)}
            >
              <Tab label="Data" />
              <Tab label="Query" />
              <Tab label="Customize" />
            </Tabs>

            {/* Tab Panels - NO CHANGES TO STRUCTURE */}
            <TabPanel value={tabValue} index={0}>
              {/* Dataset Selection */}
              <Paper sx={{ m: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatasetIcon />
                  Dataset
                </Typography>
                
                <Card 
                  variant="outlined" 
                  sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                  onClick={() => setShowDatasetSelector(true)}
                >
                  <CardContent sx={{ p: 2 }}>
                    {chartConfig.dataset ? (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {chartConfig.dataset.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {chartConfig.dataset.schema} • {chartConfig.dataset.connection}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Click to select dataset
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Paper>

              {/* Chart Type Selection */}
              <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ChartIcon />
                  Visualization Type
                </Typography>
                
                <Card 
                  variant="outlined" 
                  sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                  onClick={() => setShowChartSelector(true)}
                >
                  <CardContent sx={{ p: 2 }}>
                    {chartConfig.chartType ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {typeof chartConfig.chartType !== 'string' && chartConfig.chartType.icon}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {typeof chartConfig.chartType === 'string' 
                              ? chartConfig.chartType 
                              : chartConfig.chartType.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {typeof chartConfig.chartType !== 'string' && chartConfig.chartType.description}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Click to select chart type
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Paper>

              {/* Time Range */}
              <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1">Time Range</Typography>
                  <IconButton size="small" onClick={() => setShowTimeRangeDialog(true)}>
                    <EditIcon />
                  </IconButton>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  {chartConfig.timeRange?.type === 'relative' ? 
                    `Last ${chartConfig.timeRange.relative?.value} ${chartConfig.timeRange.relative?.unit}` :
                    chartConfig.timeRange?.type === 'specific' ? 
                    `Custom time range applied` : 
                    'No time filter'
                  }
                </Typography>
              </Paper>

              {/* ✅ Manual Refresh Control */}
              {isEditMode && chartForContainer && (
                <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RefreshIcon />
                    Chart Actions
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={handleManualRefresh}
                      fullWidth
                      size="small"
                    >
                      Refresh Chart Data
                    </Button>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showPerformanceMetrics}
                          onChange={(e) => setShowPerformanceMetrics(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          Show Performance Metrics
                        </Typography>
                      }
                    />
                  </Box>
                </Paper>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Query Builder */}
              <Paper sx={{ m: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Query</Typography>
                <Typography variant="body2" color="text.secondary">
                  Query builder interface would be implemented here
                </Typography>
              </Paper>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ display: 'flex', height: '100%' }}>
                <Box sx={{ width: '100%', borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
                  <ChartCustomizationPanel
                    chartType={typeof chartConfig.chartType === 'string' ? 
                      chartConfig.chartType : 
                      chartConfig.chartType?.id || 'bar'
                    }
                    customization={chartConfig.customization}
                    onChange={handleCustomizationChange}
                  />
                </Box>
              </Box>       
            </TabPanel>
          </Box>

          {/* ✅ Main Canvas - NOW WITH CHARTCONTAINER INTEGRATION */}
          <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
            <Paper
              variant="outlined"
              sx={{
                minHeight: '100%',
                p: (chartConfig.layout?.padding || 16) / 8,
                backgroundColor: chartConfig.theme?.background_color || '#ffffff',
                position: 'relative'
              }}
            >
              {widgets.length === 0 ? (
                <ChartPreview />
              ) : (
                <Grid container spacing={(chartConfig.layout?.gap || 16) / 8}>
                  {widgets.map(renderWidget)}
                </Grid>
              )}
            </Paper>
          </Box>
        </Box>

        {/* Existing Dialogs - NO CHANGES */}
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
          selectedChartId={typeof chartConfig.chartType === 'string' ? 
            chartConfig.chartType : 
            chartConfig.chartType?.id
          }
        />

        <TimeRangeConfigurator
          open={showTimeRangeDialog}
          onClose={() => setShowTimeRangeDialog(false)}
          onApply={handleTimeRangeChange}
          initialRange={chartConfig.timeRange}
        />

        {/* Success/Error Notification */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setNotification(prev => ({ ...prev, open: false }))}
            severity={notification.severity}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </NavbarOnlyLayout>
  );
};

export default ChartBuilderPage;