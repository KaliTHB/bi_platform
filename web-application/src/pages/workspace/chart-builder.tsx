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

interface Chart {
  id: string;
  name: string;
  display_name: string;
  type: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

const widgetTypes = [
  {
    type: 'chart',
    label: 'Chart',
    icon: <ChartIcon />,
    description: 'Add existing charts to your Chart'
  },
  {
    type: 'text',
    label: 'Text',
    icon: <TextIcon />,
    description: 'Rich text content and markdown'
  },
  {
    type: 'metric',
    label: 'Metric',
    icon: <ChartIcon />,
    description: 'Key performance indicators'
  },
  {
    type: 'table',
    label: 'Table',
    icon: <TableIcon />,
    description: 'Data tables with custom queries'
  },
  {
    type: 'image',
    label: 'Image',
    icon: <ImageIcon />,
    description: 'Images, logos, and graphics'
  },
  {
    type: 'filter',
    label: 'Filter',
    icon: <FilterIcon />,
    description: 'Interactive Chart filters'
  }
];

const ChartBuilderPage: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const [ChartConfig, setChartConfig] = useState<ChartConfig>({
    name: '',
    title: 'New Chart',
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [saving, setSaving] = useState(false);

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

  // Handle widget creation
  const handleAddWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      position: {
        x: widgets.length % 3 * 4,
        y: Math.floor(widgets.length / 3) * 4,
        w: 4,
        h: 4
      },
      config: {}
    };

    setWidgets(prev => [...prev, newWidget]);
    setSelectedWidget(newWidget);
    setWidgetDialogOpen(true);
  };

  const handleEditWidget = (widget: Widget) => {
    setSelectedWidget(widget);
    setWidgetDialogOpen(true);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleUpdateWidget = (updatedWidget: Widget) => {
    setWidgets(prev => prev.map(w => w.id === updatedWidget.id ? updatedWidget : w));
    setWidgetDialogOpen(false);
    setSelectedWidget(null);
  };

  const handleSaveChart = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Saving Chart:', { ChartConfig, widgets });
      
      // Navigate back to Charts list
      router.push(`/workspace/Charts`);
    } catch (error) {
      console.error('Error saving Chart:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderWidget = (widget: Widget) => (
    <Grid item key={widget.id} xs={widget.position.w} style={{ minHeight: widget.position.h * 50 }}>
      <Card
        sx={{
          height: '100%',
          position: 'relative',
          border: selectedWidget?.id === widget.id ? 2 : 1,
          borderColor: selectedWidget?.id === widget.id ? 'primary.main' : 'divider',
          '&:hover .widget-controls': {
            opacity: 1
          }
        }}
      >
        {!previewMode && (
          <Box
            className="widget-controls"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 1,
              opacity: 0,
              transition: 'opacity 0.2s',
              zIndex: 1
            }}
          >
            <IconButton
              size="small"
              sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              onClick={() => handleEditWidget(widget)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              onClick={() => handleDeleteWidget(widget.id)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        <CardContent sx={{ height: '100%', p: 2 }}>
          <Typography variant="h6" gutterBottom noWrap>
            {widget.title}
          </Typography>
          
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
                  {widget.config.chart_id ? 
                    charts.find(c => c.id === widget.config.chart_id)?.display_name || 'Chart Preview' :
                    'Select Chart'
                  }
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

  const renderWidgetDialog = () => (
    <Dialog
      open={widgetDialogOpen}
      onClose={() => setWidgetDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {selectedWidget ? `Edit ${selectedWidget.type} Widget` : 'Add Widget'}
      </DialogTitle>
      <DialogContent>
        {selectedWidget && (
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Widget Title"
              value={selectedWidget.title}
              onChange={(e) => setSelectedWidget({
                ...selectedWidget,
                title: e.target.value
              })}
              margin="normal"
            />

            {selectedWidget.type === 'chart' && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Select Chart</InputLabel>
                <Select
                  value={selectedWidget.config.chart_id || ''}
                  onChange={(e) => setSelectedWidget({
                    ...selectedWidget,
                    config: { ...selectedWidget.config, chart_id: e.target.value }
                  })}
                >
                  {charts.map((chart) => (
                    <MenuItem key={chart.id} value={chart.id}>
                      {chart.display_name} ({chart.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedWidget.type === 'text' && (
              <TextField
                fullWidth
                label="Content"
                value={selectedWidget.config.content || ''}
                onChange={(e) => setSelectedWidget({
                  ...selectedWidget,
                  config: { ...selectedWidget.config, content: e.target.value }
                })}
                margin="normal"
                multiline
                rows={4}
              />
            )}

            {selectedWidget.type === 'metric' && (
              <>
                <TextField
                  fullWidth
                  label="Metric Value"
                  type="number"
                  value={selectedWidget.config.metric_value || ''}
                  onChange={(e) => setSelectedWidget({
                    ...selectedWidget,
                    config: { ...selectedWidget.config, metric_value: parseInt(e.target.value) }
                  })}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Metric Label"
                  value={selectedWidget.config.metric_label || ''}
                  onChange={(e) => setSelectedWidget({
                    ...selectedWidget,
                    config: { ...selectedWidget.config, metric_label: e.target.value }
                  })}
                  margin="normal"
                />
              </>
            )}

            {selectedWidget.type === 'table' && (
              <TextField
                fullWidth
                label="SQL Query"
                value={selectedWidget.config.table_query || ''}
                onChange={(e) => setSelectedWidget({
                  ...selectedWidget,
                  config: { ...selectedWidget.config, table_query: e.target.value }
                })}
                margin="normal"
                multiline
                rows={3}
                placeholder="SELECT * FROM your_table LIMIT 10"
              />
            )}

            {selectedWidget.type === 'image' && (
              <TextField
                fullWidth
                label="Image URL"
                value={selectedWidget.config.image_url || ''}
                onChange={(e) => setSelectedWidget({
                  ...selectedWidget,
                  config: { ...selectedWidget.config, image_url: e.target.value }
                })}
                margin="normal"
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setWidgetDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => selectedWidget && handleUpdateWidget(selectedWidget)}
          variant="contained"
          disabled={!selectedWidget?.title}
        >
          {selectedWidget?.id ? 'Update' : 'Add'} Widget
        </Button>
      </DialogActions>
    </Dialog>
  );

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
              <Typography variant="subtitle2" gutterBottom>
                Add Widgets
              </Typography>
              
              <List dense>
                {widgetTypes.map((widgetType) => (
                  <ListItem
                    key={widgetType.type}
                    button
                    onClick={() => handleAddWidget(widgetType.type)}
                    sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <ListItemIcon>
                      {widgetType.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={widgetType.label}
                      secondary={widgetType.description}
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <TextField
                fullWidth
                label="Chart Title"
                value={ChartConfig.title}
                onChange={(e) => setChartConfig(prev => ({
                  ...prev,
                  title: e.target.value
                }))}
                margin="normal"
                size="small"
              />
              
              <TextField
                fullWidth
                label="Description"
                value={ChartConfig.description}
                onChange={(e) => setChartConfig(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                margin="normal"
                multiline
                rows={2}
                size="small"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={ChartConfig.is_public}
                    onChange={(e) => setChartConfig(prev => ({
                      ...prev,
                      is_public: e.target.checked
                    }))}
                  />
                }
                label="Public Chart"
                sx={{ mt: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Theme Settings
              </Typography>
              
              <TextField
                fullWidth
                label="Primary Color"
                type="color"
                value={ChartConfig.theme.primary_color}
                onChange={(e) => setChartConfig(prev => ({
                  ...prev,
                  theme: { ...prev.theme, primary_color: e.target.value }
                }))}
                margin="normal"
                size="small"
              />
            </TabPanel>
          </Drawer>
        )}

        {/* Main Canvas */}
        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto' }}>
          <Paper
            variant="outlined"
            sx={{
              minHeight: '100%',
              p: ChartConfig.layout.padding / 8,
              backgroundColor: ChartConfig.theme.background_color
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
                  {ChartConfig.title || 'Your Chart'}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {previewMode 
                    ? 'No widgets added yet'
                    : 'Add widgets from the sidebar to start building your Chart'
                  }
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={ChartConfig.layout.gap / 8}>
                {widgets.map(renderWidget)}
              </Grid>
            )}
          </Paper>
        </Box>

        {renderWidgetDialog()}
      </Box>
    </NavbarOnlyLayout>
  );
};

export default ChartBuilderPage;