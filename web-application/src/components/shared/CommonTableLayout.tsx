// web-application/src/components/shared/CommonTableLayout.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Typography,
  Button,
  Checkbox,
  Tooltip,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  ViewList,
  ViewModule,
  Refresh,
  Add,
  Edit,
  Delete,
  Visibility
} from '@mui/icons-material';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface BaseListItem {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  workspace_id?: string;
  status?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TableColumn<T = BaseListItem> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

export interface TableAction<T = BaseListItem> {
  label: string;
  icon: React.ReactNode;
  onClick: (item: T) => void;
  show?: (item: T) => boolean;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: (item: T) => boolean;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface CommonTableLayoutProps<T extends BaseListItem = BaseListItem> {
  // Data
  data: T[];
  loading?: boolean;
  error?: string;
  
  // Table Configuration
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  
  // View Options
  title: string;
  subtitle?: string;
  viewMode?: 'table' | 'grid' | 'list';
  onViewModeChange?: (mode: 'table' | 'grid' | 'list') => void;
  
  // Search and Filtering
  searchable?: boolean;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  
  // Selection
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // Pagination
  pagination?: boolean;
  itemsPerPage?: number;
  
  // Actions
  showCreateButton?: boolean;
  createButtonLabel?: string;
  onCreateClick?: () => void;
  onRefresh?: () => void;
  
  // Bulk Actions
  bulkActions?: TableAction<T[]>;
  
  // Custom Rendering
  emptyState?: React.ReactNode;
  customToolbar?: React.ReactNode;
}

// =============================================================================
// Utility Functions
// =============================================================================

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getDisplayName = (item: BaseListItem): string => {
  return item.display_name || item.name || 'Untitled';
};

// =============================================================================
// Main Component
// =============================================================================

const CommonTableLayout = <T extends BaseListItem = BaseListItem>({
  data = [],
  loading = false,
  error,
  columns,
  actions = [],
  title,
  subtitle,
  viewMode = 'table',
  onViewModeChange,
  searchable = true,
  searchPlaceholder = 'Search...',
  filters = [],
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  pagination = true,
  itemsPerPage = 25,
  showCreateButton = false,
  createButtonLabel = 'Create',
  onCreateClick,
  onRefresh,
  bulkActions,
  emptyState,
  customToolbar
}: CommonTableLayoutProps<T>) => {
  
  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(itemsPerPage);
  const [filterValues, setFilterValues] = useState<{ [key: string]: string }>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  // Computed Values
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        const searchableFields = [
          getDisplayName(item),
          item.description || '',
          item.owner?.name || '',
          item.owner?.email || ''
        ];
        return searchableFields.some(field => 
          field.toLowerCase().includes(query)
        );
      });
    }

    // Apply custom filters
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(item => {
          const itemValue = getNestedValue(item, key);
          return itemValue === value;
        });
      }
    });

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortBy) || '';
        const bValue = getNestedValue(b, sortBy) || '';
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, searchQuery, filterValues, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredAndSortedData;
    const startIndex = page * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage, pagination]);

  // Event Handlers
  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(paginatedData.map(item => item.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedItems, itemId]);
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, item: T) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  // Render Functions
  const renderToolbar = () => (
    <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          {onRefresh && (
            <IconButton onClick={onRefresh} disabled={loading}>
              <Refresh />
            </IconButton>
          )}
          
          {showCreateButton && onCreateClick && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreateClick}
            >
              {createButtonLabel}
            </Button>
          )}
        </Box>
      </Box>

      {/* Search and Filters */}
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        {searchable && (
          <TextField
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        )}

        {filters.map((filter) => (
          <FormControl key={filter.key} size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={filterValues[filter.key] || 'all'}
              onChange={(e) => setFilterValues(prev => ({
                ...prev,
                [filter.key]: e.target.value
              }))}
              label={filter.label}
            >
              <MenuItem value="all">All</MenuItem>
              {filter.options.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}

        {Object.keys(filterValues).length > 0 && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setFilterValues({})}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {customToolbar}
    </Box>
  );

  const renderTableHeader = () => (
    <TableHead>
      <TableRow>
        {selectable && (
          <TableCell padding="checkbox">
            <Checkbox
              checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
              indeterminate={selectedItems.length > 0 && selectedItems.length < paginatedData.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
          </TableCell>
        )}
        
        {columns.map((column) => (
          <TableCell
            key={String(column.key)}
            align={column.align || 'left'}
            sx={{ width: column.width, fontWeight: 'bold' }}
          >
            {column.sortable ? (
              <TableSortLabel
                active={sortBy === column.key}
                direction={sortBy === column.key ? sortOrder : 'asc'}
                onClick={() => handleSort(String(column.key))}
              >
                {column.label}
              </TableSortLabel>
            ) : (
              column.label
            )}
          </TableCell>
        ))}
        
        {actions.length > 0 && (
          <TableCell align="right" width={60}>
            Actions
          </TableCell>
        )}
      </TableRow>
    </TableHead>
  );

  const renderTableBody = () => (
    <TableBody>
      {paginatedData.map((item) => (
        <TableRow key={item.id} hover>
          {selectable && (
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onChange={(e) => handleSelectItem(item.id, e.target.checked)}
              />
            </TableCell>
          )}
          
          {columns.map((column) => (
            <TableCell
              key={String(column.key)}
              align={column.align || 'left'}
            >
              {column.render 
                ? column.render(item)
                : getNestedValue(item, String(column.key)) || '-'
              }
            </TableCell>
          ))}
          
          {actions.length > 0 && (
            <TableCell align="right">
              <IconButton
                onClick={(e) => handleActionClick(e, item)}
                size="small"
              >
                <MoreVert />
              </IconButton>
            </TableCell>
          )}
        </TableRow>
      ))}
    </TableBody>
  );

  const renderEmptyState = () => (
    <Box textAlign="center" py={8}>
      {emptyState || (
        <Box>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No items found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {searchQuery || Object.keys(filterValues).length > 0
              ? 'Try adjusting your search or filters'
              : `No ${title.toLowerCase()} have been created yet`}
          </Typography>
          {showCreateButton && onCreateClick && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreateClick}
              sx={{ mt: 2 }}
            >
              {createButtonLabel}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );

  // Main Render
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {renderToolbar()}
      
      <TableContainer>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : filteredAndSortedData.length === 0 ? (
          renderEmptyState()
        ) : (
          <Table>
            {renderTableHeader()}
            {renderTableBody()}
          </Table>
        )}
      </TableContainer>

      {pagination && filteredAndSortedData.length > 0 && (
        <TablePagination
          component="div"
          count={filteredAndSortedData.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedItem && actions
          .filter(action => !action.show || action.show(selectedItem))
          .map((action, index) => (
            <MenuItem
              key={index}
              onClick={() => {
                action.onClick(selectedItem);
                handleMenuClose();
              }}
              disabled={action.disabled?.(selectedItem)}
            >
              <ListItemIcon>
                {action.icon}
              </ListItemIcon>
              <ListItemText>
                {action.label}
              </ListItemText>
            </MenuItem>
          ))}
      </Menu>
    </Card>
  );
};

export default CommonTableLayout;
export {CommonTableLayout};