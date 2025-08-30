// web-application/src/components/builder/ChartConfigPanel.tsx
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
import { Chart, ChartConfig, ChartDimensions, ChartAxes, ChartAxis, ChartLegend } from '@/types/chart.types';
import { Dataset } from '@/types/dashboard.types';
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

  // Helper function to create default ChartConfig
  const createDefaultChartConfig = (): ChartConfig => ({
    dimensions: {
      width: 400,
      height: 300,
      margin: { top: 20, right: 20, bottom: 20, left: 20 }
    },
    series: [],
    axes: {
      x: {
        field: '',
        title: '',
        type: 'category',
        scale: 'linear',
        grid: true,
        labels: true
      },
      y: {
        field: '',
        title: '',
        type: 'value',
        scale: 'linear',
        grid: true,
        labels: true
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      align: 'center',
      orientation: 'horizontal'
    },
    colors: ['#1976d2', '#dc004e', '#388e3c', '#f57c00'],
    animations: true,
    interactivity: true
  });

  useEffect(() => {
    if (chart) {
      setConfig({ ...chart });
      if (chart.dataset_ids && chart.dataset_ids.length > 0) {
        loadDatasetColumns(chart.dataset_ids[0]);
      }
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

      // Handle config_json property specifically
      if (keys[0] === 'config_json' || keys[0] === 'config') {
        if (!newConfig.config_json) {
          newConfig.config_json = createDefaultChartConfig();
        }
        
        let current: any = newConfig.config_json;
        const configKeys = keys.slice(1);

        // Navigate to the parent of the target property
        for (let i = 0; i < configKeys.length - 1; i++) {
          const key = configKeys[i];
          if (!current[key]) {
            current[key] = {};
          }
          current = current[key];
        }

        // Set the final property
        if (configKeys.length > 0) {
          current[configKeys[configKeys.length - 1]] = value;
        } else {
          newConfig.config_json = value;
        }
      } else {
        // Handle other properties
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
      }

      // Transform config if needed
      let transformedConfig = {};

      // FIXED: Check if chart exists and has config_json before accessing it
      if (chart?.config_json) {
        try {
          transformedConfig = typeof chart.config_json === 'string' 
            ? JSON.parse(chart.config_json) 
            : chart.config_json;
        } catch (error) {
          console.error('Error parsing config_json:', error);
          transformedConfig = createDefaultChartConfig();
        }
      }

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
    handleConfigChange('dataset_ids', [datasetId]);
    loadDatasetColumns(datasetId);
  };

  const addYAxis = () => {
    if (!config) return;
    
    const currentYAxes = config.config_json?.y_axes || [];
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
    
    handleConfigChange('config_json.y_axes', newYAxes);
  };

  const removeYAxis = (index: number) => {
    if (!config) return;
    
    const currentYAxes = config.config_json?.y_axes || [];
    const newYAxes = currentYAxes.filter((_: any, i: number ) => i !== index);
    
    handleConfigChange('config_json.y_axes', newYAxes);
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
                value={config.dataset_ids?.[0] || ''}
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
              value={config.config_json?.title?.text || ''}
              onChange={(e) => handleConfigChange('config_json.title.text', e.target.value)}
            />

            <TextField
              fullWidth
              label="Subtitle"
              value={config.config_json?.title?.subtitle || ''}
              onChange={(e) => handleConfigChange('config_json.title.subtitle', e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Title Position</InputLabel>
              <Select
                value={config.config_json?.title?.position || 'center'}
                onChange={(e) => handleConfigChange('config_json.title.position', e.target.value)}
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

    const isLineOrAreaChart = ['line-chart', 'area-chart'].includes(config.chart_type);
    const isBarChart = config.chart_type === 'bar-chart';
    const isPieChart = ['pie-chart', 'donut-chart'].includes(config.chart_type);
    const isScatterPlot = config.chart_type === 'scatter-plot';
    const isMetricCard = config.chart_type === 'metric-card';

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
                    value={config.config_json?.x_axis?.column || ''}
                    onChange={(e) => handleConfigChange('config_json.x_axis.column', e.target.value)}
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
                  value={config.config_json?.x_axis?.title || ''}
                  onChange={(e) => handleConfigChange('config_json.x_axis.title', e.target.value)}
                />

                {(isLineOrAreaChart || isBarChart) && (
                  <FormControl fullWidth>
                    <InputLabel>X-Axis Type</InputLabel>
                    <Select
                      value={config.config_json?.x_axis?.type || 'category'}
                      onChange={(e) => handleConfigChange('config_json.x_axis.type', e.target.value)}
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
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" color="primary">Y-Axes</Typography>
                  <Button 
                    size="small" 
                    startIcon={<AddIcon />} 
                    onClick={addYAxis}
                  >
                    Add Series
                  </Button>
                </Box>

                {config.config_json?.y_axes?.map((yAxis: any, index: number) => (
                  <Paper key={index} sx={{ p: 2, border: '1px solid #e0e0e0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body2" fontWeight="medium">
                        Series {index + 1}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => removeYAxis(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Column</InputLabel>
                          <Select
                            value={yAxis.column || ''}
                            onChange={(e) => handleConfigChange(`config_json.y_axes.${index}.column`, e.target.value)}
                          >
                            {getColumnOptions('numeric').map(col => (
                              <MenuItem key={col.name} value={col.name}>
                                {col.name} ({col.type})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label="Series Name"
                          value={yAxis.name || ''}
                          onChange={(e) => handleConfigChange(`config_json.y_axes.${index}.name`, e.target.value)}
                        />
                      </Grid>

                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            fullWidth
                            label="Color"
                            value={yAxis.color || ''}
                            onChange={(e) => handleConfigChange(`config_json.y_axes.${index}.color`, e.target.value)}
                          />
                          <IconButton 
                            onClick={() => setShowColorPicker({ 
                              ...showColorPicker, 
                              [`yAxis_${index}`]: !showColorPicker[`yAxis_${index}`] 
                            })}
                          >
                            <PaletteIcon />
                          </IconButton>
                        </Box>

                        {showColorPicker[`yAxis_${index}`] && (
                          <Box sx={{ position: 'absolute', zIndex: 1000, mt: 1 }}>
                            <SketchPicker
                              color={yAxis.color || '#1976d2'}
                              onChangeComplete={(color) => {
                                handleConfigChange(`config_json.y_axes.${index}.color`, color.hex);
                                setShowColorPicker({ ...showColorPicker, [`yAxis_${index}`]: false });
                              }}
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
                                onChange={(e) => handleConfigChange(`config_json.y_axes.${index}.line_style`, e.target.value)}
                              >
                                <MenuItem value="solid">Solid</MenuItem>
                                <MenuItem value="dashed">Dashed</MenuItem>
                                <MenuItem value="dotted">Dotted</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={6}>
                            <Typography variant="body2" gutterBottom>
                              Line Width: {yAxis.line_width || 2}
                            </Typography>
                            <Slider
                              value={yAxis.line_width || 2}
                              onChange={(_, value) => handleConfigChange(`config_json.y_axes.${index}.line_width`, value)}
                              min={1}
                              max={10}
                              step={1}
                              marks
                            />
                          </Grid>

                          <Grid item xs={6}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={yAxis.show_points !== false}
                                  onChange={(e) => handleConfigChange(`config_json.y_axes.${index}.show_points`, e.target.checked)}
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
                                  onChange={(e) => handleConfigChange(`config_json.y_axes.${index}.fill_area`, e.target.checked)}
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
                    value={config.config_json?.label_column || ''}
                    onChange={(e) => handleConfigChange('config_json.label_column', e.target.value)}
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
                    value={config.config_json?.value_column || ''}
                    onChange={(e) => handleConfigChange('config_json.value_column', e.target.value)}
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
                      checked={config.config_json?.show_labels !== false}
                      onChange={(e) => handleConfigChange('config_json.show_labels', e.target.checked)}
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
                    value={config.config_json?.y_axis?.column || ''}
                    onChange={(e) => handleConfigChange('config_json.y_axis.column', e.target.value)}
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
                  value={config.config_json?.y_axis?.title || ''}
                  onChange={(e) => handleConfigChange('config_json.y_axis.title', e.target.value)}
                />

                <Box sx={{ px: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Point Size: {config.config_json?.point_size || 6}
                  </Typography>
                  <Slider
                    value={config.config_json?.point_size || 6}
                    onChange={(_, value) => handleConfigChange('config_json.point_size', value)}
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
                    value={config.config_json?.value_column || ''}
                    onChange={(e) => handleConfigChange('config_json.value_column', e.target.value)}
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
                    value={config.config_json?.value_format || 'number'}
                    onChange={(e) => handleConfigChange('config_json.value_format', e.target.value)}
                  >
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="currency">Currency</MenuItem>
                    <MenuItem value="percentage">Percentage</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Comparison Column (Optional)</InputLabel>
                  <Select
                    value={config.config_json?.comparison_column || ''}
                    onChange={(e) => handleConfigChange('config_json.comparison_column', e.target.value)}
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
    if (!config || config.chart_type === 'table-chart' || config.chart_type === 'metric-card') {
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
                  checked={config.config_json?.legend?.show !== false}
                  onChange={(e) => handleConfigChange('config_json.legend.show', e.target.checked)}
                />
              }
              label="Show Legend"
            />

            {config.config_json?.legend?.show !== false && (
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Position</InputLabel>
                    <Select
                      value={config.config_json?.legend?.position || 'bottom'}
                      onChange={(e) => handleConfigChange('config_json.legend.position', e.target.value)}
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
                      value={config.config_json?.legend?.orientation || 'horizontal'}
                      onChange={(e) => handleConfigChange('config_json.legend.orientation', e.target.value)}
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
                  checked={config.config_json?.grid?.show_x_grid !== false}
                  onChange={(e) => handleConfigChange('config_json.grid.show_x_grid', e.target.checked)}
                />
              }
              label="Show X-Axis Grid"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.config_json?.grid?.show_y_grid !== false}
                  onChange={(e) => handleConfigChange('config_json.grid.show_y_grid', e.target.checked)}
                />
              }
              label="Show Y-Axis Grid"
            />

            {/* Interaction Configuration */}
            <Typography variant="subtitle2" color="primary">Interaction</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.config_json?.interaction?.zoom_enabled !== false}
                  onChange={(e) => handleConfigChange('config_json.interaction.zoom_enabled', e.target.checked)}
                />
              }
              label="Enable Zoom"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.config_json?.interaction?.tooltip_enabled !== false}
                  onChange={(e) => handleConfigChange('config_json.interaction.tooltip_enabled', e.target.checked)}
                />
              }
              label="Show Tooltips"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.config_json?.interaction?.crosshair_enabled || false}
                  onChange={(e) => handleConfigChange('config_json.interaction.crosshair_enabled', e.target.checked)}
                />
              }
              label="Show Crosshair"
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (!open || !chart) {
    return null;
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 480,
          maxWidth: '90vw'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6">
            Chart Configuration
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {loading && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography>Loading dataset columns...</Typography>
            </Box>
          )}

          {!loading && (
            <>
              {renderBasicConfig()}
              {renderDataConfig()}
              {renderStyleConfig()}
            </>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: 1,
          justifyContent: 'flex-end'
        }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!config}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};