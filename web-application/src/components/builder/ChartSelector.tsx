// web-application/src/components/builder/AdvancedChartSelector.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Tabs,
  Tab,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as LineChartIcon,
  DonutLarge as DonutIcon,
  Assessment as MetricIcon,
  TableChart as TableIcon,
  ScatterPlot as ScatterIcon,
  BubbleChart as BubbleIcon,
  Functions as FunnelIcon,
  Speed as GaugeIcon,
  Radar as RadarIcon,
  ShowChart as ShowChartIcon,
  Analytics as AnalyticsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

// =============================================================================
// Types and Chart Definitions
// =============================================================================

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'popular' | 'echarts' | 'advanced-analytics';
  tags: string[];
  featured?: boolean;
  exampleValue?: string;
}

interface ChartCategory {
  id: string;
  label: string;
  icon?: React.ReactNode;
  charts: ChartType[];
}

const chartTypes: ChartType[] = [
  // Popular Charts
  {
    id: 'big-number-trendline',
    name: 'Big Number with Trendline',
    description: 'Showcases a single number accompanied by a simple line chart, to call attention to an important metric along with its change over time or other dimension.',
    icon: <TrendingUpIcon />,
    category: 'popular',
    tags: ['Formattable', 'Advanced-Analytics', 'Line', 'Percentages', 'Popular', 'Report', 'Description', 'Trend'],
    featured: true,
    exampleValue: '80.7M'
  },
  {
    id: 'big-number',
    name: 'Big Number',
    description: 'Display a single large number to highlight key metrics and KPIs.',
    icon: <MetricIcon />,
    category: 'popular',
    tags: ['Formattable', 'Popular', 'Report'],
    featured: true,
    exampleValue: '80.7M'
  },
  {
    id: 'bullet-chart',
    name: 'Bullet Chart',
    description: 'Compare actual values against targets with contextual performance ranges.',
    icon: <BarChartIcon />,
    category: 'popular',
    tags: ['Popular', 'Comparison', 'Performance'],
    featured: true
  },
  {
    id: 'funnel-chart',
    name: 'Funnel Chart',
    description: 'Visualize data through a funnel process, typically showing conversion rates.',
    icon: <FunnelIcon />,
    category: 'popular',
    tags: ['Popular', 'Conversion', 'Process'],
    featured: true
  },
  {
    id: 'gauge-chart',
    name: 'Gauge Chart',
    description: 'Display a single metric as a gauge or speedometer visualization.',
    icon: <GaugeIcon />,
    category: 'popular',
    tags: ['Popular', 'Single Metric', 'Performance'],
    featured: true
  },

  // ECharts Library
  {
    id: 'bar-chart',
    name: 'Bar Chart',
    description: 'Compare values across categories with horizontal or vertical bars.',
    icon: <BarChartIcon />,
    category: 'echarts',
    tags: ['Basic', 'Comparison', 'ECharts']
  },
  {
    id: 'line-chart', 
    name: 'Line Chart',
    description: 'Show trends and changes over time or continuous data.',
    icon: <LineChartIcon />,
    category: 'echarts',
    tags: ['Basic', 'Trend', 'Time Series', 'ECharts']
  },
  {
    id: 'pie-chart',
    name: 'Pie Chart',
    description: 'Show proportions and percentages of a whole.',
    icon: <PieChartIcon />,
    category: 'echarts',
    tags: ['Basic', 'Proportion', 'ECharts']
  },
  {
    id: 'scatter-plot',
    name: 'Scatter Plot',
    description: 'Explore relationships and correlations between two variables.',
    icon: <ScatterIcon />,
    category: 'echarts',
    tags: ['Correlation', 'Relationship', 'ECharts']
  },
  {
    id: 'area-chart',
    name: 'Area Chart',
    description: 'Show cumulative totals and filled trend areas.',
    icon: <ShowChartIcon />,
    category: 'echarts',
    tags: ['Trend', 'Cumulative', 'ECharts']
  },

  // Advanced Analytics
  {
    id: 'heatmap',
    name: 'Heatmap',
    description: 'Visualize data density and patterns using color intensity.',
    icon: <AnalyticsIcon />,
    category: 'advanced-analytics',
    tags: ['Advanced-Analytics', 'Density', 'Pattern']
  },
  {
    id: 'box-plot',
    name: 'Box Plot',
    description: 'Display statistical distribution with quartiles and outliers.',
    icon: <AnalyticsIcon />,
    category: 'advanced-analytics',
    tags: ['Advanced-Analytics', 'Statistical', 'Distribution']
  },
  {
    id: 'bubble-chart',
    name: 'Bubble Chart',
    description: 'Three-dimensional scatter plot using bubble size as third dimension.',
    icon: <BubbleIcon />,
    category: 'advanced-analytics',
    tags: ['Advanced-Analytics', '3D', 'Relationship']
  },
  {
    id: 'radar-chart',
    name: 'Radar Chart',
    description: 'Compare multiple quantitative variables on multiple axes.',
    icon: <RadarIcon />,
    category: 'advanced-analytics',
    tags: ['Advanced-Analytics', 'Multi-variable', 'Comparison']
  },
  {
    id: 'data-table',
    name: 'Table',
    description: 'Display data in tabular format with sorting and filtering capabilities.',
    icon: <TableIcon />,
    category: 'popular',
    tags: ['Popular', 'Tabular', 'Data']
  }
];

const categories: ChartCategory[] = [
  {
    id: 'all',
    label: 'All charts',
    charts: chartTypes
  },
  {
    id: 'recommended',
    label: 'Recommended tags',
    charts: chartTypes.filter(chart => chart.featured)
  },
  {
    id: 'popular',
    label: 'Popular',
    charts: chartTypes.filter(chart => chart.category === 'popular')
  },
  {
    id: 'echarts',
    label: 'ECharts',
    charts: chartTypes.filter(chart => chart.category === 'echarts')
  },
  {
    id: 'advanced-analytics',
    label: 'Advanced-Analytics',
    charts: chartTypes.filter(chart => chart.category === 'advanced-analytics')
  }
];

// =============================================================================
// Component Props
// =============================================================================

interface AdvancedChartSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (chartType: ChartType) => void;
  selectedChartId?: string;
}

// =============================================================================
// Chart Type Card Component
// =============================================================================

const ChartTypeCard: React.FC<{
  chart: ChartType;
  selected: boolean;
  onClick: () => void;
}> = ({ chart, selected, onClick }) => (
  <Card
    sx={{
      cursor: 'pointer',
      border: selected ? 2 : 1,
      borderColor: selected ? 'primary.main' : 'divider',
      '&:hover': {
        borderColor: 'primary.main',
        elevation: 2
      },
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}
    onClick={onClick}
  >
    <CardContent sx={{ flexGrow: 1, p: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 60, 
          height: 60,
          borderRadius: 1,
          backgroundColor: selected ? 'primary.light' : 'grey.100',
          color: selected ? 'primary.contrastText' : 'text.secondary',
          mb: 2
        }}>
          {chart.icon}
          {chart.exampleValue && (
            <Typography variant="caption" sx={{ position: 'absolute', fontSize: 8, fontWeight: 600 }}>
              {chart.exampleValue}
            </Typography>
          )}
        </Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {chart.name}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

// =============================================================================
// Main Component
// =============================================================================

const AdvancedChartSelector: React.FC<AdvancedChartSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedChartId
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChart, setSelectedChart] = useState<ChartType | null>(
    chartTypes.find(chart => chart.id === selectedChartId) || null
  );
  const [expandedCategory, setExpandedCategory] = useState<string>('recommended');

  const currentCategory = categories[selectedTab];
  const filteredCharts = currentCategory.charts.filter(chart =>
    chart.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chart.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleChartSelect = (chart: ChartType) => {
    setSelectedChart(chart);
  };

  const handleConfirmSelection = () => {
    if (selectedChart) {
      onSelect(selectedChart);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6">Select a visualization type</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', height: '70vh' }}>
        {/* Left Sidebar */}
        <Box sx={{ 
          width: 300, 
          borderRight: 1, 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Category Navigation */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              All charts
            </Typography>
            <List dense>
              {categories.map((category, index) => (
                <ListItem
                  key={category.id}
                  button
                  selected={selectedTab === index}
                  onClick={() => {
                    setSelectedTab(index);
                    setExpandedCategory(category.id);
                  }}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText 
                    primary={category.label}
                    secondary={`${category.charts.length} charts`}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Divider />

          {/* Chart Details Panel */}
          {selectedChart && (
            <Box sx={{ p: 3, flexGrow: 1 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedChart.name}
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 3 }}>
                {selectedChart.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedChart.description}
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Examples
              </Typography>
              <Box sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'grey.50'
              }}>
                <Typography variant="caption" color="text.secondary">
                  Chart preview would appear here
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Main Content Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Search Bar */}
          <Box sx={{ p: 3, pb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search all charts"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>

          {/* Chart Grid */}
          <Box sx={{ flexGrow: 1, p: 3, pt: 1, overflowY: 'auto' }}>
            <Grid container spacing={2}>
              {filteredCharts.map((chart) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={chart.id}>
                  <ChartTypeCard
                    chart={chart}
                    selected={selectedChart?.id === chart.id}
                    onClick={() => handleChartSelect(chart)}
                  />
                </Grid>
              ))}
            </Grid>

            {filteredCharts.length === 0 && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: 200 
              }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No charts found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your search terms or selecting a different category
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: 1, 
        borderColor: 'divider',
        p: 3,
        justifyContent: 'space-between'
      }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleConfirmSelection}
          variant="contained"
          disabled={!selectedChart}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdvancedChartSelector;