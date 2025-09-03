// src/components/builder/ChartList.tsx
// Updated to use proper type hierarchy and handle optional Chart properties

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
import { Chart, ChartConfiguration } from '@/types/chart.types';
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
// Type Hierarchy
// =============================================================================

/**
 * Base interface for all list items
 */
interface BaseListItem {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  workspace_id?: string;
}

/**
 * Chart-specific list item interface extending BaseListItem
 */
interface ChartListItem extends BaseListItem {
  config_json: ChartConfiguration;
  is_active: boolean;
  version: number;
  created_by: string;
  dashboard_id?: string;
  chart_type?: string;
  chart_category?: string;
  chart_library?: string;
  dataset_ids?: string[];
  tab_id?: string;
}

// =============================================================================
// Component Types and Interfaces
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

/**
 * Convert Chart to ChartListItem
 */
const chartToListItem = (chart: Chart): ChartListItem => {
  return {
    id: chart.id,
    name: chart.name,
    display_name: chart.display_name,
    description: chart.description,
    created_at: chart.created_at,
    updated_at: chart.updated_at,
    workspace_id: chart.workspace_id,
    config_json: chart.config_json,
    is_active: chart.is_active,
    version: chart.version,
    created_by: chart.created_by,
    dashboard_id: chart.dashboard_id,
    chart_type: chart.chart_type,
    chart_category: chart.chart_category,
    chart_library: chart.chart_library,
    dataset_ids: chart.dataset_ids,
    tab_id: chart.tab_id,
  };
};

/**
 * Convert ChartListItem back to Chart
 */
const listItemToChart = (item: ChartListItem): Chart => {
  return {
    id: item.id,
    name: item.name,
    display_name: item.display_name,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at,
    workspace_id: item.workspace_id,
    config_json: item.config_json,
    is_active: item.is_active,
    version: item.version,
    created_by: item.created_by,
    dashboard_id: item.dashboard_id,
    chart_type: item.chart_type,
    chart_category: item.chart_category,
    chart_library: item.chart_library,
    dataset_ids: item.dataset_ids,
    tab_id: item.tab_id,
  } as Chart;
};

