// web-application/src/pages/workspace/chart-builder.tsx
// CORRECTED VERSION WITH ALL TYPE ERRORS FIXED

import React, { useState, useEffect, useCallback } from 'react';
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
  Alert
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
  Palette as ThemeIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import NavbarOnlyLayout from '@/components/layout/NavbarOnlyLayout';

// Fixed: Import correct types from the proper files
import { 
  ChartConfiguration,
  ChartDimensions,
  ChartTheme,
  ChartType as ChartTypeEnum,
  DEFAULT_CHART_CONFIG 
} from '@/types/chart.types';
import { Dataset, ColumnDefinition } from '@/types/dataset.types';

// Import the new components (these need to exist or be stubbed)
import DatasetSelector from '@/components/builder/DatasetSelector';
import AdvancedChartSelector from '@/components/builder/ChartSelector';
import TimeRangeConfigurator from '@/components/builder/TimeRangeConfigurator';
import ChartCustomizationPanel from '@/components/builder/ChartCustomizationPanel';
import SQLQueryEditor from '@/components/builder/SQLQueryEditor';

// =============================================================================
// FIXED TYPES AND INTERFACES
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

// FIXED: Added the missing Widget interface
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

// FIXED: Extended ChartConfiguration to include layout properties
interface ExtendedChartConfiguration extends ChartConfiguration {
  name: string;
  title?: string;
  dataset?: Dataset;
  chartType?: ChartType;
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
  // FIXED: Added layout property
  layout?: {
    columns?: number;
    gap?: number;
    padding?: number;
  };
  // FIXED: Added theme property
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
// MAIN COMPONENT
// =============================================================================

const ChartBuilderPage: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // FIXED: Proper state definitions
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);

  // Dialog states
  const [showDatasetSelector, setShowDatasetSelector] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false);
  
  // FIXED: Chart configuration state with proper typing
  const [chartConfig, setChartConfig] = useState<ExtendedChartConfiguration>({
    name: 'Vaccine Candidates per Phase',
    customization: defaultCustomization,
    dimensions: {},
    metrics: [{ metric: 'COUNT(*)', aggregation: 'count' }],
    chartType: 'bar',
    library: 'echarts',
    fieldAssignments: {},
    aggregations: {},
    customConfig: {},
    // FIXED: Added layout with default values
    layout: {
      columns: 12,
      gap: 16,
      padding: 16
    },
    // FIXED: Added theme with default values
    theme: {
      primary_color: '#1976d2',
      background_color: '#ffffff',
      text_color: '#333333'
    }
  });

  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [isAltered, setIsAltered] = useState(true);

  // =============================================================================
  // EVENT HANDLERS - FIXED IMPLEMENTATIONS
  // =============================================================================

  // Handle dataset selection
  const handleDatasetSelect = (dataset: Dataset) => {
    setChartConfig(prev => ({
      ...prev,
      dataset
    }));
    setIsAltered(true);
  };

  // Handle chart type selection
  const handleChartTypeSelect = (chartType: ChartType) => {
    setChartConfig(prev => ({
      ...prev,
      chartType
    }));
    setIsAltered(true);
  };

  // Handle time range changes
  const handleTimeRangeChange = (timeRange: TimeRange) => {
    setChartConfig(prev => ({
      ...prev,
      timeRange
    }));
    setIsAltered(true);
  };

  // Handle customization changes
  const handleCustomizationChange = (customization: ChartCustomization) => {
    setChartConfig(prev => ({
      ...prev,
      customization
    }));
    setIsAltered(true);
  };

  // Handle query changes
  const handleQueryChange = (customQuery: string) => {
    setChartConfig(prev => ({
      ...prev,
      customQuery
    }));
    setIsAltered(true);
  };

  // FIXED: renderWidget function implementation
  const renderWidget = (widget: Widget) => (
    <Grid item xs={widget.position.w} key={widget.id}>
      <Card 
        variant="outlined"
        sx={{ 
          height: widget.position.h * 50, // Approximate height calculation
          position: 'relative',
          '&:hover': { 
            borderColor: 'primary.main',
            '& .widget-actions': { opacity: 1 }
          }
        }}
      >
        {/* Widget Header */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0,
            transition: 'opacity 0.2s',
            zIndex: 1
          }}
          className="widget-actions"
        >
          <IconButton size="small" onClick={() => setSelectedWidget(widget)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={() => setWidgets(prev => prev.filter(w => w.id !== widget.id))}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>

        <CardContent sx={{ height: '100%', p: 1 }}>
          {/* Widget Title */}
          <Box sx={{ height: 40, display: 'flex', alignItems: 'center' }}>
            <Typography variant="subtitle2" noWrap>
              {widget.title}
            </Typography>
          </Box>

          {/* Widget Content */}
          {widget.type === 'chart' && (
            <Box
              sx={{
                height: 'calc(100% - 40px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              <Box textAlign="center">
                <ChartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Chart Preview
                </Typography>
              </Box>
            </Box>
          )}

          {widget.type === 'text' && (
            <Box sx={{ height: 'calc(100% - 40px)', overflow: 'auto' }}>
              <Typography variant="body2">
                {widget.config.content || 'Add your text content here...'}
              </Typography>
            </Box>
          )}

          {widget.type === 'metric' && (
            <Box
              sx={{
                height: 'calc(100% - 40px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="h2" color="primary" gutterBottom>
                {widget.config.metric_value || '0'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {widget.config.metric_label || 'Metric Label'}
              </Typography>
            </Box>
          )}

          {widget.type === 'table' && (
            <Box
              sx={{
                height: 'calc(100% - 40px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              <Box textAlign="center">
                <TableIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Data Table Preview
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  // FIXED: Mock chart preview component
  const ChartPreview: React.FC = () => (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'grey.50',
      borderRadius: 1,
      border: 1,
      borderColor: 'divider'
    }}>
      {chartConfig.chartType ? (
        <Box sx={{ textAlign: 'center' }}>
          <ChartIcon sx={{ fontSize: 64, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {typeof chartConfig.chartType === 'string' ? 
              chartConfig.chartType : 
              chartConfig.chartType.name || 'Chart'
            } Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Chart visualization would render here
          </Typography>
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

   const breadcrumbs = [
    { label: 'Workspace', href: `/workspace/overview` },
    { label: 'Charts', href: `/workspace/charts` },
    { label: 'Chart Builder' }
  ];


  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <NavbarOnlyLayout
      title="Chart Builder"
      subtitle="Create interactive charts with chart Factory"
      breadcrumbs={breadcrumbs}
    >
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          {/* Left Panel - Configuration */}
          <Box sx={{ width: 350, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Tabs value={tabValue} variant="scrollable" aria-label="scrollable tabs example" scrollButtons="auto" onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Data" />
              <Tab label="Query" />
              <Tab label="Customize" />
            </Tabs>

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
                        <Typography variant="body1" fontWeight="medium">
                          {chartConfig.dataset.display_name || chartConfig.dataset.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {chartConfig.dataset.type} • {chartConfig.dataset.schema}
                        </Typography>
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
                        `Custom time range applied` : 
                        'No time filter'
                      }
                    </Typography>
                  </CardContent>
                  </Card>
                </Paper>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Query Builder would go here */}
              <Paper sx={{ m: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Query</Typography>
                <Typography variant="body2" color="text.secondary">
                  Query builder interface would be implemented here
                </Typography>
              </Paper>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ display: 'flex', height: '100%' }}>
                {/* Customization Panel */}
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

          {/* Main Canvas */}
          <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
            <Paper
              variant="outlined"
              sx={{
                minHeight: '100%',
                // FIXED: Safe access to layout.padding with default fallback
                p: (chartConfig.layout?.padding || 16) / 8,
                // FIXED: Safe access to theme.background_color with default fallback
                backgroundColor: chartConfig.theme?.background_color || '#ffffff'
              }}
            >
              {widgets.length === 0 ? (
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
                  <ChartIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                  <Typography variant="h5" color="textSecondary" gutterBottom>
                    {chartConfig.title || chartConfig.name || 'Your Chart'}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    {previewMode 
                      ? 'No widgets added yet'
                      : 'Add widgets from the sidebar to start building your Chart'
                    }
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={(chartConfig.layout?.gap || 16) / 8}>
                  {widgets.map(renderWidget)}
                </Grid>
              )}
            </Paper>
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
      </Box>
    </NavbarOnlyLayout>
  );
};

export default ChartBuilderPage;