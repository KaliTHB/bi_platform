// web-application/src/pages/workspace/chart-builder.tsx
// COMPLETE IMPLEMENTATION WITH RTK QUERY + CHARTCONTAINER COMPONENT INTEGRATION + WORKFLOW STATES

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
  Fullscreen as FullscreenIcon,
  Check as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

// RTK Query imports for all chart operations
import { 
  useCreateChartMutation,
  useUpdateChartMutation,
  useGetChartQuery,
  useGetChartDataQuery,
  useLazyGetChartDataQuery,
  useExportChartMutation,
  useRefreshChartMutation
} from '@/store/api/chartApi';

// Import dataset API for fetching column information
import { useGetDatasetQuery, useGetDatasetSchemaQuery } from '@/store/api/datasetApi';

import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import NavbarOnlyLayout from '@/components/layout/NavbarOnlyLayout';

// Import ChartContainer component with all its functionality
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
// TYPES AND INTERFACES - ALL EXISTING TYPES + WORKFLOW STATE
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
  requiredFields?: string[]; // NEW: For workflow validation
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

// NEW: Workflow State Interface
interface WorkflowState {
  step: 'initial' | 'configuration' | 'preview';
  datasetSelected: boolean;
  chartTypeSelected: boolean;
  fieldsConfigured: boolean;
  configurationComplete: boolean;
  previewMode: boolean;
  previewLoading: boolean;
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
  
  // NEW: Field mapping for workflow
  fieldMapping?: Record<string, string>;
  
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

  // RTK Query hooks for all chart operations
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

  // RTK Query for dataset schema/columns - FIXED with complete null safety
  const shouldFetchSchema = Boolean(chartConfig?.dataset?.id);
  const datasetId = chartConfig?.dataset?.id;

  console.group('🔍 Chart Builder - RTK Query Debug Info');
  console.log('📊 Schema Query Conditions:', {
    shouldFetchSchema,
    datasetId,
    chartConfigDataset: chartConfig?.dataset,
    timestamp: new Date().toISOString()
  });
  console.groupEnd();
  
  const {
    data: datasetSchemaResponse,
    isLoading: schemaLoading,
    error: schemaError
  } = useGetDatasetSchemaQuery(
    datasetId || 'skip',
    { 
      skip: !shouldFetchSchema,
      refetchOnMountOrArgChange: true 
    }
  );

  // Extract data columns from dataset schema
  const dataColumns: ColumnDefinition[] = useMemo(() => {
    if (!datasetSchemaResponse?.success || !datasetSchemaResponse.schema) {
      return [];
    }

    const schema = datasetSchemaResponse.schema;
    
    if (Array.isArray(schema.columns)) {
      return schema.columns.map((col: any) => ({
        name: col.name || col.column_name,
        type: col.type || col.data_type || 'string',
        nullable: col.nullable !== false,
        description: col.description || col.comment,
        aggregatable: ['number', 'integer', 'float', 'decimal', 'bigint'].includes((col.type || '').toLowerCase()),
        groupable: true,
        filterable: true
      }));
    }

    if (schema.fields && Array.isArray(schema.fields)) {
      return schema.fields.map((field: any) => ({
        name: field.name,
        type: field.type || 'string',
        nullable: field.nullable !== false,
        description: field.description,
        aggregatable: ['number', 'integer', 'float', 'decimal', 'bigint'].includes((field.type || '').toLowerCase()),
        groupable: true,
        filterable: true
      }));
    }

    return [];
  }, [datasetSchemaResponse]);

  const [tabValue, setTabValue] = useState(0);
  const [showDatasetSelector, setShowDatasetSelector] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  
  // ChartContainer specific state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPerformanceMetrics, setShowPerformanceMetrics] = useState(true);
  const [globalFilters, setGlobalFilters] = useState<Record<string, any>>({});

  // NEW: Workflow state - this is the key addition
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    step: 'initial',
    datasetSelected: false,
    chartTypeSelected: false,
    fieldsConfigured: false,
    configurationComplete: false,
    previewMode: false,
    previewLoading: false
  });

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
    chartType: undefined,
    library: 'echarts',
    fieldAssignments: {},
    aggregations: {},
    customConfig: {},
    fieldMapping: {}, // NEW: Added for workflow
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

  // Create chart object for ChartContainer (when in edit mode)
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

  // =============================================================================
  // NEW: WORKFLOW STATE MANAGEMENT
  // =============================================================================

  // Update workflow state when configuration changes
  useEffect(() => {
    const datasetSelected = !!chartConfig.dataset;
    const chartTypeSelected = !!(typeof chartConfig.chartType === 'string' ? 
      chartConfig.chartType : chartConfig.chartType?.id);
    
    // Check if required fields are configured
    const chartTypeObj = typeof chartConfig.chartType === 'string' ? 
      null : chartConfig.chartType;
    const requiredFields = chartTypeObj?.requiredFields || [];
    const fieldsConfigured = requiredFields.length === 0 || 
      requiredFields.every(field => chartConfig.fieldMapping?.[field]);
    
    const configurationComplete = datasetSelected && chartTypeSelected && fieldsConfigured;
    
    // Determine current step
    let step: WorkflowState['step'] = 'initial';
    if (workflowState.previewMode) {
      step = 'preview';
    } else if (configurationComplete) {
      step = 'configuration';
    }

    setWorkflowState(prev => ({
      ...prev,
      step,
      datasetSelected,
      chartTypeSelected,
      fieldsConfigured,
      configurationComplete
    }));
  }, [chartConfig, workflowState.previewMode]);

  // Get workflow message and button state
  const workflowMessage = useMemo(() => {
    if (workflowState.step === 'preview') {
      return 'Preview Mode - Live chart rendering';
    }
    
    if (!workflowState.datasetSelected) {
      return 'Select a dataset to get started';
    }
    
    if (!workflowState.chartTypeSelected) {
      return 'Select a chart type';
    }
    
    if (!workflowState.fieldsConfigured) {
      const chartTypeObj = typeof chartConfig.chartType === 'string' ? 
        null : chartConfig.chartType;
      const requiredFields = chartTypeObj?.requiredFields || [];
      return `Configure required fields: ${requiredFields.join(', ')}`;
    }
    
    if (workflowState.configurationComplete) {
      return 'Configuration complete! Click Preview to see your chart';
    }
    
    return 'Configure your chart';
  }, [workflowState, chartConfig.chartType]);

  const isPreviewDisabled = !workflowState.configurationComplete || workflowState.previewLoading;

  // Load existing chart data when editing (RTK Query integration)
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
        customQuery: chart.config_json?.customQuery,
        fieldMapping: chart.config_json?.fieldMapping || {} // NEW: Load field mapping
      }));

      setIsAltered(false);
    }
  }, [existingChartResponse, isEditMode]);

  // Handle RTK Query success/error notifications
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
  // EVENT HANDLERS - ALL EXISTING FUNCTIONALITY + WORKFLOW ENHANCEMENTS
  // =============================================================================

  const handleDatasetSelect = (dataset: Dataset) => {
    setChartConfig(prev => ({
      ...prev,
      dataset,
      fieldMapping: {} // Reset field mapping when dataset changes
    }));
    setIsAltered(true);
  };

  const handleChartTypeSelect = (chartType: ChartType) => {
    setChartConfig(prev => ({
      ...prev,
      chartType,
      fieldMapping: {} // Reset field mapping when chart type changes
    }));
    setIsAltered(true);
  };

  // NEW: Field mapping handler
  const handleFieldMappingChange = (field: string, value: string) => {
    setChartConfig(prev => ({
      ...prev,
      fieldMapping: {
        ...prev.fieldMapping,
        [field]: value
      }
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

  // NEW: Preview handlers
  const handlePreview = async () => {
    setWorkflowState(prev => ({
      ...prev,
      previewMode: true,
      previewLoading: true
    }));
    setPreviewMode(true);

    // Simulate preview loading
    setTimeout(() => {
      setWorkflowState(prev => ({
        ...prev,
        previewLoading: false
      }));
    }, 1500);
  };

  const handleSaveAndPreview = async () => {
    // Save first
    await handleSaveChart();
    
    // Then preview if save was successful
    if (!createError && !updateError) {
      await handlePreview();
    }
  };

  const handleExitPreview = () => {
    setWorkflowState(prev => ({
      ...prev,
      previewMode: false,
      previewLoading: false
    }));
    setPreviewMode(false);
  };

  // ChartContainer event handlers
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
    if (event.type === 'click') {
      setNotification({
        open: true,
        message: `Chart clicked: ${JSON.stringify(event.data)}`,
        severity: 'info'
      });
    }
  }, []);

  // Manual refresh trigger
  const handleManualRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Save chart function with RTK Query
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
          customization: chartConfig.customization,
          fieldMapping: chartConfig.fieldMapping // NEW: Save field mapping
        },
        is_active: true
      };

      if (isEditMode && chartId) {
        await updateChart({ 
          id: chartId, 
          data: chartData 
        }).unwrap();
      } else {
        const result = await createChart(chartData).unwrap();
        
        if (result.success && result.chart?.id) {
          router.replace(`/workspace/${workspace.slug}/chart-builder?chartId=${result.chart.id}`);
        }
      }
      
    } catch (error) {
      console.error('Failed to save chart:', error);
    }
  };

  // Export chart function using RTK Query
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

  // =============================================================================
  // NEW: FIELD MAPPING COMPONENT
  // =============================================================================

  const FieldMappingSection = () => {
    const chartTypeObj = typeof chartConfig.chartType === 'string' ? 
      null : chartConfig.chartType;
    
    if (!chartTypeObj?.requiredFields || !chartConfig.dataset?.columns) {
      return null;
    }

    return (
      <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Field Mapping
          {workflowState.fieldsConfigured && (
            <CheckIcon color="success" fontSize="small" />
          )}
        </Typography>
        
        {chartTypeObj.requiredFields.map((field) => (
          <FormControl key={field} fullWidth sx={{ mb: 2 }}>
            <InputLabel>{field}</InputLabel>
            <Select
              value={chartConfig.fieldMapping?.[field] || ''}
              onChange={(e) => handleFieldMappingChange(field, e.target.value)}
            >
              {dataColumns.map((column) => (
                <MenuItem key={column.name} value={column.name}>
                  {column.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </Paper>
    );
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

  // ENHANCED ChartPreview component with ChartContainer integration + WORKFLOW STATES
  const ChartPreview = () => {
    // NEW: Loading state for workflow
    if (workflowState.previewLoading) {
      return (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'grey.50',
          borderRadius: 1,
          border: 1,
          borderColor: 'primary.main'
        }}>
          <LinearProgress sx={{ width: '60%', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Rendering Chart...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Loading live data and generating visualization
          </Typography>
        </Box>
      );
    }

    // NEW: Preview mode with exit option
    if (workflowState.previewMode && workflowState.configurationComplete && !isEditMode) {
      const chartTypeObj = typeof chartConfig.chartType === 'string' ? 
        null : chartConfig.chartType;

      return (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'grey.50',
          borderRadius: 1,
          border: 1,
          borderColor: 'primary.main'
        }}>
          {chartTypeObj?.icon && (
            <Box sx={{ fontSize: 64, color: 'primary.main', mb: 2 }}>
              {chartTypeObj.icon}
            </Box>
          )}
          <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
            {chartTypeObj?.name || chartConfig.chartType} Preview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Live chart rendering with {chartConfig.dataset?.name}
          </Typography>
          <Button
            variant="outlined"
            onClick={handleExitPreview}
            size="small"
          >
            Exit Preview
          </Button>
        </Box>
      );
    }

    // Only show ChartContainer with header when we have a SAVED chart in edit mode
    if (isEditMode && chartForContainer && chartId) {
      return (
        <Box sx={{ height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          {/* Chart Info Header - ONLY for saved charts */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 1,
              textAlign: 'center',
              bgcolor: 'background.default',
              borderRadius: 1
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <ChartIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {chartForContainer.chart_library === 'echarts' && 'ECharts'} {chartForContainer.chart_type.charAt(0).toUpperCase() + chartForContainer.chart_type.slice(1)} Chart Preview
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                Live preview with real data
              </Typography>
              
              {/* Chart Configuration Chips */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip 
                  label={`Dataset: ${chartConfig.dataset?.name || 'sales_data'}`}
                  color="success"
                  size="small"
                  variant="filled"
                />
                <Chip 
                  label={`Type: ${chartForContainer.chart_library === 'echarts' ? 'ECharts' : chartForContainer.chart_library} ${chartForContainer.chart_type.charAt(0).toUpperCase() + chartForContainer.chart_type.slice(1)} Chart`}
                  color="info"
                  size="small"
                  variant="filled"
                />
                {chartConfig.timeRange && (
                  <Chip 
                    label="Time Filter Applied"
                    color="warning"
                    size="small"
                    variant="filled"
                  />
                )}
              </Box>
            </Box>
          </Paper>

          {/* ChartContainer - In separate container below header */}
          <Paper
            variant="outlined"
            sx={{
              flexGrow: 1,
              position: 'relative',
              overflow: 'hidden',
              minHeight: 300
            }}
          >
            <ChartContainer
              title= {chartConfig.name}
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
                boxShadow: 1,
                zIndex: 10
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

    // Default preview for NEW charts (no dataset selected or not saved)
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
        {chartConfig.chartType && chartConfig.dataset ? (
          // Show preview when both dataset and chart type are selected
          <Box sx={{ textAlign: 'center' }}>
            <ChartIcon sx={{ fontSize: 64, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
              {chartConfig.library === 'echarts' || !chartConfig.library ? 'ECharts' : chartConfig.library} {typeof chartConfig.chartType === 'string' 
                ? chartConfig.chartType.charAt(0).toUpperCase() + chartConfig.chartType.slice(1)
                : chartConfig.chartType.name || 'Chart'
              } Chart Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Save the chart to see live preview with data
            </Typography>
            {/* Show configuration status */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`Dataset: ${chartConfig.dataset.name}`}
                color="success"
                size="small"
                variant="outlined"
              />
              <Chip 
                label={`Type: ${chartConfig.library === 'echarts' || !chartConfig.library ? 'ECharts' : chartConfig.library} ${typeof chartConfig.chartType === 'string' ? chartConfig.chartType.charAt(0).toUpperCase() + chartConfig.chartType.slice(1) : chartConfig.chartType?.name || 'Bar'} Chart`}
                color="info"
                size="small"
                variant="outlined"
              />
              {chartConfig.timeRange && (
                <Chip 
                  label="Time Filter Applied"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        ) : (
          // Show initial state when no dataset or chart type selected
          <Box sx={{ textAlign: 'center' }}>
            <ChartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {!chartConfig.dataset ? 'Select a Dataset' : 'Select a Chart Type'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!chartConfig.dataset 
                ? 'Choose a dataset from the Data tab to get started'
                : 'Choose a visualization type to preview your chart'
              }
            </Typography>
            
            {/* Show next steps */}
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
              {!chartConfig.dataset && (
                <Chip 
                  label="Step 1: Select Dataset"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              )}
              {chartConfig.dataset && !chartConfig.chartType && (
                <Chip 
                  label="Step 2: Choose Chart Type"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

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
  // RENDER - WITH WORKFLOW STATUS BAR + CHARTCONTAINER INTEGRATION
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

        {/* NEW: Workflow Status Bar */}
        <Box sx={{ 
          p: 2, 
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            
            {/* Left side - Status indicators */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={workflowState.datasetSelected ? <CheckIcon /> : <DatasetIcon />}
                label="Dataset"
                color={workflowState.datasetSelected ? 'success' : 'default'}
                variant={workflowState.datasetSelected ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                icon={workflowState.chartTypeSelected ? <CheckIcon /> : <ChartIcon />}
                label="Chart Type"
                color={workflowState.chartTypeSelected ? 'success' : 'default'}
                variant={workflowState.chartTypeSelected ? 'filled' : 'outlined'}
                size="small"
              />
              {(() => {
                const chartTypeObj = typeof chartConfig.chartType === 'string' ? 
                  null : chartConfig.chartType;
                return chartTypeObj?.requiredFields && chartTypeObj.requiredFields.length > 0 && (
                  <Chip
                    icon={workflowState.fieldsConfigured ? <CheckIcon /> : <SettingsIcon />}
                    label="Fields"
                    color={workflowState.fieldsConfigured ? 'success' : 'default'}
                    variant={workflowState.fieldsConfigured ? 'filled' : 'outlined'}
                    size="small"
                  />
                );
              })()}
            </Box>

            {/* Center - Workflow message */}
            <Alert 
              severity={
                workflowState.step === 'preview' ? 'info' : 
                workflowState.configurationComplete ? 'success' : 'warning'
              }
              variant="outlined"
              sx={{ minWidth: 300 }}
            >
              {workflowMessage}
            </Alert>

            {/* Right side - Preview buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isAltered && (
                  <Chip 
                    label="Unsaved" 
                    color="warning" 
                    size="small"
                    variant="outlined"
                  />
                )}
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={isPreviewDisabled}
                size="small"
              >
                Preview Chart
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
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveAndPreview}
                disabled={isPreviewDisabled}
                size="small"
              >
                Save & Preview
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          {/* Left Panel - Configuration - NO CHANGES TO STRUCTURE */}
          <Box sx={{ width: 350, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            
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

            {/* Tab Panels - ENHANCED WITH WORKFLOW */}
            <TabPanel value={tabValue} index={0}>
              
              {/* Dataset Selection */}
              <Paper sx={{ m: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatasetIcon />
                  Dataset
                  {workflowState.datasetSelected && (
                    <CheckIcon color="success" fontSize="small" />
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
                  {workflowState.chartTypeSelected && (
                    <CheckIcon color="success" fontSize="small" />
                  )}
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

              {/* NEW: Field Mapping - Only shows when needed */}
              <FieldMappingSection />

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

              {/* Manual Refresh Control */}
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
                  {chartConfig.dataset && chartConfig.chartType ? (
                    <Box>
                      {/* Show loading state while fetching schema */}
                      {schemaLoading ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <CircularProgress size={24} />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Loading dataset schema...
                          </Typography>
                        </Box>
                      ) : schemaError ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            Unable to load dataset schema. Some customization options may be limited.
                          </Alert>
                          <ChartCustomizationPanel
  chartType={typeof chartConfig.chartType === 'string' ? 
    chartConfig.chartType : 
    chartConfig.chartType?.id || 'bar'
  }
  chartLibrary={chartConfig.library || 'echarts'} // ← ADD THIS LINE
  configuration={chartConfig.customization} // ← Also note: should be 'configuration', not 'customization'
  onChange={handleCustomizationChange}
  dataset={chartConfig.dataset}
  dataColumns={dataColumns}
/>
                        </Box>
                      ) : (
                        <ChartCustomizationPanel
                          chartType={typeof chartConfig.chartType === 'string' ? 
                            chartConfig.chartType : 
                            chartConfig.chartType?.id || 'bar'
                          }
                          customization={chartConfig.customization}
                          onChange={handleCustomizationChange}
                          dataset={chartConfig.dataset}
                          dataColumns={dataColumns}
                        />
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        Customization Options
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {!chartConfig.dataset && !chartConfig.chartType 
                          ? 'Please select a dataset and chart type to access customization options.'
                          : !chartConfig.dataset 
                          ? 'Please select a dataset to configure field mappings and chart options.'
                          : 'Please select a chart type to see available customization options.'
                        }
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mt: 3 }}>
                        {!chartConfig.dataset && (
                          <Button 
                            variant="outlined" 
                            startIcon={<DatasetIcon />}
                            onClick={() => {
                              setTabValue(0);
                              setShowDatasetSelector(true);
                            }}
                          >
                            Select Dataset
                          </Button>
                        )}
                        
                        {chartConfig.dataset && !chartConfig.chartType && (
                          <Button 
                            variant="outlined" 
                            startIcon={<ChartIcon />}
                            onClick={() => {
                              setTabValue(0);
                              setShowChartSelector(true);
                            }}
                          >
                            Select Chart Type
                          </Button>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>       
            </TabPanel>
          </Box>

          {/* Main Canvas - WITH CHARTCONTAINER INTEGRATION + WORKFLOW STATES */}
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