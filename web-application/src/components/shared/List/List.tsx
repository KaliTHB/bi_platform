// web-application/src/components/shared/List/List.tsx
import React, { useState, useMemo, ReactNode } from 'react';
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
  List as MuiList,
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
  Alert,
  CircularProgress,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Search,
  ViewList,
  ViewModule,
  TableChart,
  FilterList,
  Refresh,
} from '@mui/icons-material';

// Types
export type ViewMode = 'grid' | 'list' | 'table';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
  count?: number;
}

export interface SortOption {
  key: string;
  label: string;
  field: string;
  direction?: 'asc' | 'desc';
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (item: any) => ReactNode;
}

export interface ListAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (item: any) => void;
  show?: (item: any) => boolean;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

export interface ListProps<T = any> {
  // Data
  items: T[];
  loading?: boolean;
  error?: string | null;
  
  // Display
  title: string;
  emptyMessage?: string;
  
  // View modes
  viewMode?: ViewMode;
  supportedViewModes?: ViewMode[];
  onViewModeChange?: (mode: ViewMode) => void;
  
  // Selection
  selectionMode?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (itemIds: string[]) => void;
  getItemId?: (item: T) => string;
  
  // Search & Filter
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: string[];
  filters?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
  
  // Sorting
  sortOptions?: SortOption[];
  defaultSort?: string;
  onSortChange?: (sortBy: string) => void;
  
  // Pagination
  pagination?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  
  // Actions
  primaryAction?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    show?: boolean;
  };
  itemActions?: ListAction[];
  bulkActions?: ListAction[];
  
  // Renderers
  renderGridItem?: (item: T, isSelected?: boolean) => ReactNode;
  renderListItem?: (item: T, isSelected?: boolean) => ReactNode;
  tableColumns?: TableColumn[];
  
  // Callbacks
  onItemClick?: (item: T) => void;
  onRefresh?: () => void;
  
  // Styling
  headerActions?: ReactNode;
  showHeader?: boolean;
}

