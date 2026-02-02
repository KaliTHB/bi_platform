// web-application/src/components/builder/ChartSelector.tsx
// SAME UI - INTEGRATED WITH CHART FACTORY SYSTEM

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  BarChart as BarIcon,
  Timeline as LineIcon,
  PieChart as PieIcon,
  ScatterPlot as ScatterIcon,
  ShowChart as AreaIcon,
  Radar as RadarIcon,
  BubbleChart as BubbleIcon,
  Analytics as AnalyticsIcon,
  TableChart as TableIcon,
  DonutLarge as DonutIcon,
  Equalizer as WaterfallIcon,
  TrendingUp as TrendIcon,
  PollOutlined as ColumnIcon
} from '@mui/icons-material';

// ✅ INTEGRATE WITH CHART FACTORY
import { ChartFactory, ChartRegistry } from '@/plugins/charts';
import type { ChartPluginInfo } from '@/plugins/charts/factory/ChartFactory';

// =============================================================================
// TYPES (KEEP EXISTING INTERFACES FOR UI COMPATIBILITY)
// =============================================================================

interface ChartType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  tags: string[];
  featured?: boolean;
  library?: string; // ✅ ADD: Track which library the chart comes from
  version?: string; // ✅ ADD: Track version for debugging
  component?: React.ComponentType<any>; // ✅ ADD: Reference to actual component
}

interface ChartCategory {
  id: string;
  label: string;
  charts: ChartType[];
}

interface AdvancedChartSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (chartType: ChartType) => void;
  selectedChartId?: string;
}

// =============================================================================
// CHART ICON MAPPING (ENHANCED FOR FACTORY PLUGINS)
// =============================================================================

const getChartIcon = (chartName: string, library?: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    // Basic charts
    'bar': <BarIcon />,
    'column': <ColumnIcon />,
    'line': <LineIcon />,
    'area': <AreaIcon />,
    'pie': <PieIcon />,
    'doughnut': <DonutIcon />,
    'donut': <DonutIcon />,
    'scatter': <ScatterIcon />,
    'bubble': <BubbleIcon />,
    
    // Advanced charts
    'radar': <RadarIcon />,
    'heatmap': <AnalyticsIcon />,
    'treemap': <AnalyticsIcon />,
    'sunburst': <AnalyticsIcon />,
    'waterfall': <WaterfallIcon />,
    'gauge': <TrendIcon />,
    'funnel': <AnalyticsIcon />,
    'table': <TableIcon />,
    
    // Aliases and variations
    'chart': <BarIcon />,
    'graph': <LineIcon />
  };

  const name = chartName.toLowerCase();
  
  // Try exact match first
  if (iconMap[name]) return iconMap[name];
  
  // Try partial matches
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.includes(key)) return icon;
  }
  
  // Library-specific fallbacks
  switch (library?.toLowerCase()) {
    case 'echarts': return <BarIcon color="primary" />;
    case 'd3': return <AnalyticsIcon color="secondary" />;
    case 'chartjs': return <LineIcon color="success" />;
    default: return <AnalyticsIcon />;
  }
};

// =============================================================================
// CATEGORY MAPPING (ENHANCED FOR FACTORY PLUGINS)
// =============================================================================

const mapCategoryFromFactory = (factoryCategory: string): string => {
  // Map factory categories to UI categories
  const categoryMap: Record<string, string> = {
    'basic': 'popular',
    'statistical': 'advanced-analytics',
    'advanced': 'advanced-analytics',
    'financial': 'advanced-analytics',
    'echarts': 'echarts',
    'd3': 'advanced-analytics',
    'chartjs': 'popular'
  };
  
  return categoryMap[factoryCategory.toLowerCase()] || 'popular';
};

const getCategoryDisplayName = (categoryId: string): string => {
  const displayNames: Record<string, string> = {
    'all': 'All charts',
    'recommended': 'Recommended',
    'popular': 'Popular',
    'echarts': 'ECharts',
    'advanced-analytics': 'Advanced Analytics'
  };
  
  return displayNames[categoryId] || categoryId;
};

// =============================================================================
// CHART TYPE CARD COMPONENT (UNCHANGED UI)
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
          color: selected ? 'primary.contrastText' : 'text.primary',
          mb: 1
        }}>
          {chart.icon}
        </Box>
        <Typography 
          variant="subtitle2" 
          fontWeight={600}
          sx={{ mb: 0.5 }}
        >
          {chart.name}
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ 
            height: '2.4em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {chart.description}
        </Typography>
        {chart.library && (
          <Chip
            label={chart.library}
            size="small"
            variant="outlined"
            sx={{ mt: 1, fontSize: '0.65rem', height: 20 }}
          />
        )}
      </Box>
    </CardContent>
  </Card>
);

// =============================================================================
// MAIN COMPONENT WITH FACTORY INTEGRATION
// =============================================================================

const AdvancedChartSelector: React.FC<AdvancedChartSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedChartId
}) => {
  // ✅ STATE FOR FACTORY INTEGRATION
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [factoryCharts, setFactoryCharts] = useState<ChartType[]>([]);
  
  // ✅ EXISTING UI STATE (UNCHANGED) + DEFAULT SELECTION
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [expandedCategory, setExpandedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChart, setSelectedChart] = useState<ChartType | null>(null);

  // ✅ Set default selection when charts load and no chart is pre-selected
  useEffect(() => {
    if (factoryCharts.length > 0 && !selectedChart && !selectedChartId) {
      const defaultChart = factoryCharts.find(c => c.featured) || factoryCharts[0];
      setSelectedChart(defaultChart);
    }
  }, [factoryCharts, selectedChart, selectedChartId]);

  // ✅ LOAD CHARTS FROM FACTORY (REPLACES STATIC chartTypes)
  useEffect(() => {
    const loadChartsFromFactory = async () => {
      if (!open) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 Loading charts from ChartFactory...');
        
        // Initialize factory and registry
        await ChartFactory.initialize();
        await ChartRegistry.ensureInitialized();
        
        // Get all plugins from factory
        const plugins: ChartPluginInfo[] = await ChartFactory.getAllCharts();
        console.log(`📊 Found ${plugins.length} chart plugins from factory`);
        
        // Transform factory plugins to UI chart types (same structure as before)
        const transformedCharts: ChartType[] = plugins.map((plugin, index) => {
          const chartName = plugin.displayName || plugin.name;
          const description = plugin.description || `${chartName} visualization`;
          
          return {
            id: `${plugin.library}-${plugin.name}`, // Ensure unique ID
            name: chartName,
            description,
            icon: getChartIcon(plugin.name, plugin.library),
            category: mapCategoryFromFactory(plugin.category || 'basic'),
            library: plugin.library,
            version: plugin.version,
            component: plugin.component,
            tags: [
              plugin.library || 'chart',
              plugin.category || 'basic',
              chartName.toLowerCase()
            ].filter(Boolean),
            featured: index < 6 // Mark first 6 as featured for "Recommended"
          };
        });
        
        // ✅ NO FALLBACK CHARTS - Show 0 charts if factory is empty
        setFactoryCharts(transformedCharts);
        
        // Set initial selection if provided or default to first chart
        if (selectedChartId) {
          const chart = transformedCharts.find(c => c.id === selectedChartId);
          if (chart) {
            setSelectedChart(chart);
          }
        } else if (transformedCharts.length > 0) {
          // ✅ DEFAULT SELECTION: Select first chart by default
          const defaultChart = transformedCharts.find(c => c.featured) || transformedCharts[0];
          setSelectedChart(defaultChart);
        }
        
        console.log('✅ Charts loaded successfully from factory');
        
      } catch (err) {
        console.error('❌ Failed to load charts from factory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load charts');
        
        // ✅ NO FALLBACK - Show empty state if factory fails
        setFactoryCharts([]);
        setSelectedChart(null); // ✅ Clear selection when no charts available
      } finally {
        setLoading(false);
      }
    };
    
    loadChartsFromFactory();
  }, [open, selectedChartId]);

  // ✅ GENERATE CATEGORIES FROM FACTORY DATA (REPLACES STATIC categories)
  const categories: ChartCategory[] = useMemo(() => {
    if (factoryCharts.length === 0) return [];
    
    // Group charts by category
    const categoryMap = new Map<string, ChartType[]>();
    
    factoryCharts.forEach(chart => {
      const category = chart.category || 'popular';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(chart);
    });
    
    // Build categories array (same structure as before)
    const cats: ChartCategory[] = [
      {
        id: 'all',
        label: getCategoryDisplayName('all'),
        charts: factoryCharts
      },
      {
        id: 'recommended',
        label: getCategoryDisplayName('recommended'),
        charts: factoryCharts.filter(chart => chart.featured)
      }
    ];
    
    // Add specific categories from the factory data
    for (const [catId, charts] of categoryMap.entries()) {
      if (catId !== 'all' && charts.length > 0) {
        cats.push({
          id: catId,
          label: getCategoryDisplayName(catId),
          charts: charts
        });
      }
    }
    
    return cats;
  }, [factoryCharts]);

  // ✅ EXISTING UI LOGIC (UNCHANGED)
  const filteredCharts = useMemo(() => {
    const currentCategory = categories[selectedTab];
    if (!currentCategory) return [];
    
    let charts = currentCategory.charts;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      charts = charts.filter(chart =>
        chart.name.toLowerCase().includes(term) ||
        chart.description.toLowerCase().includes(term) ||
        chart.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    return charts;
  }, [categories, selectedTab, searchTerm]);

  const handleChartSelect = (chart: ChartType) => {
    setSelectedChart(chart);
  };

  const handleConfirmSelection = () => {
    if (selectedChart) {
      // ✅ PASS FACTORY INTEGRATION DATA TO PARENT
      const chartWithFactoryInfo = {
        ...selectedChart,
        // Include factory-specific information for the parent component
        factoryInfo: {
          library: selectedChart.library || 'echarts',
          component: selectedChart.component,
          version: selectedChart.version
        }
      };
      
      onSelect(chartWithFactoryInfo);
      onClose();
    }
  };

  // ✅ LOADING STATE (ONLY SHOWN WHILE LOADING FROM FACTORY)
  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading chart types from factory...
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  // ✅ ERROR STATE (ONLY SHOWN IF FACTORY FAILS)
  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Error Loading Charts</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant="body2">
            Using fallback charts. Please check the chart factory configuration.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ✅ EXISTING UI LAYOUT (COMPLETELY UNCHANGED)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
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
        {/* Left Sidebar - UNCHANGED UI */}
        <Box sx={{ 
          width: 300, 
          borderRight: 1, 
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Category Navigation - UNCHANGED UI */}
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

          {/* Chart Details Panel - UNCHANGED UI */}
          {selectedChart && (
            <Box sx={{ p: 2, flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {selectedChart.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedChart.description}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selectedChart.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
              {/* ✅ ADD: Show factory info for debugging */}
              {selectedChart.library && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Library: {selectedChart.library}
                    {selectedChart.version && ` v${selectedChart.version}`}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Right Content Area - UNCHANGED UI */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Search Bar - UNCHANGED UI */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              placeholder="Search chart types..."
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

          {/* Chart Grid - UNCHANGED UI */}
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

            {filteredCharts.length === 0 && !loading && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                height: 200 
              }}>
                {factoryCharts.length === 0 ? (
                  <>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      No chart plugins available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Please install and configure chart library plugins to see available chart types
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      No charts found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try adjusting your search terms or selecting a different category
                    </Typography>
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      {/* Dialog Actions - UNCHANGED UI */}
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