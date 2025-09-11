// web-application/src/components/dashboard/FilterPanel.tsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Chip
} from '@mui/material';
import {
  DatePicker,
  LocalizationProvider
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Types
interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'date_range' | 'single_select' | 'multi_select' | 'text' | 'numeric_range';
  data_source: {
    type: 'dataset' | 'static' | 'query';
    source: string;
    value_column: string;
    label_column?: string;
  };
  default_value?: any;
  is_required: boolean;
  is_visible: boolean;
  position: number;
}

interface FilterPanelProps {
  filters: GlobalFilter[];
  values: Record<string, any>;
  onChange: (filterId: string, value: any) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ 
  filters, 
  values, 
  onChange 
}) => {
  if (!filters || filters.length === 0) {
    return null;
  }

  const visibleFilters = filters.filter(filter => filter.is_visible);

  if (visibleFilters.length === 0) {
    return null;
  }

  const renderFilter = (filter: GlobalFilter) => {
    const currentValue = values[filter.id] || filter.default_value;

    switch (filter.type) {
      case 'single_select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{filter.display_name}</InputLabel>
            <Select
              value={currentValue || ''}
              label={filter.display_name}
              onChange={(e) => onChange(filter.id, e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="option1">Option 1</MenuItem>
              <MenuItem value="option2">Option 2</MenuItem>
              <MenuItem value="option3">Option 3</MenuItem>
            </Select>
          </FormControl>
        );

      case 'multi_select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{filter.display_name}</InputLabel>
            <Select
              multiple
              value={currentValue || []}
              label={filter.display_name}
              onChange={(e) => onChange(filter.id, e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="option1">Option 1</MenuItem>
              <MenuItem value="option2">Option 2</MenuItem>
              <MenuItem value="option3">Option 3</MenuItem>
            </Select>
          </FormControl>
        );

      case 'text':
        return (
          <TextField
            fullWidth
            size="small"
            label={filter.display_name}
            value={currentValue || ''}
            onChange={(e) => onChange(filter.id, e.target.value)}
            placeholder={`Enter ${filter.display_name.toLowerCase()}`}
          />
        );

      case 'date_range':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <DatePicker
                label="From"
                value={currentValue?.from || null}
                onChange={(date) => onChange(filter.id, { 
                  ...currentValue, 
                  from: date 
                })}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <Typography variant="body2" color="text.secondary">
                to
              </Typography>
              <DatePicker
                label="To"
                value={currentValue?.to || null}
                onChange={(date) => onChange(filter.id, { 
                  ...currentValue, 
                  to: date 
                })}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Box>
          </LocalizationProvider>
        );

      case 'numeric_range':
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Min"
              type="number"
              value={currentValue?.min || ''}
              onChange={(e) => onChange(filter.id, { 
                ...currentValue, 
                min: parseFloat(e.target.value) || null 
              })}
            />
            <Typography variant="body2" color="text.secondary">
              to
            </Typography>
            <TextField
              size="small"
              label="Max"
              type="number"
              value={currentValue?.max || ''}
              onChange={(e) => onChange(filter.id, { 
                ...currentValue, 
                max: parseFloat(e.target.value) || null 
              })}
            />
          </Box>
        );

      default:
        return (
          <TextField
            fullWidth
            size="small"
            label={filter.display_name}
            value={currentValue || ''}
            onChange={(e) => onChange(filter.id, e.target.value)}
          />
        );
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 2, 
        backgroundColor: 'background.paper',
        borderRadius: 1,
        boxShadow: 1
      }}
      elevation={1}
    >
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
        Dashboard Filters
      </Typography>
      
      <Grid container spacing={2} alignItems="center">
        {visibleFilters.map((filter) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={filter.id}>
            <Box>
              {renderFilter(filter)}
              {filter.is_required && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  * Required
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default FilterPanel;