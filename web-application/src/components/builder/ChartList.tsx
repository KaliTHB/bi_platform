// src/components/builder/ChartList.tsx
// Updated to use common chart icon utilities and handle optional Chart properties

import React, { useState, useEffect, useMemo } from 'react';
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
  Skeleton
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
  BarChart as DefaultChartIcon
} from '@mui/icons-material';
import { useAppSelector } from '@/hooks/redux';
import { Chart } from '@/types/chart.types';
import { 
  renderChartIcon, 
  renderListChartIcon, 
  renderCardChartIcon,
  getChartTypeDisplayName, 
  getChartLibraryDisplayName,
  getAvailableChartLibraries,
  getSupportedChartTypes 
} from '@/utils/chartIconUtils';
import { PermissionGate } from '@/components/shared/PermissionGate';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ChartListProps {
  charts: Chart[];
  loading?: boolean;
  error?: string;
  dashboardId?: string;
  onChartSelect?: (chart: Chart) => void;
  onChartCreate?: (chartData: any) => Promise<void>;
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
    version: chart.version || 1,
    workspaceId: chart.workspace_id || 'default'
  };
};

const getUniqueChartTypes = (charts: Chart[]): string[] => {
  const types = new Set<string>();
  charts.forEach(chart => {
    const type = chart.chart_type || chart.type;
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

// =============================================================================
// Main Component
// =============================================================================

const ChartList: React.FC<ChartListProps> = ({
  charts = [],
  loading = false,
  error,
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
  itemsPerPage = 12
}) => {
  const router = useRouter();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);

  // =============================================================================
  // State Management
  // =============================================================================

  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated_at');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [libraryFilter, setLibraryFilter] = useState<string>('all');
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Create chart form state
  const [chartName, setChartName] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [chartType, setChartType] = useState('');
  const [chartLibrary, setChartLibrary] = useState('echarts');
  const [chartCategory, setChartCategory] = useState('basic');

  // =============================================================================
  // Computed Values
  // =============================================================================

  const uniqueChartTypes = useMemo(() => getUniqueChartTypes(charts), [charts]);
  const uniqueChartLibraries = useMemo(() => getUniqueChartLibraries(charts), [charts]);
  const supportedChartTypes = useMemo(() => getSupportedChartTypes(chartLibrary), [chartLibrary]);

  // =============================================================================
  // Filtering and Sorting Logic
  // =============================================================================

  const filteredAndSortedCharts = useMemo(() => {
    return charts
      .filter(chart => {
        // Search filter
        if (searchQuery) {
          const displayInfo = getChartDisplayInfo(chart);
          const searchLower = searchQuery.toLowerCase();
          if (!displayInfo.name.toLowerCase().includes(searchLower) && 
              !displayInfo.description.toLowerCase().includes(searchLower) &&
              !displayInfo.type.toLowerCase().includes(searchLower) &&
              !displayInfo.library.toLowerCase().includes(searchLower)) {
            return false;
          }
        }

        // Type filter
        if (typeFilter !== 'all') {
          const chartType = chart.chart_type || chart.type;
          if (chartType !== typeFilter) return false;
        }

        // Library filter
        if (libraryFilter !== 'all') {
          if (chart.chart_library !== libraryFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aInfo = getChartDisplayInfo(a);
        const bInfo = getChartDisplayInfo(b);

        switch (sortBy) {
          case 'name':
            return aInfo.name.localeCompare(bInfo.name);
          
          case 'updated_at': {
            const aDate = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bDate = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bDate - aDate; // Most recent first
          }
          
          case 'created_at': {
            const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bDate - aDate; // Most recent first
          }
          
          case 'type':
            return aInfo.type.localeCompare(bInfo.type);
          
          case 'library':
            return aInfo.library.localeCompare(bInfo.library);
          
          case 'category':
            return aInfo.category.localeCompare(bInfo.category);
          
          default:
            return 0;
        }
      });
  }, [charts, searchQuery, typeFilter, libraryFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCharts.length / itemsPerPage);
  const paginatedCharts = filteredAndSortedCharts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, chart: Chart) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedChart(chart);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedChart(null);
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

  const handleView = () => {
    if (selectedChart) {
      if (onChartSelect) {
        onChartSelect(selectedChart);
      } else {
        const workspaceSlug = selectedChart.workspace_id || currentWorkspace?.slug || 'default';
        router.push(`/workspace/${workspaceSlug}/chart/${selectedChart.id}`);
      }
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedChart) {
      if (onChartEdit) {
        onChartEdit(selectedChart);
      } else {
        const workspaceSlug = selectedChart.workspace_id || currentWorkspace?.slug || 'default';
        router.push(`/workspace/${workspaceSlug}/chart/${selectedChart.id}/edit`);
      }
    }
    handleMenuClose();
  };

  const handleDuplicate = async () => {
    if (selectedChart && onChartDuplicate) {
      try {
        await onChartDuplicate(selectedChart.id);
      } catch (error) {
        console.error('Failed to duplicate chart:', error);
      }
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedChart && onChartDelete) {
      try {
        await onChartDelete(selectedChart.id);
        setDeleteDialogOpen(false);
        setSelectedChart(null);
      } catch (error) {
        console.error('Failed to delete chart:', error);
      }
    }
  };

  const handleCreateChart = async () => {
    if (!chartName.trim() || !chartType || !dashboardId) return;

    const chartData = {
      dashboard_id: dashboardId,
      workspace_id: currentWorkspace?.id,
      name: chartName.trim(),
      display_name: chartName.trim(),
      description: chartDescription.trim() || undefined,
      chart_type: chartType,
      chart_library: chartLibrary,
      chart_category: chartCategory,
      dataset_ids: [], // Will be set during chart configuration
      is_active: true,
      version: 1,
      created_by: 'current-user', // Should come from auth context
    };

    try {
      await onChartCreate?.(chartData);
      resetCreateForm();
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create chart:', error);
    }
  };

  const resetCreateForm = () => {
    setChartName('');
    setChartDescription('');
    setChartType('');
    setChartLibrary('echarts');
    setChartCategory('basic');
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(paginatedCharts.map(chart => chart.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderFiltersAndControls = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search charts..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>
        
        {showFilters && (
          <>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Chart Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Chart Type"
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {uniqueChartTypes.map((type) => (
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
                  label="Library"
                  onChange={(e) => {
                    setLibraryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value="all">All Libraries</MenuItem>
                  {uniqueChartLibraries.map((library) => (
                    <MenuItem key={library} value={library}>
                      {library.charAt(0).toUpperCase() + library.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </>
        )}

        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <MenuItem value="updated_at">Recently Updated</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="type">Type</MenuItem>
              <MenuItem value="library">Library</MenuItem>
              <MenuItem value="created_at">Recently Created</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" gap={1}>
              <Tooltip title="Grid View">
                <IconButton 
                  onClick={() => setViewMode('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  size="small"
                >
                  <GridViewIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="List View">
                <IconButton 
                  onClick={() => setViewMode('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  size="small"
                >
                  <ViewListIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            {showCreateButton && dashboardId && (
              <PermissionGate permissions={['chart.create']}>
                <Tooltip title="Create Chart">
                  <IconButton 
                    onClick={() => setCreateDialogOpen(true)}
                    color="primary"
                    size="small"
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </PermissionGate>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Selection controls for selection mode */}
      {selectionMode && (
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Checkbox
                indeterminate={selectedCharts.length > 0 && selectedCharts.length < paginatedCharts.length}
                checked={paginatedCharts.length > 0 && selectedCharts.length === paginatedCharts.length}
                onChange={handleSelectAll}
              />
              <Typography variant="body2">
                {selectedCharts.length} of {filteredAndSortedCharts.length} selected
              </Typography>
            </Box>
            {selectedCharts.length > 0 && (
              <Button size="small" onClick={() => onSelectionChange?.([])}>
                Clear Selection
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Results summary */}
      <Box mt={1}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedCharts.length} of {filteredAndSortedCharts.length} charts
        </Typography>
      </Box>
    </Paper>
  );

  const renderChartCard = (chart: Chart) => {
    const displayInfo = getChartDisplayInfo(chart);
    const isSelected = selectedCharts.includes(chart.id);

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={chart.id}>
        <Card
          sx={{
            height: '100%',
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            '&:hover': {
              elevation: 4,
              borderColor: 'primary.main'
            }
          }}
          onClick={() => handleChartClick(chart)}
        >
          <CardContent sx={{ pb: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1} flex={1}>
                {renderCardChartIcon(chart)} {/* ← Fixed: Now uses safe chart icon rendering */}
                <Box overflow="hidden">
                  <Tooltip title={displayInfo.name}>
                    <Typography 
                      variant="subtitle2" 
                      component="div"
                      noWrap
                      sx={{ fontWeight: 600 }}
                    >
                      {displayInfo.name}
                    </Typography>
                  </Tooltip>
                </Box>
              </Box>

              <Box display="flex" alignItems="center" gap={0.5}>
                {selectionMode && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleChartClick(chart);
                    }}
                    size="small"
                  />
                )}
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, chart)}
                  sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minHeight: '2.5em'
              }}
            >
              {displayInfo.description}
            </Typography>

            <Box display="flex" gap={0.5} mb={1} flexWrap="wrap">
              <Chip
                label={displayInfo.type}
                size="small"
                variant="outlined"
                color="primary"
              />
              <Chip
                label={displayInfo.library}
                size="small"
                variant="outlined"
              />
            </Box>

            <Typography variant="caption" color="text.secondary" component="div">
              Updated {displayInfo.updatedAt ? 
                new Date(displayInfo.updatedAt).toLocaleDateString() : 
                'Unknown'
              }
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              by {displayInfo.createdBy}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderChartListItem = (chart: Chart) => {
    const displayInfo = getChartDisplayInfo(chart);
    const isSelected = selectedCharts.includes(chart.id);

    return (
      <ListItem
        key={chart.id}
        disablePadding
        sx={{
          border: 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          borderRadius: 1,
          mb: 1,
          bgcolor: isSelected ? 'action.selected' : 'background.paper'
        }}
      >
        <ListItemButton
          onClick={() => handleChartClick(chart)}
          sx={{ py: 1.5 }}
        >
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleChartClick(chart);
              }}
              sx={{ mr: 1 }}
            />
          )}

          <ListItemAvatar sx={{ minWidth: 40 }}>
            {renderListChartIcon(chart)} {/* ← Fixed: Now uses safe chart icon rendering */}
          </ListItemAvatar>

          <Box flex={1} minWidth={0}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                {displayInfo.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
                {displayInfo.updatedAt ? 
                  new Date(displayInfo.updatedAt).toLocaleDateString() : 
                  'Unknown'
                }
              </Typography>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {displayInfo.description}
            </Typography>

            <Box display="flex" gap={0.5} alignItems="center">
              <Chip label={displayInfo.type} size="small" variant="outlined" />
              <Chip label={displayInfo.library} size="small" variant="outlined" />
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                by {displayInfo.createdBy}
              </Typography>
            </Box>
          </Box>

          <IconButton
            onClick={(e) => handleMenuClick(e, chart)}
            sx={{ ml: 1 }}
          >
            <MoreVertIcon />
          </IconButton>
        </ListItemButton>
      </ListItem>
    );
  };

  const renderEmptyState = () => (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        <DefaultChartIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Chart
            </Button>
          </PermissionGate>
        )}
      </CardContent>
    </Card>
  );

  const renderLoadingState = () => (
    <Grid container spacing={2}>
      {Array.from({ length: 8 }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Skeleton variant="circular" width={24} height={24} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="60%" />
              </Box>
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
              <Box display="flex" gap={1} mt={1}>
                <Skeleton variant="rectangular" width={60} height={20} />
                <Skeleton variant="rectangular" width={60} height={20} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <Box>
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters and Controls */}
      {!loading && renderFiltersAndControls()}

      {/* Chart List Content */}
      {loading ? (
        renderLoadingState()
      ) : filteredAndSortedCharts.length === 0 ? (
        renderEmptyState()
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {paginatedCharts.map(renderChartCard)}
        </Grid>
      ) : (
        <List sx={{ width: '100%' }}>
          {paginatedCharts.map(renderChartListItem)}
        </List>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Previous
          </Button>
          <Box mx={2} display="flex" alignItems="center">
            <Typography variant="body2">
              Page {currentPage} of {totalPages}
            </Typography>
          </Box>
          <Button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Chart</ListItemText>
        </MenuItem>

        <PermissionGate permissions={['chart.update']}>
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Chart</ListItemText>
          </MenuItem>
        </PermissionGate>

        <PermissionGate permissions={['chart.create']}>
          <MenuItem onClick={handleDuplicate}>
            <ListItemIcon>
              <FileCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate Chart</ListItemText>
          </MenuItem>
        </PermissionGate>

        <Divider />

        <PermissionGate permissions={['chart.delete']}>
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Chart</ListItemText>
          </MenuItem>
        </PermissionGate>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Chart</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedChart?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                fullWidth
                label="Chart Name"
                value={chartName}
                onChange={(e) => setChartName(e.target.value)}
                placeholder="Enter chart name"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (Optional)"
                value={chartDescription}
                onChange={(e) => setChartDescription(e.target.value)}
                placeholder="Enter chart description"
                multiline
                rows={2}
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