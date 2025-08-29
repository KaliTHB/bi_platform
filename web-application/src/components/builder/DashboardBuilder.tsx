// File: web-application/src/components/builder/DashboardBuilder.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Drawer,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Add,
  Save,
  Preview,
  Settings,
  GridOn,
  Palette,
  FilterList,
  Close,
  DragIndicator,
  Edit,
  Delete,
  ContentCopy
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDashboardBuilder } from '../../hooks/useDashboardBuilder';
import { ChartBuilder } from './ChartBuilder';

interface Chart {
  id: string;
  name: string;
  display_name: string;
  chart_type: string;
  chart_library: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: any;
  dataset_ids: string[];
}

interface Dashboard {
  id?: string;
  name: string;
  display_name: string;
  description?: string;
  category_id?: string;
  config: any;
  tabs: any[];
  global_filters: any[];
  theme_config: any;
  layout_config: any;
}

interface DashboardBuilderProps {
  dashboardId?: string;
  workspaceId: string;
}

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  workspaceId
}) => {
  const {
    dashboard,
    charts,
    categories,
    availableDatasets,
    loading,
    saving,
    error,
    loadDashboard,
    saveDashboard,
    addChart,
    updateChart,
    deleteChart,
    updateDashboardConfig
  } = useDashboardBuilder(workspaceId, dashboardId);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('charts');
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [chartBuilderOpen, setChartBuilderOpen] = useState(false);
  const [configDialog, setConfigDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [dashboardConfig, setDashboardConfig] = useState<Dashboard>({
    name: '',
    display_name: '',
    description: '',
    category_id: '',
    config: {},
    tabs: [{ id: 'main', name: 'Main', charts: [] }],
    global_filters: [],
    theme_config: {},
    layout_config: { grid_size: 12, row_height: 100 }
  });

  useEffect(() => {
    if (dashboardId) {
      loadDashboard();
    }
  }, [dashboardId, workspaceId]);

  useEffect(() => {
    if (dashboard) {
      setDashboardConfig(dashboard);
    }
  }, [dashboard]);

  const handleSaveDashboard = async () => {
    try {
      await saveDashboard(dashboardConfig);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  const handleAddChart = () => {
    setSelectedChart(null);
    setChartBuilderOpen(true);
  };

  const handleEditChart = (chart: Chart) => {
    setSelectedChart(chart);
    setChartBuilderOpen(true);
  };

  const handleDeleteChart = async (chartId: string) => {
    if (window.confirm('Are you sure you want to delete this chart?')) {
      await deleteChart(chartId);
    }
  };

  const handleDuplicateChart = async (chart: Chart) => {
    const duplicateChart = {
      ...chart,
      id: undefined,
      name: `${chart.name}_copy`,
      display_name: `${chart.display_name} (Copy)`,
      position: {
        ...chart.position,
        x: chart.position.x + 1,
        y: chart.position.y + 1
      }
    };
    
    await addChart(duplicateChart);
  };

  const handleChartPositionChange = useCallback((result: any) => {
    if (!result.destination) return;

    const chartId = result.draggableId;
    const chart = charts.find(c => c.id === chartId);
    
    if (chart) {
      const updatedChart = {
        ...chart,
        position: {
          ...chart.position,
          // Update position based on drop result
          x: result.destination.index % dashboardConfig.layout_config.grid_size,
          y: Math.floor(result.destination.index / dashboardConfig.layout_config.grid_size)
        }
      };
      
      updateChart(chartId, updatedChart);
    }
  }, [charts, dashboardConfig.layout_config.grid_size, updateChart]);

  const renderChart = (chart: Chart, isDragging: boolean = false) => (
    <Card 
      sx={{ 
        height: '100%',
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle2" noWrap>
            {chart.display_name}
          </Typography>
          
          <Box display="flex" gap={0.5}>
            <IconButton size="small" onClick={() => handleEditChart(chart)}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => handleDuplicateChart(chart)}>
              <ContentCopy fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => handleDeleteChart(chart.id)}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ 
          height: chart.position.h * dashboardConfig.layout_config.row_height - 60,
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography variant="body2" color="textSecondary">
            {chart.chart_type} Chart
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const renderChartGrid = () => {
    const gridSize = dashboardConfig.layout_config.grid_size || 12;
    const gridItems: (Chart | null)[] = new Array(gridSize * 10).fill(null);

    // Place charts in grid positions
    charts.forEach(chart => {
      const index = chart.position.y * gridSize + chart.position.x;
      if (index >= 0 && index < gridItems.length) {
        gridItems[index] = chart;
      }
    });

    return (
      <Grid container spacing={1} sx={{ p: 2 }}>
        {gridItems.map((chart, index) => (
          <Grid key={index} item xs={12 / gridSize}>
            {chart ? (
              <Draggable draggableId={chart.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      height: chart.position.h * dashboardConfig.layout_config.row_height,
                      ...provided.draggableProps.style
                    }}
                  >
                    {renderChart(chart, snapshot.isDragging)}
                  </div>
                )}
              </Draggable>
            ) : (
              <Box
                sx={{
                  height: dashboardConfig.layout_config.row_height,
                  border: '2px dashed #ddd',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.50'
                  }
                }}
                onClick={handleAddChart}
              >
                <Add color="action" />
              </Box>
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Toolbar */}
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {dashboardConfig.display_name || 'New Dashboard'}
            </Typography>
            
            <Box display="flex" gap={1}>
              <Tooltip title="Dashboard Settings">
                <IconButton onClick={() => setConfigDialog(true)}>
                  <Settings />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Preview">
                <IconButton 
                  color={previewMode ? 'primary' : 'default'}
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  <Preview />
                </IconButton>
              </Tooltip>
              
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveDashboard}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Dashboard Canvas */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: '#f5f5f5' }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          <DragDropContext onDragEnd={handleChartPositionChange}>
            <Droppable droppableId="dashboard-grid" direction="horizontal">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{ minHeight: '100%' }}
                >
                  {renderChartGrid()}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {charts.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '50vh',
                color: 'text.secondary'
              }}
            >
              <GridOn sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No charts added yet
              </Typography>
              <Typography variant="body2" align="center" mb={2}>
                Start building your dashboard by adding charts
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddChart}
              >
                Add Chart
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* Right Sidebar */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={sidebarOpen}
        sx={{
          width: 320,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 320,
            boxSizing: 'border-box'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Dashboard Tools</Typography>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          {/* Quick Actions */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddChart}
                fullWidth
              >
                Add Chart
              </Button>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                fullWidth
              >
                Add Filter
              </Button>
              <Button
                variant="outlined"
                startIcon={<Palette />}
                fullWidth
              >
                Theme Settings
              </Button>
            </Box>
          </Box>

          {/* Charts List */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Charts ({charts.length})
            </Typography>
            <Box>
              {charts.map(chart => (
                <Paper key={chart.id} sx={{ p: 1, mb: 1 }}>
                  <Box display="flex" justifyContent="between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {chart.display_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {chart.chart_type}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => handleEditChart(chart)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* Chart Builder Dialog */}
      <Dialog
        open={chartBuilderOpen}
        onClose={() => setChartBuilderOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <ChartBuilder
          chart={selectedChart}
          availableDatasets={availableDatasets}
          onSave={async (chartData) => {
            if (selectedChart) {
              await updateChart(selectedChart.id, chartData);
            } else {
              await addChart(chartData);
            }
            setChartBuilderOpen(false);
          }}
          onCancel={() => setChartBuilderOpen(false)}
        />
      </Dialog>

      {/* Dashboard Config Dialog */}
      <DashboardConfigDialog
        open={configDialog}
        dashboard={dashboardConfig}
        categories={categories}
        onClose={() => setConfigDialog(false)}
        onSave={(config) => {
          setDashboardConfig(config);
          updateDashboardConfig(config);
          setConfigDialog(false);
        }}
      />
    </Box>
  );
};

// Dashboard Configuration Dialog Component
interface DashboardConfigDialogProps {
  open: boolean;
  dashboard: Dashboard;
  categories: any[];
  onClose: () => void;
  onSave: (dashboard: Dashboard) => void;
}

const DashboardConfigDialog: React.FC<DashboardConfigDialogProps> = ({
  open,
  dashboard,
  categories,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Dashboard>(dashboard);

  useEffect(() => {
    setFormData(dashboard);
  }, [dashboard, open]);

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Dashboard Settings</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          
          <TextField
            label="Display Name"
            fullWidth
            value={formData.display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            required
          />
          
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
              label="Category"
            >
              <MenuItem value="">None</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!formData.name || !formData.display_name}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};