// File: web-application/src/components/builder/ChartConfigPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ensureMutable } from '@/plugins/charts/utils/chartDataUtils';
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
  Palette as PaletteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { SketchPicker } from 'react-color';
import { 
  Chart, 
  ChartConfig, 
  ChartDimensions, 
  ChartAxes, 
  ChartAxis, 
  ChartLegend,
  ChartTitle,
  ChartSeries,
  ChartTheme,
  ChartConfiguration
  //ChartGrid,
  //ChartAnimation,
} from '@/types/chart.types';
import { Dataset,ColumnDefinition } from '@/types/index';
import { datasetAPI } from '@/api/index';
import {AVAILABLE_THEMES} from '@/types/common.types';

import {ChartConfigPanelProps} from '@/types/index'

interface ChartConfigState extends Chart {
  // Extend with additional UI state if needed
}

export const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
   open,
  onClose,
  chart,
  datasets = [],
  onSave,
  chartType,
  configuration,
  dataColumns = [],
  onConfigurationChange
}) => {
  const [config, setConfig] = useState<ChartConfigState | null>(null);
  const [datasetColumns, setDatasetColumns] = useState<Array<{ name: string; type: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<{ [key: string]: boolean }>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [derivedColumns, setDerivedColumns] = useState<ColumnDefinition[]>([]);

  const createDefaultChartConfig = useCallback((): ChartConfig => ({
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
    orient: 'horizontal'
  },
  title: {
    text: '',
    subtitle: '',
    position: 'center'
  },
  theme: 'light',
  // Make sure colors is a mutable array
  colors: ['#1976d2', '#dc004e', '#388e3c', '#f57c00'] as string[],
  animations: true,
  interactivity: true,
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
}), []);

// Use chartType from props or derive from chart
  const effectiveChartType = chartType || chart?.chart_type || '';
  
  // Use configuration from props or derive from chart
  const effectiveConfiguration = configuration || chart?.config_json || createDefaultChartConfig();
  
  // Use dataColumns from props or fetch from datasets
   const effectiveDataColumns = dataColumns.length > 0 ? dataColumns : derivedColumns;

  // Initialize config when chart changes
  useEffect(() => {
  if (chart) {
    setConfig({
      ...chart,
      config_json: {
        ...chart.config_json,
        // Use the utility function to ensure mutable arrays
        colors: ensureMutable(chart.config_json?.colors as string[] | readonly string[] | undefined),
        // Apply to other array fields as needed
        series: chart.config_json?.series ? [...chart.config_json.series] : undefined
      }
    });
  }
}, [chart]);

  // Load dataset columns when chart dataset changes
  useEffect(() => {
    const loadDatasetColumns = async () => {
      if (config && config.dataset_ids && config.dataset_ids.length > 0) {
        setLoading(true);
        try {
          const columns = await datasetAPI.getColumns(config.dataset_ids[0]);
          setDatasetColumns(columns);
        } catch (error) {
          console.error('Failed to load dataset columns:', error);
          setDatasetColumns([]);
        } finally {
          setLoading(false);
        }
      }
    };

    loadDatasetColumns();
  }, [config?.dataset_ids]);

  // Handle config changes with deep merge
  const handleConfigChange = useCallback((path: string, value: any) => {
    if (!config) return;

    setConfig(prevConfig => {
      if (!prevConfig) return prevConfig;

      const newConfig = { ...prevConfig };
      const pathParts = path.split('.');
      let current: any = newConfig;

      // Navigate to the parent of the target property
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }

      // Set the target property
      current[pathParts[pathParts.length - 1]] = value;
      
      return newConfig;
    });
  }, [config]);

  // Handle dataset selection
  const handleDatasetChange = useCallback((datasetId: string) => {
    if (!config) return;
    
    setConfig(prevConfig => ({
      ...prevConfig!,
      dataset_ids: [datasetId]
    }));
  }, [config]);

  // Handle save
  const handleSave = useCallback(() => {
    if (!config) return;

    // Validate configuration
    const errors: string[] = [];
    
    if (!config.name?.trim()) {
      errors.push('Chart name is required');
    }
    
    if (!config.dataset_ids || config.dataset_ids.length === 0) {
      errors.push('At least one dataset is required');
    }

    if (!config.config_json?.dimensions?.width || config.config_json?.dimensions?.width <= 0) {
      errors.push('Valid chart width is required');
    }

    if (!config.config_json?.dimensions?.height || config.config_json?.dimensions?.height <= 0) {
      errors.push('Valid chart height is required');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    if (onSave) {
      onSave(config);
    }
  }, [config, onSave]);

  // Color picker handlers
  const handleColorPickerOpen = useCallback((key: string) => {
    setShowColorPicker(prev => ({ ...prev, [key]: true }));
  }, []);

  const handleColorPickerClose = useCallback((key: string) => {
    setShowColorPicker(prev => ({ ...prev, [key]: false }));
  }, []);

  const handleColorChange = useCallback((key: string, color: any) => {
    handleConfigChange(key, color.hex);
  }, [handleConfigChange]);

  if (!config) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 400 } }}
      >
        <Box p={3} textAlign="center">
          <Typography variant="h6">No chart selected</Typography>
          <Typography variant="body2" color="textSecondary" mt={1}>
            Select a chart to configure its settings.
          </Typography>
        </Box>
      </Drawer>
    );
  }

  const renderBasicConfig = () => (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Basic Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            label="Chart Name"
            value={config.name || ''}
            onChange={(e) => setConfig(prev => prev ? { ...prev, name: e.target.value } : null)}
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={config.description || ''}
            onChange={(e) => setConfig(prev => prev ? { ...prev, description: e.target.value } : null)}
          />

          <TextField
            fullWidth
            label="Chart Title"
            value={(config.config_json?.title as any)?.text || config.config_json?.title || ''}
            onChange={(e) => {
  if (typeof config.config_json?.title === 'object') {
    handleConfigChange('config_json.title.text', e.target.value);
  } else {
    handleConfigChange('config_json.title', { text: e.target.value });
  }
}}
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

  const renderDimensionsConfig = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Chart Dimensions</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Width"
                type="number"
                value={config.config_json?.dimensions?.width || 400}
                onChange={(e) => handleConfigChange('config_json.dimensions.width', parseInt(e.target.value) || 400)}
                InputProps={{ inputProps: { min: 100, max: 2000 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Height"
                type="number"
                value={config.config_json?.dimensions?.height || 300}
                onChange={(e) => handleConfigChange('config_json.dimensions.height', parseInt(e.target.value) || 300)}
                InputProps={{ inputProps: { min: 100, max: 1500 } }}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" gutterBottom>
            Margins
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Top"
                type="number"
                value={config.config_json?.dimensions?.margin?.top || 20}
                onChange={(e) => handleConfigChange('config_json.dimensions.margin.top', parseInt(e.target.value) || 20)}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Right"
                type="number"
                value={config.config_json?.dimensions?.margin?.right || 20}
                onChange={(e) => handleConfigChange('config_json.dimensions.margin.right', parseInt(e.target.value) || 20)}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Bottom"
                type="number"
                value={config.config_json?.dimensions?.margin?.bottom || 20}
                onChange={(e) => handleConfigChange('config_json.dimensions.margin.bottom', parseInt(e.target.value) || 20)}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Left"
                type="number"
                value={config.config_json?.dimensions?.margin?.left || 20}
                onChange={(e) => handleConfigChange('config_json.dimensions.margin.left', parseInt(e.target.value) || 20)}
                InputProps={{ inputProps: { min: 0, max: 100 } }}
              />
            </Grid>
          </Grid>
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderAxesConfig = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Axes Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* X-Axis Configuration */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              X-Axis
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Data Field</InputLabel>
                <Select
                  value={config.config_json?.axes?.x?.field || ''}
                  onChange={(e) => handleConfigChange('config_json.axes.x.field', e.target.value)}
                >
                  {datasetColumns.map(column => (
                    <MenuItem key={column.name} value={column.name}>
                      {column.name} ({column.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Axis Title"
                value={config.config_json?.axes?.x?.title || ''}
                onChange={(e) => handleConfigChange('config_json.axes.x.title', e.target.value)}
              />

              <FormControl fullWidth>
                <InputLabel>Axis Type</InputLabel>
                <Select
                  value={config.config_json?.axes?.x?.type || 'category'}
                  onChange={(e) => handleConfigChange('config_json.axes.x.type', e.target.value)}
                >
                  <MenuItem value="category">Category</MenuItem>
                  <MenuItem value="value">Value</MenuItem>
                  <MenuItem value="time">Time</MenuItem>
                  <MenuItem value="log">Logarithmic</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={config.config_json?.axes?.x?.grid || false}
                    onChange={(e) => handleConfigChange('config_json.axes.x.grid', e.target.checked)}
                  />
                }
                label="Show Grid Lines"
              />
            </Box>
          </Box>

          {/* Y-Axis Configuration */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Y-Axis
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ml: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Data Field</InputLabel>
                <Select
                  value={config.config_json?.axes?.y?.field || ''}
                  onChange={(e) => handleConfigChange('config_json.axes.y.field', e.target.value)}
                >
                  {datasetColumns.filter(column => column.type === 'number').map(column => (
                    <MenuItem key={column.name} value={column.name}>
                      {column.name} ({column.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Axis Title"
                value={config.config_json?.axes?.y?.title || ''}
                onChange={(e) => handleConfigChange('config_json.axes.y.title', e.target.value)}
              />

              <FormControl fullWidth>
                <InputLabel>Scale Type</InputLabel>
                <Select
                  value={config.config_json?.axes?.y?.scale || 'linear'}
                  onChange={(e) => handleConfigChange('config_json.axes.y.scale', e.target.value)}
                >
                  <MenuItem value="linear">Linear</MenuItem>
                  <MenuItem value="log">Logarithmic</MenuItem>
                  <MenuItem value="sqrt">Square Root</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={config.config_json?.axes?.y?.grid || false}
                    onChange={(e) => handleConfigChange('config_json.axes.y.grid', e.target.checked)}
                  />
                }
                label="Show Grid Lines"
              />
            </Box>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderLegendConfig = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Legend Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.config_json?.legend?.show !== false}
                onChange={(e) => handleConfigChange('config_json.legend.show', e.target.checked)}
              />
            }
            label="Show Legend"
          />

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
              <MenuItem value="top-left">Top Left</MenuItem>
              <MenuItem value="top-right">Top Right</MenuItem>
              <MenuItem value="bottom-left">Bottom Left</MenuItem>
              <MenuItem value="bottom-right">Bottom Right</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Orientation</InputLabel>
            <Select
              value={config.config_json?.legend?.orient || 'horizontal'}
              onChange={(e) => handleConfigChange('config_json.legend.orientation', e.target.value)}
            >
              <MenuItem value="horizontal">Horizontal</MenuItem>
              <MenuItem value="vertical">Vertical</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderThemeConfig = () => (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">Theme & Colors</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Theme</InputLabel>
            <Select
              value={config.config_json?.theme?.name || 'default'}
              onChange={(e) => handleConfigChange('config_json.theme.name', e.target.value)}
            >
              {AVAILABLE_THEMES.map(theme => (
                <MenuItem key={theme.value} value={theme.value}>
                  {theme.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={config.config_json?.theme?.darkMode || false}
                onChange={(e) => handleConfigChange('config_json.theme.darkMode', e.target.checked)}
              />
            }
            label="Dark Mode"
          />

          {/* Color palette preview and editing could go here */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Color Palette
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {(Array.isArray(config.config_json?.colors) ? config.config_json?.colors : []).map((color, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 30,
                    height: 30,
                    backgroundColor: color,
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleColorPickerOpen(`colors.${index}`)}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 450 } }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Chart Configuration
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Please fix the following errors:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Configuration Sections */}
          {renderBasicConfig()}
          {renderDimensionsConfig()}
          {renderAxesConfig()}
          {renderLegendConfig()}
          {renderThemeConfig()}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Color Picker Dialogs */}
      {Object.entries(showColorPicker).map(([key, show]) => (
        show && (
          <Dialog
            key={key}
            open={show}
            onClose={() => handleColorPickerClose(key)}
            maxWidth="sm"
          >
            <DialogTitle>Choose Color</DialogTitle>
            <DialogContent>
              <SketchPicker
                color={
  Array.isArray(config.config_json?.colors) 
    ? config.config_json.colors[parseInt(key.split('.')[1])] || '#3b82f6'
    : '#3b82f6'
}
                onChange={(color) => handleColorChange(key, color)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleColorPickerClose(key)}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
        )
      ))}
    </Drawer>
  );
};