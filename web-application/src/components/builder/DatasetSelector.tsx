// COMPLETE FIX for DatasetSelector.tsx - Replace the entire file content

'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Button,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  Dataset as DatasetIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { Dataset } from '@/types/dashboard.types';

interface DatasetSelectorProps {
  datasets: Dataset[];
  selectedDataset?: string;
  onSelect: (dataset: Dataset) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets,
  selectedDataset,
  onSelect,
  onRefresh,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter datasets based on search term (FIXED - removed tags)
  const filteredDatasets = useMemo(() => {
    if (!searchTerm) return datasets;
    
    const searchLower = searchTerm.toLowerCase();
    return datasets.filter(dataset => 
      dataset.name.toLowerCase().includes(searchLower) ||
      dataset.description?.toLowerCase().includes(searchLower)
      // Removed: dataset.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }, [datasets, searchTerm]);

  const formatLastUpdated = (date: Date | string) => {
    const d = new Date(date);
const now = Date.now();
const diffMs = now - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  // REMOVED: getDatasetStatusColor function since status doesn't exist

  return (
    <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Select Dataset
          </Typography>
          <Tooltip title="Refresh datasets">
            <IconButton onClick={onRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search datasets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Dataset List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredDatasets.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'No datasets found matching your search' : 'No datasets available'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredDatasets.map((dataset) => (
              <ListItem key={dataset.id} disablePadding>
                <ListItemButton
                  selected={selectedDataset === dataset.id}
                  onClick={() => onSelect(dataset)}
                  sx={{
                    py: 2,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.50',
                      '&:hover': {
                        backgroundColor: 'primary.100',
                      },
                    },
                  }}
                >
                  <ListItemIcon>
                    <DatasetIcon color={selectedDataset === dataset.id ? 'primary' : 'action'} />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" component="div">
                          {dataset.name}
                        </Typography>
                        {selectedDataset === dataset.id && (
                          <CheckCircleIcon color="primary" fontSize="small" />
                        )}
                        {/* REMOVED: Status chip since dataset.status doesn't exist */}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {dataset.description && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {dataset.description}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                          {/* Show active status using is_active property */}
                          <Typography variant="caption" color="text.secondary">
                            Updated {formatLastUpdated(dataset.updated_at)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />

                  <Box sx={{ ml: 1 }}>
                    <Tooltip title="Dataset info">
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {filteredDatasets.length} dataset{filteredDatasets.length !== 1 ? 's' : ''} available
        </Typography>
      </Box>
    </Paper>
  );
};