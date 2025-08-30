import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
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
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Preview,
  Settings,
  DragIndicator
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  useGetChartsQuery,
  useCreateDashboardMutation,
  useUpdateDashboardMutation 
} from '../../store/api/dashboardApi';
import { useGetCategoriesQuery } from '../../store/api/categoryApi';
import { ChartPreview } from './ChartPreview';
import { PermissionGate } from '../shared/PermissionGate';

interface DashboardLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  chartId?: string;
  type: 'chart' | 'text' | 'image';
  content?: any;
}

interface DashboardBuilderProps {
  dashboardId?: string;
  initialLayout?: DashboardLayout[];
  onSave?: (dashboard: any) => void;
}

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  initialLayout = [],
  onSave
}) => {
  const { workspace } = useSelector((state: RootState) => state.auth);
  const [layout, setLayout] = useState<DashboardLayout[]>(initialLayout);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showChartPicker, setShowChartPicker] = useState(false);
  const [dashboardSettings, setDashboardSettings] = useState({
    name: '',
    description: '',
    category_id: '',
    is_public: false,
    tags: []
  });

  const { data: charts = [] } = useGetChartsQuery({
    workspaceId: workspace?.id || ''
  });
  
  const { data: categories = [] } = useGetCategoriesQuery({
    workspaceId: workspace?.id || ''
  });

  const [createDashboard] = useCreateDashboardMutation();
  const [updateDashboard] = useUpdateDashboardMutation();

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const items = Array.from(layout);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLayout(items);
  }, [layout]);

  const addChartToLayout = useCallback((chartId: string) => {
    const newItem: DashboardLayout = {
      id: `item-${Date.now()}`,
      x: 0,
      y: layout.length * 2,
      w: 6,
      h: 4,
      chartId,
      type: 'chart'
    };

    setLayout([...layout, newItem]);
    setShowChartPicker(false);
  }, [layout]);

  const removeFromLayout = useCallback((itemId: string) => {
    setLayout(layout.filter(item => item.id !== itemId));
  }, [layout]);

  const updateItemSize = useCallback((itemId: string, width: number, height: number) => {
    setLayout(layout.map(item => 
      item.id === itemId 
        ? { ...item, w: width, h: height }
        : item
    ));
  }, [layout]);

  const saveDashboard = async () => {
    try {
      const dashboardData = {
        ...dashboardSettings,
        layout_config: {
          items: layout,
          gridSize: 12,
          rowHeight: 100,
          margin: [10, 10]
        }
      };

      if (dashboardId) {
        await updateDashboard({
          id: dashboardId,
          ...dashboardData
        }).unwrap();
      } else {
        const newDashboard = await createDashboard({
          workspaceId: workspace?.id || '',
          ...dashboardData
        }).unwrap();
        
        if (onSave) {
          onSave(newDashboard);
        }
      }

      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Dashboard Builder
        </Typography>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setShowChartPicker(true)}
          >
            Add Chart
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setShowSettings(true)}
          >
            Settings
          </Button>
          
          <PermissionGate permissions={['dashboard.create', 'dashboard.edit']}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={saveDashboard}
              disabled={!dashboardSettings.name}
            >
              Save Dashboard
            </Button>
          </PermissionGate>
        </Box>
      </Box>

      {layout.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your dashboard is empty. Click "Add Chart" to get started.
        </Alert>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-layout">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              <Grid container spacing={2}>
                {layout.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <Grid 
                        item 
                        xs={item.w}
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <Card 
                          sx={{ 
                            height: `${item.h * 100}px`,
                            position: 'relative',
                            border: selectedItem === item.id ? 2 : 1,
                            borderColor: selectedItem === item.id ? 'primary.main' : 'divider',
                            '&:hover': {
                              boxShadow: 3
                            }
                          }}
                          onClick={() => setSelectedItem(item.id)}
                        >
                          <Box
                            {...provided.dragHandleProps}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 10,
                              display: 'flex',
                              gap: 1,
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              borderRadius: 1,
                              p: 0.5
                            }}
                          >
                            <IconButton size="small">
                              <DragIndicator fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => removeFromLayout(item.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>

                          <CardContent sx={{ height: '100%', p: 1 }}>
                            {item.type === 'chart' && item.chartId ? (
                              <ChartPreview
                                chartId={item.chartId}
                                width="100%"
                                height="100%"
                              />
                            ) : (
                              <Box 
                                display="flex" 
                                alignItems="center" 
                                justifyContent="center"
                                height="100%"
                                bgcolor="grey.50"
                                borderRadius={1}
                              >
                                <Typography color="textSecondary">
                                  Empty Widget
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Draggable>
                ))}
              </Grid>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Chart Picker Dialog */}
      <Dialog
        open={showChartPicker}
        onClose={() => setShowChartPicker(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Select Chart to Add</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {charts.map((chart: any) => (
              <Grid item xs={12} sm={6} md={4} key={chart.id}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 3 }
                  }}
                  onClick={() => addChartToLayout(chart.id)}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {chart.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {chart.chart_type}
                    </Typography>
                    <Box mt={1}>
                      {chart.tags.map((tag: string) => (
                        <Chip 
                          key={tag}
                          label={tag}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowChartPicker(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dashboard Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Dashboard Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Dashboard Name"
              value={dashboardSettings.name}
              onChange={(e) => setDashboardSettings({
                ...dashboardSettings,
                name: e.target.value
              })}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={dashboardSettings.description}
              onChange={(e) => setDashboardSettings({
                ...dashboardSettings,
                description: e.target.value
              })}
              margin="normal"
              multiline
              rows={3}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Category</InputLabel>
              <Select
                value={dashboardSettings.category_id}
                onChange={(e) => setDashboardSettings({
                  ...dashboardSettings,
                  category_id: e.target.value
                })}
              >
                <MenuItem value="">
                  <em>No Category</em>
                </MenuItem>
                {categories.map((category: any) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Cancel
          </Button>
          <Button 
            onClick={saveDashboard}
            variant="contained"
            disabled={!dashboardSettings.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardBuilder;