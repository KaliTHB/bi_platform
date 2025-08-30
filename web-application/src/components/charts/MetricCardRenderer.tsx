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

export { MetricCardRenderer };
export default MetricCardRenderer;