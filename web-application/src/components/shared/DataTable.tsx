// web-application/src/components/shared/DataTable.tsx
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Box,
  Paper,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Typography,
} from '@mui/material';
import {
  FilterList,
  MoreVert,
  GetApp,
} from '@mui/icons-material';

export interface Column<T> {
  id: keyof T;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string | React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    enabled: boolean;
    rowsPerPageOptions?: number[];
    defaultRowsPerPage?: number;
  };
  sorting?: {
    enabled: boolean;
    defaultSortBy?: keyof T;
    defaultSortDirection?: 'asc' | 'desc';
  };
  filtering?: {
    enabled: boolean;
    globalSearch?: boolean;
  };
  selection?: {
    enabled: boolean;
    onSelectionChange?: (selectedItems: T[]) => void;
  };
  actions?: {
    label: string;
    icon: React.ReactNode;
    onClick: (item: T) => void;
    disabled?: (item: T) => boolean;
  }[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  pagination = { enabled: true, defaultRowsPerPage: 25 },
  sorting = { enabled: true },
  filtering = { enabled: true, globalSearch: true },
  selection = { enabled: false },
  actions = [],
  onRowClick,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pagination.defaultRowsPerPage || 25);
  const [sortBy, setSortBy] = useState<keyof T | null>(sorting.defaultSortBy || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(sorting.defaultSortDirection || 'asc');
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ element: HTMLElement; item: T } | null>(null);

  // Filtered data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply global filter
    if (filtering.globalSearch && globalFilter) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(globalFilter.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(item =>
          String(item[columnId as keyof T]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    return filtered;
  }, [data, globalFilter, columnFilters, filtering.globalSearch]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sorting.enabled || !sortBy) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortBy, sortDirection, sorting.enabled]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!pagination.enabled) return sortedData;

    const startIndex = page * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, page, rowsPerPage, pagination.enabled]);

  const handleSort = (columnId: keyof T) => {
    if (!sorting.enabled) return;

    if (sortBy === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = new Set(paginatedData.map(item => item.id));
      setSelectedItems(newSelected);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    
    if (selection.onSelectionChange) {
      const selectedData = data.filter(item => newSelected.has(item.id));
      selection.onSelectionChange(selectedData);
    }
  };

  const isSelected = (itemId: string) => selectedItems.has(itemId);
  const isAllSelected = paginatedData.length > 0 && paginatedData.every(item => isSelected(item.id));
  const isIndeterminate = paginatedData.some(item => isSelected(item.id)) && !isAllSelected;

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {filtering.enabled && (
        <Box sx={{ p: 2 }}>
          {filtering.globalSearch && (
            <TextField
              placeholder="Search..."
              variant="outlined"
              size="small"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              sx={{ mb: 2, minWidth: 300 }}
            />
          )}
          
          {selection.enabled && selectedItems.size > 0 && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`${selectedItems.size} selected`}
                onDelete={() => setSelectedItems(new Set())}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}

      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selection.enabled && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {sorting.enabled && (column.sortable !== false) ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              
              {actions.length > 0 && (
                <TableCell align="right">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (selection.enabled ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <Typography variant="body2" color="textSecondary">
                    {loading ? 'Loading...' : emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  hover
                  key={item.id}
                  selected={isSelected(item.id)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {selection.enabled && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  
                  {columns.map((column) => (
                    <TableCell key={String(column.id)} align={column.align}>
                      {column.format
                        ? column.format(item[column.id])
                        : String(item[column.id] || '')
                      }
                    </TableCell>
                  ))}
                  
                  {actions.length > 0 && (
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuAnchor({ element: e.currentTarget, item });
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.enabled && (
        <TablePagination
          rowsPerPageOptions={pagination.rowsPerPageOptions || [10, 25, 50, 100]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor?.element}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        {actions.map((action, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              if (actionMenuAnchor) {
                action.onClick(actionMenuAnchor.item);
                setActionMenuAnchor(null);
              }
            }}
            disabled={action.disabled ? action.disabled(actionMenuAnchor?.item!) : false}
          >
            {action.icon}
            <Box sx={{ ml: 1 }}>{action.label}</Box>
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}