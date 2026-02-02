// web-application/src/components/builder/TimeRangeConfigurator.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Grid,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface TimeRange {
  type: 'relative' | 'specific' | 'no-filter';
  relative?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
    anchor: 'now' | 'start_of_day' | 'start_of_week' | 'start_of_month';
  };
  specific?: {
    start: Date | null;
    end: Date | null;
  };
}

interface TimeRangeConfiguratorProps {
  open: boolean;
  onClose: () => void;
  onApply: (timeRange: TimeRange) => void;
  initialRange?: TimeRange;
  columnName?: string;
}

// =============================================================================
// Time Range Options
// =============================================================================

const RELATIVE_UNITS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' }
];

const RELATIVE_ANCHORS = [
  { value: 'now', label: 'Now' },
  { value: 'start_of_day', label: 'Start of Day' },
  { value: 'start_of_week', label: 'Start of Week' }, 
  { value: 'start_of_month', label: 'Start of Month' }
];

const TIME_SHORTCUTS = [
  { label: 'Last 7 days', value: { value: 7, unit: 'days' as const, anchor: 'now' as const } },
  { label: 'Last 30 days', value: { value: 30, unit: 'days' as const, anchor: 'now' as const } },
  { label: 'Last 90 days', value: { value: 90, unit: 'days' as const, anchor: 'now' as const } },
  { label: 'This month', value: { value: 1, unit: 'months' as const, anchor: 'start_of_month' as const } },
  { label: 'This year', value: { value: 1, unit: 'years' as const, anchor: 'start_of_month' as const } }
];

// =============================================================================
// Helper Functions
// =============================================================================

const formatTimeRange = (range: TimeRange): string => {
  if (range.type === 'no-filter') {
    return 'No filter';
  } else if (range.type === 'relative' && range.relative) {
    const { value, unit, anchor } = range.relative;
    return `${value} ${unit} ${anchor === 'now' ? 'ago' : `from ${anchor.replace('_', ' ')}`}`;
  } else if (range.type === 'specific' && range.specific) {
    const { start, end } = range.specific;
    if (start && end) {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
  }
  return 'Custom range';
};

const generateActualTimeRange = (range: TimeRange): string => {
  if (range.type === 'no-filter') {
    return 'All data';
  } else if (range.type === 'relative' && range.relative) {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);
    
    // Calculate start date based on relative values
    switch (range.relative.unit) {
      case 'days':
        startDate.setDate(startDate.getDate() - range.relative.value);
        break;
      case 'weeks':
        startDate.setDate(startDate.getDate() - (range.relative.value * 7));
        break;
      case 'months':
        startDate.setMonth(startDate.getMonth() - range.relative.value);
        break;
      case 'years':
        startDate.setFullYear(startDate.getFullYear() - range.relative.value);
        break;
    }
    
    return `${startDate.toISOString().split('T')[0]} ≤ col < ${endDate.toISOString().split('T')[0]}`;
  } else if (range.type === 'specific' && range.specific) {
    const { start, end } = range.specific;
    if (start && end) {
      return `${start.toISOString().split('T')[0]} ≤ col < ${end.toISOString().split('T')[0]}`;
    }
  }
  return 'Custom range';
};

// =============================================================================
// Main Component
// =============================================================================

const TimeRangeConfigurator: React.FC<TimeRangeConfiguratorProps> = ({
  open,
  onClose,
  onApply,
  initialRange,
  columnName = 'time_column'
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialRange || {
      type: 'relative',
      relative: { value: 7, unit: 'days', anchor: 'now' }
    }
  );

  const [rangeType, setRangeType] = useState<'custom' | 'no-filter'>('custom');

  // Update local state when initialRange changes
  useEffect(() => {
    if (initialRange) {
      setTimeRange(initialRange);
      setRangeType(initialRange.type === 'no-filter' ? 'no-filter' : 'custom');
    }
  }, [initialRange]);

  const handleRangeTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value as 'custom' | 'no-filter';
    setRangeType(newType);
    
    if (newType === 'no-filter') {
      setTimeRange({ type: 'no-filter' });
    } else {
      setTimeRange({
        type: 'relative',
        relative: { value: 7, unit: 'days', anchor: 'now' }
      });
    }
  };

  const handleRelativeChange = (field: keyof NonNullable<TimeRange['relative']>, value: any) => {
    setTimeRange(prev => ({
      ...prev,
      type: 'relative',
      relative: {
        ...prev.relative!,
        [field]: value
      }
    }));
  };

  const handleSpecificChange = (field: 'start' | 'end', value: Date | null) => {
    setTimeRange(prev => ({
      ...prev,
      type: 'specific',
      specific: {
        ...prev.specific,
        [field]: value
      }
    }));
  };

  const handleShortcutClick = (shortcut: typeof TIME_SHORTCUTS[0]) => {
    setTimeRange({
      type: 'relative',
      relative: shortcut.value
    });
    setRangeType('custom');
  };

  const handleApply = () => {
    onApply(timeRange);
    onClose();
  };

  const actualRange = generateActualTimeRange(timeRange);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '60vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            <Typography variant="h6">Edit time range</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
          {/* Range Type Selection */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              RANGE TYPE
            </Typography>
            <FormControl fullWidth>
              <Select
                value={rangeType}
                onChange={(e) => handleRangeTypeChange(e as React.ChangeEvent<HTMLInputElement>)}
                size="small"
              >
                <MenuItem value="custom">Custom</MenuItem>
                <MenuItem value="no-filter">No filter</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {rangeType === 'custom' && (
            <>
              {/* Time Configuration */}
              <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600 }}>
                Configure custom time range
              </Typography>

              <Grid container spacing={4}>
                {/* Left Column - Start */}
                <Grid item xs={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                      START (INCLUSIVE)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={timeRange.type}
                          onChange={(e) => {
                            const newType = e.target.value as 'relative' | 'specific';
                            if (newType === 'relative') {
                              setTimeRange(prev => ({
                                ...prev,
                                type: 'relative',
                                relative: prev.relative || { value: 7, unit: 'days', anchor: 'now' }
                              }));
                            } else {
                              setTimeRange(prev => ({
                                ...prev,
                                type: 'specific',
                                specific: prev.specific || { start: null, end: null }
                              }));
                            }
                          }}
                        >
                          <MenuItem value="relative">Relative Date/Time</MenuItem>
                          <MenuItem value="specific">Specific Date/Time</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>

                  {timeRange.type === 'relative' && timeRange.relative && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={timeRange.relative.value}
                        onChange={(e) => handleRelativeChange('value', parseInt(e.target.value) || 0)}
                        sx={{ width: 100 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={timeRange.relative.unit}
                          onChange={(e) => handleRelativeChange('unit', e.target.value)}
                        >
                          {RELATIVE_UNITS.map(unit => (
                            <MenuItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {timeRange.type === 'specific' && (
                    <DateTimePicker
                      value={timeRange.specific?.start || null}
                      onChange={(value) => handleSpecificChange('start', value)}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true
                        }
                      }}
                    />
                  )}
                </Grid>

                {/* Right Column - End */}
                <Grid item xs={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
                      END (EXCLUSIVE)
                    </Typography>
                    {timeRange.type === 'specific' ? (
                      <DateTimePicker
                        value={timeRange.specific?.end || null}
                        onChange={(value) => handleSpecificChange('end', value)}
                        slotProps={{
                          textField: {
                            size: 'small',
                            fullWidth: true,
                            placeholder: '2025-09-07 00:00:00'
                          }
                        }}
                      />
                    ) : (
                      <TextField
                        size="small"
                        fullWidth
                        disabled
                        value="Now"
                        placeholder="2025-09-07 00:00:00"
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>

              {/* Quick Shortcuts */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Quick shortcuts:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {TIME_SHORTCUTS.map((shortcut, index) => (
                    <Chip
                      key={index}
                      label={shortcut.label}
                      onClick={() => handleShortcutClick(shortcut)}
                      clickable
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              {/* TIME COLUMN */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  TIME COLUMN
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Drop a time column here or click"
                  value={columnName}
                  disabled
                />
              </Box>

              {/* TIME RANGE */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  TIME RANGE
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                  <Typography variant="body2" color="text.secondary">
                    No filter
                  </Typography>
                </Paper>
              </Box>

              {/* Actual Time Range Preview */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Actual time range
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {actualRange}
                  </Typography>
                </Paper>
              </Box>
            </>
          )}

          {rangeType === 'no-filter' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No time filtering will be applied. All available data will be included.
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          borderTop: 1, 
          borderColor: 'divider',
          p: 3,
          justifyContent: 'space-between'
        }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleApply} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default TimeRangeConfigurator;