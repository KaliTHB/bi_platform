# web-application/src/components/builder/DashboardBuilder.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  BarChart,
  LineChart,
  PieChart,
  TableChart,
  ScatterPlot,
  DonutLarge,
  Timeline,
  TrendingUp,
  Close as CloseIcon
} from '@mui/icons-material';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store/store';
import { dashboardAPI, datasetAPI, chartAPI } from '@/services/api';
import { ChartRenderer } from './ChartRenderer';
import { ChartConfigPanel } from './ChartConfigPanel';
import { Dashboard, Chart, Dataset } from '@/types/auth.types';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardBuilderProps {
  dashboardId?: string;
  initialDashboard?: Dashboard;
}

const chartTypes = [
  { type: 'line-chart', name: 'Line Chart', icon: <LineChart />, category: 'trend' },
  { type: 'bar-chart', name: 'Bar Chart', icon: <BarChart />, category: 'comparison' },
  { type: 'pie-chart', name: 'Pie Chart', icon: <PieChart />, category: 'distribution' },
  { type: 'scatter-plot', name: 'Scatter Plot', icon: <ScatterPlot />, category: 'correlation' },
  { type: 'donut-chart', name: 'Donut Chart', icon: <DonutLarge />, category: 'distribution' },
  { type: 'area-chart', name: 'Area Chart', icon: <Timeline />, category: 'trend' },
  { type: 'table-chart', name: 'Table', icon: <TableChart />, category: 'data' },
  { type: 'metric-card', name: 'Metric Card', icon: <TrendingUp />, category: 'kpi' }
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
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  
  // UI state
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
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
    try {
      const response = await dashboardAPI.getDashboard(dashboardId!);
      setDashboard(response.dashboard);
      setCharts(response.dashboard.charts || []);
      
      // Convert charts to grid layout
      const gridLayouts = convertChartsToLayout(response.dashboard.charts || []);
      setLayouts({ lg: gridLayouts, md: gridLayouts, sm: gridLayouts });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setSnackbar({ open: true, message: 'Failed to load dashboard', severity: 'error' });
    }
  };

  const loadDatasets = async () => {
    try {
      const response = await datasetAPI.getDatasets(currentWorkspace!.id);
      setDatasets(response.datasets || []);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    }
  };

  const convertChartsToLayout = (chartList: Chart[]): Layout[] => {
    return chartList.map(chart => ({
      i: chart.id,
      x: chart.position.x,
      y: chart.position.y,
      w: chart.position.width,
      h: chart.position.height,
      minW: 2,
      minH: 2
    }));
  };

  const convertLayoutToCharts = (layout: Layout[]): Chart[] => {
    return charts.map(chart => {
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
  };

  const handleAddChart = async (chartType: string) => {
    if (!dashboard || datasets.length === 0) {
      setSnackbar({ open: true, message: 'Please select a dataset first', severity: 'error' });
      return;
    }

    const newChart: Partial<Chart> = {
      dashboard_id: dashboard.id,
      dataset_id: datasets[0].id, // Default to first dataset
      name: `New ${chartTypes.find(ct => ct.type === chartType)?.name}`,
      type: chartType,
      config: {
        title: { text: `New ${chartTypes.find(ct => ct.type === chartType)?.name}` },
        // Default configuration based on chart type
        ...(chartType === 'line-chart' && {
          x_axis: { column: '', type: 'category' },
          y_axes: [{ column: '', name: 'Value' }]
        })
      },
      position: {
        x: 0,
        y: 0,
        width: 6,
        height: 4
      }
    };

    try {
      const response = await chartAPI.createChart(newChart as any);
      const createdChart = response.chart;
      
      setCharts(prev => [...prev, createdChart]);
      
      // Add to layout
      const newLayoutItem: Layout = {
        i: createdChart.id,
        x: 0,
        y: Infinity, // Add to bottom
        w: 6,
        h: 4,
        minW: 2,
        minH: 2
      };
      
      setLayouts(prev => ({
        ...prev,
        lg: [...(prev.lg || []), newLayoutItem]
      }));

      setSelectedChart(createdChart);
      setConfigPanelOpen(true);
      
      setSnackbar({ open: true, message: 'Chart added successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to add chart:', error);
      setSnackbar({ open: true, message: 'Failed to add chart', severity: 'error' });
    }
  };

  const handleLayoutChange = useCallback((layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    setLayouts(layouts);
    
    // Update chart positions
    const updatedCharts = convertLayoutToCharts(layout);
    setCharts(updatedCharts);
  }, [charts]);

  const handleDeleteChart = async (chartId: string) => {
    try {
      await chartAPI.deleteChart(chartId);
      
      setCharts(prev => prev.filter(chart => chart.id !== chartId));
      setLayouts(prev => ({
        ...prev,
        lg: prev.lg?.filter(item => item.i !== chartId) || []
      }));
      
      if (selectedChart?.id === chartId) {
        setSelectedChart(null);
        setConfigPanelOpen(false);
      }
      
      setSnackbar({ open: true, message: 'Chart deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to delete chart:', error);
      setSnackbar({ open: true, message: 'Failed to delete chart', severity: 'error' });
    }
  };

  const handleSaveDashboard = async () => {
    if (!dashboard) return;
    
    setSaving(true);
    try {
      // Update dashboard layout
      const updatedDashboard = {
        ...dashboard,
        layout_config: {
          components: charts.map(chart => ({
            id: chart.id,
            type: 'chart',
            position: chart.position,
            config: chart.config
          })),
          settings: {
            grid_size: 12,
            auto_height: false,
            responsive: true
          }
        }
      };

      await dashboardAPI.updateDashboard(dashboard.id, {
        layout_config: updatedDashboard.layout_config
      });

      // Update individual charts
      for (const chart of charts) {
        await chartAPI.updateChart(chart.id, {
          config: chart.config,
          position: chart.position
        });
      }

      setDashboard(updatedDashboard);
      setSnackbar({ open: true, message: 'Dashboard saved successfully', severity: 'success' });
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      setSnackbar({ open: true, message: 'Failed to save dashboard', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewToggle = () => {
    setPreviewMode(!previewMode);
    setDrawerOpen(!previewMode);
  };

  const renderChartTypeList = () => (
    <List>
      <ListItem>
        <Typography variant="h6" color="primary">
          Add Chart
        </Typography>
      </ListItem>
      <Divider />
      
      {Object.entries(
        chartTypes.reduce((acc, chart) => {
          if (!acc[chart.category]) acc[chart.category] = [];
          acc[chart.category].push(chart);
          return acc;
        }, {} as { [key: string]: typeof chartTypes })
      ).map(([category, categoryCharts]) => (
        <Box key={category}>
          <ListItem>
            <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
              {category}
            </Typography>
          </ListItem>
          {categoryCharts.map((chartType) => (
            <ListItem
              key={chartType.type}
              onClick={() => handleAddChart(chartType.type)}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <ListItemIcon>
                {chartType.icon}
              </ListItemIcon>
              <ListItemText primary={chartType.name} />
            </ListItem>
          ))}
          <Divider />
        </Box>
      ))}
    </List>
  );

  const renderChart = (chartId: string) => {
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return null;

    return (
      <Paper 
        elevation={2} 
        sx={{ 
          height: '100%', 
          position: 'relative',
          '&:hover .chart-controls': {
            opacity: 1
          }
        }}
      >
        {/* Chart Controls */}
        {!previewMode && (
          <Box 
            className="chart-controls"
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8, 
              zIndex: 10,
              opacity: 0,
              transition: 'opacity 0.2s',
              display: 'flex',
              gap: 0.5
            }}
          >
            <IconButton 
              size="small" 
              onClick={() => {
                setSelectedChart(chart);
                setConfigPanelOpen(true);
              }}
              sx={{ backgroundColor: 'background.paper', boxShadow: 1 }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => handleDeleteChart(chart.id)}
              sx={{ backgroundColor: 'background.paper', boxShadow: 1 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Chart Content */}
        <Box sx={{ p: 1, height: '100%' }}>
          <ChartRenderer
            chart={chart}
            dataset={datasets.find(d => d.id === chart.dataset_id)}
            interactive={!previewMode}
          />
        </Box>
      </Paper>
    );
  };

  if (!currentWorkspace) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Typography>Please select a workspace</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen && !previewMode}
        sx={{
          width: 300,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 300,
            boxSizing: 'border-box',
            position: 'relative'
          },
        }}
      >
        {renderChartTypeList()}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box>
            <Typography variant="h5">
              {dashboard?.name || 'Dashboard Builder'}
            </Typography>
            {dashboard && (
              <Typography variant="body2" color="text.secondary">
                {charts.length} charts • Last saved: {new Date(dashboard.updated_at).toLocaleString()}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreviewToggle}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveDashboard}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>

        {/* Grid Layout */}
        <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
          {charts.length > 0 ? (
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              onLayoutChange={handleLayoutChange}
              isDraggable={!previewMode}
              isResizable={!previewMode}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              rowHeight={60}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            >
              {charts.map(chart => (
                <div key={chart.id}>
                  {renderChart(chart.id)}
                </div>
              ))}
            </ResponsiveGridLayout>
          ) : (
            <Box 
              display="flex" 
              flexDirection="column" 
              justifyContent="center" 
              alignItems="center" 
              height="100%"
              sx={{ color: 'text.secondary' }}
            >
              <Typography variant="h4" gutterBottom>
                Start Building Your Dashboard
              </Typography>
              <Typography variant="body1" gutterBottom>
                Add charts from the sidebar to get started
              </Typography>
              {datasets.length === 0 && (
                <Typography variant="body2" color="error">
                  No datasets available. Please create a dataset first.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Chart Configuration Panel */}
      <ChartConfigPanel
        open={configPanelOpen}
        onClose={() => setConfigPanelOpen(false)}
        chart={selectedChart}
        datasets={datasets}
        onSave={async (updatedChart) => {
          try {
            await chartAPI.updateChart(updatedChart.id, {
              config: updatedChart.config,
              dataset_id: updatedChart.dataset_id,
              name: updatedChart.name
            });
            
            setCharts(prev => 
              prev.map(chart => 
                chart.id === updatedChart.id ? updatedChart : chart
              )
            );
            
            setSnackbar({ open: true, message: 'Chart updated successfully', severity: 'success' });
          } catch (error) {
            console.error('Failed to update chart:', error);
            setSnackbar({ open: true, message: 'Failed to update chart', severity: 'error' });
          }
        }}
      />

      {/* Floating Action Buttons */}
      {previewMode && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handlePreviewToggle}
        >
          <CloseIcon />
        </Fab>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardBuilder;