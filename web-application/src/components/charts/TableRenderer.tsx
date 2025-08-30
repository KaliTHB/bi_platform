// web-application/src/components/charts/TableRenderer.tsx
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
          size={config.density || 'standard'}
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

// web-application/src/components/charts/MetricCardRenderer.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';

interface MetricCardRendererProps {
  data: any[];
  config: {
    valueField: string;
    titleField?: string;
    subtitleField?: string;
    trendField?: string;
    targetField?: string;
    format?: 'number' | 'currency' | 'percentage';
    showProgress?: boolean;
    colorScheme?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    size?: 'small' | 'medium' | 'large';
  };
  dimensions: {
    width: number;
    height: number;
  };
}

const MetricCardRenderer: React.FC<MetricCardRendererProps> = ({
  data,
  config,
  dimensions
}) => {
  if (!data || data.length === 0) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">No data available</Typography>
      </Card>
    );
  }

  const record = data[0]; // Use first record for metric
  const value = record[config.valueField];
  const title = config.titleField ? record[config.titleField] : 'Metric';
  const subtitle = config.subtitleField ? record[config.subtitleField] : undefined;
  const trend = config.trendField ? record[config.trendField] : undefined;
  const target = config.targetField ? record[config.targetField] : undefined;

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return 'N/A';
    
    const numVal = Number(val);
    if (isNaN(numVal)) return String(val);

    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(numVal);
      case 'percentage':
        return `${(numVal * 100).toFixed(1)}%`;
      case 'number':
      default:
        return numVal.toLocaleString();
    }
  };

  const getTrendIcon = (trendValue: number) => {
    if (trendValue > 0) return <TrendingUpIcon color="success" />;
    if (trendValue < 0) return <TrendingDownIcon color="error" />;
    return <TrendingFlatIcon color="action" />;
  };

  const getTrendColor = (trendValue: number) => {
    if (trendValue > 0) return 'success';
    if (trendValue < 0) return 'error';
    return 'default';
  };

  const getProgressValue = () => {
    if (target && value !== null && value !== undefined) {
      return Math.min((Number(value) / Number(target)) * 100, 100);
    }
    return undefined;
  };

  const getCardHeight = () => {
    switch (config.size) {
      case 'small': return Math.min(dimensions.height, 120);
      case 'large': return Math.min(dimensions.height, 200);
      case 'medium':
      default: return Math.min(dimensions.height, 160);
    }
  };

  const getFontSizes = () => {
    switch (config.size) {
      case 'small':
        return { value: '1.5rem', title: '0.875rem', subtitle: '0.75rem' };
      case 'large':
        return { value: '3rem', title: '1.25rem', subtitle: '1rem' };
      case 'medium':
      default:
        return { value: '2rem', title: '1rem', subtitle: '0.875rem' };
    }
  };

  const fontSizes = getFontSizes();
  const progressValue = getProgressValue();

  return (
    <Card
      sx={{
        height: getCardHeight(),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        bgcolor: config.colorScheme === 'default' ? 'background.paper' : `${config.colorScheme}.50`,
        border: config.colorScheme !== 'default' ? `1px solid` : undefined,
        borderColor: config.colorScheme !== 'default' ? `${config.colorScheme}.200` : undefined
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        {/* Title */}
        <Typography
          variant="h6"
          component="div"
          gutterBottom
          sx={{
            fontSize: fontSizes.title,
            fontWeight: 500,
            color: 'text.secondary'
          }}
        >
          {title}
        </Typography>

        {/* Main Value */}
        <Typography
          variant="h3"
          component="div"
          sx={{
            fontSize: fontSizes.value,
            fontWeight: 'bold',
            color: config.colorScheme !== 'default' ? `${config.colorScheme}.main` : 'text.primary',
            mb: 1
          }}
        >
          {formatValue(value)}
        </Typography>

        {/* Subtitle */}
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: fontSizes.subtitle, mb: 1 }}
          >
            {subtitle}
          </Typography>
        )}

        {/* Trend Indicator */}
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {getTrendIcon(Number(trend))}
            <Chip
              label={`${trend > 0 ? '+' : ''}${Number(trend).toFixed(1)}%`}
              size="small"
              color={getTrendColor(Number(trend)) as any}
              variant="outlined"
            />
          </Box>
        )}

        {/* Progress Bar */}
        {config.showProgress && progressValue !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progressValue}
              color={config.colorScheme !== 'default' ? config.colorScheme as any : 'primary'}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {progressValue.toFixed(1)}% of target ({formatValue(target)})
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export { TableRenderer, MetricCardRenderer };
export default TableRenderer;