const getChartDisplayInfo = (item: ChartListItem) => {
  return {
    name: item.display_name || item.name || 'Untitled Chart',
    description: item.description || 'No description available',
    type: getChartTypeDisplayName(listItemToChart(item)),
    library: getChartLibraryDisplayName(listItemToChart(item)),
    category: item.chart_category || 'Uncategorized',
    updatedAt: item.updated_at || item.created_at || '',
    createdBy: item.created_by || 'Unknown',
    isActive: item.is_active ?? true,
    version: item.version || 1,
    workspaceId: item.workspace_id || 'default'
  };
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

  // Convert charts to list items
  const chartListItems = useMemo(() => {
    return charts.map(chart => chartToListItem(chart));
  }, [charts]);

  // Filter and sort the charts
  const filteredAndSortedCharts = useMemo(() => {
    let filtered = chartListItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.display_name && item.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || item.chart_type === typeFilter;
      const matchesLibrary = libraryFilter === 'all' || item.chart_library === libraryFilter;
      
      return matchesSearch && matchesType && matchesLibrary;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.display_name || a.name).localeCompare(b.display_name || b.name);
        case 'type':
          return (a.chart_type || '').localeCompare(b.chart_type || '');
        case 'library':
          return (a.chart_library || '').localeCompare(b.chart_library || '');
        case 'category':
          return (a.chart_category || '').localeCompare(b.chart_category || '');
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [chartListItems, searchQuery, typeFilter, libraryFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCharts.length / itemsPerPage);
  const paginatedCharts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedCharts.slice(startIndex, endIndex);
  }, [filteredAndSortedCharts, currentPage, itemsPerPage]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleChartClick = (item: ChartListItem) => {
    const chart = listItemToChart(item);
    if (selectionMode) {
      const newSelection = selectedCharts.includes(item.id)
        ? selectedCharts.filter(id => id !== item.id)
        : [...selectedCharts, item.id];
      onSelectionChange?.(newSelection);
    } else {
      onChartSelect?.(chart);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: ChartListItem) => {
    event.stopPropagation();
    setSelectedChart(listItemToChart(item));
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    if (selectedChart) {
      onChartSelect?.(selectedChart);
    }
  };

  const handleEdit = () => {
    if (selectedChart) {
      onChartEdit?.(selectedChart);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
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

  const handleDuplicate = async () => {
    if (selectedChart && onChartDuplicate) {
      try {
        await onChartDuplicate(selectedChart.id);
      } catch (error) {
        console.error('Failed to duplicate chart:', error);
      }
    }
  };

  const handleCreateChart = async () => {
    if (!onChartCreate) return;

    try {
      const chartData = {
        name: chartName,
        description: chartDescription,
        chart_type: chartType,
        chart_library: chartLibrary,
        chart_category: chartCategory,
        dashboard_id: dashboardId,
        workspace_id: currentWorkspace?.id
      };

      await onChartCreate(chartData);
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
      onSelectionChange?.(paginatedCharts.map(item => item.id));
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

  const renderChartCard = (item: ChartListItem) => {
    const displayInfo = getChartDisplayInfo(item);
    const isSelected = selectedCharts.includes(item.id);
    const chart = listItemToChart(item);

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
        <Card
          sx={{
            height: '100%',
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            bgcolor: isSelected ? 'action.selected' : 'background.paper',
            '&:hover': {
              borderColor: 'primary.main',
              transform: 'translateY(-2px)',
              boxShadow: theme => theme.shadows[4]
            },
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => handleChartClick(item)}
        >
          <CardContent sx={{ pb: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box display="flex" alignItems="center" gap={1} flex={1} minWidth={0}>
                {selectionMode && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleChartClick(item);
                    }}
                    size="small"
                  />
                )}
                
                <Box sx={{ minWidth: 32, display: 'flex', alignItems: 'center' }}>
                  {renderCardChartIcon(chart)}
                </Box>
                
                <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                  {displayInfo.name}
                </Typography>
              </Box>
              
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, item)}
                sx={{ ml: 1 }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                height: 40,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {displayInfo.description}
            </Typography>

            <Box display="flex" gap={0.5} mb={1} flexWrap="wrap">
              <Chip label={displayInfo.type} size="small" variant="outlined" />
              <Chip label={displayInfo.library} size="small" variant="outlined" />
              {displayInfo.category && displayInfo.category !== 'Uncategorized' && (
                <Chip label={displayInfo.category} size="small" color="primary" variant="outlined" />
              )}
            </Box>

            <Typography variant="caption" color="text.secondary">
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

  const renderChartListItem = (item: ChartListItem) => {
    const displayInfo = getChartDisplayInfo(item);
    const isSelected = selectedCharts.includes(item.id);
    const chart = listItemToChart(item);

    return (
      <ListItem
        key={item.id}
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
          onClick={() => handleChartClick(item)}
          sx={{ py: 1.5 }}
        >
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleChartClick(item);
              }}
              sx={{ mr: 1 }}
            />
          )}

          <ListItemAvatar sx={{ minWidth: 40 }}>
            {renderListChartIcon(chart)}
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
            onClick={(e) => handleMenuClick(e, item)}
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
              ? 'Create your first chart to get started'
              : 'No charts have been created yet'
          }
        </Typography>
        {dashboardId && showCreateButton && (
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
      {Array.from({ length: itemsPerPage }, (_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="text" width="60%" />
              </Box>
              <Skeleton variant="text" width="100%" />
              <Skeleton variant="text" width="80%" />
              <Box display="flex" gap={1} mt={2}>
                <Skeleton variant="rounded" width={60} height={24} />
                <Skeleton variant="rounded" width={80} height={24} />
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

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filters and Controls */}
      {showFilters && renderFiltersAndControls()}

      {/* Chart List */}
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
        maxWidth="md"
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
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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