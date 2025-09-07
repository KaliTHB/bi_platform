// web-application/src/components/viewer/FilterPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  Collapse,
  IconButton,
  Grid,
  Autocomplete,
  Slider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  FilterList as FilterIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface FilterPanelProps {
  filters: FilterDefinition[];
  values: Record<string, any>;
  onChange: (filters: any[]) => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface FilterDefinition {
  id: string;
  name: string;
  display_name: string;
  type: 'text' | 'single_select' | 'multi_select' | 'date_range' | 'numeric_range' | 'boolean';
  options?: { value: any; label: string }[];
  default_value?: any;
  is_required?: boolean;
  placeholder?: string;
  min_value?: number;
  max_value?: number;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  collapsible = true,
  defaultExpanded = true
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // Initialize filter values
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    
    filters.forEach(filter => {
      if (values[filter.id] !== undefined) {
        initialValues[filter.id] = values[filter.id];
      } else if (filter.default_value !== undefined) {
        initialValues[filter.id] = filter.default_value;
      } else {
        // Set default based on type
        switch (filter.type) {
          case 'multi_select':
            initialValues[filter.id] = [];
            break;
          case 'boolean':
            initialValues[filter.id] = false;
            break;
          case 'numeric_range':
            initialValues[filter.id] = [filter.min_value || 0, filter.max_value || 100];
            break;
          case 'date_range':
            initialValues[filter.id] = { start: null, end: null };
            break;
          default:
            initialValues[filter.id] = '';
        }
      }
    });
    
    setFilterValues(initialValues);
  }, [filters, values]);

  // Handle filter value change
  const handleFilterChange = (filterId: string, value: any) => {
    const newValues = {
      ...filterValues,
      [filterId]: value
    };
    
    setFilterValues(newValues);
    
    // Convert to filter format and call onChange
    const activeFilters = Object.entries(newValues)
      .map(([id, filterValue]) => {
        const filter = filters.find(f => f.id === id);
        if (!filter) return null;
        
        // Skip empty values
        if (filterValue === '' || filterValue === null || filterValue === undefined) {
          return null;
        }
        
        if (filter.type === 'multi_select' && Array.isArray(filterValue) && filterValue.length === 0) {
          return null;
        }
        
        return {
          id: filter.id,
          column: filter.name,
          operator: getOperatorForType(filter.type),
          value: filterValue,
          type: filter.type
        };
      })
      .filter(Boolean);
    
    onChange(activeFilters);
  };

  // Get operator based on filter type
  const getOperatorForType = (type: string) => {
    switch (type) {
      case 'text':
        return 'contains';
      case 'single_select':
        return 'equals';
      case 'multi_select':
        return 'in';
      case 'boolean':
        return 'equals';
      case 'numeric_range':
      case 'date_range':
        return 'between';
      default:
        return 'equals';
    }
  };

  // Clear all filters
  const handleClearAll = () => {
    const clearedValues: Record<string, any> = {};
    
    filters.forEach(filter => {
      switch (filter.type) {
        case 'multi_select':
          clearedValues[filter.id] = [];
          break;
        case 'boolean':
          clearedValues[filter.id] = false;
          break;
        case 'numeric_range':
          clearedValues[filter.id] = [filter.min_value || 0, filter.max_value || 100];
          break;
        case 'date_range':
          clearedValues[filter.id] = { start: null, end: null };
          break;
        default:
          clearedValues[filter.id] = '';
      }
    });
    
    setFilterValues(clearedValues);
    onChange([]);
  };

  // Render individual filter
  const renderFilter = (filter: FilterDefinition) => {
    const value = filterValues[filter.id];
    
    switch (filter.type) {
      case 'text':
        return (
          <TextField
            key={filter.id}
            label={filter.display_name}
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            required={filter.is_required}
          />
        );

      case 'single_select':
        return (
          <FormControl key={filter.id} fullWidth size="small">
            <InputLabel>{filter.display_name}</InputLabel>
            <Select
              value={value || ''}
              label={filter.display_name}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {filter.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multi_select':
        return (
          <Autocomplete
            key={filter.id}
            multiple
            options={filter.options || []}
            getOptionLabel={(option) => option.label}
            value={filter.options?.filter(option => (value || []).includes(option.value)) || []}
            onChange={(_, newValues) => 
              handleFilterChange(filter.id, newValues.map(v => v.value))
            }
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.label}
                  size="small"
                  {...getTagProps({ index })}
                  key={option.value}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label={filter.display_name}
                placeholder={filter.placeholder}
                size="small"
              />
            )}
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            key={filter.id}
            control={
              <Switch
                checked={value || false}
                onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
                color="primary"
              />
            }
            label={filter.display_name}
          />
        );

      case 'numeric_range':
        const numericValue = value || [filter.min_value || 0, filter.max_value || 100];
        return (
          <Box key={filter.id} sx={{ px: 1 }}>
            <Typography gutterBottom variant="body2">
              {filter.display_name}
            </Typography>
            <Slider
              value={numericValue}
              onChange={(_, newValue) => handleFilterChange(filter.id, newValue)}
              valueLabelDisplay="auto"
              min={filter.min_value || 0}
              max={filter.max_value || 100}
              marks={[
                { value: filter.min_value || 0, label: String(filter.min_value || 0) },
                { value: filter.max_value || 100, label: String(filter.max_value || 100) }
              ]}
            />
          </Box>
        );

      case 'date_range':
        const dateValue = value || { start: null, end: null };
        return (
          <LocalizationProvider key={filter.id} dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <DatePicker
                label="Start Date"
                value={dateValue.start}
                onChange={(date) => 
                  handleFilterChange(filter.id, { ...dateValue, start: date })
                }
                slotProps={{ textField: { size: 'small', sx: { flex: 1 } } }}
              />
              <Typography variant="body2">to</Typography>
              <DatePicker
                label="End Date"
                value={dateValue.end}
                onChange={(date) => 
                  handleFilterChange(filter.id, { ...dateValue, end: date })
                }
                slotProps={{ textField: { size: 'small', sx: { flex: 1 } } }}
              />
            </Box>
          </LocalizationProvider>
        );

      default:
        return (
          <Typography key={filter.id} variant="body2" color="error">
            Unsupported filter type: {filter.type}
          </Typography>
        );
    }
  };

  // Don't render if no filters
  if (!filters || filters.length === 0) {
    return null;
  }

  // Count active filters
  const activeFilterCount = Object.values(filterValues).filter(value => {
    if (value === '' || value === null || value === undefined) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && value.start === null && value.end === null) return false;
    return true;
  }).length;

  return (
    <Paper elevation={1} sx={{ mb: 2 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: collapsible ? 'pointer' : 'default'
        }}
        onClick={collapsible ? () => setExpanded(!expanded) : undefined}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon color="action" />
          <Typography variant="h6">
            Filters
          </Typography>
          {activeFilterCount > 0 && (
            <Chip 
              label={`${activeFilterCount} active`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {activeFilterCount > 0 && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
            >
              Clear All
            </Button>
          )}
          
          {collapsible && (
            <IconButton size="small">
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Filter Controls */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Grid container spacing={2}>
            {filters.map((filter) => (
              <Grid item xs={12} sm={6} md={4} key={filter.id}>
                {renderFilter(filter)}
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};

export { FilterPanel };