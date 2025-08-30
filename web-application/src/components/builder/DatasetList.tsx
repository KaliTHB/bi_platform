'use client';

import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Tooltip,
  LinearProgress,
  Paper,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  Storage,
  Transform,
  TableChart,
  Query,
  Refresh,
  Schedule,
  TrendingUp,
  Search,
  FilterList,
  ViewModule,
  ViewList,
  DataObject,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Dataset } from '@/types/dataset.types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDatasets } from '@/hooks/useDatasets';
import PermissionGate from '@/components/shared/PermissionGate';

interface DatasetListProps {
  onDatasetSelect?: (dataset: Dataset) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDatasets?: string[];
  onSelectionChange?: (datasetIds: string[]) => void;
  filterByType?: 'table' | 'query' | 'transformation';
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
  const { hasPermissions } = usePermissions();
  const { 
    datasets, 
    loading, 
    createDataset, 
    updateDataset,
    deleteDataset, 
    refreshDataset 
  } = useDatasets();

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
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Form states
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [datasetType, setDatasetType] = useState<'table' | 'query' | 'transformation'>('table');

  const filteredDatasets = datasets
    .filter(dataset => {
      if (typeFilter !== 'all' && dataset.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !dataset.is_active) return false;
        if (statusFilter === 'inactive' && dataset.is_active) return false;
      }
      if (searchQuery && !dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !dataset.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'updated_at': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'type': return a.type.localeCompare(b.type);
        case 'row_count': return (b.row_count_estimate || 0) - (a.row_count_estimate || 0);
        default: return 0;
      }
    });

  const paginatedDatasets = filteredDatasets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dataset: Dataset) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDataset(dataset);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDataset(null);
  };

  const handleEdit = () => {
    if (selectedDataset) {
      router.push(`/workspace/${currentWorkspace?.slug}/dataset/${selectedDataset.id}/edit`);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedDataset) {
      if (onDatasetSelect) {
        onDatasetSelect(selectedDataset);
      } else {
        router.push(`/workspace/${currentWorkspace?.slug}/dataset/${selectedDataset.id}`);
      }
    }
    handleMenuClose();
  };

  const handleRefresh = async () => {
    if (selectedDataset) {
      await refreshDataset(selectedDataset.id);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedDataset) {
      await deleteDataset(selectedDataset.id);
      setDeleteDialogOpen(false);
    }
    handleMenuClose();
  };

  const handleCreateDataset = async () => {
    if (datasetName.trim()) {
      await createDataset({
        name: datasetName,
        description: datasetDescription,
        type: datasetType,
      });
      resetForm();
      setCreateDialogOpen(false);
    }
  };

  const resetForm = () => {
    setDatasetName('');
    setDatasetDescription('');
    setDatasetType('table');
  };

  const handleDatasetClick = (dataset: Dataset) => {
    if (selectionMode) {
      const newSelection = selectedDatasets.includes(dataset.id)
        ? selectedDatasets.filter(id => id !== dataset.id)
        : [...selectedDatasets, dataset.id];
      onSelectionChange?.(newSelection);
    } else {
      onDatasetSelect?.(dataset);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <TableChart />;
      case 'query': return <Query />;
      case 'transformation': return <Transform />;
      default: return <DataObject />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'table': return 'primary';
      case 'query': return 'secondary';
      case 'transformation': return 'info';
      default: return 'default';
    }
  };

  const DatasetCard = ({ dataset }: { dataset: Dataset }) => {
    const isSelected = selectionMode && selectedDatasets.includes(dataset.id);
    
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
        onClick={() => handleDatasetClick(dataset)}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1} flex={1}>
              {getTypeIcon(dataset.type)}
              <Typography variant="h6" component="h3" noWrap>
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
            {dataset.description || 'No description available'}
          </Typography>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Chip 
              label={dataset.type} 
              size="small" 
              color={getTypeColor(dataset.type) as any}
            />
            <Chip 
              label={dataset.is_active ? 'Active' : 'Inactive'} 
              size="small" 
              color={dataset.is_active ? 'success' : 'default'}
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
    );
  };

  const DatasetListItem = ({ dataset }: { dataset: Dataset }) => {
    const isSelected = selectionMode && selectedDatasets.includes(dataset.id);
    
    return (
      <ListItem
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
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={dataset.type} 
                  size="small" 
                  color={getTypeColor(dataset.type) as any}
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading datasets...</Typography>
      </Box>
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
                <MenuItem value="row_count">Row Count</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredDatasets.length} dataset(s)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Dataset List */}
      {filteredDatasets.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Storage sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No datasets found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first dataset'
              }
            </Typography>
            {showCreateButton && !searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
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
      ) : currentViewMode === 'grid' ? (
        <>
          <Grid container spacing={3}>
            {paginatedDatasets.map((dataset) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={dataset.id}>
                <DatasetCard dataset={dataset} />
              </Grid>
            ))}
          </Grid>
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
        </>
      ) : currentViewMode === 'list' ? (
        <>
          <List>
            {paginatedDatasets.map((dataset) => (
              <DatasetListItem key={dataset.id} dataset={dataset} />
            ))}
          </List>
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
        </>
      ) : (
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
                        color={getTypeColor(dataset.type) as any}
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
                        label={dataset.is_active ? 'Active' : 'Inactive'} 
                        size="small" 
                        color={dataset.is_active ? 'success' : 'default'}
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
          />
        </TableContainer>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          {onDatasetSelect ? 'Select' : 'View'}
        </MenuItem>
        <PermissionGate permissions={['dataset.update']}>
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        </PermissionGate>
        <PermissionGate permissions={['dataset.refresh']}>
          <MenuItem onClick={handleRefresh}>
            <Refresh fontSize="small" sx={{ mr: 1 }} />
            Refresh Data
          </MenuItem>
        </PermissionGate>
        <PermissionGate permissions={['dataset.delete']}>
          <MenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ color: 'error.main' }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </PermissionGate>
      </Menu>

      {/* Create Dataset Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Dataset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dataset Name"
            fullWidth
            variant="outlined"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={datasetDescription}
            onChange={(e) => setDatasetDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Dataset Type</InputLabel>
            <Select
              value={datasetType}
              label="Dataset Type"
              onChange={(e) => setDatasetType(e.target.value as any)}
            >
              <MenuItem value="table">Table Dataset</MenuItem>
              <MenuItem value="query">Query Dataset</MenuItem>
              <MenuItem value="transformation">Transformation Dataset</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDataset} 
            variant="contained"
            disabled={!datasetName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Dataset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDataset?.name}"? This action cannot be undone and may affect dashboards and charts that depend on this dataset.
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

export default DatasetList;