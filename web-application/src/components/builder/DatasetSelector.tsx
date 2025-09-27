// web-application/src/components/builder/DatasetSelector.tsx - FIXED VERSION
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
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';

// RTK Query imports
import { useGetDatasetsQuery } from '@/store/api/datasetApi';
import { RootState } from '@/store';
import {Dataset} from '@/types/dataset.types';

// Types to match backend response


interface DatasetSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dataset: Dataset) => void;
  selectedDatasetId?: string;
  workspaceId?: string;
}

// ✅ Helper function to safely get user initials
const getUserInitials = (name: string | null | undefined, email: string | null | undefined): string => {
  if (name && typeof name === 'string') {
    return name.split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  if (email && typeof email === 'string') {
    return email.charAt(0).toUpperCase();
  }
  
  return 'U'; // Default fallback
};

// ✅ Helper function to get display name for owner
const getOwnerDisplayName = (owner?: { id: string; name: string | null; email: string | null }): string => {
  if (!owner) return 'Unknown';
  
  if (owner.name && typeof owner.name === 'string') {
    return owner.name;
  }
  
  if (owner.email && typeof owner.email === 'string') {
    return owner.email;
  }
  
  return 'Unknown User';
};

// ✅ Helper function to get dataset type icon
const getDatasetTypeIcon = (type: string) => {
  switch (type) {
    case 'source':
    case 'table':
      return <SourceIcon fontSize="small" />;
    case 'virtual':
    case 'transformation':
    case 'calculated':
      return <VirtualIcon fontSize="small" />;
    default:
      return <SourceIcon fontSize="small" />;
  }
};

// ✅ Helper function to get dataset type color
const getDatasetTypeColor = (type: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
  switch (type) {
    case 'source':
    case 'table':
      return 'primary';
    case 'virtual':
      return 'secondary';
    case 'transformation':
      return 'success';
    case 'calculated':
      return 'warning';
    case 'sql':
      return 'info';
    default:
      return 'default';
  }
};

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedDatasetId,
  workspaceId
}) => {
  // Get current workspace from Redux if not provided
  const currentWorkspace = useSelector((state: RootState) => state.workspace.currentWorkspace);
  const effectiveWorkspaceId = workspaceId || currentWorkspace?.id;

  // Local state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // RTK Query for datasets
  const {
    data: datasetsResponse,
    isLoading,
    error,
    refetch
  } = useGetDatasetsQuery(
    {
      workspaceId: effectiveWorkspaceId!,
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      type: typeFilter || undefined,
      sortBy: 'updated_at',
      sortDirection: 'desc'
    },
    {
      skip: !effectiveWorkspaceId || !open,
      refetchOnMountOrArgChange: true
    }
  );

  // Extract data from response
  const datasets = datasetsResponse?.datasets || [];
  const totalCount = datasetsResponse?.total || 0;
  const totalPages = datasetsResponse?.pages || 1;

  // Memoized filtered datasets (additional client-side filtering if needed)
  const filteredDatasets = useMemo(() => {
    return datasets; // Server handles filtering, but we can add client-side refinements here
  }, [datasets]);

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  const handleTypeFilter = useCallback((value: string) => {
    setTypeFilter(value);
    setCurrentPage(1); // Reset to first page on filter
  }, []);

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSelectDataset = useCallback((dataset: Dataset) => {
    onSelect(dataset);
    onClose();
  }, [onSelect, onClose]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton variant="text" width="80%" /></TableCell>
          <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width="60%" /></TableCell>
          <TableCell><Skeleton variant="text" width="70%" /></TableCell>
          <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
          <TableCell><Skeleton variant="text" width="50%" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  if (!effectiveWorkspaceId) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Select Dataset
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error">
            No workspace selected. Please select a workspace first.
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: 800 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Select Dataset</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={handleRefresh}
              disabled={isLoading}
              size="small"
              title="Refresh datasets"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              aria-label="close"
              onClick={onClose}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
        
        {isLoading && <LinearProgress sx={{ mt: 1 }} />}
      </DialogTitle>

      <DialogContent sx={{ px: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Current Selection Alert */}
        {selectedDatasetId && (
          <Alert 
            severity="info" 
            sx={{ mx: 3, mb: 2 }}
            icon={<WarningIcon />}
          >
            <Typography variant="body2">
              Currently selected dataset will be replaced
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
              onChange={(e) => handleSearch(e.target.value)}
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
                  onChange={(e) => handleTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="source">Source</MenuItem>
                  <MenuItem value="table">Table</MenuItem>
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
        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '30%' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '10%' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '15%' }}>Updated</TableCell>
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
                  </TableCell>
                </TableRow>
              ) : filteredDatasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm || typeFilter 
                        ? 'No datasets match your search criteria'
                        : 'No datasets available'
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDatasets.map((dataset) => (
                  <TableRow
                    key={dataset.id}
                    hover
                    onClick={() => handleSelectDataset(dataset)}
                    sx={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedDatasetId === dataset.id 
                        ? 'action.selected' 
                        : undefined
                    }}
                  >
                    {/* Name */}
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {dataset.display_name}
                        </Typography>
                        {dataset.name !== dataset.display_name && (
                          <Typography variant="caption" color="text.secondary">
                            {dataset.name}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Chip
                        icon={getDatasetTypeIcon(dataset.type)}
                        label={dataset.type}
                        size="small"
                        color={getDatasetTypeColor(dataset.type)}
                        variant="outlined"
                      />
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 200
                        }}
                        title={dataset.description}
                      >
                        {dataset.description || 'No description'}
                      </Typography>
                    </TableCell>

                    {/* Updated */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(dataset.updated_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>

                    {/* Owner - ✅ FIXED: Safe handling of null/undefined names */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            fontSize: '0.875rem',
                            bgcolor: 'primary.main'
                          }}
                          src={undefined} // No avatar URL in your data
                        >
                          {getUserInitials(dataset.owner?.name, dataset.owner?.email)}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {getOwnerDisplayName(dataset.owner)}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Row count */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {dataset.row_count ? dataset.row_count.toLocaleString() : 'Unknown'}
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
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
              disabled={isLoading}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Typography variant="body2" color="text.secondary">
          Click on a dataset to select it
        </Typography>
      </DialogActions>
    </Dialog>
  );
};

export default DatasetSelector;