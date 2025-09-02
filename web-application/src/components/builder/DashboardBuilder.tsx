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
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  Add as AddIcon,
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  FileCopy as FileCopyIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';

// API Services
import { dashboardAPI, datasetAPI } from '@/services/index';

// Components
import ChartContainer from '../dashboard/ChartContainer';

// Types
import type { 
  Dashboard as DashboardType, 
  Dataset as DatasetType
} from '@/types/index';

// Utils
import {
  BuilderChart,
  convertToChartContainerType,
  convertApiChartToBuilderChart,
  generateGridLayout,
  updateChartsFromLayout,
  createNewChart,
  prepareDashboardForSave,
  validateChartConfig
} from '../../utils/chartBuilderUtils';

import {
  DashboardSettings,
  extractDashboardSettings,
  applySettingsToDashboard,
  validateDashboard
} from '../../utils/dashboardUtils';

import {
  ChartTypeInfo,
  loadAvailableChartTypes,
  groupChartTypesByCategory
} from '../../utils/chartRegistryUtils';

// Styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardBuilderProps {
  dashboardId?: string;
  initialDashboard?: DashboardType;
}

const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  initialDashboard
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  
  // ============================================================================
  // State Management
  // ============================================================================
  
  // Core data
  const [dashboard, setDashboard] = useState<DashboardType | null>(initialDashboard || null);
  const [charts, setCharts] = useState<BuilderChart[]>([]);
  const [datasets, setDatasets] = useState<DatasetType[]>([]);
  const [availableChartTypes, setAvailableChartTypes] = useState<ChartTypeInfo[]>([]);
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>({});
  
  // UI state
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Chart categories
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  
  // Dialogs
  const [chartDialog, setChartDialog] = useState<{
    open: boolean;
    type?: string;
    dataset?: DatasetType;
  }>({ open: false });
  
  const [settingsDialog, setSettingsDialog] = useState<{
    open: boolean;
    settings: DashboardSettings;
  }>({
    open: false,
    settings: extractDashboardSettings(dashboard)
  });

  // Notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'success' });

  // ============================================================================
  // Data Loading
  // ============================================================================
  
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load chart types from registry
        const chartTypes = await loadAvailableChartTypes();
        setAvailableChartTypes(chartTypes);
        
        // Set default expanded categories
        const categories = groupChartTypesByCategory(chartTypes);
        const defaultExpanded = Object.keys(categories).reduce((acc, category) => ({
          ...acc,
          [category]: category === 'basic'
        }), {});
        setExpandedCategories(defaultExpanded);
        
        // Load dashboard if ID provided
        if (dashboardId && !initialDashboard) {
          try {
             
            const response = await dashboardAPI.getDashboard(dashboardId);
            if (response.success) {
              const dashboard = response.dashboard;
              setDashboard(dashboard);
              
              // Convert API charts to builder format
              const builderCharts = dashboard.charts?.map(convertApiChartToBuilderChart) || [];
              setCharts(builderCharts);
            } else {
              console.error('Failed to load dashboard:', response.message);
              setDashboard(null);
              setCharts([]);
            }
            
            // Generate grid layout
            const gridLayout = generateGridLayout(charts);
            setLayouts({ lg: gridLayout });
            
          } catch (error) {
            console.error('Failed to load dashboard:', error);
            showError('Failed to load dashboard data');
          }
        }
        
        // Load datasets
        try {
          const datasetsData = await datasetAPI.getDatasets(currentWorkspace.id);
            if (datasetsData?.datasets) {
              setDatasets(datasetsData.datasets);
            } else {
              setDatasets([]);
              showError('No datasets available. Please create a dataset first.');
            }
        } catch (error) {
          console.error('Failed to load datasets:', error);
          setDatasets([]);
          showError('Failed to load datasets');
        }
        
      } catch (error) {
        console.error('Failed to load initial data:', error);
        showError('Failed to initialize dashboard builder');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [dashboardId, initialDashboard, currentWorkspace?.id]);

  // Update settings when dashboard changes
  useEffect(() => {
    setSettingsDialog(prev => ({
      ...prev,
      settings: extractDashboardSettings(dashboard)
    }));
  }, [dashboard]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const showError = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  }, []);

  const handleLayoutChange = useCallback((layout: any[], layouts: { [key: string]: any[] }) => {
    setLayouts(layouts);
    const updatedCharts = updateChartsFromLayout(charts, layout);
    setCharts(updatedCharts);
  }, [charts]);

  const handleSave = useCallback(async () => {
    if (!currentWorkspace?.id || !dashboard) return;
    
    // Validate dashboard
    const validation = validateDashboard(dashboard);
    if (!validation.valid) {
      showError(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }
    
    // Validate all charts
    const chartValidations = charts.map(validateChartConfig);
    const invalidCharts = chartValidations.filter(v => !v.valid);
    if (invalidCharts.length > 0) {
      showError(`Chart validation failed: ${invalidCharts[0].errors.join(', ')}`);
      return;
    }
    
    setSaving(true);
    try {
      const dashboardWithWorkspace = {
        ...dashboard,
        workspace_id: currentWorkspace.id
      };
      const dashboardData = prepareDashboardForSave(dashboardWithWorkspace, charts, layouts);
      
      if (dashboardId) {
        await dashboardAPI.updateDashboard(dashboardId, dashboardData);
        showSuccess('Dashboard updated successfully');
      } else {
        const newDashboard = await dashboardAPI.createDashboard(dashboardData);
        setDashboard(newDashboard.dashboard);
        router.replace(`/workspace/${currentWorkspace.slug}/dashboard-builder?id=${newDashboard.dashboard.id}`);
        showSuccess('Dashboard created successfully');
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      showError('Failed to save dashboard');
    } finally {
      setSaving(false);
    }
  }, [currentWorkspace, dashboard, dashboardId, layouts, charts, router, showError, showSuccess]);

  const handleAddChart = useCallback((chartType: string, dataset: DatasetType) => {
    if (!availableChartTypes.length) {
      showError('No chart types available');
      return;
    }
    
    const newChart = createNewChart(chartType, dataset, availableChartTypes);
    setCharts(prev => [...prev, newChart]);
    setChartDialog({ open: false });
    showSuccess(`${newChart.name} added to dashboard`);
  }, [availableChartTypes, showError, showSuccess]);

  const handleDeleteChart = useCallback((chartId: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== chartId));
    showSuccess('Chart deleted');
  }, [showSuccess]);

  const handleDuplicateChart = useCallback((chart: BuilderChart) => {
    const duplicatedChart = createNewChart(chart.type, chart.dataset!, availableChartTypes);
    duplicatedChart.name = `${chart.name} (Copy)`;
    duplicatedChart.config = { ...chart.config };
    duplicatedChart.position = {
      ...chart.position,
      y: chart.position.y + chart.position.height + 1
    };
    
    setCharts(prev => [...prev, duplicatedChart]);
    showSuccess('Chart duplicated');
  }, [availableChartTypes, showSuccess]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  const handleUpdateSettings = useCallback(() => {
    const updatedDashboard = applySettingsToDashboard(dashboard, settingsDialog.settings);
    setDashboard(updatedDashboard);
    setSettingsDialog(prev => ({ ...prev, open: false }));
    showSuccess('Settings updated');
  }, [dashboard, settingsDialog.settings, showSuccess]);

  // ============================================================================
  // Render Helpers
  // ============================================================================
  
  const chartTypesByCategory = groupChartTypesByCategory(availableChartTypes);

  const renderChartTypesList = () => {
    if (availableChartTypes.length === 0) {
      return (
        <Box p={2}>
          <Typography color="text.secondary">
            No chart types available
          </Typography>
        </Box>
      );
    }

    return Object.entries(chartTypesByCategory).map(([category, types]) => (
      <Box key={category}>
        <ListItemButton onClick={() => toggleCategory(category)}>
          <ListItemText primary={category.charAt(0).toUpperCase() + category.slice(1)} />
          {expandedCategories[category] ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        <Collapse in={expandedCategories[category]}>
          <List component="div" disablePadding>
            {types.map((chartType) => (
              <ListItemButton
                key={chartType.type}
                sx={{ pl: 4 }}
                onClick={() => setChartDialog({ open: true, type: chartType.type })}
              >
                <ListItemText primary={chartType.name} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </Box>
    ));
  };

  // ============================================================================
  // Loading State
  // ============================================================================
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================
  
  if (!currentWorkspace?.id) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error">No workspace selected</Alert>
      </Box>
    );
  }

  if (datasets.length === 0 && !loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="warning">
          No datasets available. Please create a dataset first to build dashboards.
        </Alert>
      </Box>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
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
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {dashboard?.name || 'New Dashboard'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<SettingsIcon />}
              onClick={() => setSettingsDialog(prev => ({ ...prev, open: true }))}
            >
              Settings
            </Button>
            
            <Button
              startIcon={previewMode ? <EditIcon /> : <VisibilityIcon />}
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            marginTop: '64px',
            height: 'calc(100% - 64px)'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Chart Types
          </Typography>
          {renderChartTypesList()}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          marginTop: '64px',
          marginLeft: drawerOpen && !isMobile ? '280px' : 0,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          overflow: 'auto'
        }}
      >
        {charts.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            minHeight="60vh"
            textAlign="center"
          >
            <Typography variant="h5" gutterBottom color="text.secondary">
              No charts yet
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Start building your dashboard by adding charts from the sidebar
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setChartDialog({ open: true })}
              size="large"
              disabled={datasets.length === 0}
            >
              Add First Chart
            </Button>
          </Box>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            margin={[16, 16]}
            isDraggable={!previewMode}
            isResizable={!previewMode}
          >
            {charts.map((chart) => (
              <Paper
                key={chart.id}
                sx={{ 
                  height: '100%', 
                  position: 'relative',
                  '&:hover .chart-actions': {
                    opacity: previewMode ? 0 : 1
                  }
                }}
              >
                {/* Chart Actions */}
                {!previewMode && (
                  <Box
                    className="chart-actions"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      zIndex: 10,
                      backgroundColor: 'background.paper',
                      borderRadius: 1,
                      boxShadow: 1
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleDuplicateChart(chart)}
                      title="Duplicate chart"
                    >
                      <FileCopyIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteChart(chart.id)}
                      title="Delete chart"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                )}

                {/* Chart Content */}
                <ChartContainer
                  chart={convertToChartContainerType(chart)}
                  workspaceId={currentWorkspace.id}
                  preview={previewMode}
                  onChartError={(chartId, error) => {
                    showError(`Chart error: ${error}`);
                  }}
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Chart</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Dataset</InputLabel>
            <Select
              value={chartDialog.dataset?.id || ''}
              onChange={(e) => {
                const dataset = datasets.find(d => d.id === e.target.value);
                setChartDialog(prev => ({ ...prev, dataset }));
              }}
            >
              {datasets.map(dataset => (
                <MenuItem key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChartDialog({ open: false })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (chartDialog.type && chartDialog.dataset) {
                handleAddChart(chartDialog.type, chartDialog.dataset);
              }
            }}
            variant="contained"
            disabled={!chartDialog.type || !chartDialog.dataset}
          >
            Add Chart
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dashboard Settings Dialog */}
      <Dialog 
        open={settingsDialog.open} 
        onClose={() => setSettingsDialog(prev => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Dashboard Name"
            value={settingsDialog.settings.dashboardName}
            onChange={(e) => setSettingsDialog(prev => ({ 
              ...prev, 
              settings: { ...prev.settings, dashboardName: e.target.value }
            }))}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={settingsDialog.settings.dashboardDescription}
            onChange={(e) => setSettingsDialog(prev => ({ 
              ...prev, 
              settings: { ...prev.settings, dashboardDescription: e.target.value }
            }))}
            margin="normal"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settingsDialog.settings.isPublic}
                onChange={(e) => setSettingsDialog(prev => ({ 
                  ...prev, 
                  settings: { ...prev.settings, isPublic: e.target.checked }
                }))}
              />
            }
            label="Make dashboard public"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settingsDialog.settings.isFeatured}
                onChange={(e) => setSettingsDialog(prev => ({ 
                  ...prev, 
                  settings: { ...prev.settings, isFeatured: e.target.checked }
                }))}
              />
            }
            label="Feature this dashboard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(prev => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button onClick={handleUpdateSettings} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mobile FAB */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setChartDialog({ open: true })}
          disabled={datasets.length === 0}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardBuilder;