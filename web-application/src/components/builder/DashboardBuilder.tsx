// web-application/src/components/builder/DashboardBuilder.tsx
import React, { useState, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  Drawer,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  IconButton,
  Card,
  CardContent,
  Fab,
  Menu,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Grid,
  Chip,
  Tooltip
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  TableChart as TableIcon,
  TextFields as TextIcon,
  Assessment as MetricIcon,
  FilterList as FilterIcon,
  Timeline as LineChartIcon,
  DonutLarge as DonutIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import BuilderLayout from '../layout/BuilderLayout';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface DashboardItem {
  id: string;
  type: 'chart' | 'table' | 'text' | 'metric' | 'filter';
  title: string;
  description?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: Record<string, any>;
  isVisible: boolean;
}

interface DashboardConfig {
  id?: string;
  name: string;
  description?: string;
  theme: 'light' | 'dark' | 'auto';
  layout: 'grid' | 'free';
  refreshInterval?: number;
  isPublic: boolean;
  tags: string[];
  items: DashboardItem[];
}

interface WidgetTemplate {
  id: string;
  type: 'chart' | 'table' | 'text' | 'metric' | 'filter';
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'visualization' | 'data' | 'content' | 'filter';
  defaultSize: { width: number; height: number };
  defaultConfig: Record<string, any>;
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  // Visualization Widgets
  {
    id: 'bar-chart',
    type: 'chart',
    title: 'Bar Chart',
    description: 'Compare categories with vertical bars',
    icon: <BarChartIcon />,
    category: 'visualization',
    defaultSize: { width: 6, height: 4 },
    defaultConfig: { chartType: 'bar', orientation: 'vertical' }
  },
  {
    id: 'line-chart',
    type: 'chart',
    title: 'Line Chart',
    description: 'Show trends over time',
    icon: <LineChartIcon />,
    category: 'visualization',
    defaultSize: { width: 6, height: 4 },
    defaultConfig: { chartType: 'line', showPoints: true }
  },
  {
    id: 'pie-chart',
    type: 'chart',
    title: 'Pie Chart',
    description: 'Display proportions of a whole',
    icon: <PieChartIcon />,
    category: 'visualization',
    defaultSize: { width: 4, height: 4 },
    defaultConfig: { chartType: 'pie', showLegend: true }
  },
  {
    id: 'donut-chart',
    type: 'chart',
    title: 'Donut Chart',
    description: 'Pie chart with center hole',
    icon: <DonutIcon />,
    category: 'visualization',
    defaultSize: { width: 4, height: 4 },
    defaultConfig: { chartType: 'donut', innerRadius: 50 }
  },
  
  // Data Widgets
  {
    id: 'data-table',
    type: 'table',
    title: 'Data Table',
    description: 'Display data in rows and columns',
    icon: <TableIcon />,
    category: 'data',
    defaultSize: { width: 8, height: 6 },
    defaultConfig: { pagination: true, sorting: true, search: true }
  },
  {
    id: 'metric-card',
    type: 'metric',
    title: 'Metric',
    description: 'Show key performance indicators',
    icon: <MetricIcon />,
    category: 'data',
    defaultSize: { width: 3, height: 2 },
    defaultConfig: { format: 'number', trend: true, comparison: false }
  },

  // Content Widgets
  {
    id: 'text-widget',
    type: 'text',
    title: 'Text',
    description: 'Add rich text content and markdown',
    icon: <TextIcon />,
    category: 'content',
    defaultSize: { width: 4, height: 3 },
    defaultConfig: { content: '', markdown: true }
  },

  // Filter Widgets
  {
    id: 'filter-widget',
    type: 'filter',
    title: 'Filter',
    description: 'Interactive dashboard filters',
    icon: <FilterIcon />,
    category: 'filter',
    defaultSize: { width: 3, height: 2 },
    defaultConfig: { filterType: 'dropdown', multiSelect: false }
  }
];

// =============================================================================
// Dashboard Builder Component
// =============================================================================

const DashboardBuilder: React.FC<{
  dashboardId?: string;
  workspaceSlug?: string;
  onSave?: (dashboard: DashboardConfig) => void;
  onCancel?: () => void;
}> = ({ 
  dashboardId, 
  workspaceSlug,
  onSave, 
  onCancel 
}) => {
  // State management
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>({
    name: 'New Dashboard',
    description: '',
    theme: 'light',
    layout: 'grid',
    isPublic: false,
    tags: [],
    items: []
  });

  const [selectedItem, setSelectedItem] = useState<DashboardItem | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'widgets' | 'settings'>('widgets');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: DashboardItem;
  } | null>(null);

  // Canvas state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [zoom, setZoom] = useState(1);

  // Update dashboard config
  const updateDashboardConfig = useCallback((updates: Partial<DashboardConfig>) => {
    setDashboardConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  // Add widget to dashboard
  const addWidget = useCallback((template: WidgetTemplate, position?: { x: number; y: number }) => {
    const newItem: DashboardItem = {
      id: `${template.id}-${Date.now()}`,
      type: template.type,
      title: template.title,
      description: template.description,
      position: position || { x: 50, y: 50 },
      size: template.defaultSize,
      config: template.defaultConfig,
      isVisible: true
    };

    updateDashboardConfig({
      items: [...dashboardConfig.items, newItem]
    });
  }, [dashboardConfig.items, updateDashboardConfig]);

  // Update widget
  const updateWidget = useCallback((id: string, updates: Partial<DashboardItem>) => {
    updateDashboardConfig({
      items: dashboardConfig.items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    });
  }, [dashboardConfig.items, updateDashboardConfig]);

  // Delete widget
  const deleteWidget = useCallback((id: string) => {
    updateDashboardConfig({
      items: dashboardConfig.items.filter(item => item.id !== id)
    });
    setSelectedItem(null);
  }, [dashboardConfig.items, updateDashboardConfig]);

  // Duplicate widget
  const duplicateWidget = useCallback((id: string) => {
    const item = dashboardConfig.items.find(i => i.id === id);
    if (item) {
      const duplicatedItem: DashboardItem = {
        ...item,
        id: `${item.type}-${Date.now()}`,
        title: `${item.title} (Copy)`,
        position: { x: item.position.x + 20, y: item.position.y + 20 }
      };
      updateDashboardConfig({
        items: [...dashboardConfig.items, duplicatedItem]
      });
    }
  }, [dashboardConfig.items, updateDashboardConfig]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(dashboardConfig);
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle preview
  const handlePreview = () => {
    console.log('Preview dashboard:', dashboardConfig);
    // TODO: Open preview modal or new tab
  };

  // Context menu handlers
  const handleContextMenu = (event: React.MouseEvent, item: DashboardItem) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      item
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Drag and drop for canvas
  const [, drop] = useDrop({
    accept: 'widget-template',
    drop: (item: WidgetTemplate, monitor) => {
      if (!canvasRef.current) return;

      const offset = monitor.getClientOffset();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      if (offset) {
        const position = {
          x: Math.max(0, offset.x - canvasRect.left),
          y: Math.max(0, offset.y - canvasRect.top)
        };
        addWidget(item, position);
      }
    }
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <BuilderLayout
        builderType="dashboard"
        entityName={dashboardConfig.name}
        workspaceSlug={workspaceSlug}
        onSave={handleSave}
        onCancel={onCancel}
        onPreview={handlePreview}
        saving={saving}
        hasChanges={hasChanges}
        canSave={dashboardConfig.name.trim().length > 0}
      >
        {/* Left Sidebar - Widget Palette */}
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              position: 'relative',
              borderRight: '1px solid',
              borderColor: 'divider'
            }
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Add Widgets
            </Typography>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {/* Widget Categories */}
            {['visualization', 'data', 'content', 'filter'].map(category => (
              <Box key={category}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    px: 2, 
                    py: 1, 
                    bgcolor: 'grey.50', 
                    fontWeight: 600,
                    textTransform: 'capitalize'
                  }}
                >
                  {category}
                </Typography>
                
                <List dense>
                  {WIDGET_TEMPLATES
                    .filter(template => template.category === category)
                    .map(template => (
                      <DraggableWidgetItem 
                        key={template.id} 
                        template={template} 
                        onAddWidget={addWidget}
                      />
                    ))}
                </List>
              </Box>
            ))}
          </Box>
        </Drawer>

        {/* Main Canvas Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Canvas Toolbar */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 1, 
              borderBottom: '1px solid', 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Canvas: {canvasSize.width} × {canvasSize.height}
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Zoom: {Math.round(zoom * 100)}%
            </Typography>

            <Box sx={{ flex: 1 }} />

            <Chip 
              label={`${dashboardConfig.items.length} widgets`} 
              size="small" 
              color="primary"
            />
          </Paper>

          {/* Canvas */}
          <Box 
            ref={canvasRef}
            sx={{ 
              flex: 1, 
              position: 'relative', 
              overflow: 'auto',
              bgcolor: 'grey.50',
              backgroundImage: `
                linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          >
            <Box
              ref={drop}
              sx={{
                minHeight: '100%',
                minWidth: '100%',
                position: 'relative',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
              }}
            >
              {dashboardConfig.items.map(item => (
                <DashboardWidget
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={setSelectedItem}
                  onUpdate={updateWidget}
                  onContextMenu={handleContextMenu}
                />
              ))}

              {/* Empty state */}
              {dashboardConfig.items.length === 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Start Building Your Dashboard
                  </Typography>
                  <Typography variant="body2">
                    Drag widgets from the left panel to create your dashboard
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        {/* Right Sidebar - Properties Panel */}
        <Drawer
          variant="permanent"
          anchor="right"
          sx={{
            width: 320,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              boxSizing: 'border-box',
              position: 'relative',
              borderLeft: '1px solid',
              borderColor: 'divider'
            }
          }}
        >
          <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tabs
              value={sidebarTab}
              onChange={(_, newValue) => setSidebarTab(newValue)}
              variant="fullWidth"
            >
              <Tab label="Widgets" value="widgets" />
              <Tab label="Settings" value="settings" />
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {sidebarTab === 'widgets' ? (
              <WidgetPropertiesPanel 
                selectedItem={selectedItem}
                onUpdate={updateWidget}
                onDelete={deleteWidget}
                onDuplicate={duplicateWidget}
              />
            ) : (
              <DashboardSettingsPanel
                config={dashboardConfig}
                onUpdate={updateDashboardConfig}
              />
            )}
          </Box>
        </Drawer>

        {/* Context Menu */}
        <Menu
          open={contextMenu !== null}
          onClose={handleContextMenuClose}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu !== null
              ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
              : undefined
          }
        >
          <MenuItem onClick={() => {
            if (contextMenu) {
              setSelectedItem(contextMenu.item);
              setSidebarTab('widgets');
            }
            handleContextMenuClose();
          }}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Widget
          </MenuItem>
          
          <MenuItem onClick={() => {
            if (contextMenu) {
              duplicateWidget(contextMenu.item.id);
            }
            handleContextMenuClose();
          }}>
            <CopyIcon sx={{ mr: 1 }} />
            Duplicate
          </MenuItem>
          
          <MenuItem onClick={() => {
            if (contextMenu) {
              updateWidget(contextMenu.item.id, { 
                isVisible: !contextMenu.item.isVisible 
              });
            }
            handleContextMenuClose();
          }}>
            {contextMenu?.item.isVisible ? (
              <><VisibilityOffIcon sx={{ mr: 1 }} /> Hide</>
            ) : (
              <><VisibilityIcon sx={{ mr: 1 }} /> Show</>
            )}
          </MenuItem>
          
          <Divider />
          
          <MenuItem 
            onClick={() => {
              if (contextMenu) {
                deleteWidget(contextMenu.item.id);
              }
              handleContextMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </BuilderLayout>
    </DndProvider>
  );
};

// =============================================================================
// Draggable Widget Item Component
// =============================================================================

const DraggableWidgetItem: React.FC<{
  template: WidgetTemplate;
  onAddWidget: (template: WidgetTemplate) => void;
}> = ({ template, onAddWidget }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'widget-template',
    item: template,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <ListItem
      ref={drag}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        '&:hover': { bgcolor: 'action.hover' },
        '&:active': { cursor: 'grabbing' }
      }}
      onClick={() => onAddWidget(template)}
    >
      <ListItemIcon>{template.icon}</ListItemIcon>
      <ListItemText
        primary={template.title}
        secondary={template.description}
        secondaryTypographyProps={{ variant: 'caption' }}
      />
    </ListItem>
  );
};

// =============================================================================
// Dashboard Widget Component
// =============================================================================

const DashboardWidget: React.FC<{
  item: DashboardItem;
  isSelected: boolean;
  onSelect: (item: DashboardItem) => void;
  onUpdate: (id: string, updates: Partial<DashboardItem>) => void;
  onContextMenu: (event: React.MouseEvent, item: DashboardItem) => void;
}> = ({ item, isSelected, onSelect, onUpdate, onContextMenu }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button === 2) return; // Right click
    onSelect(item);
    setIsDragging(true);

    const startX = event.clientX - item.position.x;
    const startY = event.clientY - item.position.y;

    const handleMouseMove = (e: MouseEvent) => {
      onUpdate(item.id, {
        position: {
          x: Math.max(0, e.clientX - startX),
          y: Math.max(0, e.clientY - startY)
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Paper
      elevation={isSelected ? 4 : 2}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => onContextMenu(e, item)}
      sx={{
        position: 'absolute',
        left: item.position.x,
        top: item.position.y,
        width: item.size.width * 40,
        height: item.size.height * 40,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: isSelected ? 2 : 0,
        borderColor: 'primary.main',
        opacity: item.isVisible ? 1 : 0.5,
        '&:hover': {
          boxShadow: 4
        }
      }}
    >
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DragIcon color="action" sx={{ mr: 1 }} />
          <Typography variant="subtitle2" noWrap>
            {item.title}
          </Typography>
        </Box>
        
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50',
          borderRadius: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            {item.type.toUpperCase()}
          </Typography>
        </Box>
      </CardContent>
    </Paper>
  );
};

// =============================================================================
// Widget Properties Panel Component
// =============================================================================

const WidgetPropertiesPanel: React.FC<{
  selectedItem: DashboardItem | null;
  onUpdate: (id: string, updates: Partial<DashboardItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}> = ({ selectedItem, onUpdate, onDelete, onDuplicate }) => {
  if (!selectedItem) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Select a widget to edit its properties
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Widget Properties
      </Typography>

      <TextField
        fullWidth
        label="Title"
        value={selectedItem.title}
        onChange={(e) => onUpdate(selectedItem.id, { title: e.target.value })}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Description"
        value={selectedItem.description || ''}
        onChange={(e) => onUpdate(selectedItem.id, { description: e.target.value })}
        multiline
        rows={2}
        sx={{ mb: 2 }}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Width"
            type="number"
            value={selectedItem.size.width}
            onChange={(e) => onUpdate(selectedItem.id, {
              size: { ...selectedItem.size, width: parseInt(e.target.value) || 1 }
            })}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Height"
            type="number"
            value={selectedItem.size.height}
            onChange={(e) => onUpdate(selectedItem.id, {
              size: { ...selectedItem.size, height: parseInt(e.target.value) || 1 }
            })}
          />
        </Grid>
      </Grid>

      <FormControlLabel
        control={
          <Switch
            checked={selectedItem.isVisible}
            onChange={(e) => onUpdate(selectedItem.id, { isVisible: e.target.checked })}
          />
        }
        label="Visible"
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
        <Button
          variant="outlined"
          startIcon={<CopyIcon />}
          onClick={() => onDuplicate(selectedItem.id)}
          fullWidth
        >
          Duplicate Widget
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete(selectedItem.id)}
          fullWidth
        >
          Delete Widget
        </Button>
      </Box>
    </Box>
  );
};

// =============================================================================
// Dashboard Settings Panel Component
// =============================================================================

const DashboardSettingsPanel: React.FC<{
  config: DashboardConfig;
  onUpdate: (updates: Partial<DashboardConfig>) => void;
}> = ({ config, onUpdate }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Dashboard Settings
      </Typography>

      <TextField
        fullWidth
        label="Dashboard Name"
        value={config.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Description"
        value={config.description || ''}
        onChange={(e) => onUpdate({ description: e.target.value })}
        multiline
        rows={3}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Theme</InputLabel>
        <Select
          value={config.theme}
          onChange={(e) => onUpdate({ theme: e.target.value as any })}
          label="Theme"
        >
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
          <MenuItem value="auto">Auto</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Layout</InputLabel>
        <Select
          value={config.layout}
          onChange={(e) => onUpdate({ layout: e.target.value as any })}
          label="Layout"
        >
          <MenuItem value="grid">Grid</MenuItem>
          <MenuItem value="free">Free Form</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Auto Refresh (minutes)"
        type="number"
        value={config.refreshInterval || ''}
        onChange={(e) => onUpdate({ 
          refreshInterval: e.target.value ? parseInt(e.target.value) : undefined 
        })}
        sx={{ mb: 2 }}
      />

      <FormControlLabel
        control={
          <Switch
            checked={config.isPublic}
            onChange={(e) => onUpdate({ isPublic: e.target.checked })}
          />
        }
        label="Public Dashboard"
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Tags (comma separated)"
        value={config.tags.join(', ')}
        onChange={(e) => onUpdate({ 
          tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
        })}
        placeholder="analytics, kpi, sales"
      />
    </Box>
  );
};

export default DashboardBuilder;