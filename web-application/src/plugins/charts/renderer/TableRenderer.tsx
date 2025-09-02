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
  Chip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface TableRendererProps {
  data: any[];
  columns: Array<{
    name: string;
    type: string;
  }>;
  config: {
    pageSize?: number;
    searchable?: boolean;
    sortable?: boolean;
    showPagination?: boolean;
    density?: 'standard' | 'comfortable' | 'compact';
    columnWidths?: { [key: string]: number };
  };
}

type Order = 'asc' | 'desc';

const TableRenderer: React.FC<TableRendererProps> = ({
  data,
  columns,
  config
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(config.pageSize || 10);
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<Order>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // Convert density to Material-UI table size
  const getTableSize = (): 'small' | 'medium' | undefined => {
    switch (config.density) {
      case 'compact':
        return 'small';
      case 'standard':
      case 'comfortable':
        return 'medium';
      default:
        return undefined;
    }
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm && config.searchable !== false) {
      filtered = data.filter(row =>
        columns.some(col =>
          String(row[col.name] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (orderBy && config.sortable !== false) {
      filtered = filtered.sort((a, b) => {
        const aValue = a[orderBy];
        const bValue = b[orderBy];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return order === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [data, columns, searchTerm, orderBy, order, config.searchable, config.sortable]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (config.showPagination === false) {
      return processedData;
    }
    return processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedData, page, rowsPerPage, config.showPagination]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatCellValue = (value: any, columnType: string) => {
    if (value === null || value === undefined) {
      return <Chip label="NULL" size="small" variant="outlined" />;
    }

    switch (columnType) {
      case 'number':
      case 'integer':
      case 'float':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'date':
      case 'timestamp':
        return new Date(value).toLocaleDateString();
      case 'boolean':
        return (
          <Chip
            label={value ? 'True' : 'False'}
            color={value ? 'success' : 'default'}
            size="small"
          />
        );
      case 'json':
        return <code>{JSON.stringify(value)}</code>;
      default:
        return String(value);
    }
  };

  const getColumnWidth = (columnName: string) => {
    return config.columnWidths?.[columnName] || 'auto';
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Bar */}
      {config.searchable !== false && (
        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SearchIcon color="action" />
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
            sx={{ flexGrow: 1 }}
            InputProps={{
              endAdornment: searchTerm && (
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon />
                </IconButton>
              )
            }}
          />
        </Box>
      )}

      {/* Table Container */}
      <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
        <Table
          stickyHeader
          size={getTableSize()}
          aria-labelledby="tableTitle"
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.name}
                  sortDirection={orderBy === column.name ? order : false}
                  sx={{ width: getColumnWidth(column.name) }}
                >
                  {config.sortable !== false ? (
                    <TableSortLabel
                      active={orderBy === column.name}
                      direction={orderBy === column.name ? order : 'asc'}
                      onClick={() => handleRequestSort(column.name)}
                    >
                      {column.name}
                    </TableSortLabel>
                  ) : (
                    column.name
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow
                hover
                key={index}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                {columns.map((column) => (
                  <TableCell key={column.name}>
                    {formatCellValue(row[column.name], column.type)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {config.showPagination !== false && processedData.length > rowsPerPage && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={processedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Box>
  );
};

export default TableRenderer;