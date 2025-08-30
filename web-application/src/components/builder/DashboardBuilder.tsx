// web-application/src/components/builder/DashboardBuilder.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Fab,
  Snackbar,
  Alert,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterPlotIcon,
  DonutLarge as DonutLargeIcon,
  Timeline as TimelineIcon,
  TableChart as TableChartIcon,
  TrendingUp as TrendingUpIcon,
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { RootState } from '../../store';
import { dashboardAPI, chartAPI, datasetAPI } from '../../services/api';
import ChartContainer from '../dashboard/ChartContainer';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardBuilderProps {
  dashboardId?: string;
  initialDashboard?: Dashboard;
}

interface Dashboard {
  id: string;
  name: string;
  slug: string;
  description?: string;
  layout_config: any;
  filter_config: any;
  is_public: boolean;
  is_featured: boolean;
  charts: Chart[];
}

interface Chart {
  id: string;
  name: string;
  type: string;
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataset_id: string;
  dataset?: {
    id: string;
    name: string;
  };
}

interface Dataset {
  id: string;
  name: string;
  description?: string;
}

const chartTypes = [
  { type: 'echarts-bar', name: 'Bar Chart', icon: <BarChartIcon />, category: 'basic' },
  { type: 'echarts-line', name: 'Line Chart', icon: <LineChartIcon />, category: 'basic' },
  { type: 'echarts-pie', name: 'Pie Chart', icon: <PieChartIcon />, category: 'basic' },
  { type: 'echarts-scatter', name: 'Scatter Plot', icon: <ScatterPlotIcon />, category: 'analysis' },
  { type: 'echarts-donut', name: 'Donut Chart', icon: <DonutLargeIcon />, category: 'basic' },
  { type: 'echarts-area', name: 'Area Chart', icon: <TimelineIcon />, category: 'trend' },
  { type: 'table-chart', name: 'Data Table', icon: <TableChartIcon />, category: 'data' },
  { type: 'metric-card', name: 'Metric Card', icon: <TrendingUpIcon />, category: 'kpi' }
];

const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  initialDashboard
}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);
  
  // State management
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard || null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>({});
  
  // UI state
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Chart categories expansion
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    basic: true,
    trend: false,
    analysis: false,
    data: false,
    kpi: false
  });

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Chart creation dialog
  const [chartDialog, setChartDialog] = useState<{
    open: boolean;
    type?: string;
    dataset?: Dataset;
  }>({
    open: false
  });

  // Load initial data
  useEffect(() => {
    if (currentWorkspace) {
      loadDatasets();
      if (dashboardId && !initialDashboard) {
        loadDashboard();
      }
    }
  }, [currentWorkspace, dashboardId]);

  const loadDashboard = async () => {
    if (!dashboardId) return;
    
    setLoading(true);
    try {
      const response = await dashboardAPI.getDashboard(dashboardId);
      if (response.success) {
        setDashboard(response.dashboard);
        setCharts(response.dashboard.charts || []);
        
        // Convert charts to grid layout format
        const gridLayouts = response.dashboard.charts?.reduce((acc: any, chart: Chart) => {
          acc[chart.id] = {
            i: chart.id,
            x: chart.position.x,
            y: chart.position.y,
            w: chart.position.width,
            h: chart.position.height
          };
          return acc;
        }, {});
        
        setLayouts({
          lg: Object.values(gridLayouts || {}),
          md: Object.values(gridLayouts || {}),
          sm: Object.values(gridLayouts || {}),
          xs: Object.values(gridLayouts || {}),
        });
      }
    } catch (error) {
      showSnackbar('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDatasets = async () => {
    try {
      const response = await datasetAPI.getDatasets({
        workspaceId: currentWorkspace?.id
      });
      if (response.success) {
        setDatasets(response.datasets);
      }
    } catch (error) {
      showSnackbar('Failed to load datasets', 'error');
    }
  };

  const handleLayoutChange = useCallback((layout: any[], layouts: { [key: string]: any[] }) => {
    setLayouts(layouts);
    
    // Update chart positions
    const updatedCharts = charts.map(chart => {
      const layoutItem = layout.find(item => item.i === chart.id);
      if (layoutItem) {
        return {
          ...chart,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            width: layoutItem.w,
            height: layoutItem.h
          }
        };
      }
      return chart;
    });
    
    setCharts(updatedCharts);
  }, [charts]);

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleChartTypeSelect = (chartType: string) => {
    setChartDialog({
      open: true,
      type: chartType
    });
  };

  const handleDatasetSelect = (dataset: Dataset) => {
    setChartDialog(prev => ({
      ...prev,
      dataset
    }));
  };

  const createChart = async () => {
    if (!dashboard || !chartDialog.type || !chartDialog.dataset) {
      showSnackbar('Please select chart type and dataset', 'error');
      return;
    }

    try {
      setSaving(true);
      
      // Find available position for new chart
      const existingPositions = charts.map(c => c.position);
      const newPosition = findAvailablePosition(existingPositions);
      
      const newChart = {
        dashboard_id: dashboard.id,
        dataset_id: chartDialog.dataset.id,
        name: `New ${chartDialog.type}`,
        type: chartDialog.type,
        config: getDefaultChartConfig(chartDialog.type),
        position: newPosition
      };

      const response = await chartAPI.createChart(newChart);
      
      if (response.success) {
        const createdChart = {
          ...response.chart,
          dataset: chartDialog.dataset
        };
        
        setCharts(prev => [...prev, createdChart]);
        
        // Add to layout
        const layoutItem = {
          i: response.chart.id,
          x: newPosition.x,
          y: newPosition.y,
          w: newPosition.width,
          h: newPosition.height
        };
        
        setLayouts(prev => ({
          ...prev,
          lg: [...(prev.lg || []), layoutItem],
          md: [...(prev.md || []), layoutItem],
          sm: [...(prev.sm || []), layoutItem],
          xs: [...(prev.xs || []), layoutItem]
        }));
        
        showSnackbar('Chart created successfully', 'success');
        setChartDialog({ open: false });
      }
    } catch (error) {
      showSnackbar('Failed to create chart', 'error');
    } finally {
      setSaving(false);
    }
  };

  const duplicateChart = async (chartId: string) => {
    if (!dashboard) return;
    
    try {
      setSaving(true);
      const response = await chartAPI.duplicateChart(chartId, {
        dashboard_id: dashboard.id
      });
      
      if (response.success) {
        const duplicatedChart = response.chart;
        setCharts(prev => [...prev, duplicatedChart]);
        showSnackbar('Chart duplicated successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to duplicate chart', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteChart = async (chartId: string) => {
    try {
      setSaving(true);
      const response = await chartAPI.deleteChart(chartId);
      
      if (response.success) {
        setCharts(prev => prev.filter(c => c.id !== chartId));
        setLayouts(prev => ({
          ...prev,
          lg: prev.lg?.filter(item => item.i !== chartId) || [],
          md: prev.md?.filter(item => item.i !== chartId) || [],
          sm: prev.sm?.filter(item => item.i !== chartId) || [],
          xs: prev.xs?.filter(item => item.i !== chartId) || []
        }));
        showSnackbar('Chart deleted successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to delete chart', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveDashboard = async () => {
    if (!dashboard) return;

    setSaving(true);
    try {
      // Update dashboard with current layout configuration
      const updatedDashboard = {
        ...dashboard,
        layout_config: layouts
      };

      const response = await dashboardAPI.updateDashboard(dashboard.id, updatedDashboard);
      
      if (response.success) {
        setDashboard(response.dashboard);
        showSnackbar('Dashboard saved successfully', 'success');
      }
    } catch (error) {
      showSnackbar('Failed to save dashboard', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
    setDrawerOpen(!previewMode);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const findAvailablePosition = (existingPositions: any[]) => {
    // Simple algorithm to find next available position
    let x = 0, y = 0;
    const width = 6, height = 4;
    
    // Check if position is occupied
    while (existingPositions.some(pos => 
      pos.x < x + width && pos.x + pos.width > x &&
      pos.y < y + height && pos.y + pos.height > y
    )) {
      x += width;
      if (x >= 12) {
        x = 0;
        y += height;
      }
    }
    
    return { x, y, width, height };
  };

  const getDefaultChartConfig = (chartType: string) => {
    // Return basic configuration based on chart type
    switch (chartType) {
      case 'echarts-bar':
      case 'echarts-line':
        return {
          xAxis: { field: '', title: 'X Axis' },
          yAxis: { field: '', title: 'Y Axis' },
          series: []
        };
      case 'echarts-pie':
        return {
          labelField: '',
          valueField: '',
          showLegend: true
        };
      default:
        return {};
    }
  };

  const getChartsByCategory = (category: string) => {
    return chartTypes.filter(chart => chart.category === category);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {dashboard?.name || 'Dashboard Builder'}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={previewMode}
                onChange={togglePreview}
                color="default"
              />
            }
            label="Preview"
            sx={{ color: 'white', mr: 2 }}
          />
          <Button
            color="inherit"
            startIcon={<SaveIcon />}
            onClick={saveDashboard}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Chart Types Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen && !previewMode}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100vh - 64px)'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Chart Types
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {Object.keys(expandedCategories).map(category => (
            <Box key={category}>
              <ListItemButton onClick={() => handleCategoryToggle(category)}>
                <ListItemText 
                  primary={category.charAt(0).toUpperCase() + category.slice(1)} 
                  sx={{ textTransform: 'capitalize' }}
                />
                {expandedCategories[category] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              
              <Collapse in={expandedCategories[category]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {getChartsByCategory(category).map(chartType => (
                    <ListItem key={chartType.type} sx={{ pl: 4 }}>
                      <ListItemButton
                        onClick={() => handleChartTypeSelect(chartType.type)}
                        sx={{
                          border: '1px dashed #ddd',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {chartType.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={chartType.name}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          ))}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          ml: drawerOpen && !previewMode ? 0 : 0,
          transition: 'margin 0.2s'
        }}
      >
        {dashboard && (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
            rowHeight={60}
            isDraggable={!previewMode}
            isResizable={!previewMode}
            margin={[16, 16]}
            containerPadding={[16, 16]}
          >
            {charts.map(chart => (
              <Paper
                key={chart.id}
                sx={{
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {!previewMode && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1,
                      opacity: 0.7,
                      '&:hover': { opacity: 1 }
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => setSelectedChart(chart)}
                    >
                      <SettingsIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => duplicateChart(chart.id)}
                    >
                      <FileCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => deleteChart(chart.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                
                <ChartContainer
                  chart={chart}
                  workspaceId={currentWorkspace?.id}
                  preview={previewMode}
                />
              </Paper>
            ))}
          </ResponsiveGridLayout>
        )}
      </Box>

      {/* Chart Creation Dialog */}
      <Dialog
        open={chartDialog.open}
        onClose={() => setChartDialog({ open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Create New Chart
          {chartDialog.type && (
            <Chip 
              label={chartTypes.find(t => t.type === chartDialog.type)?.name} 
              sx={{ ml: 2 }} 
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Select Dataset:
          </Typography>
          <Grid container spacing={2}>
            {datasets.map(dataset => (
              <Grid item xs={12} sm={6} md={4} key={dataset.id}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: chartDialog.dataset?.id === dataset.id ? 2 : 1,
                    borderColor: chartDialog.dataset?.id === dataset.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleDatasetSelect(dataset)}
                >
                  <Typography variant="h6" noWrap>
                    {dataset.name}
                  </Typography>
                  {dataset.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {dataset.description}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartDialog({ open: false })}>
            Cancel
          </Button>
          <Button
            onClick={createChart}
            variant="contained"
            disabled={!chartDialog.type || !chartDialog.dataset || saving}
            startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {saving ? 'Creating...' : 'Create Chart'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardBuilder;