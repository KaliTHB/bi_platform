// web-application/src/components/builder/ChartList.tsx
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Card,
  CardContent,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  FileCopy,
  MoreVert,
  BarChart,
  Timeline,
  PieChart,
  DonutLarge,
  ShowChart,
  BubbleChart,
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useCharts } from '@/hooks/useCharts';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';
import { List, FilterOption, SortOption, TableColumn, ListAction } from '@/components/shared/List';

// Utils
import { 
  renderChartIcon, 
  renderListChartIcon, 
  renderCardChartIcon,
  getChartTypeDisplayName, 
  getChartLibraryDisplayName,
  getAvailableChartLibraries,
  getSupportedChartTypes 
} from '@/utils/chartIconUtils';

// Types
interface Chart {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  chart_type: string;
  chart_library: string;
  chart_category?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  workspace_id: string;
  dashboard_id?: string;
  version?: number;
  configuration?: Record<string, any>;
}

interface ChartListProps {
  charts?: Chart[];
  loading?: boolean;
  error?: string;
  dashboardId?: string;
  onChartSelect?: (chart: Chart) => void;
  onChartCreate?: (chartData: any) => Promise<void>;
  onChartEdit?: (chart: Chart) => void;
  onChartDelete?: (chartId: string) => Promise<void>;
  onChartDuplicate?: (chartId: string) => Promise<void>;
  viewMode?: 'grid' | 'list' | 'table';
  selectionMode?: boolean;
  selectedCharts?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  showCreateButton?: boolean;
  showFilters?: boolean;
  itemsPerPage?: number;
}

export const ChartList: React.FC<ChartListProps> = ({
  charts = [],
  loading = false,
  error,
  dashboardId,
  onChartSelect,
  onChartCreate,
  onChartEdit,
  onChartDelete,
  onChartDuplicate,
  viewMode = 'grid',
  selectionMode = false,
  selectedCharts = [],
  onSelectionChange,
  showCreateButton = true,
  showFilters = true,
  itemsPerPage = 12,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [chartName, setChartName] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [chartType, setChartType] = useState('');
  const [chartLibrary, setChartLibrary] = useState('echarts');
  const [chartCategory, setChartCategory] = useState('basic');

  // Helper functions
  const getChartDisplayInfo = (chart: Chart) => ({
    name: chart.display_name || chart.name || 'Untitled Chart',
    description: chart.description || 'No description available',    
    type: chart.chart_type || 'Unknown',
    library:  chart.chart_library || 'Unknown',
    category: chart.chart_category || 'Uncategorized',
    updatedAt: chart.updated_at || chart.created_at || '',
    createdBy: chart.created_by || 'Unknown',
    isActive: chart.is_active ?? true,
    version: chart.version || 1,
    workspaceId: chart.workspace_id || 'default'
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default';
  };

  const getChartTypeIcon = (chartType: string) => {
    switch (chartType.toLowerCase()) {
      case 'bar':
      case 'column': return <BarChart />;
      case 'line': return <Timeline />;
      case 'pie': return <PieChart />;
      case 'donut': return <DonutLarge />;
      case 'area': return <ShowChart />;
      case 'scatter':
      case 'bubble': return <BubbleChart />;
      default: return <BarChart />;
    }
  };

  const getUniqueChartTypes = (charts: Chart[]): string[] => {
    const types = new Set<string>();
    charts.forEach(chart => {
      const type = chart.chart_type;
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  };

  const getUniqueChartLibraries = (charts: Chart[]): string[] => {
    const libraries = new Set<string>();
    charts.forEach(chart => {
      const library = chart.chart_library;
      if (library) libraries.add(library);
    });
    return Array.from(libraries).sort();
  };

  const getUniqueChartCategories = (charts: Chart[]): string[] => {
    const categories = new Set<string>();
    charts.forEach(chart => {
      const category = chart.chart_category;
      if (category) categories.add(category);
    });
    return Array.from(categories).sort();
  };

  // Computed values
  const uniqueChartTypes = useMemo(() => getUniqueChartTypes(charts), [charts]);
  const uniqueChartLibraries = useMemo(() => getUniqueChartLibraries(charts), [charts]);
  const uniqueChartCategories = useMemo(() => getUniqueChartCategories(charts), [charts]);
  const supportedChartTypes = useMemo(() => getSupportedChartTypes(chartLibrary), [chartLibrary]);

  // Event handlers
  const resetCreateForm = () => {
    setChartName('');
    setChartDescription('');
    setChartType('');
    setChartLibrary('echarts');
    setChartCategory('basic');
  };

  const handleCreateChart = async () => {
    if (!chartName.trim() || !chartType) return;

    const chartData = {
      name: chartName,
      description: chartDescription,
      chart_type: chartType,
      chart_library: chartLibrary,
      chart_category: chartCategory,
      dashboard_id: dashboardId,
      workspace_id: currentWorkspace?.id,
    };

    try {
      await onChartCreate?.(chartData);
      setCreateDialogOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error('Failed to create chart:', error);
    }
  };

  // Configuration for the List component
  const filters: FilterOption[] = [
    ...uniqueChartTypes.map(type => ({
      key: 'chart_type',
      label: `Type: ${type}`,
      value: type,
      count: charts.filter(c => c.chart_type === type).length,
    })),
    ...uniqueChartLibraries.map(library => ({
      key: 'chart_library',
      label: `Library: ${library}`,
      value: library,
      count: charts.filter(c => c.chart_library === library).length,
    })),
    ...uniqueChartCategories.map(category => ({
      key: 'chart_category',
      label: `Category: ${category}`,
      value: category,
      count: charts.filter(c => c.chart_category === category).length,
    })),
    {
      key: 'is_active',
      label: 'Active',
      value: 'true',
      count: charts.filter(c => c.is_active !== false).length,
    },
    {
      key: 'is_active',
      label: 'Inactive',
      value: 'false',
      count: charts.filter(c => c.is_active === false).length,
    },
  ];

  const sortOptions: SortOption[] = [
    { key: 'updated_at', label: 'Recently Updated', field: 'updated_at', direction: 'desc' },
    { key: 'created_at', label: 'Recently Created', field: 'created_at', direction: 'desc' },
    { key: 'name', label: 'Name (A-Z)', field: 'name', direction: 'asc' },
    { key: 'chart_type', label: 'Chart Type', field: 'chart_type', direction: 'asc' },
    { key: 'chart_library', label: 'Library', field: 'chart_library', direction: 'asc' },
    { key: 'chart_category', label: 'Category', field: 'chart_category', direction: 'asc' },
  ];

  const tableColumns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (chart: Chart) => {
        const displayInfo = getChartDisplayInfo(chart);
        return (
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              {getChartTypeIcon(chart.chart_type)}
            </Avatar>
            <Box>
              <Typography variant="subtitle2">
                {displayInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {displayInfo.description}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      key: 'chart_type',
      label: 'Type',
      align: 'center',
      render: (chart: Chart) => (
        <Chip
          icon={getChartTypeIcon(chart.chart_type)}
          label={chart.chart_type}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    {
      key: 'chart_library',
      label: 'Library',
      align: 'center',
      render: (chart: Chart) => (
        <Chip
          label={chart.chart_library}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      key: 'chart_category',
      label: 'Category',
      align: 'center',
      render: (chart: Chart) => (
        <Chip
          label={chart.chart_category || 'Uncategorized'}
          size="small"
          color="secondary"
          variant="outlined"
        />
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      align: 'center',
      render: (chart: Chart) => (
        <Chip
          label={chart.is_active !== false ? 'Active' : 'Inactive'}
          size="small"
          color={getStatusColor(chart.is_active !== false) as any}
        />
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (chart: Chart) => (
        <Box>
          <Typography variant="body2" color="text.secondary">
            {new Date(chart.updated_at || chart.created_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            by {chart.created_by}
          </Typography>
        </Box>
      ),
    },
  ];

  const itemActions: ListAction[] = [
    {
      key: 'view',
      label: 'View Chart',
      icon: <Visibility />,
      onClick: (chart: Chart) => {
        router.push(`/builder/charts/${chart.id}`);
      },
    },
    {
      key: 'edit',
      label: 'Edit Chart',
      icon: <Edit />,
      onClick: (chart: Chart) => {
        onChartEdit?.(chart) || router.push(`/builder/charts/${chart.id}/edit`);
      },
      show: () => hasPermission('chart.update'),
    },
    {
      key: 'duplicate',
      label: 'Duplicate Chart',
      icon: <FileCopy />,
      onClick: (chart: Chart) => {
        onChartDuplicate?.(chart.id);
      },
      show: () => hasPermission('chart.create'),
    },
    {
      key: 'delete',
      label: 'Delete Chart',
      icon: <Delete />,
      color: 'error',
      onClick: (chart: Chart) => {
        if (confirm(`Are you sure you want to delete "${getChartDisplayInfo(chart).name}"?`)) {
          onChartDelete?.(chart.id);
        }
      },
      show: () => hasPermission('chart.delete'),
    },
  ];

  const bulkActions: ListAction[] = [
    {
      key: 'delete_bulk',
      label: 'Delete Selected',
      icon: <Delete />,
      color: 'error',
      onClick: (chartIds: string[]) => {
        if (confirm(`Are you sure you want to delete ${chartIds.length} charts?`)) {
          chartIds.forEach(id => onChartDelete?.(id));
        }
      },
    },
  ];

  // Render functions for different view modes
  const renderGridItem = (chart: Chart, isSelected?: boolean) => {
    const displayInfo = getChartDisplayInfo(chart);
    
    return (
      <Card
        sx={{
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            boxShadow: 2,
            borderColor: 'primary.light',
          },
        }}
        onClick={() => onChartSelect?.(chart)}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              {getChartTypeIcon(chart.chart_type)}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h6" noWrap>
                {displayInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {displayInfo.type} • {displayInfo.library}
              </Typography>
            </Box>
            <IconButton size="small">
              <MoreVert />
            </IconButton>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.5em',
              mb: 2,
            }}
          >
            {displayInfo.description}
          </Typography>

          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            <Chip
              label={displayInfo.type}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={displayInfo.category}
              size="small"
              color="secondary"
              variant="outlined"
            />
            {chart.is_active === false && (
              <Chip
                label="Inactive"
                size="small"
                color="default"
              />
            )}
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Updated {new Date(displayInfo.updatedAt).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{displayInfo.version}
            </Typography>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            by {displayInfo.createdBy}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  const renderListItem = (chart: Chart, isSelected?: boolean) => {
    const displayInfo = getChartDisplayInfo(chart);
    
    return (
      <ListItem
        key={chart.id}
        button
        selected={isSelected}
        onClick={() => onChartSelect?.(chart)}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 1,
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {getChartTypeIcon(chart.chart_type)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle2">
                {displayInfo.name}
              </Typography>
              {chart.is_active === false && (
                <Chip
                  label="Inactive"
                  size="small"
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {displayInfo.description}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Chip
                  label={displayInfo.type}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={displayInfo.library}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={displayInfo.category}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  Updated {new Date(displayInfo.updatedAt).toLocaleDateString()} • by {displayInfo.createdBy}
                </Typography>
              </Box>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton edge="end">
            <MoreVert />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  return (
    <Box>
      <List<Chart>
        items={charts}
        loading={loading}
        error={error}
        title="Charts"
        emptyMessage="No charts found. Create your first chart to get started."
        viewMode={viewMode}
        supportedViewModes={['grid', 'list', 'table']}
        selectionMode={selectionMode}
        selectedItems={selectedCharts}
        onSelectionChange={onSelectionChange}
        getItemId={(chart) => chart.id}
        searchPlaceholder="Search charts..."
        searchFields={['name', 'display_name', 'description', 'chart_type', 'chart_category']}
        filters={showFilters ? filters : []}
        sortOptions={sortOptions}
        tableColumns={tableColumns}
        itemActions={itemActions}
        bulkActions={selectionMode ? bulkActions : []}
        primaryAction={
          showCreateButton
            ? {
                label: 'Create Chart',
                icon: <Add />,
                onClick: () => setCreateDialogOpen(true),
                show: hasPermission('chart.create'),
              }
            : undefined
        }
        renderGridItem={renderGridItem}
        renderListItem={renderListItem}
        onItemClick={onChartSelect}
        pagination={true}
        rowsPerPage={itemsPerPage}
      />

      {/* Create Chart Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => {
          setCreateDialogOpen(false);
          resetCreateForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Chart</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chart Name"
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={chartDescription}
                onChange={(e) => setChartDescription(e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Chart Library</InputLabel>
                <Select
                  value={chartLibrary}
                  label="Chart Library"
                  onChange={(e) => {
                    setChartLibrary(e.target.value);
                    setChartType(''); // Reset chart type when library changes
                  }}
                >
                  {getAvailableChartLibraries().map((library) => (
                    <MenuItem key={library} value={library}>
                      {library.charAt(0).toUpperCase() + library.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Chart Type</InputLabel>
                <Select
                  value={chartType}
                  label="Chart Type"
                  onChange={(e) => setChartType(e.target.value)}
                  disabled={!chartLibrary}
                >
                  {supportedChartTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setCreateDialogOpen(false);
              resetCreateForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateChart}
            variant="contained"
            disabled={!chartName.trim() || !chartType}
          >
            Create Chart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChartList;