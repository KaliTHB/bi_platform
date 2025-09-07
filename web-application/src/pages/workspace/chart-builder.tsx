// web-application/src/pages/workspace/Chart-builder.tsx
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
// Import the new components we created
import DatasetSelector from '@/components/builder/DatasetSelector';
import AdvancedChartSelector from '@/components/builder/ChartSelector';
import TimeRangeConfigurator from '@/components/builder/TimeRangeConfigurator';
import ChartCustomizationPanel from '@/components/builder/ChartCustomizationPanel';
import SQLQueryEditor from '@/components/builder/SQLQueryEditor';

// =============================================================================
// Types and Interfaces
// =============================================================================

// =============================================================================
// Types and Interfaces
// =============================================================================

interface Dataset {
  id: string;
  name: string;
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

interface ChartConfiguration {
  name: string;
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
}

// =============================================================================
// Sample Data
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
// Tab Panel Component
// =============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
  </div>
);

interface ChartConfig {
  id?: string;
  name: string;
  title: string;
  description: string;
  category_id: string;
  is_public: boolean;
  layout: {
    columns: number;
    gap: number;
    padding: number;
  };
  theme: {
    primary_color: string;
    background_color: string;
    text_color: string;
  };
}

const ChartBuilderPage: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();


  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);

   // Dialog states
  const [showDatasetSelector, setShowDatasetSelector] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false);
  
  // Chart configuration state
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    name: 'Vaccine Candidates per Phase',
    customization: defaultCustomization,
    dimensions: {},
    metrics: [{ metric: 'COUNT(*)', aggregation: 'count' }]
  });

  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [isAltered, setIsAltered] = useState(true);

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

  // Mock chart preview component
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
          {chartConfig.chartType.icon}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {chartConfig.chartType.name} Preview
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

  // Load charts and initialize
  useEffect(() => {
    const loadCharts = async () => {
      try {
        // Mock data - replace with actual API call
        setTimeout(() => {
          setCharts([
            { id: '1', name: 'sales-chart', display_name: 'Sales Overview', type: 'bar' },
            { id: '2', name: 'revenue-chart', display_name: 'Revenue Trends', type: 'line' },
            { id: '3', name: 'customers-chart', display_name: 'Customer Distribution', type: 'pie' }
          ]);
        }, 500);
      } catch (error) {
        console.error('Error loading charts:', error);
      }
    };

    if (workspace) {
      loadCharts();
    }
  }, [workspace]);


  const breadcrumbs = [
    { label: 'Workspace', href: `/workspace/overview` },
    { label: 'Charts', href: `/workspace/Charts` },
    { label: 'Chart Builder' }
  ];

  const actions = (
    <>
      <Button
        variant="outlined"
        startIcon={previewMode ? <EditIcon /> : <ViewIcon />}
        onClick={() => setPreviewMode(!previewMode)}
      >
        {previewMode ? 'Edit' : 'Preview'}
      </Button>
    </>
  );

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  return (
    <NavbarOnlyLayout
      title="Chart Builder"
      subtitle="Create interactive Charts with chart Factory"
      breadcrumbs={breadcrumbs}
      actions={actions}
    >
      <Box sx={{ height: '100%', display: 'flex' }}>
        {/* Sidebar */}
        {!previewMode && (
          <Drawer
            variant="permanent"
            sx={{
              width: sidebarOpen ? 300 : 0,
              flexShrink: 0,
              transition: 'width 0.3s',
              '& .MuiDrawer-paper': {
                width: sidebarOpen ? 300 : 0,
                position: 'relative',
                transition: 'width 0.3s',
                overflowX: 'hidden'
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Chart Settings
              </Typography>
              
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                variant="fullWidth"
              >
                <Tab label="Dataset" />
                <Tab label="Data" />
                <Tab label="Customise" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatasetIcon />
                    ADD Dataset
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
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
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
                                  {chartConfig.chartType.icon}
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {chartConfig.chartType.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {chartConfig.chartType.description}
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
                            <Typography variant="subtitle1">Time</Typography>
                            <IconButton size="small" onClick={() => setShowTimeRangeDialog(true)}>
                              <EditIcon />
                            </IconButton>
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary">
                            {chartConfig.timeRange ? 
                              `Custom time range applied` : 
                              'No time filter'
                            }
                          </Typography>
                        </Paper>
              
                        {/* Dimensions & Metrics */}
                        <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
                          <Typography variant="subtitle1" sx={{ mb: 2 }}>Query</Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                              Dimensions
                            </Typography>
                            <FormControl fullWidth size="small">
                              <InputLabel>clinical_stage</InputLabel>
                              <Select defaultValue="clinical_stage">
                                <MenuItem value="clinical_stage">clinical_stage</MenuItem>
                              </Select>
                            </FormControl>
                          </Box>
              
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                              Metric
                            </Typography>
                            <FormControl fullWidth size="small">
                              <InputLabel>COUNT(*)</InputLabel>
                              <Select defaultValue="count">
                                <MenuItem value="count">COUNT(*)</MenuItem>
                              </Select>
                            </FormControl>
                          </Box>
                        </Paper>

              <Divider sx={{ my: 2 }} />
              
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
               <Box sx={{ display: 'flex', height: '100%' }}>
                               {/* Customization Panel */}
                               <Box sx={{ width: 400, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
                                 <ChartCustomizationPanel
                                   chartType={chartConfig.chartType?.id || 'bar'}
                                   customization={chartConfig.customization}
                                   onChange={handleCustomizationChange}
                                 />
                               </Box>
                </Box>       
            </TabPanel>
          </Drawer>
        )}

        {/* Main Canvas */}
        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          <Paper
            variant="outlined"
            sx={{
              minHeight: '100%',
              p: chartConfig.layout.padding / 8,
              backgroundColor: chartConfig.theme.background_color
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
                  {chartConfig.title || 'Your Chart'}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {previewMode 
                    ? 'No widgets added yet'
                    : 'Add widgets from the sidebar to start building your Chart'
                  }
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={chartConfig.layout.gap / 8}>
                {widgets.map(renderWidget)}
              </Grid>
            )}
          </Paper>
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
        selectedChartId={chartConfig.chartType?.id}
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