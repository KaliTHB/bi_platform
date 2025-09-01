// File: web-application/src/components/builder/ChartSelector.tsx
'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  Chip,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  PieChart as PieChartIcon,
  ScatterPlot as ScatterPlotIcon,
  Timeline as TimelineIcon,
  DonutLarge as DonutIcon,
  BubbleChart as BubbleChartIcon,
  Map as MapIcon,
  TableChart as TableIcon,
  Speed as MetricIcon
} from '@mui/icons-material';

interface ChartSelectorProps {
  onSelectChart: (chartType: string, library?: string) => void;
  selectedChart?: string;
}

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'basic' | 'advanced' | 'statistical' | 'specialized';
  library: string;
  popular?: boolean;
  dataRequirements: string[];
}

const chartTypes: ChartType[] = [
  // Basic Charts
  {
    id: 'bar',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: <BarChartIcon />,
    category: 'basic',
    library: 'echarts',
    popular: true,
    dataRequirements: ['1 categorical field', '1+ numeric fields']
  },
  {
    id: 'line',
    name: 'Line Chart',
    description: 'Show trends over time or continuous data',
    icon: <LineChartIcon />,
    category: 'basic',
    library: 'echarts',
    popular: true,
    dataRequirements: ['1 continuous field', '1+ numeric fields']
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Show parts of a whole',
    icon: <PieChartIcon />,
    category: 'basic',
    library: 'echarts',
    popular: true,
    dataRequirements: ['1 categorical field', '1 numeric field']
  },
  {
    id: 'area',
    name: 'Area Chart',
    description: 'Line chart with filled areas',
    icon: <TimelineIcon />,
    category: 'basic',
    library: 'echarts',
    dataRequirements: ['1 continuous field', '1+ numeric fields']
  },
  
  // Advanced Charts
  {
    id: 'scatter',
    name: 'Scatter Plot',
    description: 'Explore relationships between variables',
    icon: <ScatterPlotIcon />,
    category: 'advanced',
    library: 'plotly',
    dataRequirements: ['2+ numeric fields']
  },
  {
    id: 'bubble',
    name: 'Bubble Chart',
    description: 'Multi-dimensional scatter plot',
    icon: <BubbleChartIcon />,
    category: 'advanced',
    library: 'plotly',
    dataRequirements: ['3+ numeric fields']
  },
  {
    id: 'donut',
    name: 'Donut Chart',
    description: 'Pie chart with hollow center',
    icon: <DonutIcon />,
    category: 'advanced',
    library: 'chartjs',
    dataRequirements: ['1 categorical field', '1 numeric field']
  },
  {
    id: 'heatmap',
    name: 'Heatmap',
    description: 'Show data density or correlation',
    icon: <MapIcon />,
    category: 'advanced',
    library: 'd3js',
    dataRequirements: ['2 categorical fields', '1 numeric field']
  },

  // Statistical Charts
  {
    id: 'box',
    name: 'Box Plot',
    description: 'Show distribution and outliers',
    icon: <BarChartIcon />,
    category: 'statistical',
    library: 'plotly',
    dataRequirements: ['1 categorical field', '1 numeric field']
  },
  {
    id: 'violin',
    name: 'Violin Plot',
    description: 'Detailed distribution visualization',
    icon: <BarChartIcon />,
    category: 'statistical',
    library: 'plotly',
    dataRequirements: ['1 categorical field', '1 numeric field']
  },

  // Specialized Charts
  {
    id: 'table',
    name: 'Data Table',
    description: 'Tabular data display with sorting and filtering',
    icon: <TableIcon />,
    category: 'specialized',
    library: 'table',
    dataRequirements: ['Any data structure']
  },
  {
    id: 'metric',
    name: 'Metric Card',
    description: 'Display KPIs and key metrics',
    icon: <MetricIcon />,
    category: 'specialized',
    library: 'metric',
    dataRequirements: ['1 numeric field']
  }
];

const categories = [
  { id: 'all', label: 'All Charts', count: chartTypes.length },
  { id: 'basic', label: 'Basic', count: chartTypes.filter(c => c.category === 'basic').length },
  { id: 'advanced', label: 'Advanced', count: chartTypes.filter(c => c.category === 'advanced').length },
  { id: 'statistical', label: 'Statistical', count: chartTypes.filter(c => c.category === 'statistical').length },
  { id: 'specialized', label: 'Specialized', count: chartTypes.filter(c => c.category === 'specialized').length }
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

export const ChartSelector: React.FC<ChartSelectorProps> = ({
  onSelectChart,
  selectedChart
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);

  // Filter charts based on search and category
  const filteredCharts = React.useMemo(() => {
    let charts = chartTypes;

    // Filter by category
    const categoryId = categories[activeCategory].id;
    if (categoryId !== 'all') {
      charts = charts.filter(chart => chart.category === categoryId);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      charts = charts.filter(chart =>
        chart.name.toLowerCase().includes(searchLower) ||
        chart.description.toLowerCase().includes(searchLower)
      );
    }

    return charts;
  }, [searchTerm, activeCategory]);

  // Popular charts for quick access
  const popularCharts = chartTypes.filter(chart => chart.popular);

  const handleChartSelect = (chartType: ChartType) => {
    onSelectChart(chartType.id, chartType.library);
  };

  const getLibraryColor = (library: string) => {
    switch (library) {
      case 'echarts': return 'primary';
      case 'plotly': return 'secondary';
      case 'chartjs': return 'success';
      case 'd3js': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Select Chart Type
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Choose the best visualization for your data
        </Typography>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search chart types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ mt: 2 }}
        />
      </Box>

      {/* Popular Charts */}
      {!searchTerm && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Popular Charts
          </Typography>
          <Grid container spacing={1}>
            {popularCharts.map((chart) => (
              <Grid item xs={4} key={chart.id}>
                <Card
                  variant={selectedChart === chart.id ? 'elevation' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    border: selectedChart === chart.id ? '2px solid' : undefined,
                    borderColor: selectedChart === chart.id ? 'primary.main' : undefined,
                    minHeight: 80,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <CardActionArea
                    onClick={() => handleChartSelect(chart)}
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1
                    }}
                  >
                    <Box sx={{ color: 'primary.main', mb: 0.5 }}>
                      {chart.icon}
                    </Box>
                    <Typography variant="caption" textAlign="center">
                      {chart.name}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Category Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeCategory}
          onChange={(e, newValue) => setActiveCategory(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {categories.map((category, index) => (
            <Tab
              key={category.id}
              label={
                <Badge badgeContent={category.count} color="primary" max={99}>
                  <span>{category.label}</span>
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Chart Grid */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {filteredCharts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No charts found matching your criteria
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {filteredCharts.map((chart) => (
              <Grid item xs={12} key={chart.id}>
                <Card
                  variant={selectedChart === chart.id ? 'elevation' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    border: selectedChart === chart.id ? '2px solid' : undefined,
                    borderColor: selectedChart === chart.id ? 'primary.main' : undefined,
                    '&:hover': {
                      elevation: 2,
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <CardActionArea onClick={() => handleChartSelect(chart)}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        {/* Icon */}
                        <Box sx={{ 
                          color: selectedChart === chart.id ? 'primary.main' : 'text.secondary',
                          mt: 0.5
                        }}>
                          {chart.icon}
                        </Box>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {chart.name}
                            </Typography>
                            <Chip
                              label={chart.library}
                              size="small"
                              color={getLibraryColor(chart.library) as any}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                            {chart.popular && (
                              <Chip
                                label="Popular"
                                size="small"
                                color="success"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            {chart.description}
                          </Typography>

                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {chart.dataRequirements.map((req, index) => (
                              <Chip
                                key={index}
                                label={req}
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Footer */}
      {selectedChart && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Typography variant="body2" color="primary" gutterBottom>
            Chart Type Selected
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Configure your dataset and chart settings to proceed.
          </Typography>
        </Box>
      )}
    </Box>
  );
};