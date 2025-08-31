// web-application/src/components/builder/DashboardBuilder.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
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
  CircularProgress,
  useTheme,
  useMediaQuery,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Menu as MenuIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
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
  FileCopy as FileCopyIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { dashboardAPI, chartAPI, datasetAPI } from '../../services/api';
import ChartContainer from '../dashboard/ChartContainer';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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
  table_name?: string;
  schema?: any;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  
  // State management
  const [dashboard, setDashboard] = useState<Dashboard | null>(initialDashboard || null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>({});
  
  // UI state
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
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

  const [newChartName, setNewChartName] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<string>('');

  const drawerWidth = 300;

  // Load dashboard and related data
  useEffect(() => {
    if (dashboardId && !initialDashboard) {
      loadDashboard();
    }
    loadDatasets();
  }, [dashboardId]);

  // Update charts when dashboard changes
  useEffect(() => {
    if (dashboard) {
      setCharts(dashboard.charts || []);
      if (dashboard.layout_config) {
        setLayouts(dashboard.layout_config);
      }
    }
  }, [dashboard]);

  const loadDashboard = async () => {
    if (!dashboardId || !currentWorkspace) return;

    setLoading(true);
    try {
      const response = await dashboardAPI.getDashboard(dashboardId);
      if (response.success) {
        setDashboard(response.dashboard);
      } else {
        showSnackbar('Failed to load dashboard', 'error');
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      showSnackbar('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDatasets = async () => {
    if (!currentWorkspace) return;

    try {
      const response = await datasetAPI.getDatasets(currentWorkspace.id);
      
      if (response.success && response.datasets) {  // Access datasets directly
        setDatasets(response.datasets);
      } else {
        console.warn('Failed to load datasets:', response.message || 'Unknown error');
        showSnackbar(response.message || 'Failed to load datasets', 'error');
        setDatasets([]);
      }
    } catch (error) {
      console.error('Failed to load datasets:', error);
      showSnackbar('Failed to load datasets', 'error');
      setDatasets([]);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const saveDashboard = async () => {
    if (!dashboard || !currentWorkspace) return;

    setSaving(true);
    try {
      const dashboardData = {
        ...dashboard,
        layout_config: layouts,
        charts: charts
      };

      let response;
      if (dashboardId) {
        response = await dashboardAPI.updateDashboard(dashboardId, dashboardData);
        if (response.dashboard) {
          setDashboard(response.dashboard);
          showSnackbar(response.message || 'Dashboard saved successfully', 'success');
        }
      } else {
        response = await dashboardAPI.createDashboard(dashboardData);
        if (response.dashboard) {
          setDashboard(response.dashboard);
          // Navigate to the new dashboard
          router.push(`/workspace/${currentWorkspace.slug}/dashboard-builder/${response.dashboard.id}`);
          showSnackbar(response.message || 'Dashboard created successfully', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      showSnackbar('Failed to save dashboard', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleAddChart = (chartType: string) => {
    setChartDialog({
      open: true,
      type: chartType
    });
  };

  const createChart = async () => {
    if (!newChartName.trim() || !selectedDataset || !chartDialog.type || !dashboard) return;

    try {
      const chartData = {
        name: newChartName,
        type: chartDialog.type,
        dataset_id: selectedDataset,
        dashboard_id: dashboard.id,
        config: {},
        position: {
          x: 0,
          y: 0,
          width: 4,
          height: 3
        }
      };

      const response = await chartAPI.createChart(chartData);
      if (response.chart) {
        const newChart = response.chart;
        setCharts(prev => [...prev, newChart]);
        
        // Add to layout
        const newLayout = {
          i: newChart.id,
          x: 0,
          y: 0,
          w: 4,
          h: 3
        };
        
        setLayouts(prev => ({
          ...prev,
          lg: [...(prev.lg || []), newLayout],
          md: [...(prev.md || []), newLayout],
          sm: [...(prev.sm || []), newLayout],
          xs: [...(prev.xs || []), newLayout]
        }));

        showSnackbar(response.message || 'Chart added successfully', 'success');
      } else {
        showSnackbar('Failed to create chart', 'error');
      }
    } catch (error) {
      console.error('Failed to create chart:', error);
      showSnackbar('Failed to create chart', 'error');
    }

    // Reset dialog
    setChartDialog({ open: false });
    setNewChartName('');
    setSelectedDataset('');
  };

  const deleteChart = async (chartId: string) => {
    try {
      const response = await chartAPI.deleteChart(chartId);
      // chartAPI.deleteChart returns { message: string }
      if (response.message) {
        setCharts(prev => prev.filter(chart => chart.id !== chartId));
        
        // Remove from layout
        setLayouts(prev => ({
          lg: (prev.lg || []).filter(item => item.i !== chartId),
          md: (prev.md || []).filter(item => item.i !== chartId),
          sm: (prev.sm || []).filter(item => item.i !== chartId),
          xs: (prev.xs || []).filter(item => item.i !== chartId)
        }));

        showSnackbar('Chart deleted successfully', 'success');
      } else {
        showSnackbar('Failed to delete chart', 'error');
      }
    } catch (error) {
      console.error('Failed to delete chart:', error);
      showSnackbar('Failed to delete chart', 'error');
    }
  };

  const onLayoutChange = (layout: any[], layouts: { [key: string]: any[] }) => {
    setLayouts(layouts);
  };

  const renderChartTypesByCategory = () => {
    const categories = {
      basic: chartTypes.filter(chart => chart.category === 'basic'),
      trend: chartTypes.filter(chart => chart.category === 'trend'),
      analysis: chartTypes.filter(chart => chart.category === 'analysis'),
      data: chartTypes.filter(chart => chart.category === 'data'),
      kpi: chartTypes.filter(chart => chart.category === 'kpi')
    };

    return Object.entries(categories).map(([category, types]) => (
      <React.Fragment key={category}>
        <ListItemButton onClick={() => toggleCategory(category)}>
          <ListItemText 
            primary={category.charAt(0).toUpperCase() + category.slice(1)} 
            primaryTypographyProps={{ fontWeight: 600 }}
          />
          {expandedCategories[category] ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={expandedCategories[category]} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {types.map((chartType) => (
              <ListItemButton
                key={chartType.type}
                sx={{ pl: 4 }}
                onClick={() => handleAddChart(chartType.type)}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {chartType.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={chartType.name}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </React.Fragment>
    ));
  };

  const renderChart = (chart: Chart) => (
    <Paper 
      key={chart.id}
      sx={{ 
        height: '100%', 
        p: 1,
        position: 'relative',
        '&:hover .chart-actions': {
          opacity: 1
        }
      }}
    >
      {/* Chart Actions */}
      <Box
        className="chart-actions"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          opacity: 0,
          transition: 'opacity 0.2s',
          display: 'flex',
          gap: 1
        }}
      >
        <IconButton
          size="small"
          onClick={() => setSelectedChart(chart)}
          sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => deleteChart(chart.id)}
          sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Chart Content */}
      <ChartContainer
        chart={chart}
        workspaceId={currentWorkspace?.id}
        preview={true}
      />
    </Paper>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { md: drawerOpen ? `${drawerWidth}px` : 0 },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
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
            {dashboard ? `Editing: ${dashboard.name}` : 'New Dashboard'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={previewMode}
                  onChange={(e) => setPreviewMode(e.target.checked)}
                />
              }
              label="Preview"
            />
            
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={saveDashboard}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Toolbar />
        <Divider />
        
        <Box sx={{ overflow: 'auto', p: 1 }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            Chart Types
          </Typography>
          <List>
            {renderChartTypesByCategory()}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          width: { md: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
          ml: { md: drawerOpen ? `${drawerWidth}px` : 0 },
        }}
      >
        <Toolbar />
        
        {charts.length > 0 ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={onLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
            rowHeight={60}
            isDraggable={!previewMode}
            isResizable={!previewMode}
            compactType="vertical"
            preventCollision={false}
          >
            {charts.map(renderChart)}
          </ResponsiveGridLayout>
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="60vh"
            textAlign="center"
          >
            <Typography variant="h4" color="text.secondary" gutterBottom>
              Start Building Your Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Select chart types from the sidebar to add visualizations to your dashboard.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Chart Creation Dialog */}
      <Dialog open={chartDialog.open} onClose={() => setChartDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add New Chart
          {chartDialog.type && (
            <Chip 
              label={chartTypes.find(t => t.type === chartDialog.type)?.name} 
              sx={{ ml: 2 }} 
            />
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chart Name"
            fullWidth
            variant="outlined"
            value={newChartName}
            onChange={(e) => setNewChartName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth variant="outlined">
            <InputLabel>Dataset</InputLabel>
            <Select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              label="Dataset"
            >
              {datasets.map((dataset) => (
                <MenuItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartDialog({ open: false })}>Cancel</Button>
          <Button 
            onClick={createChart} 
            variant="contained"
            disabled={!newChartName.trim() || !selectedDataset}
          >
            Add Chart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
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