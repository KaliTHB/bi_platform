import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  Avatar,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  Alert,
  Skeleton,
  SelectChangeEvent
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  FileCopy as FileCopyIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  Sort as SortIcon,
  BarChart as DefaultChartIcon,
  Refresh
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useCharts } from '@/hooks/useCharts';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';

// Types
import { 
  Chart,
  ChartType,
  ChartConfiguration,
  CreateChartRequest,
  UpdateChartRequest,
  DuplicateChartRequest
} from '@/types/chart.types';

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

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ChartListProps {
  charts?: Chart[];
  loading?: boolean;
  error?: string;
  dashboardId?: string;
  onChartSelect?: (chart: Chart) => void;
  onChartCreate?: (chartData: CreateChartRequest) => Promise<void>;
  onChartEdit?: (chart: Chart) => void;
  onChartDelete?: (chartId: string) => Promise<void>;
  onChartDuplicate?: (chartId: string) => Promise<void>;
  selectionMode?: boolean;
  selectedCharts?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  showCreateButton?: boolean;
  showFilters?: boolean;
  defaultViewMode?: 'grid' | 'list';
  itemsPerPage?: number;
}

interface CreateChartDialogData {
  name: string;
  display_name: string;
  description: string;
  type: ChartType;
  library: string;
  chart_category: string;
}

type SortOption = 'name' | 'updated_at' | 'created_at' | 'type' | 'library' | 'category';
type ViewMode = 'grid' | 'list';

// =============================================================================
// Utility Functions
// =============================================================================

const getChartDisplayInfo = (chart: Chart) => {
  return {
    name: chart.display_name || chart.name || 'Untitled Chart',
    description: chart.description || 'No description available',
    type: getChartTypeDisplayName(chart),
    library: getChartLibraryDisplayName(chart),
    category: chart.chart_category || 'Uncategorized',
    updatedAt: chart.updated_at || chart.created_at || '',
    createdBy: chart.created_by || 'Unknown',
    isActive: chart.is_active ?? true,
  };
};

// =============================================================================
// Main Component
// =============================================================================

export const ChartList: React.FC<ChartListProps> = ({
  charts: propCharts,
  loading: propLoading,
  error: propError,
  dashboardId,
  onChartSelect,
  onChartCreate,
  onChartEdit,
  onChartDelete,
  onChartDuplicate,
  selectionMode = false,
  selectedCharts = [],
  onSelectionChange,
  showCreateButton = true,
  showFilters = true,
  defaultViewMode = 'grid',
  itemsPerPage = 12,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { 
    charts: hookCharts, 
    loading: hookLoading, 
    error: hookError,
    createChart, 
    updateChart,
    deleteChart,
    duplicateChart,
    refreshCharts
  } = useCharts(dashboardId);

  // Use props if provided, otherwise use hook data
  const charts = propCharts || hookCharts || [];
  const loading = propLoading ?? hookLoading;
  const error = propError || hookError;

  // ============================================================================
  // State Management
  // ============================================================================
  
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [libraryFilter, setLibraryFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated_at');
  const [page, setPage] = useState(0);

  // Dialog state
  const [createFormData, setCreateFormData] = useState<CreateChartDialogData>({
    name: '',
    display_name: '',
    description: '',
    type: 'bar',
    library: 'echarts',
    chart_category: '',
  });

  // ============================================================================
  // Computed Values
  // ============================================================================

  const availableChartTypes = useMemo(() => getSupportedChartTypes(createFormData.library), [createFormData.library]);
  const availableLibraries = useMemo(() => getAvailableChartLibraries(), []);

  const filteredCharts = useMemo(() => {
    let filtered = [...charts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chart => {
        const displayInfo = getChartDisplayInfo(chart);
        return displayInfo.name.toLowerCase().includes(query) ||
               displayInfo.description.toLowerCase().includes(query) ||
               displayInfo.type.toLowerCase().includes(query) ||
               displayInfo.library.toLowerCase().includes(query) ||
               displayInfo.category.toLowerCase().includes(query);
      });
    }

    // Type filter
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(chart => chart.chart_type === typeFilter);
    }

    // Library filter
    if (libraryFilter && libraryFilter !== 'all') {
      filtered = filtered.filter(chart => chart.chart_library === libraryFilter);
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(chart => chart.chart_category === categoryFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return getChartDisplayInfo(a).name.localeCompare(getChartDisplayInfo(b).name);
        case 'created_at':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'updated_at':
          return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
        case 'type':
          return getChartDisplayInfo(a).type.localeCompare(getChartDisplayInfo(b).type);
        case 'library':
          return getChartDisplayInfo(a).library.localeCompare(getChartDisplayInfo(b).library);
        case 'category':
          return getChartDisplayInfo(a).category.localeCompare(getChartDisplayInfo(b).category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [charts, searchQuery, typeFilter, libraryFilter, categoryFilter, sortBy]);

  const paginatedCharts = useMemo(() => {
    const startIndex = page * itemsPerPage;
    return filteredCharts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCharts, page, itemsPerPage]);

  // Get unique values for filters
  const uniqueTypes = useMemo(() => {
    const types = new Set(charts.map(chart => chart.chart_type).filter(Boolean));
    return Array.from(types).sort();
  }, [charts]);

  const uniqueLibraries = useMemo(() => {
    const libraries = new Set(charts.map(chart => chart.chart_library).filter(Boolean));
    return Array.from(libraries).sort();
  }, [charts]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(charts.map(chart => chart.chart_category).filter(Boolean));
    return Array.from(categories).sort();
  }, [charts]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleChartClick = useCallback((chart: Chart) => {
    if (selectionMode) {
      const newSelection = selectedCharts.includes(chart.id)
        ? selectedCharts.filter(id => id !== chart.id)
        : [...selectedCharts, chart.id];
      onSelectionChange?.(newSelection);
    } else if (onChartSelect) {
      onChartSelect(chart);
    } else {
      router.push(`/chart/${chart.id}`);
    }
  }, [selectionMode, selectedCharts, onSelectionChange, onChartSelect, router]);

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, chart: Chart) => {
    event.stopPropagation();
    setSelectedChart(chart);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedChart(null);
  }, []);

  const handleCreateChart = useCallback(async () => {
    if (!currentWorkspace) return;

    const createRequest: CreateChartRequest = {
      ...createFormData,
      workspace_id: currentWorkspace.id,
      dashboard_id: dashboardId,
    };

    try {
      if (onChartCreate) {
        await onChartCreate(createRequest);
      } else {
        await createChart(createRequest);
      }
      setCreateDialogOpen(false);
      setCreateFormData({
        name: '',
        display_name: '',
        description: '',
        type: 'bar',
        library: 'echarts',
        chart_category: '',
      });
    } catch (error) {
      console.error('Failed to create chart:', error);
    }
  }, [createFormData, currentWorkspace, dashboardId, onChartCreate, createChart]);

  const handleDeleteChart = useCallback(async () => {
    if (!selectedChart) return;

    try {
      if (onChartDelete) {
        await onChartDelete(selectedChart.id);
      } else {
        await deleteChart(selectedChart.id);
      }
      setDeleteDialogOpen(false);
      handleMenuClose();
    } catch (error) {
      console.error('Failed to delete chart:', error);
    }
  }, [selectedChart, onChartDelete, deleteChart, handleMenuClose]);

  const handleDuplicateChart = useCallback(async () => {
    if (!selectedChart) return;

    try {
      if (onChartDuplicate) {
        await onChartDuplicate(selectedChart.id);
      } else {
        await duplicateChart(selectedChart.id);
      }
      handleMenuClose();
    } catch (error) {
      console.error('Failed to duplicate chart:', error);
    }
  }, [selectedChart, onChartDuplicate, duplicateChart, handleMenuClose]);

  const handleEditChart = useCallback(() => {
    if (!selectedChart) return;

    if (onChartEdit) {
      onChartEdit(selectedChart);
    } else {
      router.push(`/chart/${selectedChart.id}/edit`);
    }
    handleMenuClose();
  }, [selectedChart, onChartEdit, router, handleMenuClose]);

  // ============================================================================
  // Render Helper Functions
  // ============================================================================

  const renderChartCard = (chart: Chart) => {
    const displayInfo = getChartDisplayInfo(chart);
    const isSelected = selectionMode && selectedCharts.includes(chart.id);

    return (
      <Card
        key={chart.id}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          position: 'relative',
          '&:hover': {
            boxShadow: 4,
          },
          ...(isSelected && {
            border: 2,
            borderColor: 'primary.main',
          }),
        }}
        onClick={() => handleChartClick(chart)}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              {renderCardChartIcon(chart)}
              <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }} noWrap>
                {displayInfo.name}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, chart)}
              sx={{ ml: 1 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {displayInfo.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {displayInfo.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              size="small"
              label={displayInfo.type}
              variant="outlined"
              color="primary"
            />
            <Chip
              size="small"
              label={displayInfo.library}
              variant="outlined"
              color="secondary"
            />
            {displayInfo.category && (
              <Chip
                size="small"
                label={displayInfo.category}
                variant="outlined"
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
            <Typography variant="caption" color="text.secondary">
              Updated {new Date(displayInfo.updatedAt).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              by {displayInfo.createdBy}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderChartListItem = (chart: Chart) => {
    const displayInfo = getChartDisplayInfo(chart);
    const isSelected = selectionMode && selectedCharts.includes(chart.id);

    return (
      <ListItem
        key={chart.id}
        disablePadding
        sx={{
          ...(isSelected && {
            backgroundColor: 'action.selected',
          }),
        }}
      >
        <ListItemButton onClick={() => handleChartClick(chart)}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {renderListChartIcon(chart)}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body1" fontWeight="medium">
                  {displayInfo.name}
                </Typography>
                <Chip size="small" label={displayInfo.type} variant="outlined" color="primary" />
                <Chip size="small" label={displayInfo.library} variant="outlined" color="secondary" />
              </Box>
            }
            secondary={
              <Box>
                {displayInfo.description && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {displayInfo.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  Updated {new Date(displayInfo.updatedAt).toLocaleDateString()} • by {displayInfo.createdBy}
                  {displayInfo.category && ` • ${displayInfo.category}`}
                </Typography>
              </Box>
            }
          />
          <IconButton
            edge="end"
            onClick={(e) => handleMenuOpen(e, chart)}
          >
            <MoreVertIcon />
          </IconButton>
        </ListItemButton>
      </ListItem>
    );
  };

  const renderEmptyState = () => (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <DefaultChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        No charts found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {searchQuery || typeFilter !== 'all' || libraryFilter !== 'all' || categoryFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : dashboardId 
            ? 'This dashboard doesn\'t have any charts yet.'
            : 'Get started by creating your first chart.'}
      </Typography>
      {showCreateButton && (
        <PermissionGate permission="chart.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Chart
          </Button>
        </PermissionGate>
      )}
    </Paper>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Grid container spacing={3}>
          {Array.from({ length: itemsPerPage }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
                  <Skeleton variant="text" sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {dashboardId ? 'Dashboard Charts' : 'Charts'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={() => setViewMode('grid')} 
            color={viewMode === 'grid' ? 'primary' : 'default'}
          >
            <GridViewIcon />
          </IconButton>
          <IconButton 
            onClick={() => setViewMode('list')} 
            color={viewMode === 'list' ? 'primary' : 'default'}
          >
            <ViewListIcon />
          </IconButton>
          <IconButton onClick={refreshCharts}>
            <Refresh />
          </IconButton>
          {showCreateButton && (
            <PermissionGate permission="chart.create">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                New Chart
              </Button>
            </PermissionGate>
          )}
        </Box>
      </Box>

      {/* Filters */}
      {showFilters && (
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
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e: SelectChangeEvent) => setTypeFilter(e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {uniqueTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Library</InputLabel>
                <Select
                  value={libraryFilter}
                  onChange={(e: SelectChangeEvent) => setLibraryFilter(e.target.value)}
                  label="Library"
                >
                  <MenuItem value="all">All Libraries</MenuItem>
                  {uniqueLibraries.map((library) => (
                    <MenuItem key={library} value={library}>
                      {getChartLibraryDisplayName(library)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {uniqueCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e: SelectChangeEvent<SortOption>) => setSortBy(e.target.value as SortOption)}
                  label="Sort By"
                >
                  <MenuItem value="updated_at">Updated</MenuItem>
                  <MenuItem value="created_at">Created</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="type">Type</MenuItem>
                  <MenuItem value="library">Library</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Content */}
      {filteredCharts.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {viewMode === 'grid' && (
            <Grid container spacing={3}>
              {paginatedCharts.map((chart) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={chart.id}>
                  {renderChartCard(chart)}
                </Grid>
              ))}
            </Grid>
          )}

          {viewMode === 'list' && (
            <Paper>
              <List>
                {paginatedCharts.map((chart, index) => (
                  <React.Fragment key={chart.id}>
                    {renderChartListItem(chart)}
                    {index < paginatedCharts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedChart && handleChartClick(selectedChart)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        <PermissionGate permission="chart.update" resourceId={selectedChart?.id}>
          <MenuItem onClick={handleEditChart}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        </PermissionGate>
        <MenuItem onClick={handleDuplicateChart}>
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <Divider />
        <PermissionGate permission="chart.delete" resourceId={selectedChart?.id} resourceType="chart">
          <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </PermissionGate>
      </Menu>

      {/* Create Chart Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Chart</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={createFormData.name}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Display Name"
              value={createFormData.display_name}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, display_name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={createFormData.description}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chart Library</InputLabel>
              <Select
                value={createFormData.library}
                onChange={(e: SelectChangeEvent) => setCreateFormData(prev => ({ 
                  ...prev, 
                  library: e.target.value,
                  type: 'bar' // Reset type when library changes
                }))}
                label="Chart Library"
              >
                {availableLibraries.map((library) => (
                  <MenuItem key={library} value={library}>
                    {getChartLibraryDisplayName(library)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={createFormData.type}
                onChange={(e: SelectChangeEvent<ChartType>) => setCreateFormData(prev => ({ 
                  ...prev, 
                  type: e.target.value as ChartType 
                }))}
                label="Chart Type"
                disabled={!createFormData.library}
              >
                {availableChartTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Category"
              value={createFormData.chart_category}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, chart_category: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateChart} 
            variant="contained"
            disabled={!createFormData.name.trim() || !createFormData.type}
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
            Are you sure you want to delete "{getChartDisplayInfo(selectedChart || {} as Chart).name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteChart} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChartList;