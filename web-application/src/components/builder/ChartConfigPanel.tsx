# web-application/src/components/builder/ChartConfigPanel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Divider,
  Paper,
  Grid,
  Slider,
  ColorPicker,
  Autocomplete,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Palette as PaletteIcon
} from '@mui/icons-material';
import { SketchPicker } from 'react-color';
import { Chart, Dataset } from '@/types/auth.types';
import { datasetAPI } from '@/services/api';

interface ChartConfigPanelProps {
  open: boolean;
  onClose: () => void;
  chart: Chart | null;
  datasets: Dataset[];
  onSave: (chart: Chart) => void;
}

interface ChartConfigState extends Chart {
  // Extend with additional UI state if needed
}

export const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  open,
  onClose,
  chart,
  datasets,
  onSave
}) => {
  const [config, setConfig] = useState<ChartConfigState | null>(null);
  const [datasetColumns, setDatasetColumns] = useState<Array<{ name: string; type: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (chart) {
      setConfig({ ...chart });
      loadDatasetColumns(chart.dataset_id);
    }
  }, [chart]);

  const loadDatasetColumns = async (datasetId: string) => {
    try {
      setLoading(true);
      const response = await datasetAPI.getDatasetSchema(datasetId);
      setDatasetColumns(response.schema.columns || []);
    } catch (error) {
      console.error('Failed to load dataset columns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (path: string, value: any) => {
    if (!config) return;

    setConfig(prev => {
      if (!prev) return prev;
      
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;

      // Navigate to the parent of the target property
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }

      // Set the final property
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const handleSave = () => {
    if (config) {
      onSave(config);
      onClose();
    }
  };

  const handleDatasetChange = (datasetId: string) => {
    handleConfigChange('dataset_id', datasetId);
    loadDatasetColumns(datasetId);
  };

  const addYAxis = () => {
    if (!config) return;
    
    const currentYAxes = config.config.y_axes || [];
    const newYAxes = [
      ...currentYAxes,
      {
        column: '',
        name: `Series ${currentYAxes.length + 1}`,
        color: getDefaultColor(currentYAxes.length),
        line_style: 'solid',
        line_width: 2,
        show_points: true,
        point_size: 4
      }
    ];
    
    handleConfigChange('config.y_axes', newYAxes);
  };

  const removeYAxis = (index: number) => {
    if (!config) return;
    
    const currentYAxes = config.config.y_axes || [];
    const newYAxes = currentYAxes.filter((_, i) => i !== index);
    
    handleConfigChange('config.y_axes', newYAxes);
  };

  const getDefaultColor = (index: number) => {
    const colors = [
      '#1976d2', '#dc004e', '#388e3c', '#f57c00',
      '#7b1fa2', '#c62828', '#00796b', '#f9a825'
    ];
    return colors[index % colors.length];
  };

  const getColumnOptions = (type?: 'numeric' | 'categorical' | 'all') => {
    if (!type || type === 'all') {
      return datasetColumns;
    }
    
    const numericTypes = ['number', 'integer', 'float', 'decimal', 'bigint'];
    const categoricalTypes = ['string', 'text', 'varchar', 'char', 'category'];
    
    return datasetColumns.filter(col => {
      if (type === 'numeric') {
        return numericTypes.includes(col.type.toLowerCase());
      } else if (type === 'categorical') {
        return categoricalTypes.includes(col.type.toLowerCase());
      }
      return true;
    });
  };

  const renderBasicConfig = () => {
    if (!config) return null;

    return (
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Basic Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Chart Name"
              value={config.name || ''}
              onChange={(e) => handleConfigChange('name', e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Dataset</InputLabel>
              <Select
                value={config.dataset_id || ''}
                onChange={(e) => handleDatasetChange(e.target.value)}
              >
                {datasets.map(dataset => (
                  <MenuItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Chart Title"
              value={config.config.title?.text || ''}
              onChange={(e) => handleConfigChange('config.title.text', e.target.value)}
            />

            <TextField
              fullWidth
              label="Subtitle"
              value={config.config.title?.subtitle || ''}
              onChange={(e) => handleConfigChange('config.title.subtitle', e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Title Position</InputLabel>
              <Select
                value={config.config.title?.position || 'center'}
                onChange={(e) => handleConfigChange('config.title.position', e.target.value)}
              >
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="center">Center</MenuItem>
                <MenuItem value="right">Right</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderDataConfig = () => {
    if (!config) return null;

    const isLineOrAreaChart = ['line-chart', 'area-chart'].includes(config.type);
    const isBarChart = config.type === 'bar-chart';
    const isPieChart = ['pie-chart', 'donut-chart'].includes(config.type);
    const isScatterPlot = config.type === 'scatter-plot';
    const isMetricCard = config.type === 'metric-card';

    return (
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Data Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* X-Axis Configuration for Line/Bar/Scatter charts */}
            {(isLineOrAreaChart || isBarChart || isScatterPlot) && (
              <>
                <Typography variant="subtitle2" color="primary">X-Axis</Typography>
                <FormControl fullWidth>
                  <InputLabel>X-Axis Column</InputLabel>
                  <Select
                    value={config.config.x_axis?.column || ''}
                    onChange={(e) => handleConfigChange('config.x_axis.column', e.target.value)}
                  >
                    {getColumnOptions('all').map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="X-Axis Title"
                  value={config.config.x_axis?.title || ''}
                  onChange={(e) => handleConfigChange('config.x_axis.title', e.target.value)}
                />

                {(isLineOrAreaChart || isBarChart) && (
                  <FormControl fullWidth>
                    <InputLabel>X-Axis Type</InputLabel>
                    <Select
                      value={config.config.x_axis?.type || 'category'}
                      onChange={(e) => handleConfigChange('config.x_axis.type', e.target.value)}
                    >
                      <MenuItem value="category">Category</MenuItem>
                      <MenuItem value="value">Value</MenuItem>
                      <MenuItem value="time">Time</MenuItem>
                      <MenuItem value="log">Log</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            {/* Y-Axis Configuration for Line/Bar charts */}
            {(isLineOrAreaChart || isBarChart) && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Typography variant="subtitle2" color="primary">Y-Axis Series</Typography>
                  <Button startIcon={<AddIcon />} onClick={addYAxis} size="small">
                    Add Series
                  </Button>
                </Box>

                {(config.config.y_axes || []).map((yAxis: any, index: number) => (
                  <Paper key={index} sx={{ p: 2, mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2">Series {index + 1}</Typography>
                      <IconButton onClick={() => removeYAxis(index)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Column</InputLabel>
                          <Select
                            value={yAxis.column || ''}
                            onChange={(e) => handleConfigChange(`config.y_axes.${index}.column`, e.target.value)}
                          >
                            {getColumnOptions('numeric').map(col => (
                              <MenuItem key={col.name} value={col.name}>
                                {col.name} ({col.type})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={8}>
                        <TextField
                          fullWidth
                          label="Series Name"
                          value={yAxis.name || ''}
                          onChange={(e) => handleConfigChange(`config.y_axes.${index}.name`, e.target.value)}
                        />
                      </Grid>

                      <Grid item xs={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">Color:</Typography>
                          <IconButton
                            onClick={() => setShowColorPicker(prev => ({ ...prev, [`series_${index}`]: !prev[`series_${index}`] }))}
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              backgroundColor: yAxis.color || getDefaultColor(index),
                              '&:hover': { opacity: 0.8 }
                            }}
                          >
                            <PaletteIcon sx={{ fontSize: 16, color: 'white' }} />
                          </IconButton>
                        </Box>
                        
                        {showColorPicker[`series_${index}`] && (
                          <Box sx={{ position: 'absolute', zIndex: 1000, mt: 1 }}>
                            <SketchPicker
                              color={yAxis.color || getDefaultColor(index)}
                              onChange={(color) => handleConfigChange(`config.y_axes.${index}.color`, color.hex)}
                            />
                          </Box>
                        )}
                      </Grid>

                      {isLineOrAreaChart && (
                        <>
                          <Grid item xs={6}>
                            <FormControl fullWidth>
                              <InputLabel>Line Style</InputLabel>
                              <Select
                                value={yAxis.line_style || 'solid'}
                                onChange={(e) => handleConfigChange(`config.y_axes.${index}.line_style`, e.target.value)}
                              >
                                <MenuItem value="solid">Solid</MenuItem>
                                <MenuItem value="dashed">Dashed</MenuItem>
                                <MenuItem value="dotted">Dotted</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={6}>
                            <Box sx={{ px: 2 }}>
                              <Typography variant="body2" gutterBottom>
                                Line Width: {yAxis.line_width || 2}
                              </Typography>
                              <Slider
                                value={yAxis.line_width || 2}
                                onChange={(_, value) => handleConfigChange(`config.y_axes.${index}.line_width`, value)}
                                min={1}
                                max={10}
                                step={1}
                                marks
                              />
                            </Box>
                          </Grid>

                          <Grid item xs={6}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={yAxis.show_points !== false}
                                  onChange={(e) => handleConfigChange(`config.y_axes.${index}.show_points`, e.target.checked)}
                                />
                              }
                              label="Show Points"
                            />
                          </Grid>

                          <Grid item xs={6}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={yAxis.fill_area || false}
                                  onChange={(e) => handleConfigChange(`config.y_axes.${index}.fill_area`, e.target.checked)}
                                />
                              }
                              label="Fill Area"
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </Paper>
                ))}
              </>
            )}

            {/* Pie Chart Configuration */}
            {isPieChart && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Label Column</InputLabel>
                  <Select
                    value={config.config.label_column || ''}
                    onChange={(e) => handleConfigChange('config.label_column', e.target.value)}
                  >
                    {getColumnOptions('categorical').map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Value Column</InputLabel>
                  <Select
                    value={config.config.value_column || ''}
                    onChange={(e) => handleConfigChange('config.value_column', e.target.value)}
                  >
                    {getColumnOptions('numeric').map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.config.show_labels !== false}
                      onChange={(e) => handleConfigChange('config.show_labels', e.target.checked)}
                    />
                  }
                  label="Show Labels"
                />
              </>
            )}

            {/* Scatter Plot Configuration */}
            {isScatterPlot && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Y-Axis Column</InputLabel>
                  <Select
                    value={config.config.y_axis?.column || ''}
                    onChange={(e) => handleConfigChange('config.y_axis.column', e.target.value)}
                  >
                    {getColumnOptions('numeric').map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Y-Axis Title"
                  value={config.config.y_axis?.title || ''}
                  onChange={(e) => handleConfigChange('config.y_axis.title', e.target.value)}
                />

                <Box sx={{ px: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Point Size: {config.config.point_size || 6}
                  </Typography>
                  <Slider
                    value={config.config.point_size || 6}
                    onChange={(_, value) => handleConfigChange('config.point_size', value)}
                    min={2}
                    max={20}
                    step={1}
                    marks
                  />
                </Box>
              </>
            )}

            {/* Metric Card Configuration */}
            {isMetricCard && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Value Column</InputLabel>
                  <Select
                    value={config.config.value_column || ''}
                    onChange={(e) => handleConfigChange('config.value_column', e.target.value)}
                  >
                    {getColumnOptions('numeric').map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Value Format</InputLabel>
                  <Select
                    value={config.config.value_format || 'number'}
                    onChange={(e) => handleConfigChange('config.value_format', e.target.value)}
                  >
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="currency">Currency</MenuItem>
                    <MenuItem value="percentage">Percentage</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Comparison Column (Optional)</InputLabel>
                  <Select
                    value={config.config.comparison_column || ''}
                    onChange={(e) => handleConfigChange('config.comparison_column', e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {getColumnOptions('numeric').map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderStyleConfig = () => {
    if (!config || config.type === 'table-chart' || config.type === 'metric-card') {
      return null;
    }

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Style & Interaction</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Legend Configuration */}
            <Typography variant="subtitle2" color="primary">Legend</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.config.legend?.show !== false}
                  onChange={(e) => handleConfigChange('config.legend.show', e.target.checked)}
                />
              }
              label="Show Legend"
            />

            {config.config.legend?.show !== false && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Position</InputLabel>
                    <Select
                      value={config.config.legend?.position || 'bottom'}
                      onChange={(e) => handleConfigChange('config.legend.position', e.target.value)}
                    >
                      <MenuItem value="top">Top</MenuItem>
                      <MenuItem value="bottom">Bottom</MenuItem>
                      <MenuItem value="left">Left</MenuItem>
                      <MenuItem value="right">Right</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Orientation</InputLabel>
                    <Select
                      value={config.config.legend?.orientation || 'horizontal'}
                      onChange={(e) => handleConfigChange('config.legend.orientation', e.target.value)}
                    >
                      <MenuItem value="horizontal">Horizontal</MenuItem>
                      <MenuItem value="vertical">Vertical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {/* Grid Configuration */}
            <Typography variant="subtitle2" color="primary">Grid</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.config.grid?.show_x_grid !== false}
                  onChange={(e) => handleConfigChange('config.grid.show_x_grid', e.target.checked)}
                />
              }
              label="Show X-Axis Grid"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.config.grid?.show_y_grid !== false}
                  onChange={(e) => handleConfigChange('config.grid.show_y_grid', e.target.checked)}
                />
              }
              label="Show Y-Axis Grid"
            />

            {/* Interaction Configuration */}
            <Typography variant="subtitle2" color="primary">Interaction</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.config.interaction?.zoom_enabled !== false}
                  onChange={(e) => handleConfigChange('config.interaction.zoom_enabled', e.target.checked)}
                />
              }
              label="Enable Zoom"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.config.interaction?.tooltip_enabled !== false}
                  onChange={(e) => handleConfigChange('config.interaction.tooltip_enabled', e.target.checked)}
                />
              }
              label="Show Tooltips"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.config.interaction?.crosshair_enabled || false}
                  onChange={(e) => handleConfigChange('config.interaction.crosshair_enabled', e.target.checked)}
                />
              }
              label="Show Crosshair"
            />

            {/* Animation Configuration */}
            <Typography variant="subtitle2" color="primary">Animation</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.config.animation?.enabled !== false}
                  onChange={(e) => handleConfigChange('config.animation.enabled', e.target.checked)}
                />
              }
              label="Enable Animations"
            />

            {config.config.animation?.enabled !== false && (
              <Box sx={{ px: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Duration: {config.config.animation?.duration || 1000}ms
                </Typography>
                <Slider
                  value={config.config.animation?.duration || 1000}
                  onChange={(_, value) => handleConfigChange('config.animation.duration', value)}
                  min={0}
                  max={5000}
                  step={100}
                  marks={[
                    { value: 0, label: '0ms' },
                    { value: 1000, label: '1s' },
                    { value: 3000, label: '3s' },
                    { value: 5000, label: '5s' }
                  ]}
                />
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (!config) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 400 }
      }}
    >
      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Configure Chart</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Configuration Sections */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {loading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Loading dataset columns...
            </Alert>
          )}
          
          {renderBasicConfig()}
          {renderDataConfig()}
          {renderStyleConfig()}
        </Box>

        {/* Actions */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save Changes
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};