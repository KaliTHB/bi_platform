// web-application/src/pages/workspace/chart-builder.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Palette as ColorIcon,
  TuneOutlined as ConfigIcon,
  BarChart as BarIcon,
  PieChart as PieIcon,
  ShowChart as LineIcon,
  ScatterPlot as ScatterIcon,
  ExpandMore as ExpandMoreIcon,
  DataObject as DataIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import NavbarOnlyLayout from '@/components/layout/NavbarOnlyLayout';

interface Dataset {
  id: string;
  name: string;
  display_name: string;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
  }>;
}

interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  description: string;
  dataset_id: string;
  x_axis: string;
  y_axis: string;
  color_field?: string;
  group_by?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  styling: {
    colors: string[];
    show_legend: boolean;
    show_grid: boolean;
    chart_height: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const steps = ['Select Data', 'Choose Chart Type', 'Configure Chart', 'Style & Preview'];

const chartTypes = [
  { 
    type: 'bar', 
    label: 'Bar Chart', 
    icon: <BarIcon />, 
    description: 'Compare values across categories',
    requirements: ['categorical x-axis', 'numerical y-axis']
  },
  { 
    type: 'line', 
    label: 'Line Chart', 
    icon: <LineIcon />, 
    description: 'Show trends over time',
    requirements: ['time/date x-axis', 'numerical y-axis']
  },
  { 
    type: 'pie', 
    label: 'Pie Chart', 
    icon: <PieIcon />, 
    description: 'Show proportions of a whole',
    requirements: ['categorical field', 'numerical values']
  },
  { 
    type: 'scatter', 
    label: 'Scatter Plot', 
    icon: <ScatterIcon />, 
    description: 'Explore relationships between variables',
    requirements: ['numerical x-axis', 'numerical y-axis']
  }
];

const ChartBuilderPage: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    type: 'bar',
    title: '',
    description: '',
    dataset_id: '',
    x_axis: '',
    y_axis: '',
    aggregation: 'count',
    filters: [],
    styling: {
      colors: ['#1976d2', '#dc004e', '#9c27b0', '#673ab7', '#3f51b5'],
      show_legend: true,
      show_grid: true,
      chart_height: 400
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load datasets
  useEffect(() => {
    const loadDatasets = async () => {
      try {
        setLoading(true);
        
        // Mock data - replace with actual API call
        setTimeout(() => {
          setDatasets([
            {
              id: '1',
              name: 'sales_orders',
              display_name: 'Sales Orders',
              columns: [
                { name: 'order_id', type: 'string' },
                { name: 'customer_name', type: 'string' },
                { name: 'order_date', type: 'date' },
                { name: 'total_amount', type: 'number' },
                { name: 'status', type: 'string' },
                { name: 'quantity', type: 'number' }
              ]
            },
            {
              id: '2',
              name: 'customer_analytics',
              display_name: 'Customer Analytics',
              columns: [
                { name: 'customer_id', type: 'string' },
                { name: 'customer_name', type: 'string' },
                { name: 'order_count', type: 'number' },
                { name: 'total_spent', type: 'number' },
                { name: 'last_order_date', type: 'date' }
              ]
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading datasets:', error);
        setLoading(false);
      }
    };

    if (workspace) {
      loadDatasets();
    }
  }, [workspace]);

  const handleDatasetSelect = (datasetId: string) => {
    const dataset = datasets.find(d => d.id === datasetId);
    if (dataset) {
      setSelectedDataset(dataset);
      setChartConfig(prev => ({
        ...prev,
        dataset_id: datasetId,
        title: `Chart from ${dataset.display_name}`,
        x_axis: '',
        y_axis: ''
      }));
      setActiveStep(1);
    }
  };

  const handleChartTypeSelect = (type: ChartConfig['type']) => {
    setChartConfig(prev => ({ ...prev, type }));
    setActiveStep(2);
  };

  const handleSaveChart = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Saving chart:', chartConfig);
      
      // Navigate back to charts list
      router.push(`/workspace/charts`);
    } catch (error) {
      console.error('Error saving chart:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderDataSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Dataset
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Choose the dataset you want to create a chart from.
      </Typography>

      <Grid container spacing={2}>
        {datasets.map((dataset) => (
          <Grid item xs={12} md={6} key={dataset.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { 
                  transform: 'translateY(-2px)', 
                  boxShadow: 3 
                },
                border: selectedDataset?.id === dataset.id ? 2 : 1,
                borderColor: selectedDataset?.id === dataset.id ? 'primary.main' : 'divider'
              }}
              onClick={() => handleDatasetSelect(dataset.id)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <DataIcon color="primary" />
                  <Typography variant="h6">
                    {dataset.display_name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {dataset.columns.length} columns available
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {dataset.columns.slice(0, 4).map((col) => (
                    <Chip 
                      key={col.name}
                      label={`${col.name} (${col.type})`}
                      size="small" 
                      variant="outlined"
                    />
                  ))}
                  {dataset.columns.length > 4 && (
                    <Chip 
                      label={`+${dataset.columns.length - 4} more`}
                      size="small" 
                      variant="outlined"
                      color="primary"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderChartTypeSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose Chart Type
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Select the type of chart that best represents your data.
      </Typography>

      <Grid container spacing={2}>
        {chartTypes.map((type) => (
          <Grid item xs={12} md={6} key={type.type}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { 
                  transform: 'translateY(-2px)', 
                  boxShadow: 3 
                },
                border: chartConfig.type === type.type ? 2 : 1,
                borderColor: chartConfig.type === type.type ? 'primary.main' : 'divider'
              }}
              onClick={() => handleChartTypeSelect(type.type)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  {type.icon}
                  <Typography variant="h6">
                    {type.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {type.description}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Requirements:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                  {type.requirements.map((req) => (
                    <Chip 
                      key={req}
                      label={req}
                      size="small" 
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderConfiguration = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Chart
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Basic Configuration
            </Typography>
            
            <TextField
              fullWidth
              label="Chart Title"
              value={chartConfig.title}
              onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Description"
              value={chartConfig.description}
              onChange={(e) => setChartConfig(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={2}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>X-Axis</InputLabel>
              <Select
                value={chartConfig.x_axis}
                onChange={(e) => setChartConfig(prev => ({ ...prev, x_axis: e.target.value }))}
              >
                {selectedDataset?.columns.map((col) => (
                  <MenuItem key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Y-Axis</InputLabel>
              <Select
                value={chartConfig.y_axis}
                onChange={(e) => setChartConfig(prev => ({ ...prev, y_axis: e.target.value }))}
              >
                {selectedDataset?.columns
                  .filter(col => col.type === 'number')
                  .map((col) => (
                    <MenuItem key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Aggregation</InputLabel>
              <Select
                value={chartConfig.aggregation}
                onChange={(e) => setChartConfig(prev => ({ ...prev, aggregation: e.target.value as any }))}
              >
                <MenuItem value="count">Count</MenuItem>
                <MenuItem value="sum">Sum</MenuItem>
                <MenuItem value="avg">Average</MenuItem>
                <MenuItem value="min">Minimum</MenuItem>
                <MenuItem value="max">Maximum</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Chart Preview
            </Typography>
            
            <Box
              sx={{
                height: 300,
                border: '2px dashed',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}
            >
              {chartConfig.x_axis && chartConfig.y_axis ? (
                <>
                  {chartTypes.find(t => t.type === chartConfig.type)?.icon}
                  <Typography variant="h6">
                    {chartConfig.title || 'Untitled Chart'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {chartConfig.type.toUpperCase()} • {chartConfig.x_axis} vs {chartConfig.y_axis}
                  </Typography>
                </>
              ) : (
                <>
                  <PreviewIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                  <Typography variant="h6" color="textSecondary">
                    Chart Preview
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Configure axes to see preview
                  </Typography>
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStyling = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Style & Preview
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Chart Styling
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={chartConfig.styling.show_legend}
                  onChange={(e) => setChartConfig(prev => ({
                    ...prev,
                    styling: { ...prev.styling, show_legend: e.target.checked }
                  }))}
                />
              }
              label="Show Legend"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={chartConfig.styling.show_grid}
                  onChange={(e) => setChartConfig(prev => ({
                    ...prev,
                    styling: { ...prev.styling, show_grid: e.target.checked }
                  }))}
                />
              }
              label="Show Grid"
            />

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                Chart Height: {chartConfig.styling.chart_height}px
              </Typography>
              <Slider
                value={chartConfig.styling.chart_height}
                onChange={(_, value) => setChartConfig(prev => ({
                  ...prev,
                  styling: { ...prev.styling, chart_height: value as number }
                }))}
                min={200}
                max={800}
                step={50}
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                Color Palette
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {chartConfig.styling.colors.map((color, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: color,
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" gutterBottom>
              Final Preview
            </Typography>
            
            <Box
              sx={{
                height: chartConfig.styling.chart_height,
                border: '2px dashed',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: 'grey.50'
              }}
            >
              {chartTypes.find(t => t.type === chartConfig.type)?.icon}
              <Typography variant="h5">
                {chartConfig.title}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {chartConfig.description}
              </Typography>
              <Chip 
                label={`${chartConfig.type.toUpperCase()} Chart`}
                color="primary"
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const breadcrumbs = [
    { label: 'Workspace', href: `/workspace/${workspace?.slug}` },
    { label: 'Charts', href: `/workspace/${workspace?.slug}/charts` },
    { label: 'Chart Builder' }
  ];

  const actions = (
    <>
      <Button
        variant="outlined"
        startIcon={<BackIcon />}
        onClick={() => router.push(`/workspace/${workspace?.slug}/charts`)}
      >
        Cancel
      </Button>
      <PermissionGate permission="chart.create">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveChart}
          disabled={saving || !chartConfig.title || !chartConfig.x_axis || !chartConfig.y_axis}
        >
          {saving ? 'Saving...' : 'Save Chart'}
        </Button>
      </PermissionGate>
    </>
  );

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  return (
    <NavbarOnlyLayout
      title="Chart Builder"
      subtitle="Create interactive charts from your datasets"
      breadcrumbs={breadcrumbs}
      actions={actions}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Stepper */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {activeStep === 0 && renderDataSelection()}
          {activeStep === 1 && renderChartTypeSelection()}
          {activeStep === 2 && renderConfiguration()}
          {activeStep === 3 && renderStyling()}
        </Box>

        {/* Navigation */}
        <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" justifyContent="between">
            <Button
              disabled={activeStep === 0}
              onClick={() => setActiveStep(prev => prev - 1)}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep(prev => prev + 1)}
              disabled={
                activeStep === steps.length - 1 ||
                (activeStep === 0 && !selectedDataset) ||
                (activeStep === 2 && (!chartConfig.x_axis || !chartConfig.y_axis))
              }
            >
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Box>
    </NavbarOnlyLayout>
  );
};

export default ChartBuilderPage;