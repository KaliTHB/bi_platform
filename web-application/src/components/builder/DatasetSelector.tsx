// File: web-application/src/components/builder/DatasetSelector.tsx
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

  // Filter datasets based on search term
  const filteredDatasets = useMemo(() => {
    if (!searchTerm) return datasets;
    
    const searchLower = searchTerm.toLowerCase();
    return datasets.filter(dataset => 
      dataset.name.toLowerCase().includes(searchLower) ||
      dataset.description?.toLowerCase().includes(searchLower) ||
      dataset.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }, [datasets, searchTerm]);

  const formatLastUpdated = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const getDatasetStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'updating': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Select Dataset
          </Typography>
          <Tooltip title="Refresh datasets">
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
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
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
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
            {!searchTerm && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={onRefresh}
                sx={{ mt: 2 }}
                disabled={loading}
              >
                Refresh
              </Button>
            )}
          </Box>
        ) : (
          <List dense>
            {filteredDatasets.map((dataset) => (
              <React.Fragment key={dataset.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={selectedDataset === dataset.id}
                    onClick={() => onSelect(dataset)}
                    sx={{
                      py: 1.5,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.50',
                        '&:hover': {
                          backgroundColor: 'primary.100'
                        }
                      }
                    }}
                  >
                    <ListItemIcon>
                      {selectedDataset === dataset.id ? (
                        <CheckCircleIcon color="primary" />
                      ) : (
                        <DatasetIcon color="action" />
                      )}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {dataset.name}
                          </Typography>
                          {dataset.status && (
                            <Chip
                              size="small"
                              label={dataset.status}
                              color={getDatasetStatusColor(dataset.status) as any}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          {dataset.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                mb: 0.5
                              }}
                            >
                              {dataset.description}
                            </Typography>
                          )}
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {dataset.row_count && (
                              <Typography variant="caption" color="text.secondary">
                                {dataset.row_count.toLocaleString()} rows
                              </Typography>
                            )}
                            {dataset.size && (
                              <Typography variant="caption" color="text.secondary">
                                • {dataset.size}
                              </Typography>
                            )}
                          </Box>
                          
                          {dataset.tags && dataset.tags.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                              {dataset.tags.slice(0, 3).map((tag) => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              ))}
                              {dataset.tags.length > 3 && (
                                <Chip
                                  label={`+${dataset.tags.length - 3}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              )}
                            </Box>
                          )}
                          
                          <Typography variant="caption" color="text.secondary">
                            Updated {formatLastUpdated(dataset.updated_at)}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <Tooltip title="Dataset information">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle info click
                          console.log('Dataset info:', dataset);
                        }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Footer */}
      {selectedDataset && (
        <Paper elevation={1} sx={{ p: 2, mt: 1 }}>
          <Typography variant="body2" color="primary" gutterBottom>
            Dataset Selected
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Your chart will use data from the selected dataset. Configure your chart settings to visualize the data.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};