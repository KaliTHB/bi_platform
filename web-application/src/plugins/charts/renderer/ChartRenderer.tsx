// ============================================================================
// FILE: /src/plugins/charts/renderer/ChartRenderer.tsx
// PURPOSE: Main chart renderer with improved axis handling
// ============================================================================

'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Box, Typography, Alert, CircularProgress, IconButton } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

// Import services
import { 
  ConfigMappingService,
  ChartPluginService,
  validateChartSetup,
  createFieldMapping
} from '../services';

// ONLY import plugin system components - NO direct renderer imports
import { ChartFactory } from '@/plugins/charts/factory/ChartFactory';
import { ChartRegistry } from '@/plugins/charts/registry/ChartRegistry';
import ChartErrorBoundary from '@/plugins/charts/renderer/ChartErrorBoundary';

// Types only
import {
  ChartProps,
  ChartDimensions,
  ChartConfiguration,
  ChartInteractionEvent,
  ChartError
} from '@/types/chart.types';
import { ChartRendererProps } from '@/types/index';

// ============================================================================
// MAIN CHART RENDERER COMPONENT
// ============================================================================

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  chart,
  data,
  config,
  columns,
  dimensions,
  theme,
  loading = false,
  error = null,
  onInteraction,
  onError,
  onDataPointClick,
  onDataPointHover,
  onLegendClick,
  onZoom,
  className,
  style
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Chart loading state
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<ChartProps> | null>(null);
  const [chartElement, setChartElement] = useState<React.ReactElement | null>(null);
  const [pluginLoading, setPluginLoading] = useState(true);
  const [pluginError, setPluginError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ============================================================================
  // CHART CONFIGURATION
  // ============================================================================

  // Extract chart configuration
  const chartLibrary = chart.chart_library || 'echarts';
  const chartType = chart.chart_type;
  const chartId = chart.id;
  const chartName = chart.name || chart.display_name || 'Untitled Chart';

  // Chart dimensions with proper defaults
  const chartDimensions: ChartDimensions = useMemo(() => ({
    width: dimensions?.width || chart.config_json?.dimensions?.width || 400,
    height: dimensions?.height || chart.config_json?.dimensions?.height || 300,
    margin: dimensions?.margin || { top: 20, right: 20, bottom: 20, left: 20 }
  }), [dimensions, chart]);

  // ============================================================================
  // ENHANCED CONFIGURATION PROCESSING
  // ============================================================================

  const processedConfig = useMemo(() => {
    console.log('🔍 Processing Chart Configuration');
    
    // Run validation first
    const validation = validateChartSetup(data, config, config?.fieldAssignments);
    console.log('📋 Chart Setup Validation:', validation);

    if (!validation.valid) {
      console.warn('⚠️ Chart validation failed:', validation.errors);
    }

    // Map configuration using ConfigMappingService
    const mappedConfig = ConfigMappingService.mapToFactoryConfig(
      config?.fieldAssignments || {},
      config?.customConfig || {},
      { id: chartType || 'line', library: chartLibrary }
    );

    console.log('🔄 Mapped Configuration:', mappedConfig);

    // Combine all configuration sources
    const finalConfig = {
      ...chart.config_json,
      ...config,
      ...mappedConfig,
      chartType: chartType,
      library: chartLibrary,
      dimensions: chartDimensions
    };

    console.log('✅ Final Configuration:', finalConfig);
    
    return finalConfig;
  }, [data, config, chart, chartType, chartLibrary, chartDimensions]);

  // ============================================================================
  // DYNAMIC CHART LOADING WITH ERROR HANDLING
  // ============================================================================

  useEffect(() => {
    if (!chartType || pluginError) {
      return;
    }

    const loadChartComponent = async () => {
      setPluginLoading(true);
      setPluginError(null);

      try {
        console.log(`📦 Loading chart component: ${chartType} (${chartLibrary})`);
        
        // Use ChartFactory to load component dynamically
        const component = await ChartFactory.createChart(chartType, {
          data: data || [],
          config: processedConfig,
          dimensions: chartDimensions,
          theme,
          onInteraction,
          onError: (error: ChartError) => {
            console.error('Chart Error:', error);
            setPluginError(error.message);
            onError?.(error);
          }
        });

        if (component) {
          setChartElement(component);
        } else {
          throw new Error(`Failed to create chart component for type: ${chartType}`);
        }

      } catch (error) {
        console.error('Error loading chart component:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error loading chart';
        setPluginError(errorMessage);
      } finally {
        setPluginLoading(false);
      }
    };

    loadChartComponent();
  }, [chartType, chartLibrary, processedConfig, data, chartDimensions, theme, onInteraction, onError]);

  // ============================================================================
  // ERROR HANDLING AND RETRY
  // ============================================================================

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setPluginError(null);
    setPluginLoading(true);
  }, []);

  // ============================================================================
  // RENDER LOADING STATE
  // ============================================================================

  if (loading || pluginLoading) {
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: chartDimensions.height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Loading {chartName}...
        </Typography>
      </Box>
    );
  }

  // ============================================================================
  // RENDER ERROR STATE
  // ============================================================================

  if (error || pluginError) {
    const errorMessage = error || pluginError || 'Unknown error';
    
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: 'auto',
          minHeight: chartDimensions.height,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'error.main',
          borderRadius: 1,
          p: 2,
          bgcolor: 'background.paper'
        }}
      >
        <Alert 
          severity="error" 
          action={
            <IconButton size="small" onClick={handleRetry} title="Retry">
              <RefreshIcon />
            </IconButton>
          }
        >
          <Typography variant="subtitle2">Chart Rendering Error</Typography>
          <Typography variant="body2">{errorMessage}</Typography>
        </Alert>
      </Box>
    );
  }

  // ============================================================================
  // RENDER NO DATA STATE
  // ============================================================================

  if (!data || data.length === 0) {
    return (
      <Box
        className={className}
        style={style}
        sx={{
          width: chartDimensions.width,
          height: chartDimensions.height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No data available for {chartName}
        </Typography>
      </Box>
    );
  }

  // ============================================================================
  // RENDER CHART WITH ERROR BOUNDARY
  // ============================================================================

  return (
    <ChartErrorBoundary onError={(error) => {
      console.error('Chart Error Boundary:', error);
      setPluginError(error.message);
    }}>
      <Box
        className={className}
        style={style}
        sx={{ 
          width: chartDimensions.width, 
          height: chartDimensions.height,
          position: 'relative'
        }}
      >
        {chartElement || (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Chart component not loaded
            </Typography>
          </Box>
        )}
      </Box>
    </ChartErrorBoundary>
  );
};

export default ChartRenderer;