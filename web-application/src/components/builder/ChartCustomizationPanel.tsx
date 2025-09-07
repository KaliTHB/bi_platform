// web-application/src/components/builder/ChartCustomizationPanel.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Grid,
  Chip,
  ColorPicker,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Palette as PaletteIcon,
  FormatPaint as FormatIcon,
  TextFields as TextFieldsIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ChartCustomization {
  // General Settings
  percentageThreshold: number;
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  
  // Labels
  labelType: 'category_name' | 'value' | 'percentage' | 'category_and_value';
  numberFormat: 'adaptive' | 'fixed' | 'percent' | 'currency';
  dateFormat: 'adaptive' | 'smart_date' | 'custom';
  
  // Colors & Styling
  colorScheme: 'default' | 'custom';
  customColors: string[];
  opacity: number;
  
  // Axes (for applicable charts)
  showXAxis: boolean;
  showYAxis: boolean;
  xAxisTitle: string;
  yAxisTitle: string;
  
  // Grid & Borders
  showGrid: boolean;
  gridColor: string;
  showBorder: boolean;
  borderColor: string;
  
  // Interactive Features
  enableTooltip: boolean;
  enableZoom: boolean;
  enableCrosshair: boolean;
}

interface ChartCustomizationPanelProps {
  chartType: string;
  customization: ChartCustomization;
  onChange: (customization: ChartCustomization) => void;
}

// =============================================================================
// Default Values
// =============================================================================

const defaultCustomization: ChartCustomization = {
  percentageThreshold: 5,
  showLegend: true,
  legendPosition: 'right',
  labelType: 'category_name',
  numberFormat: 'adaptive',
  dateFormat: 'adaptive',
  colorScheme: 'default',
  customColors: [],
  opacity: 100,
  showXAxis: true,
  showYAxis: true,
  xAxisTitle: '',
  yAxisTitle: '',
  showGrid: true,
  gridColor: '#e0e0e0',
  showBorder: false,
  borderColor: '#000000',
  enableTooltip: true,
  enableZoom: false,
  enableCrosshair: false
};

const colorPalettes = [
  { name: 'Default', colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'] },
  { name: 'Categorical', colors: ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6'] },
  { name: 'Sequential Blues', colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd'] },
  { name: 'Diverging', colors: ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#abdda4'] }
];

// =============================================================================
// Main Component
// =============================================================================

const ChartCustomizationPanel: React.FC<ChartCustomizationPanelProps> = ({
  chartType,
  customization,
  onChange
}) => {
  const [expandedSection, setExpandedSection] = useState<string>('general');

  const handleChange = (field: keyof ChartCustomization, value: any) => {
    onChange({
      ...customization,
      [field]: value
    });
  };

  const handleAccordionChange = (section: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSection(isExpanded ? section : '');
  };

  const isChartTypeSupported = (feature: string): boolean => {
    const supportMap: Record<string, string[]> = {
      legend: ['pie', 'donut', 'bar', 'line', 'area', 'scatter'],
      axes: ['bar', 'line', 'area', 'scatter', 'bubble'],
      grid: ['bar', 'line', 'area', 'scatter', 'bubble'],
      zoom: ['line', 'area', 'scatter', 'bubble']
    };
    return supportMap[feature]?.includes(chartType) ?? true;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400 }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Customize
        </Typography>
      </Box>

      {/* General Settings */}
      <Accordion 
        expanded={expandedSection === 'general'} 
        onChange={handleAccordionChange('general')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">General Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Percentage Threshold */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Percentage Threshold
              </Typography>
              <TextField
                type="number"
                value={customization.percentageThreshold}
                onChange={(e) => handleChange('percentageThreshold', parseFloat(e.target.value) || 0)}
                size="small"
                fullWidth
                inputProps={{ min: 0, max: 100, step: 0.1 }}
              />
            </Box>

            {/* Legend Settings */}
            {isChartTypeSupported('legend') && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                  Legend
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={customization.showLegend}
                      onChange={(e) => handleChange('showLegend', e.target.checked)}
                    />
                  }
                  label="Show Legend"
                />
                {customization.showLegend && (
                  <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                    <InputLabel>Legend Position</InputLabel>
                    <Select
                      value={customization.legendPosition}
                      onChange={(e) => handleChange('legendPosition', e.target.value)}
                      label="Legend Position"
                    >
                      <MenuItem value="top">Top</MenuItem>
                      <MenuItem value="bottom">Bottom</MenuItem>
                      <MenuItem value="left">Left</MenuItem>
                      <MenuItem value="right">Right</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Labels & Formatting */}
      <Accordion 
        expanded={expandedSection === 'labels'} 
        onChange={handleAccordionChange('labels')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Labels</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Label Type */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Label Type
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={customization.labelType}
                  onChange={(e) => handleChange('labelType', e.target.value)}
                >
                  <MenuItem value="category_name">Category Name</MenuItem>
                  <MenuItem value="value">Value</MenuItem>
                  <MenuItem value="percentage">Percentage</MenuItem>
                  <MenuItem value="category_and_value">Category and Value</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Number Format */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Number Format
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={customization.numberFormat}
                  onChange={(e) => handleChange('numberFormat', e.target.value)}
                >
                  <MenuItem value="adaptive">Adaptive formatting</MenuItem>
                  <MenuItem value="fixed">Fixed decimal places</MenuItem>
                  <MenuItem value="percent">Percentage</MenuItem>
                  <MenuItem value="currency">Currency</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Date Format */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Date Format
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={customization.dateFormat}
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                >
                  <MenuItem value="adaptive">Adaptive formatting</MenuItem>
                  <MenuItem value="smart_date">Smart date</MenuItem>
                  <MenuItem value="custom">Custom format</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Colors & Styling */}
      <Accordion 
        expanded={expandedSection === 'colors'} 
        onChange={handleAccordionChange('colors')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Colors & Styling</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Color Scheme */}
            <Box>
              <Typography variant="body2" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Color Scheme
              </Typography>
              <Grid container spacing={1}>
                {colorPalettes.map((palette, index) => (
                  <Grid item xs={12} key={index}>
                    <Card
                      variant="outlined"
                      sx={{ 
                        cursor: 'pointer',
                        border: customization.colorScheme === palette.name.toLowerCase() ? 2 : 1,
                        borderColor: customization.colorScheme === palette.name.toLowerCase() ? 'primary.main' : 'divider'
                      }}
                      onClick={() => handleChange('colorScheme', palette.name.toLowerCase())}
                    >
                      <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 500 }}>
                          {palette.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {palette.colors.slice(0, 4).map((color, colorIndex) => (
                            <Box
                              key={colorIndex}
                              sx={{
                                width: 12,
                                height: 12,
                                backgroundColor: color,
                                borderRadius: '50%'
                              }}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Opacity */}
            <Box>
              <Typography variant="body2" sx={{ mb: 2, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Opacity
              </Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={customization.opacity}
                  onChange={(_, value) => handleChange('opacity', value as number)}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                />
              </Box>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Axes Settings */}
      {isChartTypeSupported('axes') && (
        <Accordion 
          expanded={expandedSection === 'axes'} 
          onChange={handleAccordionChange('axes')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Axes</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* X-Axis */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={customization.showXAxis}
                      onChange={(e) => handleChange('showXAxis', e.target.checked)}
                    />
                  }
                  label="Show X-Axis"
                />
                {customization.showXAxis && (
                  <TextField
                    label="X-Axis Title"
                    value={customization.xAxisTitle}
                    onChange={(e) => handleChange('xAxisTitle', e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>

              {/* Y-Axis */}
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={customization.showYAxis}
                      onChange={(e) => handleChange('showYAxis', e.target.checked)}
                    />
                  }
                  label="Show Y-Axis"
                />
                {customization.showYAxis && (
                  <TextField
                    label="Y-Axis Title"
                    value={customization.yAxisTitle}
                    onChange={(e) => handleChange('yAxisTitle', e.target.value)}
                    size="small"
                    fullWidth
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Grid & Visual Elements */}
      {isChartTypeSupported('grid') && (
        <Accordion 
          expanded={expandedSection === 'grid'} 
          onChange={handleAccordionChange('grid')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Grid & Visual</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Grid */}
              <FormControlLabel
                control={
                  <Switch
                    checked={customization.showGrid}
                    onChange={(e) => handleChange('showGrid', e.target.checked)}
                  />
                }
                label="Show Grid"
              />

              {/* Border */}
              <FormControlLabel
                control={
                  <Switch
                    checked={customization.showBorder}
                    onChange={(e) => handleChange('showBorder', e.target.checked)}
                  />
                }
                label="Show Border"
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Interactive Features */}
      <Accordion 
        expanded={expandedSection === 'interactive'} 
        onChange={handleAccordionChange('interactive')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Interactive</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={customization.enableTooltip}
                  onChange={(e) => handleChange('enableTooltip', e.target.checked)}
                />
              }
              label="Enable Tooltip"
            />

            {isChartTypeSupported('zoom') && (
              <FormControlLabel
                control={
                  <Switch
                    checked={customization.enableZoom}
                    onChange={(e) => handleChange('enableZoom', e.target.checked)}
                  />
                }
                label="Enable Zoom"
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={customization.enableCrosshair}
                  onChange={(e) => handleChange('enableCrosshair', e.target.checked)}
                />
              }
              label="Enable Crosshair"
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Update Button */}
      <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{ 
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: 0.5
          }}
        >
          Update Chart
        </Button>
      </Box>
    </Box>
  );
};

export default ChartCustomizationPanel;