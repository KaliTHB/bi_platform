// src/components/builder/DatasetList.tsx
// Updated to use proper type hierarchy and handle optional Dataset properties

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Tooltip,
  CircularProgress,
  Checkbox,
  ListItemButton
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Storage,
  TableChart,
  ViewList,
  ViewModule,
  Refresh,
  FilterList,
  Transform,
  QueryStats,
  Dataset as DatasetIcon
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDatasets } from '@/hooks/useDatasets';

// Components
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
  workspace_id: string;
}

/**
 * Dataset-specific list item interface extending BaseListItem
 */
interface DatasetListItem extends BaseListItem {
  type: 'table' | 'query' | 'transformation';
  status: 'active' | 'inactive' | 'error' | 'refreshing';
  row_count_estimate?: number;
  last_refreshed?: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  datasource_id?: string;
  query_config?: Record<string, any>;
  transformation_config?: Record<string, any>;
}

/**
 * Full Dataset interface for external usage
 */
interface Dataset {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  type: 'table' | 'query' | 'transformation';
  status: 'active' | 'inactive' | 'error' | 'refreshing';
  row_count_estimate?: number;
  last_refreshed?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  workspace_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  datasource_id?: string;
  query_config?: Record<string, any>;
  transformation_config?: Record<string, any>;
}

// =============================================================================
// Component Props
// =============================================================================

interface DatasetListProps {
  onDatasetSelect?: (dataset: Dataset) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDatasets?: string[];
  onSelectionChange?: (datasetIds: string[]) => void;
  filterByType?: string;
  itemsPerPage?: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert Dataset to DatasetListItem
 */
const datasetToListItem = (dataset: Dataset): DatasetListItem => {
  return {
    id: dataset.id,
    name: dataset.name,
    display_name: dataset.display_name,
    description: dataset.description,
    created_at: dataset.created_at,
    updated_at: dataset.updated_at,
    workspace_id: dataset.workspace_id,
    type: dataset.type,
    status: dataset.status,
    row_count_estimate: dataset.row_count_estimate,
    last_refreshed: dataset.last_refreshed,
    owner_id: dataset.owner_id,
    owner: dataset.owner,
    datasource_id: dataset.datasource_id,
    query_config: dataset.query_config,
    transformation_config: dataset.transformation_config,
  };
};

/**
 * Convert DatasetListItem back to Dataset
 */
const listItemToDataset = (item: DatasetListItem): Dataset => {
  return {
    id: item.id,
    name: item.name,
    display_name: item.display_name,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at,
    workspace_id: item.workspace_id,
    type: item.type,
    status: item.status,
    row_count_estimate: item.row_count_estimate,
    last_refreshed: item.last_refreshed,
    owner_id: item.owner_id,
    owner: item.owner,
    datasource_id: item.datasource_id,
    query_config: item.query_config,
    transformation_config: item.transformation_config,
  };
};

const getDatasetDisplayInfo = (item: DatasetListItem) => {
  return {
    name: item.display_name || item.name || 'Untitled Dataset',
    description: item.description || 'No description available',
    type: item.type,
    status: item.status,
    rowCount: item.row_count_estimate || 0,
    lastRefreshed: item.last_refreshed,
    updatedAt: item.updated_at || item.created_at || '',
    createdBy: item.owner?.name || 'Unknown',
  };
};

// =============================================================================
// Main Component
// =============================================================================

export const DatasetList: React.FC<DatasetListProps> = ({
  onDatasetSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDatasets = [],
  onSelectionChange,
  filterByType,
  itemsPerPage = 12,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { 
    datasets, 
    loading, 
    error: datasetError,
    createDataset, 
    updateDataset,
    deleteDataset,
    refreshDataset
  } = useDatasets();

  // =============================================================================
  // State Management
  // =============================================================================
  
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(filterByType || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(itemsPerPage);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Create dataset form state
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [datasetType, setDatasetType] = useState<'table' | 'query' | 'transformation'>('table');

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Convert datasets to list items
  const datasetListItems = useMemo(() => {
    return (datasets || []).map(dataset => datasetToListItem(dataset));
  }, [datasets]);

  // Filter and sort the datasets
  const filteredDatasets = useMemo(() => {
    let filtered = datasetListItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.display_name && item.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.display_name || a.name).localeCompare(b.display_name || b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'row_count':
          return (b.row_count_estimate || 0) - (a.row_count_estimate || 0);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [datasetListItems, searchQuery, typeFilter, statusFilter, sortBy]);

  // Pagination
  const paginatedDatasets = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredDatasets.slice(startIndex, endIndex);
  }, [filteredDatasets, page, rowsPerPage]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleDatasetClick = (item: DatasetListItem) => {
    const dataset = listItemToDataset(item);
    if (selectionMode) {
      const newSelection = selectedDatasets.includes(item.id)
        ? selectedDatasets.filter(id => id !== item.id)
        : [...selectedDatasets, item.id];
      onSelectionChange?.(newSelection);
    } else if (onDatasetSelect) {
      onDatasetSelect(dataset);
    } else {
      // Navigate to dataset detail view
      router.push(`/dataset/${item.id}`);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: DatasetListItem) => {
    event.stopPropagation();
    setSelectedDataset(listItemToDataset(item));
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedDataset) {
      router.push(`/dataset/${selectedDataset.id}/edit`);
    }
  };

  const handleRefresh = async (dataset: Dataset) => {
    if (refreshDataset) {
      try {
        setRefreshing(dataset.id);
        await refreshDataset(dataset.id);
      } catch (error) {
        console.error('Failed to refresh dataset:', error);
      } finally {
        setRefreshing(null);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedDataset && deleteDataset) {
      try {
        await deleteDataset(selectedDataset.id);
        setDeleteDialogOpen(false);
        setSelectedDataset(null);
      } catch (error) {
        console.error('Failed to delete dataset:', error);
      }
    }
  };

  const handleCreateDataset = async () => {
    if (!createDataset) return;

    try {
      const datasetData = {
        name: datasetName,
        description: datasetDescription,
        type: datasetType,
        workspace_id: currentWorkspace?.id
      };

      await createDataset(datasetData);
      resetCreateForm();
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create dataset:', error);
    }
  };

  const resetCreateForm = () => {
    setDatasetName('');
    setDatasetDescription('');
    setDatasetType('table');
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(paginatedDatasets.map(item => item.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  // =============================================================================
  // Utility Functions for Rendering
  // =============================================================================

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <TableChart />;
      case 'query':
        return <QueryStats />;
      case 'transformation':
        return <Transform />;
      default:
        return <DatasetIcon />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'table':
        return 'primary';
      case 'query':
        return 'info';
      case 'transformation':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'error':
        return 'error';
      case 'refreshing':
        return 'info';
      default:
        return 'default';
    }
  };

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderFiltersAndControls = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search datasets..."
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
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="table">Table</MenuItem>
              <MenuItem value="query">Query</MenuItem>
              <MenuItem value="transformation">Transformation</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="refreshing">Refreshing</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="updated_at">Last Updated</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="type">Type</MenuItem>
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="row_count">Row Count</MenuItem>
              <MenuItem value="created_at">Recently Created</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Showing {filteredDatasets.length} dataset{filteredDatasets.length !== 1 ? 's' : ''}
            </Typography>
            
            <Box display="flex" gap={1}>
              <Tooltip title="Grid View">
                <IconButton 
                  onClick={() => setCurrentViewMode('grid')}
                  color={currentViewMode === 'grid' ? 'primary' : 'default'}
                  size="small"
                >
                  <ViewModule />
                </IconButton>
              </Tooltip>
              <Tooltip title="List View">
                <IconButton 
                  onClick={() => setCurrentViewMode('list')}
                  color={currentViewMode === 'list' ? 'primary' : 'default'}
                  size="small"
                >
                  <ViewList />
                </IconButton>
              </Tooltip>
              <Tooltip title="Table View">
                <IconButton 
                  onClick={() => setCurrentViewMode('table')}
                  color={currentViewMode === 'table' ? 'primary' : 'default'}
                  size="small"
                >
                  <TableChart />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Selection controls for selection mode */}
      {selectionMode && (
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Checkbox
                indeterminate={selectedDatasets.length > 0 && selectedDatasets.length < paginatedDatasets.length}
                checked={paginatedDatasets.length > 0 && selectedDatasets.length === paginatedDatasets.length}
                onChange={handleSelectAll}
              />
              <Typography variant="body2">
                {selectedDatasets.length} of {filteredDatasets.length} selected
              </Typography>
            </Box>
            {selectedDatasets.length > 0 && (
              <Button size="small" onClick={() => onSelectionChange?.([])}>
                Clear Selection
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );

  const renderDatasetCard = (item: DatasetListItem) => {
    const displayInfo = getDatasetDisplayInfo(item);
    const isSelected = selectionMode && selectedDatasets.includes(item.id);

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
        <Card
          sx={{
            height: '100%',
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: 2,
            },
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => handleDatasetClick(item)}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" alignItems="center" gap={1} flex={1} minWidth={0}>
                {selectionMode && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleDatasetClick(item);
                    }}
                    size="small"
                  />
                )}
                
                <Avatar
                  sx={{ 
                    bgcolor: getTypeColor(displayInfo.type) === 'primary' ? 'primary.main' : 
                             getTypeColor(displayInfo.type) === 'info' ? 'info.main' : 
                             getTypeColor(displayInfo.type) === 'secondary' ? 'secondary.main' : 'grey.500',
                    width: 32,
                    height: 32
                  }}
                >
                  {getTypeIcon(displayInfo.type)}
                </Avatar>
                
                <Typography variant="h6" component="div" noWrap>
                  {displayInfo.name}
                </Typography>
              </Box>
              
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, item)}
              >
                <MoreVert />
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

            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
              <Chip 
                label={displayInfo.type} 
                size="small" 
                color={getTypeColor(displayInfo.type) as any}
              />
              <Chip 
                label={displayInfo.status} 
                size="small" 
                color={getStatusColor(displayInfo.status) as any}
              />
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Storage fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  ~{displayInfo.rowCount.toLocaleString()} rows
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {displayInfo.lastRefreshed 
                  ? `Refreshed ${new Date(displayInfo.lastRefreshed).toLocaleDateString()}`
                  : 'Never refreshed'
                }
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Updated {new Date(displayInfo.updatedAt).toLocaleDateString()}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderDatasetListItem = (item: DatasetListItem) => {
    const displayInfo = getDatasetDisplayInfo(item);
    const isSelected = selectionMode && selectedDatasets.includes(item.id);
    
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
          onClick={() => handleDatasetClick(item)}
          sx={{ py: 1.5 }}
        >
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleDatasetClick(item);
              }}
              sx={{ mr: 1 }}
            />
          )}

          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getTypeIcon(displayInfo.type)}
            </Avatar>
          </ListItemAvatar>
          
          <ListItemText
            primary={displayInfo.name}
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {displayInfo.description}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Chip 
                    label={displayInfo.type} 
                    size="small" 
                    color={getTypeColor(displayInfo.type) as any}
                  />
                  <Chip 
                    label={displayInfo.status} 
                    size="small" 
                    color={getStatusColor(displayInfo.status) as any}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {displayInfo.rowCount.toLocaleString()} rows • 
                    Updated {new Date(displayInfo.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            }
          />
          
          <IconButton
            onClick={(e) => handleMenuClick(e, item)}
            sx={{ ml: 1 }}
          >
            <MoreVert />
          </IconButton>
        </ListItemButton>
      </ListItem>
    );
  };

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {selectionMode && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedDatasets.length > 0 && selectedDatasets.length < paginatedDatasets.length}
                  checked={paginatedDatasets.length > 0 && selectedDatasets.length === paginatedDatasets.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
            )}
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Rows</TableCell>
            <TableCell>Last Refreshed</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedDatasets.map((item) => {
            const displayInfo = getDatasetDisplayInfo(item);
            const isSelected = selectionMode && selectedDatasets.includes(item.id);
            
            return (
              <TableRow
                key={item.id}
                hover
                selected={isSelected}
                onClick={() => handleDatasetClick(item)}
                sx={{ cursor: 'pointer' }}
              >
                {selectionMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleDatasetClick(item);
                      }}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {getTypeIcon(displayInfo.type)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {displayInfo.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {displayInfo.createdBy}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={displayInfo.type} 
                    size="small" 
                    color={getTypeColor(displayInfo.type) as any}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {displayInfo.description}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {displayInfo.rowCount.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {displayInfo.lastRefreshed
                      ? new Date(displayInfo.lastRefreshed).toLocaleDateString()
                      : 'Never'
                    }
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={displayInfo.status} 
                    size="small" 
                    color={getStatusColor(displayInfo.status) as any}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, item)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderEmptyState = () => (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        <DatasetIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No datasets found
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'Create your first dataset to get started'
          }
        </Typography>
        {showCreateButton && (
          <PermissionGate permissions={['dataset.create']}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Dataset
            </Button>
          </PermissionGate>
        )}
      </CardContent>
    </Card>
  );

  // =============================================================================
  // Main Render
  // =============================================================================
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (datasetError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load datasets: {datasetError}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Datasets
        </Typography>
        
        {showCreateButton && (
          <PermissionGate permissions={['dataset.create']}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Dataset
            </Button>
          </PermissionGate>
        )}
      </Box>

      {/* Filters and Controls */}
      {renderFiltersAndControls()}

      {/* Dataset List */}
      {filteredDatasets.length === 0 ? (
        renderEmptyState()
      ) : currentViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {paginatedDatasets.map(renderDatasetCard)}
        </Grid>
      ) : currentViewMode === 'list' ? (
        <List>
          {paginatedDatasets.map(renderDatasetListItem)}
        </List>
      ) : (
        renderTableView()
      )}

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredDatasets.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{ mt: 3 }}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => selectedDataset && handleRefresh(selectedDataset)}>
          <Refresh fontSize="small" sx={{ mr: 1 }} />
          {refreshing === selectedDataset?.id ? 'Refreshing...' : 'Refresh'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Dataset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDataset?.display_name || selectedDataset?.name}"?
            This action cannot be undone and may affect dashboards and charts that depend on this dataset.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dataset Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Dataset</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={datasetType}
                label="Type"
                onChange={(e) => setDatasetType(e.target.value as 'table' | 'query' | 'transformation')}
              >
                <MenuItem value="table">Table</MenuItem>
                <MenuItem value="query">Query</MenuItem>
                <MenuItem value="transformation">Transformation</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateDataset} variant="contained" disabled={!datasetName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatasetList;