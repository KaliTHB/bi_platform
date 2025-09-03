// src/components/shared/BaseListComponent.tsx
// Generic reusable list component for Charts, Dashboards, Datasets, and DataSources

import React, { useState, useEffect, useMemo, ReactNode } from 'react';
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
  ListItemButton,
  Skeleton
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  ViewList,
  ViewModule,
  TableChart,
  Refresh
} from '@mui/icons-material';

import { PermissionGate } from '@/components/shared/PermissionGate';

// =============================================================================
// Base Types
// =============================================================================

interface BaseListItem {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  workspace_id?: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface SortOption {
  value: string;
  label: string;
}

interface ColumnDefinition {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: any) => ReactNode;
}

interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (item: any) => void;
  permission?: string;
  color?: 'inherit' | 'error';
  divider?: boolean;
}

// =============================================================================
// Component Props
// =============================================================================

interface BaseListComponentProps<T extends BaseListItem> {
  // Data
  items: T[];
  loading?: boolean;
  error?: string;
  
  // Display
  title: string;
  emptyStateMessage?: string;
  emptyStateIcon?: ReactNode;
  defaultViewMode?: 'grid' | 'list' | 'table';
  itemsPerPage?: number;
  
  // Functionality
  onItemSelect?: (item: T) => void;
  onItemCreate?: (data: any) => Promise<void>;
  onItemEdit?: (item: T) => void;
  onItemDelete?: (itemId: string) => Promise<void>;
  onItemDuplicate?: (itemId: string) => Promise<void>;
  customActions?: ActionMenuItem[];
  
  // Selection
  selectionMode?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // UI Configuration
  showCreateButton?: boolean;
  showFilters?: boolean;
  createButtonLabel?: string;
  createPermission?: string;
  
  // Filtering and Sorting
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  filters?: {
    key: keyof T;
    label: string;
    options: FilterOption[];
  }[];
  sortOptions?: SortOption[];
  defaultSort?: string;
  
  // Rendering
  renderCard?: (item: T, isSelected: boolean, onMenuClick: (e: React.MouseEvent, item: T) => void) => ReactNode;
  renderListItem?: (item: T, isSelected: boolean, onMenuClick: (e: React.MouseEvent, item: T) => void) => ReactNode;
  tableColumns?: ColumnDefinition[];
  
  // Create Dialog
  createDialogTitle?: string;
  renderCreateForm?: (formData: any, setFormData: (data: any) => void, formValid: boolean) => ReactNode;
  validateCreateForm?: (formData: any) => boolean;
  getCreateData?: (formData: any) => any;
  
  // Display Info Extractor
  getDisplayInfo?: (item: T) => {
    name: string;
    description: string;
    updatedAt: string;
    [key: string]: any;
  };
}

// =============================================================================
// Main Component
// =============================================================================

function BaseList<T extends BaseListItem>({
  // Data
  items = [],
  loading = false,
  error,
  
  // Display
  title,
  emptyStateMessage = 'No items found',
  emptyStateIcon,
  defaultViewMode = 'grid',
  itemsPerPage = 12,
  
  // Functionality
  onItemSelect,
  onItemCreate,
  onItemEdit,
  onItemDelete,
  onItemDuplicate,
  customActions = [],
  
  // Selection
  selectionMode = false,
  selectedItems = [],
  onSelectionChange,
  
  // UI Configuration
  showCreateButton = true,
  showFilters = true,
  createButtonLabel = 'Create',
  createPermission,
  
  // Filtering and Sorting
  searchPlaceholder = 'Search items...',
  searchFields = ['name', 'display_name', 'description'] as (keyof T)[],
  filters = [],
  sortOptions = [
    { value: 'updated_at', label: 'Recently Updated' },
    { value: 'name', label: 'Name' },
    { value: 'created_at', label: 'Recently Created' }
  ],
  defaultSort = 'updated_at',
  
  // Rendering
  renderCard,
  renderListItem,
  tableColumns = [],
  
  // Create Dialog
  createDialogTitle = `Create ${title.slice(0, -1)}`, // Remove 's' from plural
  renderCreateForm,
  validateCreateForm,
  getCreateData,
  
  // Display Info Extractor
  getDisplayInfo = (item: T) => ({
    name: item.display_name || item.name || 'Untitled',
    description: item.description || 'No description available',
    updatedAt: item.updated_at || item.created_at || '',
  })
}: BaseListComponentProps<T>) {
  
  // =============================================================================
  // State Management
  // =============================================================================
  
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    filters.reduce((acc, filter) => ({ ...acc, [filter.key as string]: 'all' }), {})
  );
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(itemsPerPage);
  const [createFormData, setCreateFormData] = useState({});

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Search filter
      const matchesSearch = !searchQuery || 
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      
      // Custom filters
      const matchesFilters = filters.every(filter => {
        const filterValue = filterValues[filter.key as string];
        return filterValue === 'all' || item[filter.key] === filterValue;
      });
      
      return matchesSearch && matchesFilters;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const aName = a.display_name || a.name || '';
          const bName = b.display_name || b.name || '';
          return aName.localeCompare(bName);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [items, searchQuery, searchFields, filters, filterValues, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedItems.length / rowsPerPage);
  const paginatedItems = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedItems.slice(startIndex, endIndex);
  }, [filteredAndSortedItems, page, rowsPerPage]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleItemClick = (item: T) => {
    if (selectionMode) {
      const newSelection = selectedItems.includes(item.id)
        ? selectedItems.filter(id => id !== item.id)
        : [...selectedItems, item.id];
      onSelectionChange?.(newSelection);
    } else {
      onItemSelect?.(item);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: T) => {
    event.stopPropagation();
    setSelectedItem(item);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedItem && onItemEdit) {
      onItemEdit(selectedItem);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedItem && onItemDelete) {
      try {
        await onItemDelete(selectedItem.id);
        setDeleteDialogOpen(false);
        setSelectedItem(null);
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleDuplicate = async () => {
    if (selectedItem && onItemDuplicate) {
      try {
        await onItemDuplicate(selectedItem.id);
      } catch (error) {
        console.error('Failed to duplicate item:', error);
      }
    }
    handleMenuClose();
  };

  const handleCreateItem = async () => {
    if (!onItemCreate) return;

    try {
      const data = getCreateData ? getCreateData(createFormData) : createFormData;
      await onItemCreate(data);
      setCreateFormData({});
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(paginatedItems.map(item => item.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterKey]: value }));
    setPage(0);
  };

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderFiltersAndControls = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        {/* Search */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Filters */}
        {showFilters && filters.map((filter) => (
          <Grid item xs={12} md={2} key={filter.key as string}>
            <FormControl fullWidth size="small">
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={filterValues[filter.key as string] || 'all'}
                label={filter.label}
                onChange={(e) => handleFilterChange(filter.key as string, e.target.value)}
              >
                <MenuItem value="all">All {filter.label}</MenuItem>
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        ))}

        {/* Sort */}
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* View Controls */}
        <Grid item xs={12} md={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Showing {paginatedItems.length} of {filteredAndSortedItems.length} items
            </Typography>
            
            <Box display="flex" gap={1}>
              <Tooltip title="Grid View">
                <IconButton 
                  onClick={() => setViewMode('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  size="small"
                >
                  <ViewModule />
                </IconButton>
              </Tooltip>
              <Tooltip title="List View">
                <IconButton 
                  onClick={() => setViewMode('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  size="small"
                >
                  <ViewList />
                </IconButton>
              </Tooltip>
              {tableColumns.length > 0 && (
                <Tooltip title="Table View">
                  <IconButton 
                    onClick={() => setViewMode('table')}
                    color={viewMode === 'table' ? 'primary' : 'default'}
                    size="small"
                  >
                    <TableChart />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Selection controls */}
      {selectionMode && (
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Checkbox
                indeterminate={selectedItems.length > 0 && selectedItems.length < paginatedItems.length}
                checked={paginatedItems.length > 0 && selectedItems.length === paginatedItems.length}
                onChange={handleSelectAll}
              />
              <Typography variant="body2">
                {selectedItems.length} of {filteredAndSortedItems.length} selected
              </Typography>
            </Box>
            {selectedItems.length > 0 && (
              <Button size="small" onClick={() => onSelectionChange?.([])}>
                Clear Selection
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );

  const renderDefaultCard = (item: T, isSelected: boolean, onMenuClick: (e: React.MouseEvent, item: T) => void) => {
    const displayInfo = getDisplayInfo(item);
    
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
              transform: 'translateY(-2px)',
              boxShadow: theme => theme.shadows[4]
            },
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => handleItemClick(item)}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box display="flex" alignItems="center" gap={1} flex={1} minWidth={0}>
                {selectionMode && (
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                    size="small"
                  />
                )}
                
                <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                  {displayInfo.name}
                </Typography>
              </Box>
              
              <IconButton
                size="small"
                onClick={(e) => onMenuClick(e, item)}
                sx={{ ml: 1 }}
              >
                <MoreVert fontSize="small" />
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

            <Typography variant="caption" color="text.secondary">
              Updated {displayInfo.updatedAt ? 
                new Date(displayInfo.updatedAt).toLocaleDateString() : 
                'Unknown'
              }
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderDefaultListItem = (item: T, isSelected: boolean, onMenuClick: (e: React.MouseEvent, item: T) => void) => {
    const displayInfo = getDisplayInfo(item);
    
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
          onClick={() => handleItemClick(item)}
          sx={{ py: 1.5 }}
        >
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleItemClick(item);
              }}
              sx={{ mr: 1 }}
            />
          )}

          <ListItemAvatar sx={{ minWidth: 40 }}>
            <Avatar>{displayInfo.name.charAt(0).toUpperCase()}</Avatar>
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
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {displayInfo.description}
            </Typography>
          </Box>

          <IconButton
            onClick={(e) => onMenuClick(e, item)}
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
                  indeterminate={selectedItems.length > 0 && selectedItems.length < paginatedItems.length}
                  checked={paginatedItems.length > 0 && selectedItems.length === paginatedItems.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
            )}
            {tableColumns.map((column) => (
              <TableCell key={column.key} align={column.align || 'left'}>
                {column.label}
              </TableCell>
            ))}
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedItems.map((item) => {
            const isSelected = selectionMode && selectedItems.includes(item.id);
            
            return (
              <TableRow
                key={item.id}
                hover
                selected={isSelected}
                onClick={() => handleItemClick(item)}
                sx={{ cursor: 'pointer' }}
              >
                {selectionMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleItemClick(item);
                      }}
                    />
                  </TableCell>
                )}
                {tableColumns.map((column) => (
                  <TableCell key={column.key} align={column.align || 'left'}>
                    {column.render ? column.render(item) : String(item[column.key as keyof T] || '')}
                  </TableCell>
                ))}
                <TableCell align="center">
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
        {emptyStateIcon || <Box sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}>📋</Box>}
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {emptyStateMessage}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {searchQuery || Object.values(filterValues).some(v => v !== 'all')
            ? 'Try adjusting your search or filters'
            : 'Get started by creating your first item'
          }
        </Typography>
        {showCreateButton && onItemCreate && (
          <PermissionGate permissions={createPermission ? [createPermission] : undefined}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              {createButtonLabel}
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
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        
        {showCreateButton && onItemCreate && (
          <PermissionGate permissions={createPermission ? [createPermission] : undefined}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              {createButtonLabel}
            </Button>
          </PermissionGate>
        )}
      </Box>

      {/* Filters and Controls */}
      {showFilters && renderFiltersAndControls()}

      {/* Content */}
      {loading ? (
        renderLoadingState()
      ) : filteredAndSortedItems.length === 0 ? (
        renderEmptyState()
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {paginatedItems.map((item) => {
            const isSelected = selectionMode && selectedItems.includes(item.id);
            return renderCard ? renderCard(item, isSelected, handleMenuClick) : renderDefaultCard(item, isSelected, handleMenuClick);
          })}
        </Grid>
      ) : viewMode === 'list' ? (
        <List sx={{ width: '100%' }}>
          {paginatedItems.map((item) => {
            const isSelected = selectionMode && selectedItems.includes(item.id);
            return renderListItem ? renderListItem(item, isSelected, handleMenuClick) : renderDefaultListItem(item, isSelected, handleMenuClick);
          })}
        </List>
      ) : (
        renderTableView()
      )}

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredAndSortedItems.length}
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
        <MenuItem onClick={() => handleItemClick(selectedItem!)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View
        </MenuItem>

        {onItemEdit && (
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}

        {onItemDuplicate && (
          <MenuItem onClick={handleDuplicate}>
            <Add fontSize="small" sx={{ mr: 1 }} />
            Duplicate
          </MenuItem>
        )}

        {customActions.map((action) => (
          <React.Fragment key={action.key}>
            {action.divider && <Divider />}
            <PermissionGate permissions={action.permission ? [action.permission] : undefined}>
              <MenuItem
                onClick={() => {
                  action.onClick(selectedItem!);
                  handleMenuClose();
                }}
                sx={{ color: action.color === 'error' ? 'error.main' : 'inherit' }}
              >
                {action.icon && React.cloneElement(action.icon as React.ReactElement, { 
                  fontSize: 'small', 
                  sx: { mr: 1 } 
                })}
                {action.label}
              </MenuItem>
            </PermissionGate>
          </React.Fragment>
        ))}

        {onItemDelete && (
          <>
            <Divider />
            <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedItem ? getDisplayInfo(selectedItem).name : ''}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      {renderCreateForm && (
        <Dialog
          open={createDialogOpen}
          onClose={() => {
            setCreateDialogOpen(false);
            setCreateFormData({});
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>{createDialogTitle}</DialogTitle>
          <DialogContent>
            {renderCreateForm(createFormData, setCreateFormData, validateCreateForm ? validateCreateForm(createFormData) : true)}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setCreateDialogOpen(false);
                setCreateFormData({});
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateItem}
              variant="contained"
              disabled={validateCreateForm ? !validateCreateForm(createFormData) : false}
            >
              {createButtonLabel}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

export default BaseList;