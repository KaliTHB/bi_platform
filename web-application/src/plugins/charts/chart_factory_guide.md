# Chart Factory - Dynamic File-Based Plugin System

## Overview

The ChartFactory provides a dynamic, file-based plugin system for chart components that supports both compile-time registration and runtime discovery. This architecture enables type-safe chart plugins while maintaining flexibility for custom visualizations.

## Architecture

### File-Based Plugin Discovery
- **Compile-Time Registration**: Chart plugins are statically imported and registered
- **Type Safety**: Full TypeScript support with proper interfaces
- **Dynamic Loading**: Support for runtime plugin discovery (optional)
- **Workspace Configuration**: Charts can be enabled/disabled per workspace

## Usage

### 1. Using ChartFactory in Components

```typescript
import { ChartFactory } from '../../plugins/charts/factory/ChartFactory';

// Static method usage (for ChartBuilder, etc.)
const chartElement = ChartFactory.createChart('bar', 'echarts', {
  data: chartData,
  config: chartConfig,
  dimensions: { width: '100%', height: 400 },
  onError: (error) => console.error('Chart error:', error),
  onInteraction: (event) => console.log('User interaction:', event)
});

// JSX component usage (alternative)
<ChartFactoryComponent
  chartType="line"
  chartLibrary="echarts"
  data={data}
  config={config}
  dimensions={{ width: '100%', height: 300 }}
  enableDynamicLoading={true}
  onPluginLoadError={(error) => console.error('Plugin error:', error)}
/>
```

### 2. Available Chart Types

The system currently supports:

#### ECharts Library
- `bar` - Bar Chart (basic category)
- `line` - Line Chart (basic category)
- `pie` - Pie Chart (basic category)
- `scatter` - Scatter Plot (statistical category)
- `area` - Area Chart (basic category)

#### Chart.js Library
- `donut` - Donut Chart (basic category)
- `radar` - Radar Chart (basic category)
- `polar` - Polar Area Chart (basic category)

### 3. Chart Factory API

```typescript
// Get all available charts
const allCharts = ChartFactory.getAllCharts();

// Get charts by library
const echartsCharts = ChartFactory.getChartTypes('echarts');

// Get charts by category
const basicCharts = ChartFactory.getChartsByCategory('basic');

// Check if chart is supported
const isSupported = ChartFactory.isChartSupported('bar', 'echarts');

// Search charts
const searchResults = ChartFactory.searchCharts('line');

// Validate chart config
const validation = ChartFactory.validateConfig('bar', 'echarts', config);
```

## Adding New Chart Plugins

### Step 1: Create Chart Component

Create your chart component following the `ChartProps` interface:

```typescript
// File: web-application/src/plugins/charts/d3/NetworkChart.tsx

import React, { useRef, useEffect } from 'react';
import { ChartProps } from '../factory/ChartFactory';

export const D3NetworkChart: React.FC<ChartProps> = ({ 
  data, 
  config, 
  dimensions, 
  onError, 
  onInteraction 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Your D3 chart implementation here
    try {
      // Render D3 network visualization
    } catch (error) {
      onError?.(error as Error);
    }
  }, [data, config]);

  return (
    <div style={{ width: dimensions.width, height: dimensions.height }}>
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  );
};
```

### Step 2: Register in ChartFactory

Add your component to the `STATIC_CHART_REGISTRY`:

```typescript
// In ChartFactory.tsx
const STATIC_CHART_REGISTRY = {
  // ... existing charts
  'd3-network': {
    component: D3NetworkChart,
    library: 'd3',
    category: 'advanced',
    displayName: 'Network Graph',
    description: 'Interactive network visualization for connected data'
  },
};
```

### Step 3: Add Configuration Schema (Optional)

For charts with configuration options:

```typescript
export const NetworkChartConfigSchema = {
  nodeSize: {
    type: 'number',
    default: 5,
    min: 1,
    max: 20,
    description: 'Size of network nodes'
  },
  linkStrength: {
    type: 'number', 
    default: 0.5,
    min: 0,
    max: 1,
    description: 'Strength of node connections'
  },
  colorScheme: {
    type: 'select',
    options: ['category10', 'viridis', 'plasma'],
    default: 'category10'
  }
};
```

## Plugin Categories

- **basic** - Simple charts (bar, line, pie)
- **statistical** - Statistical visualizations (scatter, box plots, histograms)
- **advanced** - Complex visualizations (network graphs, sankey diagrams)
- **geographic** - Map-based visualizations
- **financial** - Financial charts (candlestick, volume)
- **custom** - Organization-specific charts

## Error Handling

The ChartFactory provides comprehensive error handling:

1. **Plugin Not Found**: Shows error placeholder with helpful message
2. **Rendering Errors**: Catches component errors and displays fallback
3. **Configuration Errors**: Validates chart config before rendering
4. **Data Errors**: Handles missing or malformed data gracefully

## Performance Considerations

- **Lazy Loading**: Chart components loaded only when needed
- **Static Registry**: Fast lookup for frequently used charts
- **Caching**: Plugin discovery results cached between renders
- **Error Boundaries**: Individual chart failures don't crash the entire dashboard

## Development Workflow

### 1. Development Mode
- Debug information panel shows available plugins
- Console logging for plugin discovery and errors
- Hot reload support for chart component changes

### 2. Adding Charts During Development
```bash
# 1. Create new chart component
touch src/plugins/charts/mylibrary/MyChart.tsx

# 2. Implement component following ChartProps interface
# 3. Add to STATIC_CHART_REGISTRY in ChartFactory.tsx
# 4. Chart automatically available in ChartBuilder
```

### 3. Testing New Charts
```typescript
// Test chart creation
const testChart = ChartFactory.createChart('mytype', 'mylibrary', {
  data: sampleData,
  config: {},
  dimensions: { width: 400, height: 300 }
});

// Validate chart config
const validation = ChartFactory.validateConfig('mytype', 'mylibrary', config);
console.log('Valid:', validation.valid, 'Errors:', validation.errors);
```

## Future Enhancements

1. **Build-Time Discovery**: Auto-scan plugins directory and generate registry
2. **Plugin Metadata**: Extract metadata from component files automatically  
3. **Configuration UI**: Auto-generate configuration forms from schemas
4. **Plugin Versioning**: Support multiple versions of the same chart type
5. **Hot Plugin Reloading**: Reload plugins without app restart in development

## Troubleshooting

### Chart Not Appearing
1. Check if chart is registered in `STATIC_CHART_REGISTRY`
2. Verify component exports and imports
3. Check browser console for plugin discovery errors
4. Use debug panel in development mode

### TypeScript Errors
1. Ensure component implements `ChartProps` interface
2. Check that all required props are provided
3. Verify chart type strings match registry keys

### Performance Issues
1. Use React.memo for expensive chart components
2. Implement shouldComponentUpdate for data-heavy charts
3. Consider virtualization for large datasets
4. Use appropriate chart library for your data size

## Example: Complete Plugin Implementation

```typescript
// File: src/plugins/charts/custom/KPICard.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { ChartProps } from '../factory/ChartFactory';

export const KPICard: React.FC<ChartProps> = ({ data, config, dimensions }) => {
  const value = data?.[0]?.[config.valueField] || 0;
  const target = config.target || 0;
  const percentage = target ? ((value / target) * 100).toFixed(1) : '0';

  return (
    <Box sx={{ 
      width: dimensions.width, 
      height: dimensions.height,
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      border: '1px solid #ddd',
      borderRadius: 1
    }}>
      <Typography variant="h4" color="primary" fontWeight="bold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {config.title || 'KPI Value'}
      </Typography>
      {target && (
        <Typography variant="caption" color={value >= target ? 'success.main' : 'warning.main'}>
          {percentage}% of target
        </Typography>
      )}
    </Box>
  );
};

// Register in ChartFactory:
/*
'custom-kpi': {
  component: KPICard,
  library: 'custom',
  category: 'basic',
  displayName: 'KPI Card',
  description: 'Key Performance Indicator card with target comparison'
}
*/
```

This example shows a complete custom chart plugin that will be automatically available in the ChartBuilder interface.