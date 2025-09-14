// web-application/src/pages/workspace/dashboard-builder.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Button,
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
  Card,
  CardContent,
  CardHeader,
  Menu,
  ListItemButton
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  FullscreenExit as ResizeIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  BarChart as ChartIcon,
  TextFields as TextIcon,
  Image as ImageIcon,
  TableChart as TableIcon,
  FilterList as FilterIcon,
  Palette as ThemeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  GridView as GridIcon,
  AspectRatio as AspectRatioIcon,
  PhotoSizeSelectLarge as ResizeHandleIcon
} from '@mui/icons-material';

// React Grid Layout imports
import { Responsive, WidthProvider, Layouts, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Components and hooks
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ChartContainer } from '@/components/dashboard/ChartContainer';
import NavbarOnlyLayout from '@/components/layout/NavbarOnlyLayout';

// Make ResponsiveGridLayout responsive
const ResponsiveGridLayout = WidthProvider(Responsive);

// Additional CSS styles to fix layout issues
const dashboardBuilderStyles = `
  .dashboard-grid-layout {
    position: relative !important;
    width: 100% !important;
  }
  
  .react-grid-item {
    box-sizing: border-box !important;
  }
  
  .react-grid-item.react-draggable-dragging {
    z-index: 1000 !important;
    transform: rotate(1deg) !important;
  }
  
  .grid-item-card {
    width: 100% !important;
    height: 100% !important;
    box-sizing: border-box !important;
  }
  
  .widget-content-container {
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('dashboard-builder-styles');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'dashboard-builder-styles';
    style.textContent = dashboardBuilderStyles;
    document.head.appendChild(style);
  }
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface DashboardConfig {
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

interface Widget {
  id: string;
  type: 'chart' | 'text' | 'image' | 'table' | 'metric' | 'filter';
  title: string;
  config: {
    chart_id?: string;
    content?: string;
    image_url?: string;
    table_query?: string;
    metric_value?: number;
    metric_label?: string;
    filter_field?: string;
  };
  // Grid layout will handle positioning
}

interface Chart {
  id: string;
  name: string;
  display_name: string;
  chart_type: string;
  config_json: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ============================================================================
// WIDGET TYPES CONFIGURATION
// ============================================================================

const widgetTypes = [
  {
    type: 'chart',
    label: 'Chart',
    icon: <ChartIcon />,
    description: 'Add existing charts to your dashboard',
    defaultSize: { w: 6, h: 4 }
  },
  {
    type: 'text',
    label: 'Text',
    icon: <TextIcon />,
    description: 'Rich text content and markdown',
    defaultSize: { w: 4, h: 3 }
  },
  {
    type: 'metric',
    label: 'Metric',
    icon: <DashboardIcon />,
    description: 'Key performance indicators',
    defaultSize: { w: 3, h: 2 }
  },
  {
    type: 'table',
    label: 'Table',
    icon: <TableIcon />,
    description: 'Data tables with custom queries',
    defaultSize: { w: 8, h: 6 }
  },
  {
    type: 'image',
    label: 'Image',
    icon: <ImageIcon />,
    description: 'Images, logos, and graphics',
    defaultSize: { w: 4, h: 4 }
  },
  {
    type: 'filter',
    label: 'Filter',
    icon: <FilterIcon />,
    description: 'Interactive dashboard filters',
    defaultSize: { w: 3, h: 2 }
  }
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

// Custom Widget Renderer for Grid Layout
const WidgetRenderer: React.FC<{ 
  widget: Widget; 
  onEdit: (widget: Widget) => void; 
  onDelete: (widgetId: string) => void;
  previewMode: boolean;
}> = ({ widget, onEdit, onDelete, previewMode }) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuClose = () => setMenuAnchor(null);

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'chart':
        if (widget.config.chart_id) {
          // Mock chart for demo - replace with actual chart data
          const mockChart = {
            id: widget.config.chart_id,
            name: `chart-${widget.id}`,
            display_name: widget.title,
            chart_type: 'bar',
            config_json: {
              library: 'echarts',
              chartType: 'bar',
              title: { text: widget.title }
            },
            dataset_ids: [],
            is_active: true,
            version: 1,
            created_by: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          return (
            <ChartContainer
              chart={mockChart}
              preview={true}
              dimensions={{ width: '100%', height: '100%' }}
            />
          );
        }
        return (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'text.secondary'
          }}>
            <ChartIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body2">Select a chart</Typography>
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="body1">
              {widget.config.content || 'Click to edit text content...'}
            </Typography>
          </Box>
        );

      case 'metric':
        return (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            p: 2
          }}>
            <Typography variant="h3" color="primary" gutterBottom>
              {widget.config.metric_value?.toLocaleString() || '0'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {widget.config.metric_label || widget.title}
            </Typography>
          </Box>
        );

      case 'table':
        return (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TableIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          </Box>
        );

      case 'image':
        return (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f5f5f5'
          }}>
            {widget.config.image_url ? (
              <img 
                src={widget.config.image_url} 
                alt={widget.title}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            )}
          </Box>
        );

      case 'filter':
        return (
          <Box sx={{ p: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{widget.title}</InputLabel>
              <Select value="" label={widget.title}>
                <MenuItem value="option1">Option 1</MenuItem>
                <MenuItem value="option2">Option 2</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      default:
        return (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.secondary">Unknown widget type</Typography>
          </Box>
        );
    }
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        cursor: previewMode ? 'default' : 'grab',
        '&:hover': {
          boxShadow: previewMode ? 1 : 3
        }
      }}
      className="grid-item-card"
    >
      {/* Widget Header */}
      <CardHeader
        title={widget.title}
        titleTypographyProps={{ variant: 'subtitle2', noWrap: true }}
        action={
          !previewMode && (
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          )
        }
        sx={{ 
          pb: 1,
          '& .MuiCardHeader-content': { minWidth: 0 }
        }}
      />
      
      {/* Widget Content */}
      <CardContent sx={{ flex: 1, pt: 0, '&:last-child': { pb: 1 } }}>
        {renderWidgetContent()}
      </CardContent>

      {/* Widget Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { onEdit(widget); handleMenuClose(); }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => { onDelete(widget.id); handleMenuClose(); }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DashboardBuilderPage: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    name: '',
    title: 'New Dashboard',
    description: '',
    category_id: '',
    is_public: false,
    layout: {
      columns: 12,
      gap: 16,
      padding: 24
    },
    theme: {
      primary_color: '#1976d2',
      background_color: '#ffffff',
      text_color: '#333333'
    }
  });

  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);

  // Grid Layout State
  const [layouts, setLayouts] = useState<Layouts>({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  // ============================================================================
  // GRID LAYOUT CONFIGURATION
  // ============================================================================

  const gridProps = {
    className: 'dashboard-grid-layout',
    layouts: layouts,
    onLayoutChange: (layout: Layout[], layouts: Layouts) => {
      console.log('Layout changed:', { layout, layouts });
      setLayouts(layouts);
    },
    onBreakpointChange: (breakpoint: string) => {
      console.log('Breakpoint changed:', breakpoint);
      setCurrentBreakpoint(breakpoint);
    },
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    rowHeight: 60,
    isDraggable: !previewMode,
    isResizable: !previewMode,
    margin: [16, 16] as [number, number],
    containerPadding: [24, 24] as [number, number],
    useCSSTransforms: true,
    autoSize: true,
    preventCollision: false,
    compactType: 'vertical' as const,
    // Handle drag start/stop
    onDragStart: (layout: Layout[], oldItem: Layout, newItem: Layout) => {
      console.log('Drag started:', newItem);
    },
    onDragStop: (layout: Layout[], oldItem: Layout, newItem: Layout) => {
      console.log('Drag stopped:', newItem);
    },
    // Handle resize start/stop
    onResizeStart: (layout: Layout[], oldItem: Layout, newItem: Layout) => {
      console.log('Resize started:', newItem);
    },
    onResizeStop: (layout: Layout[], oldItem: Layout, newItem: Layout) => {
      console.log('Resize stopped:', newItem);
    }
  };

  // ============================================================================
  // WIDGET MANAGEMENT
  // ============================================================================

  const addWidget = useCallback((type: string) => {
    const widgetType = widgetTypes.find(wt => wt.type === type);
    if (!widgetType) return;

    const newWidget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      title: `New ${widgetType.label}`,
      config: {}
    };

    setWidgets(prev => [...prev, newWidget]);

    // Add to grid layout
    const defaultLayout: Layout = {
      i: newWidget.id,
      x: (widgets.length * 2) % 12,
      y: Infinity, // Auto-place at bottom
      w: widgetType.defaultSize.w,
      h: widgetType.defaultSize.h,
      minW: 2,
      minH: 2,
      maxW: 12,
      maxH: 20
    };

    setLayouts(prev => ({
      ...prev,
      [currentBreakpoint]: [...(prev[currentBreakpoint] || []), defaultLayout]
    }));

    console.log('Added widget:', newWidget, 'Layout:', defaultLayout);
  }, [widgets.length, currentBreakpoint]);

  const editWidget = useCallback((widget: Widget) => {
    setSelectedWidget(widget);
    setWidgetDialogOpen(true);
  }, []);

  const deleteWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    
    // Remove from layouts
    setLayouts(prev => {
      const newLayouts: Layouts = {};
      Object.keys(prev).forEach(breakpoint => {
        newLayouts[breakpoint] = prev[breakpoint]?.filter(item => item.i !== widgetId) || [];
      });
      return newLayouts;
    });
  }, []);

  const updateWidget = useCallback((updatedWidget: Widget) => {
    setWidgets(prev => prev.map(w => w.id === updatedWidget.id ? updatedWidget : w));
    setSelectedWidget(null);
    setWidgetDialogOpen(false);
  }, []);

  // ============================================================================
  // DASHBOARD ACTIONS
  // ============================================================================

  const saveDashboard = useCallback(async () => {
    if (!dashboardConfig.name.trim()) {
      alert('Please enter a dashboard name');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving dashboard:', {
        config: dashboardConfig,
        widgets,
        layouts
      });

      // Mock save - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Dashboard saved successfully!');
      // router.replace(`/workspace/${workspace?.slug}/dashboards`);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setSaving(false);
    }
  }, [dashboardConfig, widgets, layouts, workspace]);

  // ============================================================================
  // LOAD INITIAL DATA
  // ============================================================================

  useEffect(() => {
    const loadCharts = async () => {
      try {
        // Mock data - replace with actual API call
        setTimeout(() => {
          setCharts([
            { id: '1', name: 'sales-chart', display_name: 'Sales Overview', chart_type: 'bar', config_json: {} },
            { id: '2', name: 'revenue-chart', display_name: 'Revenue Trends', chart_type: 'line', config_json: {} },
            { id: '3', name: 'user-chart', display_name: 'User Analytics', chart_type: 'pie', config_json: {} }
          ]);
        }, 500);
      } catch (error) {
        console.error('Error loading charts:', error);
      }
    };

    loadCharts();
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderWidgetDialog = () => {
    if (!selectedWidget) return null;

    return (
      <Dialog 
        open={widgetDialogOpen} 
        onClose={() => setWidgetDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit {selectedWidget.type.charAt(0).toUpperCase() + selectedWidget.type.slice(1)} Widget
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Widget Title"
              value={selectedWidget.title}
              onChange={(e) => setSelectedWidget(prev => prev ? { ...prev, title: e.target.value } : null)}
              sx={{ mb: 2 }}
            />

            {selectedWidget.type === 'chart' && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Chart</InputLabel>
                <Select
                  value={selectedWidget.config.chart_id || ''}
                  onChange={(e) => setSelectedWidget(prev => prev ? {
                    ...prev,
                    config: { ...prev.config, chart_id: e.target.value }
                  } : null)}
                >
                  {charts.map((chart) => (
                    <MenuItem key={chart.id} value={chart.id}>
                      {chart.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedWidget.type === 'text' && (
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Text Content"
                value={selectedWidget.config.content || ''}
                onChange={(e) => setSelectedWidget(prev => prev ? {
                  ...prev,
                  config: { ...prev.config, content: e.target.value }
                } : null)}
              />
            )}

            {selectedWidget.type === 'metric' && (
              <>
                <TextField
                  fullWidth
                  type="number"
                  label="Metric Value"
                  value={selectedWidget.config.metric_value || ''}
                  onChange={(e) => setSelectedWidget(prev => prev ? {
                    ...prev,
                    config: { ...prev.config, metric_value: parseFloat(e.target.value) || 0 }
                  } : null)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Metric Label"
                  value={selectedWidget.config.metric_label || ''}
                  onChange={(e) => setSelectedWidget(prev => prev ? {
                    ...prev,
                    config: { ...prev.config, metric_label: e.target.value }
                  } : null)}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWidgetDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => selectedWidget && updateWidget(selectedWidget)}
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ============================================================================
  // NAVIGATION & ACTIONS
  // ============================================================================

  const breadcrumbs = [
    { label: 'Dashboard', href: `/workspace/${workspace?.slug}/dashboards` },
    { label: 'Builder', href: '#' }
  ];

  const actions = (
    <>
      <Button
        startIcon={<GridIcon />}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        sx={{ mr: 1 }}
      >
        {sidebarOpen ? 'Hide' : 'Show'} Sidebar
      </Button>
      
      <Button
        startIcon={previewMode ? <EditIcon /> : <PreviewIcon />}
        onClick={() => setPreviewMode(!previewMode)}
        sx={{ mr: 1 }}
      >
        {previewMode ? 'Edit Mode' : 'Preview'}
      </Button>

      <PermissionGate permission="dashboard.create">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={saveDashboard}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Dashboard'}
        </Button>
      </PermissionGate>
    </>
  );

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <NavbarOnlyLayout
      title="Dashboard Builder"
      subtitle="Create interactive dashboards with drag & drop"
      breadcrumbs={breadcrumbs}
      actions={actions}
    >
      <Box sx={{ height: '100%', display: 'flex' }}>
        {/* Sidebar */}
        {!previewMode && (
          <Drawer
            variant="permanent"
            sx={{
              width: sidebarOpen ? 320 : 0,
              flexShrink: 0,
              transition: 'width 0.3s',
              '& .MuiDrawer-paper': {
                width: sidebarOpen ? 320 : 0,
                position: 'relative',
                transition: 'width 0.3s',
                overflowX: 'hidden',
                borderRight: '1px solid',
                borderColor: 'divider'
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">
                  Dashboard Builder
                </Typography>
                <IconButton size="small" onClick={() => setSidebarOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                variant="fullWidth"
              >
                <Tab label="Widgets" />
                <Tab label="Settings" />
              </Tabs>
            </Box>

            {/* Widgets Tab */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="subtitle2" gutterBottom>
                Add Widgets to Dashboard
              </Typography>
              
              <List dense>
                {widgetTypes.map((widgetType) => (
                  <ListItemButton
                    key={widgetType.type}
                    onClick={() => addWidget(widgetType.type)}
                    sx={{ 
                      mb: 1, 
                      border: '1px solid', 
                      borderColor: 'divider', 
                      borderRadius: 1,
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.50'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {widgetType.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={widgetType.label}
                      secondary={`${widgetType.defaultSize.w}×${widgetType.defaultSize.h}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <AddIcon fontSize="small" color="action" />
                  </ListItemButton>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Current Widgets ({widgets.length})
              </Typography>
              
              {widgets.map((widget) => (
                <Chip
                  key={widget.id}
                  label={widget.title}
                  size="small"
                  sx={{ m: 0.5 }}
                  onDelete={() => deleteWidget(widget.id)}
                  onClick={() => editWidget(widget)}
                />
              ))}
            </TabPanel>

            {/* Settings Tab */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="subtitle2" gutterBottom>
                Dashboard Settings
              </Typography>

              <TextField
                fullWidth
                label="Dashboard Name"
                value={dashboardConfig.name}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Dashboard Title"
                value={dashboardConfig.title}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, title: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={dashboardConfig.description}
                onChange={(e) => setDashboardConfig(prev => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={dashboardConfig.is_public}
                    onChange={(e) => setDashboardConfig(prev => ({ ...prev, is_public: e.target.checked }))}
                  />
                }
                label="Public Dashboard"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Layout Info
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Current Breakpoint: <strong>{currentBreakpoint.toUpperCase()}</strong>
                </Typography>
              </Box>
              
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Grid Columns: <strong>{gridProps.cols[currentBreakpoint as keyof typeof gridProps.cols]}</strong>
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Items in Layout: <strong>{layouts[currentBreakpoint]?.length || 0}</strong>
                </Typography>
              </Box>
            </TabPanel>
          </Drawer>
        )}

        {/* Main Canvas */}
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Canvas Header */}
          <Paper 
            sx={{ 
              p: 2, 
              mb: 2, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}
            elevation={1}
          >
            <Box>
              <Typography variant="h6">
                {dashboardConfig.title || 'Untitled Dashboard'}
              </Typography>
              {dashboardConfig.description && (
                <Typography variant="body2" color="text.secondary">
                  {dashboardConfig.description}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={`${widgets.length} widgets`} 
                size="small" 
                color={widgets.length > 0 ? 'primary' : 'default'}
              />
              <Chip 
                label={previewMode ? 'Preview Mode' : 'Edit Mode'} 
                size="small" 
                color={previewMode ? 'success' : 'warning'}
              />
            </Box>
          </Paper>

          {/* Grid Layout Canvas */}
          <Box 
            sx={{ 
              flex: 1, 
              overflow: 'auto',
              backgroundColor: previewMode ? dashboardConfig.theme.background_color : 'grey.50',
              p: 2
            }}
          >
            {widgets.length === 0 ? (
              <Paper
                sx={{
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  flexDirection: 'column',
                  gap: 2,
                  backgroundColor: 'background.paper'
                }}
              >
                <DashboardIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                <Typography variant="h5" color="textSecondary" gutterBottom>
                  {dashboardConfig.title || 'Your Dashboard'}
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center' }}>
                  {previewMode 
                    ? 'No widgets added yet'
                    : 'Add widgets from the sidebar to start building your dashboard'
                  }
                </Typography>
                {!previewMode && (
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setTabValue(0)}
                  >
                    Add Your First Widget
                  </Button>
                )}
              </Paper>
            ) : (
              <ResponsiveGridLayout {...gridProps}>
                {widgets.map((widget) => (
                  <div key={widget.id}>
                    <WidgetRenderer
                      widget={widget}
                      onEdit={editWidget}
                      onDelete={deleteWidget}
                      previewMode={previewMode}
                    />
                  </div>
                ))}
              </ResponsiveGridLayout>
            )}
          </Box>
        </Box>

        {renderWidgetDialog()}
      </Box>
    </NavbarOnlyLayout>
  );
};

export default DashboardBuilderPage;