export const List = <T extends Record<string, any>>({
  items,
  loading = false,
  error = null,
  title,
  emptyMessage = 'No items found',
  viewMode = 'grid',
  supportedViewModes = ['grid', 'list', 'table'],
  onViewModeChange,
  selectionMode = false,
  selectedItems = [],
  onSelectionChange,
  getItemId = (item) => item.id,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchFields = ['name', 'display_name', 'title'],
  filters = [],
  activeFilters = {},
  onFilterChange,
  sortOptions = [],
  defaultSort = 'updated_at',
  onSortChange,
  pagination = true,
  page = 0,
  rowsPerPage = 12,
  totalItems,
  onPageChange,
  onRowsPerPageChange,
  primaryAction,
  itemActions = [],
  bulkActions = [],
  renderGridItem,
  renderListItem,
  tableColumns = [],
  onItemClick,
  onRefresh,
  headerActions,
  showHeader = true,
}: ListProps<T>) => {
  // Local state
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(viewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState(defaultSort);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  // Computed values
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Apply search
    if (searchQuery && searchable) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(query);
        })
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(item => item[key] === value);
      }
    });

    // Apply sorting
    if (currentSort) {
      const sortOption = sortOptions.find(s => s.key === currentSort);
      if (sortOption) {
        result.sort((a, b) => {
          const aValue = a[sortOption.field];
          const bValue = b[sortOption.field];
          const direction = sortOption.direction === 'desc' ? -1 : 1;
          
          if (aValue < bValue) return -1 * direction;
          if (aValue > bValue) return 1 * direction;
          return 0;
        });
      }
    }

    return result;
  }, [items, searchQuery, activeFilters, currentSort, searchFields, sortOptions, searchable]);

  const paginatedItems = useMemo(() => {
    if (!pagination) return filteredItems;
    const start = page * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, pagination, page, rowsPerPage]);

  const displayedTotal = totalItems ?? filteredItems.length;

  // Event handlers
  const handleViewModeChange = (mode: ViewMode) => {
    setCurrentViewMode(mode);
    onViewModeChange?.(mode);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters, [key]: value };
    onFilterChange?.(newFilters);
  };

  const handleSortChange = (sortKey: string) => {
    setCurrentSort(sortKey);
    onSortChange?.(sortKey);
  };

  const handleItemSelect = (item: T) => {
    if (!selectionMode) return;
    
    const itemId = getItemId(item);
    const newSelection = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = () => {
    if (!selectionMode) return;
    
    const allSelected = paginatedItems.length === selectedItems.length;
    const newSelection = allSelected ? [] : paginatedItems.map(getItemId);
    onSelectionChange?.(newSelection);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: T) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleActionClick = (action: ListAction, item: T) => {
    action.onClick(item);
    handleMenuClose();
  };

  // Render functions
  const renderViewModeToggle = () => {
    if (supportedViewModes.length <= 1) return null;

    const getNextMode = () => {
      const currentIndex = supportedViewModes.indexOf(currentViewMode);
      const nextIndex = (currentIndex + 1) % supportedViewModes.length;
      return supportedViewModes[nextIndex];
    };

    const getViewModeIcon = (mode: ViewMode) => {
      switch (mode) {
        case 'grid': return <ViewModule />;
        case 'list': return <ViewList />;
        case 'table': return <TableChart />;
        default: return <ViewModule />;
      }
    };

    const nextMode = getNextMode();

    return (
      <Tooltip title={`Switch to ${nextMode} view`}>
        <IconButton onClick={() => handleViewModeChange(nextMode)}>
          {getViewModeIcon(nextMode)}
        </IconButton>
      </Tooltip>
    );
  };

  const renderFilters = () => {
    const showFilters = searchable || filters.length > 0 || sortOptions.length > 0;
    if (!showFilters) return null;

    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {searchable && (
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          )}

          {filters.map((filter) => (
            <Grid item xs={12} sm={6} md={2} key={filter.key}>
              <FormControl fullWidth size="small">
                <InputLabel>{filter.label}</InputLabel>
                <Select
                  value={activeFilters[filter.key] || 'all'}
                  label={filter.label}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value={filter.value}>
                    {filter.label}
                    {filter.count !== undefined && ` (${filter.count})`}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          ))}

          {sortOptions.length > 0 && (
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={currentSort}
                  label="Sort by"
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option.key} value={option.key}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {onRefresh && (
            <Grid item>
              <Tooltip title="Refresh">
                <IconButton onClick={onRefresh} disabled={loading}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  const renderGridView = () => {
    if (!renderGridItem) {
      return (
        <Alert severity="info">
          Grid view renderer not provided
        </Alert>
      );
    }

    return (
      <Grid container spacing={2}>
        {paginatedItems.map((item) => {
          const itemId = getItemId(item);
          const isSelected = selectedItems.includes(itemId);
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={itemId}>
              {renderGridItem(item, isSelected)}
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderListView = () => {
    if (!renderListItem) {
      return (
        <Alert severity="info">
          List view renderer not provided
        </Alert>
      );
    }

    return (
      <MuiList>
        {paginatedItems.map((item) => {
          const itemId = getItemId(item);
          const isSelected = selectedItems.includes(itemId);
          
          return renderListItem(item, isSelected);
        })}
      </MuiList>
    );
  };

  const renderTableView = () => {
    if (tableColumns.length === 0) {
      return (
        <Alert severity="info">
          Table columns not configured
        </Alert>
      );
    }

    return (
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
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  style={{ width: column.width }}
                >
                  {column.label}
                </TableCell>
              ))}
              {itemActions.length > 0 && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedItems.map((item) => {
              const itemId = getItemId(item);
              const isSelected = selectedItems.includes(itemId);
              
              return (
                <TableRow key={itemId} selected={isSelected}>
                  {selectionMode && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleItemSelect(item)}
                      />
                    </TableCell>
                  )}
                  {tableColumns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'left'}
                      onClick={() => onItemClick?.(item)}
                      style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                    >
                      {column.render ? column.render(item) : item[column.key]}
                    </TableCell>
                  ))}
                  {itemActions.length > 0 && (
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, item)}
                      >
                        <Search />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderContent = () => {
    switch (currentViewMode) {
      case 'grid':
        return renderGridView();
      case 'list':
        return renderListView();
      case 'table':
        return renderTableView();
      default:
        return renderGridView();
    }
  };

  const renderPagination = () => {
    if (!pagination || displayedTotal <= rowsPerPage) return null;

    return (
      <TablePagination
        component="div"
        count={displayedTotal}
        page={page}
        onPageChange={(_, newPage) => onPageChange?.(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value))}
        rowsPerPageOptions={[12, 24, 48, 96]}
      />
    );
  };

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
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
      {showHeader && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            {renderViewModeToggle()}
            
            {headerActions}
            
            {primaryAction && primaryAction.show !== false && (
              <Button
                variant="contained"
                startIcon={primaryAction.icon}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Bulk Actions */}
      {selectionMode && selectedItems.length > 0 && bulkActions.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2">
              {selectedItems.length} items selected
            </Typography>
            {bulkActions.map((action) => (
              <Button
                key={action.key}
                size="small"
                startIcon={action.icon}
                color={action.color}
                onClick={() => action.onClick(selectedItems)}
              >
                {action.label}
              </Button>
            ))}
          </Box>
        </Paper>
      )}

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      {paginatedItems.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Paper>
      ) : (
        <>
          {renderContent()}
          {renderPagination()}
        </>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedItem && itemActions
          .filter(action => !action.show || action.show(selectedItem))
          .map((action) => (
            <MenuItem
              key={action.key}
              onClick={() => handleActionClick(action, selectedItem)}
            >
              {action.icon && (
                <Box component="span" sx={{ mr: 1, display: 'flex' }}>
                  {action.icon}
                </Box>
              )}
              {action.label}
            </MenuItem>
          ))}
      </Menu>
    </Box>
  );
};

export default List;