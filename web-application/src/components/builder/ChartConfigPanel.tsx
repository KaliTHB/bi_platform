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
  Alert,
  FormHelperText,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dialog
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

// Available themes configuration
const AVAILABLE_THEMES = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
  { value: 'corporate', label: 'Corporate Theme' },
  { value: 'webview', label: 'Webview Theme' },
  { value: 'custom', label: 'Custom Theme' }
];

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
    interactivity: true,
    theme: 'light',
    customTheme: {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontFamily: 'Roboto, sans-serif',
      fontSize: 12,
      useCustomColors: false,
      enableAnimations: true
    }
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
    const newYAxes = currentYAxes.filter((_: any, i: number) => i !== index);
    
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
                      <Typography variant="body1">Series {index + 1}</Typography>
                      <IconButton onClick={() => removeYAxis(index)} size="small" color="error">
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
                        <TextField
                          fullWidth
                          label="Color"
                          type="color"
                          value={yAxis.color || '#1976d2'}
                          onChange={(e) => handleConfigChange(`config_json.y_axes.${index}.color`, e.target.value)}
                        />
                      </Grid>
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
              </>
            )}

            {/* Metric Card Configuration */}
            {isMetricCard && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Metric Column</InputLabel>
                  <Select
                    value={config.config_json?.metric_column || ''}
                    onChange={(e) => handleConfigChange('config_json.metric_column', e.target.value)}
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
              </Grid>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderThemeConfig = () => {
    if (!config) return null;

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Theme & Appearance</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Theme Selection */}
            <FormControl fullWidth>
              <InputLabel>Theme</InputLabel>
              <Select
                value={config.config_json?.theme || 'light'}
                onChange={(e) => handleConfigChange('config_json.theme', e.target.value)}
                label="Theme"
              >
                {AVAILABLE_THEMES.map(theme => (
                  <MenuItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a theme that matches your dashboard's appearance
              </FormHelperText>
            </FormControl>

            {/* Color Customization */}
            <Typography variant="subtitle2" color="primary">Color Customization</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Primary Color"
                  type="color"
                  value={config.config_json?.customTheme?.primaryColor || '#1976d2'}
                  onChange={(e) => handleConfigChange('config_json.customTheme.primaryColor', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Secondary Color"
                  type="color"
                  value={config.config_json?.customTheme?.secondaryColor || '#dc004e'}
                  onChange={(e) => handleConfigChange('config_json.customTheme.secondaryColor', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Background Color"
                  type="color"
                  value={config.config_json?.customTheme?.backgroundColor || '#ffffff'}
                  onChange={(e) => handleConfigChange('config_json.customTheme.backgroundColor', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Text Color"
                  type="color"
                  value={config.config_json?.customTheme?.textColor || '#333333'}
                  onChange={(e) => handleConfigChange('config_json.customTheme.textColor', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Font Configuration */}
            <Typography variant="subtitle2" color="primary">Typography</Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Font Family"
                  value={config.config_json?.customTheme?.fontFamily || 'Roboto, sans-serif'}
                  onChange={(e) => handleConfigChange('config_json.customTheme.fontFamily', e.target.value)}
                  fullWidth
                  helperText="CSS font family"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Font Size"
                  type="number"
                  value={config.config_json?.customTheme?.fontSize || 12}
                  onChange={(e) => handleConfigChange('config_json.customTheme.fontSize', parseInt(e.target.value))}
                  fullWidth
                  InputProps={{ endAdornment: 'px' }}
                />
              </Grid>
            </Grid>

            {/* Advanced Theme Options */}
            <Typography variant="subtitle2" color="primary">Advanced Options</Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={config.config_json?.customTheme?.useCustomColors !== false}
                  onChange={(e) => handleConfigChange('config_json.customTheme.useCustomColors', e.target.checked)}
                />
              }
              label="Use Custom Colors"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.config_json?.customTheme?.enableAnimations !== false}
                  onChange={(e) => handleConfigChange('config_json.customTheme.enableAnimations', e.target.checked)}
                />
              }
              label="Enable Animations"
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  if (!config) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Configure Chart</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {renderBasicConfig()}
          {renderDataConfig()}
          {renderStyleConfig()}
          {renderThemeConfig()}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChartConfigPanel;