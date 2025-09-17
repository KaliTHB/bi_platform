// web-application/src/components/builder/DatasetSelector.tsx
// RTK Query enabled DatasetSelector that matches existing UI patterns

import React, { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Chip,
  Avatar,
  Pagination,
  Alert,
  Skeleton,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  Storage as SourceIcon,
  Transform as VirtualIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// RTK Query imports
import { useGetDatasetsQuery } from '@/store/api/datasetApi';
import { RootState } from '@/store';

// Types to match existing structure
interface Dataset {
  id: string;
  name: string;
  display_name?: string;
  type: 'source' | 'virtual' | 'sql' | 'table' | 'query' | 'transformation' | 'calculated' | 'imported';
  schema?: string;
  connection?: string;
  datasource_ids?: string[];
  owner?: {
    id: string;
    name: string;
    avatar?: string;
  };
  owner_id?: string;
  created_by?: string;
  row_count?: number;
  last_modified?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
  workspace_id?: string;
  status?: string;
  is_active?: boolean;
}

interface DatasetSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dataset: Dataset) => void;
  selectedDatasetId?: string;
  workspaceId?: string;
}

interface GetDatasetsParams {
  workspaceId: string;
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  includeSchema?: boolean;
}

const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedDatasetId,
  workspaceId: propWorkspaceId
}) => {
  // Get current workspace from Redux
  const currentWorkspace = useSelector((state: RootState) => state.workspace.currentWorkspace);
  const workspaceId = propWorkspaceId || currentWorkspace?.id;

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tempSelectedId, setTempSelectedId] = useState<string | undefined>(selectedDatasetId);
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  const itemsPerPage = 10;

  // Build query parameters
  const queryParams: GetDatasetsParams = useMemo(() => ({
    workspaceId: workspaceId || '',
    page: currentPage,
    limit: itemsPerPage,
    search: searchTerm || undefined,
    type: typeFilter || undefined,
    sortBy: 'updated_at',
    sortDirection: 'desc',
    includeSchema: false
  }), [workspaceId, currentPage, searchTerm, typeFilter]);

  // RTK Query hook
  const {
    data: datasetsResponse,
    isLoading,
    isFetching,
    error,
    refetch
  } = useGetDatasetsQuery(queryParams, {
    skip: !workspaceId || !open,
    refetchOnMountOrArgChange: true,
  });

  // Extract data
  const datasets = datasetsResponse?.datasets || [];
  const totalCount = datasetsResponse?.total || 0;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setTempSelectedId(selectedDatasetId);
      setCurrentPage(1);
    }
  }, [open, selectedDatasetId]);

  // Reset page on search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  // Handlers
  const handleDatasetClick = useCallback((dataset: Dataset) => {
    setTempSelectedId(dataset.id);
  }, []);

  const handleSelectDataset = useCallback(() => {
    if (tempSelectedId) {
      const selectedDataset = datasets.find(d => d.id === tempSelectedId);
      if (selectedDataset) {
        onSelect(selectedDataset);
        onClose();
      }
    }
  }, [tempSelectedId, datasets, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setTempSelectedId(selectedDatasetId);
    setSearchTerm('');
    setTypeFilter('');
    onClose();
  }, [selectedDatasetId, onClose]);

  // Format helpers
  const formatRowCount = (count?: number) => {
    if (!count) return 'N/A';
    return count.toLocaleString();
  };

  const getDatasetIcon = (type: string) => {
    return ['virtual', 'transformation', 'calculated'].includes(type) 
      ? <VirtualIcon color="primary" /> 
      : <SourceIcon color="action" />;
  };

  const getDatasetTypeColor = (type: string): 'primary' | 'secondary' | 'default' => {
    switch (type) {
      case 'virtual':
      case 'transformation':
      case 'calculated':
        return 'primary';
      case 'sql':
      case 'query':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <>
      {[...Array(itemsPerPage)].map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton variant="text" width="80%" /></TableCell>
          <TableCell><Skeleton variant="rectangular" width={60} height={20} /></TableCell>
          <TableCell><Skeleton variant="text" width="60%" /></TableCell>
          <TableCell><Skeleton variant="text" width="70%" /></TableCell>
          <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width="50%" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '70vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography variant="h6">Select Dataset</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => refetch()} size="small" disabled={isLoading}>
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {isFetching && <LinearProgress />}

      <DialogContent sx={{ p: 0 }}>
        {/* Warning Alert */}
        {selectedDatasetId && (
          <Alert 
            severity="warning" 
            icon={<WarningIcon />}
            sx={{ m: 3, mb: 2 }}
          >
            <Typography variant="body2">
              <strong>Warning!</strong> Changing the dataset may break the chart if the chart relies on columns or metadata that does not exist in the target dataset.
            </Typography>
          </Alert>
        )}

        {/* Search and Filters */}
        <Box sx={{ p: 3, pt: selectedDatasetId ? 1 : 3, pb: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              placeholder="Search datasets..."
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
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={typeFilter}
                  label="Type"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="source">Source</MenuItem>
                  <MenuItem value="virtual">Virtual</MenuItem>
                  <MenuItem value="sql">SQL</MenuItem>
                  <MenuItem value="transformation">Transformation</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="body2" color="text.secondary">
                {isLoading 
                  ? 'Loading...' 
                  : `Showing ${datasets.length} of ${totalCount} datasets`
                }
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Dataset Table */}
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '30%' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '10%' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>Schema</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>Connection</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '15%' }}>Owner</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '10%' }}>Rows</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <LoadingSkeleton />
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="error">
                      Error loading datasets. Please try again.
                    </Typography>
                    <Button onClick={() => refetch()} size="small" sx={{ mt: 1 }}>
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || typeFilter ? 'No datasets match your criteria' : 'No datasets available'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                datasets.map((dataset) => (
                  <TableRow
                    key={dataset.id}
                    hover
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: dataset.id === tempSelectedId ? 'action.selected' : 'transparent',
                      '&:hover': {
                        backgroundColor: dataset.id === tempSelectedId 
                          ? 'action.selected' 
                          : 'action.hover'
                      }
                    }}
                    onClick={() => handleDatasetClick(dataset)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getDatasetIcon(dataset.type)}
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: dataset.id === tempSelectedId ? 600 : 400,
                              color: dataset.id === tempSelectedId ? 'primary.main' : 'text.primary'
                            }}
                          >
                            {dataset.display_name || dataset.name}
                          </Typography>
                          {dataset.display_name && (
                            <Typography variant="caption" color="text.secondary">
                              {dataset.name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={dataset.type} 
                        size="small" 
                        variant="outlined"
                        color={getDatasetTypeColor(dataset.type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dataset.schema || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{dataset.connection || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      {dataset.owner ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            sx={{ width: 24, height: 24, fontSize: 10 }}
                            src={dataset.owner.avatar}
                          >
                            {dataset.owner.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                          <Typography variant="body2" color="text.secondary">
                            {dataset.owner.name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">N/A</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatRowCount(dataset.row_count)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3, gap: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, page) => setCurrentPage(page)}
              color="primary"
              size="small"
              disabled={isLoading}
            />
            <Typography variant="body2" color="text.secondary">
              Page {currentPage} of {totalPages}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: 1, 
        borderColor: 'divider',
        p: 3,
        justifyContent: 'space-between'
      }}>
        <Box>
          {tempSelectedId && (
            <Typography variant="body2" color="text.secondary">
              Selected: {datasets.find(d => d.id === tempSelectedId)?.display_name || 
                       datasets.find(d => d.id === tempSelectedId)?.name}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleClose} variant="outlined" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            disabled={!tempSelectedId || isLoading}
            onClick={handleSelectDataset}
          >
            Select Dataset
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DatasetSelector;