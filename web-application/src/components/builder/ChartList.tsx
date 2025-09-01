'use client';

import React, { useState, useEffect } from 'react';
import { formatDate } from '@/utils/dateUtils';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Paper,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  BarChart,
  PieChart,
  ShowChart,
  Timeline,
  BubbleChart,
  DonutLarge,
  ScatterPlot,
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Refresh,
  FileCopy,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Chart } from '@/types/chart.types';
import { useWorkspace } from '@/components/providers/WorkspaceProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { useCharts } from '@/hooks/useCharts';
import PermissionGate from '@/components/shared/PermissionGate';

interface ChartListProps {
  dashboardId?: string;
  onChartSelect?: (chart: Chart) => void;
  viewMode?: 'grid' | 'list';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedCharts?: string[];
  onSelectionChange?: (chartIds: string[]) => void;
  filterByType?: string;
}

export const ChartList: React.FC<ChartListProps> = ({
  dashboardId,
  onChartSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedCharts = [],
  onSelectionChange,
  filterByType,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { 
    charts, 
    loading, 
    createChart, 
    updateChart,
    deleteChart, 
    duplicateChart 
  } = useCharts(dashboardId);

  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(filterByType || 'all');
  const [libraryFilter, setLibraryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');

  // Form states
  const [chartName, setChartName] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [chartType, setChartType] = useState('');
  const [chartLibrary, setChartLibrary] = useState('echarts');

  const filteredCharts = charts
    .filter(chart => {
      if (typeFilter !== 'all' && chart.chart_type !== typeFilter) return false;
      if (libraryFilter !== 'all' && chart.chart_library !== libraryFilter) return false;
      if (searchQuery && !chart.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !chart.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'updated_at': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'type': return a.chart_type.localeCompare(b.chart_type);
        default: return 0;
      }
    });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, chart: Chart) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedChart(chart);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedChart(null);
  };

  const handleEdit = () => {
    if (selectedChart) {
      router.push(`/workspace/${currentWorkspace?.slug}/chart/${selectedChart.id}/edit`);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedChart) {
      if (onChartSelect) {
        onChartSelect(selectedChart);
      } else {
        router.push(`/workspace/${currentWorkspace?.slug}/chart/${selectedChart.id}`);
      }
    }
    handleMenuClose();
  };

  const handleDuplicate = async () => {
    if (selectedChart) {
      await duplicateChart(selectedChart.id);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedChart) {
      await deleteChart(selectedChart.id);
      setDeleteDialogOpen(false);
    }
    handleMenuClose();
  };

  const handleCreateChart = async () => {
    if (chartName.trim() && chartType && dashboardId) {
      await createChart({
        dashboard_id: dashboardId,
        name: chartName,
        description: chartDescription,
        chart_type: chartType,
        chart_library: chartLibrary,
      });
      resetForm();
      setCreateDialogOpen(false);
    }
  };

  const resetForm = () => {
    setChartName('');
    setChartDescription('');
    setChartType('');
    setChartLibrary('echarts');
  };

  const handleChartClick = (chart: Chart) => {
    if (selectionMode) {
      const newSelection = selectedCharts.includes(chart.id)
        ? selectedCharts.filter(id => id !== chart.id)
        : [...selectedCharts, chart.id];
      onSelectionChange?.(newSelection);
    } else {
      onChartSelect?.(chart);
    }
  };

  const getChartIcon = (type: string, library: string) => {
    const key = `${library}-${type}`;
    switch (key) {
      case 'echarts-bar': return <BarChart />;
      case 'echarts-pie': return <PieChart />;
      case 'echarts-line': return <ShowChart />;
      case 'echarts-scatter': return <BubbleChart />;
      case 'echarts-area': return <Timeline />;
      case 'd3js-network': return <ScatterPlot />;
      case 'drilldown-pie': return <DonutLarge />;
      default: return <BarChart />;
    }
  };

  const getLibraryColor = (library: string) => {
    switch (library) {
      case 'echarts': return 'primary';
      case 'd3js': return 'secondary';
      case 'plotly': return 'info';
      case 'chartjs': return 'success';
      case 'drilldown': return 'warning';
      default: return 'default';
    }
  };

  const ChartCard = ({ chart }: { chart: Chart }) => {
    const isSelected = selectionMode && selectedCharts.includes(chart.id);
    
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            boxShadow: 3,
          },
        }}
        onClick={() => handleChartClick(chart)}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1} flex={1}>
              {getChartIcon(chart.chart_type, chart.chart_library)}
              <Typography variant="h6" component="h3" noWrap>
                {chart.display_name || chart.name}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => handleMenuClick(e, chart)}
            >
              <MoreVert />
            </IconButton>
          </Box>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: 32,
            }}
          >
            {chart.description || 'No description available'}
          </Typography>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Chip 
              label={chart.chart_library} 
              size="small" 
              color={getLibraryColor(chart.chart_library) as any}
            />
            <Chip 
              label={chart.chart_type} 
              size="small" 
              variant="outlined"
            />
          </Box>

          <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
            <Typography variant="caption" color="text.secondary">
  Last updated: {formatDate(chart.updated_at)}
</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const ChartListItem = ({ chart }: { chart: Chart }) => {
    const isSelected = selectionMode && selectedCharts.includes(chart.id);
    
    return (
      <ListItem
        button
        selected={isSelected}
        onClick={() => handleChartClick(chart)}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 1,
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: getLibraryColor(chart.chart_library) + '.main' }}>
            {getChartIcon(chart.chart_type, chart.chart_library)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={chart.display_name || chart.name}
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {chart.description || 'No description'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={chart.chart_library} 
                  size="small" 
                  color={getLibraryColor(chart.chart_library) as any}
                />
                <Chip 
                  label={chart.chart_type} 
                  size="small" 
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                 Updated {new Date(chart.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            onClick={(e) => handleMenuClick(e, chart)}
          >
            <MoreVert />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading charts...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Charts {dashboardId && 'in Dashboard'}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={() => setCurrentViewMode(currentViewMode === 'grid' ? 'list' : 'grid')}
          >
            {currentViewMode === 'grid' ? <ViewList /> : <ViewModule />}
          </IconButton>
          
          {showCreateButton && dashboardId && (
            <PermissionGate permissions={['chart.create']}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Chart
              </Button>
            </PermissionGate>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search charts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Library</InputLabel>
              <Select
                value={libraryFilter}
                label="Library"
                onChange={(e) => setLibraryFilter(e.target.value)}
              >
                <MenuItem value="all">All Libraries</MenuItem>
                <MenuItem value="echarts">ECharts</MenuItem>
                <MenuItem value="d3js">D3.js</MenuItem>
                <MenuItem value="plotly">Plotly</MenuItem>
                <MenuItem value="chartjs">Chart.js</MenuItem>
                <MenuItem value="drilldown">Drilldown</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="bar">Bar</MenuItem>
                <MenuItem value="pie">Pie</MenuItem>
                <MenuItem value="line">Line</MenuItem>
                <MenuItem value="scatter">Scatter</MenuItem>
                <MenuItem value="area">Area</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="updated_at">Recently Updated</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="render_count">Render Count</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredCharts.length} chart(s)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Chart List */}
      {filteredCharts.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <BarChart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No charts found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchQuery || typeFilter !== 'all' || libraryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : dashboardId 
                  ? 'Get started by creating your first chart'
                  : 'Select a dashboard to view its charts'
              }
            </Typography>
            {showCreateButton && dashboardId && !searchQuery && typeFilter === 'all' && libraryFilter === 'all' && (
              <PermissionGate permissions={['chart.create']}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Chart
                </Button>
              </PermissionGate>
            )}
          </CardContent>
        </Card>
      ) : currentViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredCharts.map((chart) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={chart.id}>
              <ChartCard chart={chart} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <List>
          {filteredCharts.map((chart) => (
            <ChartListItem key={chart.id} chart={chart} />
          ))}
        </List>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          {onChartSelect ? 'Select' : 'View'}
        </MenuItem>
        <PermissionGate permissions={['chart.update']}>
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        </PermissionGate>
        <PermissionGate permissions={['chart.create']}>
          <MenuItem onClick={handleDuplicate}>
            <FileCopy fontSize="small" sx={{ mr: 1 }} />
            Duplicate
          </MenuItem>
        </PermissionGate>
        <PermissionGate permissions={['chart.delete']}>
          <MenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ color: 'error.main' }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </PermissionGate>
      </Menu>

      {/* Create Chart Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Chart</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Chart Name"
            fullWidth
            variant="outlined"
            value={chartName}
            onChange={(e) => setChartName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={chartDescription}
            onChange={(e) => setChartDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Chart Library</InputLabel>
            <Select
              value={chartLibrary}
              label="Chart Library"
              onChange={(e) => setChartLibrary(e.target.value)}
            >
              <MenuItem value="echarts">ECharts</MenuItem>
              <MenuItem value="d3js">D3.js</MenuItem>
              <MenuItem value="plotly">Plotly</MenuItem>
              <MenuItem value="chartjs">Chart.js</MenuItem>
              <MenuItem value="drilldown">Drilldown</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Chart Type</InputLabel>
            <Select
              value={chartType}
              label="Chart Type"
              onChange={(e) => setChartType(e.target.value)}
            >
              <MenuItem value="bar">Bar Chart</MenuItem>
              <MenuItem value="pie">Pie Chart</MenuItem>
              <MenuItem value="line">Line Chart</MenuItem>
              <MenuItem value="scatter">Scatter Plot</MenuItem>
              <MenuItem value="area">Area Chart</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateChart} 
            variant="contained"
            disabled={!chartName.trim() || !chartType || !dashboardId}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Chart</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedChart?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChartList;