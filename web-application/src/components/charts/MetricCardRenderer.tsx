// File: web-application/src/components/charts/MetricCardRenderer.tsx
'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  GpsFixed as TargetIcon
} from '@mui/icons-material';
import { ChartDimensions, ChartConfiguration } from '@/types/chart.types';

interface MetricCardConfig {
  valueField: string;
  titleField?: string;
  subtitleField?: string;
  trendField?: string;
  targetField?: string;
  comparisonField?: string;
  format?: 'number' | 'currency' | 'percentage' | 'custom';
  customFormat?: string;
  size?: 'small' | 'medium' | 'large';
  colorScheme?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  showTrend?: boolean;
  showProgress?: boolean;
  showComparison?: boolean;
  icon?: React.ReactNode;
  suffix?: string;
  prefix?: string;
  precision?: number;
}

interface MetricCardRendererProps {
  data: any[];
  config: ChartConfiguration & {
    metricCard?: MetricCardConfig;
  };
  dimensions: ChartDimensions;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (data: any) => void;
}

const MetricCardRenderer: React.FC<MetricCardRendererProps> = ({
  data,
  config,
  dimensions,
  className,
  style,
  onClick
}) => {
  const metricConfig = config.metricCard || {};

  // Extract data values
  const record = useMemo(() => {
    return (data && data.length > 0) ? data[0] : {};
  }, [data]);

  const value = record[metricConfig.valueField || 'value'];
  const title = metricConfig.titleField 
    ? record[metricConfig.titleField] 
    : config.title?.text || 'Metric';
  const subtitle = metricConfig.subtitleField ? record[metricConfig.subtitleField] : undefined;
  const trend = metricConfig.trendField ? record[metricConfig.trendField] : undefined;
  const target = metricConfig.targetField ? record[metricConfig.targetField] : undefined;
  const comparison = metricConfig.comparisonField ? record[metricConfig.comparisonField] : undefined;

  // Format the main value
  const formatValue = (val: any) => {
    if (val === null || val === undefined) return 'N/A';
    
    const numVal = Number(val);
    if (isNaN(numVal)) return String(val);

    const precision = metricConfig.precision ?? 1;

    let formatted: string;
    switch (metricConfig.format) {
      case 'currency':
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: precision,
          maximumFractionDigits: precision
        }).format(numVal);
        break;
      case 'percentage':
        formatted = `${(numVal * 100).toFixed(precision)}%`;
        break;
      case 'custom':
        // Simple custom formatting - in real implementation, you might use a library
        formatted = numVal.toFixed(precision);
        break;
      case 'number':
      default:
        if (numVal >= 1000000) {
          formatted = `${(numVal / 1000000).toFixed(precision)}M`;
        } else if (numVal >= 1000) {
          formatted = `${(numVal / 1000).toFixed(precision)}K`;
        } else {
          formatted = numVal.toLocaleString(undefined, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
          });
        }
        break;
    }

    if (metricConfig.prefix) formatted = metricConfig.prefix + formatted;
    if (metricConfig.suffix) formatted = formatted + metricConfig.suffix;

    return formatted;
  };

  // Calculate trend information
  const trendInfo = useMemo(() => {
    if (!metricConfig.showTrend || trend === undefined || trend === null) {
      return null;
    }

    const trendValue = Number(trend);
    if (isNaN(trendValue)) return null;

    const isPositive = trendValue > 0;
    const isNegative = trendValue < 0;
    const isNeutral = trendValue === 0;

    return {
      value: trendValue,
      formatted: `${isPositive ? '+' : ''}${trendValue.toFixed(1)}%`,
      isPositive,
      isNegative,
      isNeutral,
      icon: isPositive ? TrendingUpIcon : isNegative ? TrendingDownIcon : TrendingFlatIcon,
      color: isPositive ? 'success' : isNegative ? 'error' : 'default'
    };
  }, [trend, metricConfig.showTrend]);

  // Calculate progress information
  const progressInfo = useMemo(() => {
    if (!metricConfig.showProgress || target === undefined || target === null || value === undefined) {
      return null;
    }

    const numValue = Number(value);
    const numTarget = Number(target);
    
    if (isNaN(numValue) || isNaN(numTarget) || numTarget === 0) return null;

    const percentage = Math.min((numValue / numTarget) * 100, 100);
    const isComplete = percentage >= 100;
    const isNearComplete = percentage >= 80;

    return {
      percentage,
      isComplete,
      isNearComplete,
      target: numTarget,
      formatted: `${percentage.toFixed(0)}%`,
      color: isComplete ? 'success' : isNearComplete ? 'warning' : 'primary'
    };
  }, [value, target, metricConfig.showProgress]);

  // Calculate comparison information
  const comparisonInfo = useMemo(() => {
    if (!metricConfig.showComparison || comparison === undefined || comparison === null) {
      return null;
    }

    const numValue = Number(value);
    const numComparison = Number(comparison);
    
    if (isNaN(numValue) || isNaN(numComparison)) return null;

    const difference = numValue - numComparison;
    const percentageChange = numComparison !== 0 ? (difference / numComparison) * 100 : 0;

    return {
      difference,
      percentageChange,
      formatted: `${difference >= 0 ? '+' : ''}${formatValue(difference)}`,
      comparisonValue: formatValue(numComparison),
      isPositive: difference > 0,
      isNegative: difference < 0,
      isNeutral: difference === 0
    };
  }, [value, comparison, metricConfig.showComparison]);

  // Get card dimensions and styling
  const getCardStyle = () => {
    const baseHeight = metricConfig.size === 'small' ? 120 : metricConfig.size === 'large' ? 200 : 160;
    const cardHeight = Math.min(dimensions.height, baseHeight);
    
    const colorScheme = metricConfig.colorScheme || 'default';
    const colorMap = {
      default: { bg: 'background.paper', border: 'divider' },
      primary: { bg: 'primary.50', border: 'primary.200' },
      success: { bg: 'success.50', border: 'success.200' },
      warning: { bg: 'warning.50', border: 'warning.200' },
      error: { bg: 'error.50', border: 'error.200' },
      info: { bg: 'info.50', border: 'info.200' }
    };

    return {
      height: cardHeight,
      width: dimensions.width,
      bgcolor: colorMap[colorScheme]?.bg || colorMap.default.bg,
      borderColor: colorMap[colorScheme]?.border || colorMap.default.border,
      border: colorScheme !== 'default' ? 1 : undefined,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease-in-out',
      '&:hover': onClick ? {
        transform: 'translateY(-2px)',
        boxShadow: 2
      } : undefined
    };
  };

  // Get font sizes based on card size
  const getFontSizes = () => {
    switch (metricConfig.size) {
      case 'small':
        return {
          value: '1.75rem',
          title: '0.875rem',
          subtitle: '0.75rem',
          trend: '0.75rem'
        };
      case 'large':
        return {
          value: '3rem',
          title: '1.125rem',
          subtitle: '1rem',
          trend: '0.875rem'
        };
      case 'medium':
      default:
        return {
          value: '2.25rem',
          title: '1rem',
          subtitle: '0.875rem',
          trend: '0.8rem'
        };
    }
  };

  const fontSizes = getFontSizes();

  return (
    <Card
      className={className}
      style={style}
      sx={getCardStyle()}
      onClick={() => onClick?.(record)}
    >
      <CardContent
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          '&:last-child': {
            paddingBottom: 2
          }
        }}
      >
        {/* Header with title and optional icon/info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {metricConfig.icon && (
              <Box sx={{ color: 'text.secondary' }}>
                {metricConfig.icon}
              </Box>
            )}
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontSize: fontSizes.title,
                fontWeight: 500,
                color: 'text.secondary',
                lineHeight: 1.2
              }}
            >
              {title}
            </Typography>
          </Box>
          
          {subtitle && (
            <Tooltip title="Additional information">
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Main value */}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
          <Typography
            variant="h3"
            component="div"
            sx={{
              fontSize: fontSizes.value,
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1,
              wordBreak: 'break-word'
            }}
          >
            {formatValue(value)}
          </Typography>

          {/* Trend indicator */}
          {trendInfo && (
            <Chip
              size="small"
              icon={<trendInfo.icon />}
              label={trendInfo.formatted}
              color={trendInfo.color as any}
              variant="outlined"
              sx={{ fontSize: fontSizes.trend }}
            />
          )}
        </Box>

        {/* Subtitle */}
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              fontSize: fontSizes.subtitle,
              color: 'text.secondary',
              mb: 1
            }}
          >
            {subtitle}
          </Typography>
        )}

        {/* Progress bar */}
        {progressInfo && (
          <Box sx={{ mb: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 0.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TargetIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {progressInfo.formatted} of {formatValue(progressInfo.target)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressInfo.percentage}
              color={progressInfo.color as any}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover'
              }}
            />
          </Box>
        )}

        {/* Comparison information */}
        {comparisonInfo && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 'auto',
              pt: 1,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              vs Previous: {comparisonInfo.comparisonValue}
            </Typography>
            <Chip
              size="small"
              label={comparisonInfo.formatted}
              color={
                comparisonInfo.isPositive 
                  ? 'success' 
                  : comparisonInfo.isNegative 
                    ? 'error' 
                    : 'default'
              }
              variant="filled"
            />
          </Box>
        )}

        {/* Speed/Performance indicator for certain metrics */}
        {metricConfig.format === 'percentage' && value !== undefined && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              opacity: 0.6
            }}
          >
            <SpeedIcon
              fontSize="small"
              sx={{
                color: Number(value) >= 0.8 ? 'success.main' : 
                       Number(value) >= 0.5 ? 'warning.main' : 'error.main'
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCardRenderer;