'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  BarChart,
  PieChart,
  ShowChart,
  BubbleChart,
  Timeline,
  DonutLarge,
ScatterPlot,  Map,
  AccountTree
} from '@mui/icons-material';
import { EnhancedChartPluginService } from '../../plugins/charts/factory/ChartFactory';

interface ChartSelectorProps {
  pluginService: EnhancedChartPluginService;
  onSelectChart: (chartType: string, library?: string) => void;
  selectedChart?: string;
  selectedLibrary?: string;
}

// Chart type to icon mapping
const getChartIcon = (chartType: string, library: string) => {
  const key = `${library}-${chartType}`;
  const iconProps = { fontSize: 'large' as const };
  
  switch (key) {
    case 'echarts-bar':
    case 'chartjs-bar':
    case 'drilldown-bar':
      return <BarChart {...iconProps} />;
    case 'echarts-pie':
    case 'chartjs-pie':
    case 'drilldown-pie':
      return <PieChart {...iconProps} />;
    case 'echarts-line':
    case 'chartjs-line':
      return <ShowChart {...iconProps} />;
    case 'echarts-scatter':
    case 'chartjs-scatter':
    case 'plotly-scatter':
      return <BubbleChart {...iconProps} />;
    case 'echarts-area':
    case 'chartjs-area':
      return <Timeline {...iconProps} />;
    case 'chartjs-donut':
      return <DonutLarge {...iconProps} />;
    case 'd3js-force':
    case 'd3js-network':
      return <ScatterPlot {...iconProps} />;
    case 'd3js-map':
    case 'plotly-map':
      return <Map {...iconProps} />;
    case 'echarts-sankey':
    case 'echarts-treemap':
      return <AccountTree {...iconProps} />;
    default:
      return <BarChart {...iconProps} />;
  }
};

// Library color mapping
const getLibraryColor = (library: string): 'primary' | 'secondary' | 'default' | 'info' | 'success' | 'warning' | 'error' => {
  switch (library.toLowerCase()) {
    case 'echarts': return 'primary';
    case 'd3js': return 'secondary';
    case 'plotly': return 'info';
    case 'chartjs': return 'success';
    case 'drilldown': return 'warning';
    default: return 'default';
  }
};

export const ChartSelector: React.FC<ChartSelectorProps> = ({
  pluginService,
  onSelectChart,
  selectedChart,
  selectedLibrary
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLib, setSelectedLib] = useState('all');
  const [expandedLibrary, setExpandedLibrary] = useState<string>('echarts');

  // Get all charts and organize by library
  const allCharts = useMemo(() => {
    if (!pluginService) return [];
    return pluginService.getAllCharts();
  }, [pluginService]);

  const categories = useMemo(() => {
    return pluginService?.getChartCategories() || [];
  }, [pluginService]);

  const libraries = useMemo(() => {
    return pluginService?.getChartLibraries() || [];
  }, [pluginService]);

  // Filter charts based on search and filters
  const filteredCharts = useMemo(() => {
    let charts = allCharts;

    // Apply search filter
    if (searchQuery.trim()) {
      charts = pluginService.searchCharts(searchQuery);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      charts = charts.filter(chart => chart.category === selectedCategory);
    }

    // Apply library filter
    if (selectedLib !== 'all') {
      charts = charts.filter(chart => chart.library === selectedLib);
    }

    return charts;
  }, [allCharts, searchQuery, selectedCategory, selectedLib, pluginService]);

  // Group charts by library
  const chartsByLibrary = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredCharts.forEach(chart => {
      const lib = chart.library || 'unknown';
      if (!grouped[lib]) {
        grouped[lib] = [];
      }
      grouped[lib].push(chart);
    });
    return grouped;
  }, [filteredCharts]);

  // Handle chart selection
  const handleChartClick = (chart: any) => {
    const chartType = chart.name || chart.type;
    const library = chart.library;
    
    // Extract chart type without library prefix if present
    const cleanChartType = chartType.includes('-') ? 
      chartType.split('-').slice(1).join('-') : 
      chartType;
    
    onSelectChart(cleanChartType, library);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Get current selection key
  const currentSelectionKey = selectedChart && selectedLibrary ? 
    `${selectedLibrary}-${selectedChart}` : 
    selectedChart;

  return (
    <Box>
      {/* Search Bar */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search charts..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={clearSearch}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexDirection: 'column' }}>
        <FormControl size="small" fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>Library</InputLabel>
          <Select
            value={selectedLib}
            label="Library"
            onChange={(e) => setSelectedLib(e.target.value)}
          >
            <MenuItem value="all">All Libraries</MenuItem>
            {libraries.map(library => (
              <MenuItem key={library} value={library}>
                {library.toUpperCase()}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Results Summary */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="textSecondary">
          {filteredCharts.length} chart{filteredCharts.length !== 1 ? 's' : ''} available
          {searchQuery && ` matching "${searchQuery}"`}
        </Typography>
      </Box>

      {/* Charts by Library */}
      <Box>
        {Object.entries(chartsByLibrary).map(([library, charts]) => (
          <Accordion 
            key={library}
            expanded={expandedLibrary === library}
            onChange={() => setExpandedLibrary(expandedLibrary === library ? '' : library)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {library.toUpperCase()}
                  </Typography>
                  <Chip 
                    label={library} 
                    color={getLibraryColor(library)} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
                <Badge badgeContent={charts.length} color="primary" />
              </Box>
            </AccordionSummary>
            
            <AccordionDetails>
              <Grid container spacing={1}>
                {charts.map((chart, index) => {
                  const isSelected = currentSelectionKey === chart.name || 
                    (selectedChart === (chart.name?.split('-').slice(1).join('-') || chart.name) && 
                     selectedLibrary === chart.library);
                  
                  return (
                    <Grid item xs={12} sm={6} key={`${chart.name}-${index}`}>
                      <Card 
                        variant={isSelected ? "elevation" : "outlined"}
                        elevation={isSelected ? 4 : 0}
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          border: isSelected ? 2 : 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          '&:hover': {
                            elevation: 2,
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        <CardActionArea onClick={() => handleChartClick(chart)}>
                          <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ color: isSelected ? 'primary.main' : 'text.secondary', mb: 1 }}>
                              {getChartIcon(
                                chart.name?.split('-').slice(1).join('-') || chart.name || 'bar', 
                                chart.library || 'echarts'
                              )}
                            </Box>
                            
                            <Typography 
                              variant="body2" 
                              fontWeight={isSelected ? 'bold' : 'normal'}
                              sx={{ 
                                fontSize: '0.75rem',
                                lineHeight: 1.2,
                                color: isSelected ? 'primary.main' : 'text.primary'
                              }}
                            >
                              {chart.displayName || chart.name}
                            </Typography>
                            
                            {chart.category && (
                              <Chip 
                                label={chart.category}
                                size="small"
                                variant="filled"
                                sx={{ 
                                  mt: 0.5, 
                                  height: '16px', 
                                  fontSize: '0.625rem',
                                  bgcolor: isSelected ? 'primary.light' : 'grey.200',
                                  color: isSelected ? 'white' : 'text.secondary'
                                }}
                              />
                            )}
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
              
              {charts.length === 0 && (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="textSecondary">
                    No charts available in {library.toUpperCase()} library
                  </Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* No Results */}
      {filteredCharts.length === 0 && (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Charts Found
          </Typography>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Try adjusting your search criteria or filters
          </Typography>
          {(searchQuery || selectedCategory !== 'all' || selectedLib !== 'all') && (
            <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap">
              {searchQuery && (
                <Chip 
                  label={`Search: "${searchQuery}"`} 
                  onDelete={clearSearch}
                  size="small"
                />
              )}
              {selectedCategory !== 'all' && (
                <Chip 
                  label={`Category: ${selectedCategory}`} 
                  onDelete={() => setSelectedCategory('all')}
                  size="small"
                />
              )}
              {selectedLib !== 'all' && (
                <Chip 
                  label={`Library: ${selectedLib}`} 
                  onDelete={() => setSelectedLib('all')}
                  size="small"
                />
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ChartSelector;