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
  CircularProgress
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
  FilterList
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDatasets } from '@/hooks/useDatasets';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';

// Types
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
}

interface DatasetListProps {
  onDatasetSelect?: (dataset: Dataset) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDatasets?: string[];
  onSelectionChange?: (datasetIds: string[]) => void;
  filterByType?: string;
}

export const DatasetList: React.FC<DatasetListProps> = ({
  onDatasetSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDatasets = [],
  onSelectionChange,
  filterByType,
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

  // ============================================================================
  // State Management
  // ============================================================================
  
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
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  // Form states
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [datasetType, setDatasetType] = useState<'table' | 'query' | 'transformation'>('table');

  // ============================================================================
  // Data Processing
  // ============================================================================
  
  const filteredDatasets = useMemo(() => {
    if (!datasets?.data) return [];

    return datasets.data.filter((dataset: Dataset) => {
      const matchesSearch = !searchQuery || 
        dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataset.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || dataset.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || dataset.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [datasets?.data, searchQuery, typeFilter, statusFilter]);

  const sortedDatasets = useMemo(() => {
    return [...filteredDatasets].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [filteredDatasets, sortBy]);

  const paginatedDatasets = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedDatasets.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedDatasets, page, rowsPerPage]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, dataset: Dataset) => {
    event.stopPropagation();
    setSelectedDataset(dataset);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedDataset(null);
  }, []);

  const handleDatasetClick = useCallback((dataset: Dataset) => {
    if (selectionMode) {
      const isSelected = selectedDatasets.includes(dataset.id);
      const newSelection = isSelected
        ? selectedDatasets.filter(id => id !== dataset.id)
        : [...selectedDatasets, dataset.id];
      onSelectionChange?.(newSelection);
    } else {
      onDatasetSelect?.(dataset);
    }
  }, [selectionMode, selectedDatasets, onSelectionChange, onDatasetSelect]);

  const handleEdit = useCallback(() => {
    if (selectedDataset) {
      router.push(`/workspace/${currentWorkspace?.slug}/datasets/${selectedDataset.id}/edit`);
    }
    handleMenuClose();
  }, [selectedDataset, router, currentWorkspace?.slug, handleMenuClose]);

  const handleDelete = useCallback(async () => {
    if (selectedDataset) {
      try {
        await deleteDataset(selectedDataset.id);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error('Failed to delete dataset:', error);
      }
    }
    handleMenuClose();
  }, [selectedDataset, deleteDataset, handleMenuClose]);

  const handleRefresh = useCallback(async (dataset: Dataset) => {
    setRefreshing(dataset.id);
    try {
      await refreshDataset(dataset.id);
    } catch (error) {
      console.error('Failed to refresh dataset:', error);
    } finally {
      setRefreshing(null);
    }
    handleMenuClose();
  }, [refreshDataset, handleMenuClose]);

  const handleCreateDataset = useCallback(async () => {
    if (datasetName.trim()) {
      try {
        await createDataset({
          name: datasetName,
          description: datasetDescription,
          type: datasetType
        });
        resetForm();
        setCreateDialogOpen(false);
      } catch (error) {
        console.error('Failed to create dataset:', error);
      }
    }
  }, [datasetName, datasetDescription, datasetType, createDataset]);

  const resetForm = useCallback(() => {
    setDatasetName('');
    setDatasetDescription('');
    setDatasetType('table');
  }, []);

  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <TableChart fontSize="small" />;
      case 'query':
        return <Search fontSize="small" />;
      case 'transformation':
        return <FilterList fontSize="small" />;
      default:
        return <Storage fontSize="small" />;
    }
  };

  const getTypeColor = (type: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (type) {
      case 'table':
        return 'primary';
      case 'query':
        return 'info';
      case 'transformation':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      case 'refreshing':
        return 'info';
      default:
        return 'default';
    }
  };

  // ============================================================================
  // Render Functions
  // ============================================================================
  
  const renderDatasetCard = (dataset: Dataset) => {
    const isSelected = selectionMode && selectedDatasets.includes(dataset.id);
    
    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={dataset.id}>
        <Card
          sx={{
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: 2,
            },
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => handleDatasetClick(dataset)}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                {getTypeIcon(dataset.type)}
                <Typography variant="h6" component="div" noWrap>
                  {dataset.display_name || dataset.name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, dataset)}
              >
                <MoreVert />
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              {dataset.description || 'No description'}
            </Typography>

            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
              <Chip 
                label={dataset.type} 
                size="small" 
                color={getTypeColor(dataset.type)}
              />
              <Chip 
                label={dataset.status} 
                size="small" 
                color={getStatusColor(dataset.status)}
              />
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Storage fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  ~{dataset.row_count_estimate?.toLocaleString() || 0} rows
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {dataset.last_refreshed 
                  ? `Refreshed ${new Date(dataset.last_refreshed).toLocaleDateString()}`
                  : 'Never refreshed'
                }
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderDatasetListItem = (dataset: Dataset) => {
    const isSelected = selectionMode && selectedDatasets.includes(dataset.id);
    
    return (
      <ListItem
        key={dataset.id}
        button
        selected={isSelected}
        onClick={() => handleDatasetClick(dataset)}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 1,
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {getTypeIcon(dataset.type)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={dataset.display_name || dataset.name}
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dataset.description || 'No description'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Chip 
                  label={dataset.type} 
                  size="small" 
                  color={getTypeColor(dataset.type)}
                />
                <Chip 
                  label={dataset.status} 
                  size="small" 
                  color={getStatusColor(dataset.status)}
                />
                <Typography variant="caption" color="text.secondary">
                  {dataset.row_count_estimate?.toLocaleString() || 0} rows • 
                  Updated {new Date(dataset.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            onClick={(e) => handleMenuClick(e, dataset)}
          >
            <MoreVert />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
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
          {paginatedDatasets.map((dataset) => {
            const isSelected = selectionMode && selectedDatasets.includes(dataset.id);
            return (
              <TableRow 
                key={dataset.id}
                selected={isSelected}
                hover
                onClick={() => handleDatasetClick(dataset)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTypeIcon(dataset.type)}
                    <Typography variant="body2">
                      {dataset.display_name || dataset.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={dataset.type} 
                    size="small" 
                    color={getTypeColor(dataset.type)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {dataset.description || 'No description'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {dataset.row_count_estimate?.toLocaleString() || 0}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {dataset.last_refreshed 
                      ? new Date(dataset.last_refreshed).toLocaleDateString()
                      : 'Never'
                    }
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={dataset.status} 
                    size="small" 
                    color={getStatusColor(dataset.status)}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, dataset)}
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

  // ============================================================================
  // Main Render
  // ============================================================================
  
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
        
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={() => setCurrentViewMode(
              currentViewMode === 'grid' ? 'list' : currentViewMode === 'list' ? 'table' : 'grid'
            )}
            title={`Switch to ${
              currentViewMode === 'grid' ? 'list' : currentViewMode === 'list' ? 'table' : 'grid'
            } view`}
          >
            {currentViewMode === 'grid' ? <ViewList /> : currentViewMode === 'list' ? <TableChart /> : <ViewModule />}
          </IconButton>
          
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
      </Box>

      {/* Filters */}
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
                <MenuItem value="all">All</MenuItem>
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
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredDatasets.length} dataset{filteredDatasets.length !== 1 ? 's' : ''}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Content */}
      {currentViewMode === 'grid' ? (
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