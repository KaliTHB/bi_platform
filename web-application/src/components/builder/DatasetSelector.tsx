// web-application/src/components/builder/DatasetSelector.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Alert,
  Pagination,
  Box,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Storage as StorageIcon,
  TableChart as TableIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useDatasets } from '@/hooks/useDatasets';
// =============================================================================
// Types and Interfaces
// =============================================================================

interface Dataset {
  id: string;
  name: string;
  type: 'virtual' | 'physical';
  schema?: string;
  connection?: string;
  owner?: {
    id: string;
    name: string;
    avatar?: string;
  };
  rowCount?: number;
  lastModified?: string;
  description?: string;
}

interface DatasetSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dataset: Dataset) => void;
  selectedDatasetId?: string;
}

// =============================================================================
// Mock Data (replace with API call)
// =============================================================================

const mockDatasets: Dataset[] = [
  {
    id: '1',
    name: 'video_game_sales_modified',
    type: 'virtual',
    schema: 'public',
    connection: 'examples',
    owner: { id: '1', name: 'John Doe', avatar: 'JD' },
    rowCount: 16598,
    lastModified: '2024-12-15T10:30:00Z'
  },
  {
    id: '2', 
    name: 'high_selling_games',
    type: 'virtual',
    schema: 'public',
    connection: 'examples',
    owner: { id: '1', name: 'John Doe', avatar: 'JD' },
    rowCount: 3421,
    lastModified: '2024-12-14T15:45:00Z'
  },
  {
    id: '3',
    name: 'test_data',
    type: 'virtual', 
    schema: 'public',
    connection: 'examples',
    owner: { id: '2', name: 'Sarah Admin', avatar: 'SA' },
    rowCount: 1000,
    lastModified: '2024-12-13T09:15:00Z'
  },
  {
    id: '4',
    name: 'canton_map_switzerland',
    type: 'physical',
    schema: 'public',
    connection: 'examples', 
    owner: { id: '2', name: 'Sarah Admin', avatar: 'SA' },
    rowCount: 26,
    lastModified: '2024-12-12T14:20:00Z'
  },
  {
    id: '5',
    name: 'users',
    type: 'physical',
    schema: 'public',
    connection: 'examples',
    owner: { id: '1', name: 'John Doe', avatar: 'JD' },
    rowCount: 5420,
    lastModified: '2024-12-11T11:30:00Z'
  }
];

// =============================================================================
// Dataset Selector Component
// =============================================================================

const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  open,
  onClose,
  onSelect,
  selectedDatasetId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const {
    datasets,
    loading,
    error,
    refreshDatasets,
    getDatasetById
  } = useDatasets();
  const [filteredDatasets, setFilteredDatasets] = useState<Dataset[]>(mockDatasets);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDatasets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDatasets = filteredDatasets.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    const filtered = datasets.filter(dataset =>
      dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) 
      //dataset.schema.toLowerCase().includes(searchTerm.toLowerCase()) ||
      //dataset.connection.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDatasets(filtered);
    setCurrentPage(1);
  }, [searchTerm, datasets]);
  

  const handleDatasetSelect = (dataset: Dataset) => {
    onSelect(dataset);
    onClose();
  };

  const formatRowCount = (count?: number) => {
    if (!count) return 'N/A';
    return count.toLocaleString();
  };

  const formatLastModified = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '70vh'
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
        <Typography variant="h6">Change dataset</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Warning Alert */}
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ m: 3, mb: 2 }}
          onClose={() => {}} // Add close handler if needed
        >
          <Typography variant="body2">
            <strong>Warning!</strong> Changing the dataset may break the chart if the chart relies on columns or metadata that does not exist in the target dataset
          </Typography>
        </Alert>

        {/* Search Bar */}
        <Box sx={{ p: 3, pt: 1, pb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search / Filter"
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
        </Box>

        {/* Dataset Table */}
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Schema</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Connection</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Owners</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDatasets.map((dataset) => (
                <TableRow
                  key={dataset.id}
                  hover
                  sx={{ 
                    cursor: 'pointer',
                    backgroundColor: dataset.id === selectedDatasetId ? 'action.selected' : undefined
                  }}
                  onClick={() => handleDatasetSelect(dataset)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {dataset.type === 'virtual' ? <StorageIcon fontSize="small" /> : <TableIcon fontSize="small" />}
                      <Typography 
                        color="primary" 
                        sx={{ 
                          fontWeight: dataset.id === selectedDatasetId ? 600 : 400,
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {dataset.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={dataset.type} 
                      size="small" 
                      variant="outlined"
                      color={dataset.type === 'virtual' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{dataset.schema}</TableCell>
                  <TableCell>{dataset.connection}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        sx={{ width: 24, height: 24, fontSize: 10 }}
                        src={dataset.owner.avatar}
                      >
                        {dataset.owner.avatar || dataset.owner.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        {dataset.owner.name}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size="small"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 2 }}>
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredDatasets.length)} of {filteredDatasets.length}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: 1, 
        borderColor: 'divider',
        p: 3,
        justifyContent: 'space-between'
      }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          variant="contained" 
          disabled={!selectedDatasetId}
          onClick={() => {
            const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
            if (selectedDataset) {
              handleDatasetSelect(selectedDataset);
            }
          }}
        >
          Select Dataset
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatasetSelector;