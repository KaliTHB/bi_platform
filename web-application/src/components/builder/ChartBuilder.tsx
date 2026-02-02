// web-application/src/components/builder/ChartBuilder.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Card,
  CardContent,
  Alert,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Storage as DatasetIcon,
  BarChart as ChartIcon,
  Edit as EditIcon,
  Settings as CustomizeIcon,
  Code as QueryIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
  Timeline as TrendingIcon
} from '@mui/icons-material';

// Import the new components we created
import DatasetSelector from './DatasetSelector';
import AdvancedChartSelector from './AdvancedChartSelector';
import TimeRangeConfigurator from './TimeRangeConfigurator';
import ChartCustomizationPanel from './ChartCustomizationPanel';
import SQLQueryEditor from './SQLQueryEditor';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface Dataset {
  id: string;
  name: string;
  type: 'virtual' | 'physical';
  schema: string;
  connection: string;
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  tags: string[];
}

interface TimeRange {
  type: 'relative' | 'specific' | 'no-filter';
  relative?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
    anchor: 'now' | 'start_of_day' | 'start_of_week' | 'start_of_month';
  };
  specific?: {
    start: Date | null;
    end: Date | null;
  };
}

interface ChartCustomization {
  percentageThreshold: number;
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  labelType: 'category_name' | 'value' | 'percentage' | 'category_and_value';
  numberFormat: 'adaptive' | 'fixed' | 'percent' | 'currency';
  dateFormat: 'adaptive' | 'smart_date' | 'custom';
  colorScheme: 'default' | 'custom';
  customColors: string[];
  opacity: number;
  showXAxis: boolean;
  showYAxis: boolean;
  xAxisTitle: string;
  yAxisTitle: string;
  showGrid: boolean;
  gridColor: string;
  showBorder: boolean;
  borderColor: string;
  enableTooltip: boolean;
  enableZoom: boolean;
  enableCrosshair: boolean;
}

interface ChartConfiguration {
  name: string;
  dataset?: Dataset;
  chartType?: ChartType;
  timeRange?: TimeRange;
  customization: ChartCustomization;
  customQuery?: string;
  dimensions: {
    x?: string[];
    y?: string[];
    series?: string;
  };
  metrics: {
    metric: string;
    aggregation: 'sum' | 'count' | 'avg' | 'min' | 'max';
  }[];
}

// =============================================================================
// Sample Data
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

// =============================================================================
// Tab Panel Component
// =============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
  </div>
);

// =============================================================================
// Main Component
// =============================================================================

const ChartBuilder: React.FC = () => {
  // Dialog states
  const [showDatasetSelector, setShowDatasetSelector] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false);

  // Chart configuration state
  const [chartConfig, setChartConfig] = useState<ChartConfiguration>({
    name: 'Vaccine Candidates per Phase',
    customization: defaultCustomization,
    dimensions: {},
    metrics: [{ metric: 'COUNT(*)', aggregation: 'count' }]
  });

  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [isAltered, setIsAltered] = useState(true);

  // Handle dataset selection
  const handleDatasetSelect = (dataset: Dataset) => {
    setChartConfig(prev => ({
      ...prev,
      dataset
    }));
    setIsAltered(true);
  };

  // Handle chart type selection
  const handleChartTypeSelect = (chartType: ChartType) => {
    setChartConfig(prev => ({
      ...prev,
      chartType
    }));
    setIsAltered(true);
  };

  // Handle time range changes
  const handleTimeRangeChange = (timeRange: TimeRange) => {
    setChartConfig(prev => ({
      ...prev,
      timeRange
    }));
    setIsAltered(true);
  };

  // Handle customization changes
  const handleCustomizationChange = (customization: ChartCustomization) => {
    setChartConfig(prev => ({
      ...prev,
      customization
    }));
    setIsAltered(true);
  };

  // Handle query changes
  const handleQueryChange = (customQuery: string) => {
    setChartConfig(prev => ({
      ...prev,
      customQuery
    }));
    setIsAltered(true);
  };

  // Mock chart preview component
  const ChartPreview: React.FC = () => (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'grey.50',
      borderRadius: 1,
      border: 1,
      borderColor: 'divider'
    }}>
      {chartConfig.chartType ? (
        <Box sx={{ textAlign: 'center' }}>
          {chartConfig.chartType.icon}
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {chartConfig.chartType.name} Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Chart visualization would render here
          </Typography>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center' }}>
          <ChartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Select a chart type to preview
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">
            {chartConfig.name}
          </Typography>
          {isAltered && (
            <Chip 
              label="Altered" 
              color="warning" 
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<PreviewIcon />}>
            Preview
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />}
            onClick={() => setIsAltered(false)}
          >
            Save
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Left Panel - Configuration */}
        <Box sx={{ width: 350, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          {/* Dataset Selection */}
          <Paper sx={{ m: 2, p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DatasetIcon />
              Dataset
            </Typography>
            
            <Card 
              variant="outlined" 
              sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              onClick={() => setShowDatasetSelector(true)}
            >
              <CardContent sx={{ p: 2 }}>
                {chartConfig.dataset ? (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {chartConfig.dataset.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {chartConfig.dataset.schema} • {chartConfig.dataset.connection}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Click to select dataset
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Paper>

          {/* Chart Type Selection */}
          <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChartIcon />
              Visualization Type
            </Typography>
            
            <Card 
              variant="outlined" 
              sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              onClick={() => setShowChartSelector(true)}
            >
              <CardContent sx={{ p: 2 }}>
                {chartConfig.chartType ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {chartConfig.chartType.icon}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {chartConfig.chartType.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {chartConfig.chartType.description}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Click to select chart type
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Paper>

          {/* Time Range */}
          <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">Time</Typography>
              <IconButton size="small" onClick={() => setShowTimeRangeDialog(true)}>
                <EditIcon />
              </IconButton>
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              {chartConfig.timeRange ? 
                `Custom time range applied` : 
                'No time filter'
              }
            </Typography>
          </Paper>

          {/* Dimensions & Metrics */}
          <Paper sx={{ mx: 2, mb: 2, p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Query</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Dimensions
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>clinical_stage</InputLabel>
                <Select defaultValue="clinical_stage">
                  <MenuItem value="clinical_stage">clinical_stage</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                Metric
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>COUNT(*)</InputLabel>
                <Select defaultValue="count">
                  <MenuItem value="count">COUNT(*)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Box>

        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="Data" />
              <Tab label="Customize" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ flexGrow: 1 }}>
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 3, height: '100%' }}>
                {/* SQL Query Editor */}
                <SQLQueryEditor
                  initialQuery={chartConfig.customQuery}
                  onQueryChange={handleQueryChange}
                  height={300}
                />

                {/* Chart Preview */}
                <Box sx={{ mt: 3, height: 'calc(100% - 350px)' }}>
                  <ChartPreview />
                </Box>
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box sx={{ display: 'flex', height: '100%' }}>
                {/* Customization Panel */}
                <Box sx={{ width: 400, borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
                  <ChartCustomizationPanel
                    chartType={chartConfig.chartType?.id || 'bar'}
                    customization={chartConfig.customization}
                    onChange={handleCustomizationChange}
                  />
                </Box>

                {/* Chart Preview */}
                <Box sx={{ flexGrow: 1, p: 3 }}>
                  <ChartPreview />
                </Box>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </Box>

      {/* Dialogs */}
      <DatasetSelector
        open={showDatasetSelector}
        onClose={() => setShowDatasetSelector(false)}
        onSelect={handleDatasetSelect}
        selectedDatasetId={chartConfig.dataset?.id}
      />

      <AdvancedChartSelector
        open={showChartSelector}
        onClose={() => setShowChartSelector(false)}
        onSelect={handleChartTypeSelect}
        selectedChartId={chartConfig.chartType?.id}
      />

      <TimeRangeConfigurator
        open={showTimeRangeDialog}
        onClose={() => setShowTimeRangeDialog(false)}
        onApply={handleTimeRangeChange}
        initialRange={chartConfig.timeRange}
      />
    </Box>
  );
};

export default ChartBuilder;