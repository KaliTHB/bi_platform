# Chart Factory - Advanced Plugin System Guide

> **A modern, TypeScript-first chart plugin system with universal data support, async loading, and comprehensive error handling.**

## 📋 Overview

The ChartFactory provides a powerful, extensible plugin system for creating dynamic chart components with full async support, comprehensive error handling, and universal data format compatibility. Built for enterprise applications requiring reliable, performant, and flexible data visualization.

### 🌟 Key Features

- **🚀 Async Initialization** - Full async/await support with proper error handling
- **⚡ Dynamic Loading** - Charts loaded on-demand with loading states
- **🔄 Universal Data Support** - Handles both `any[]` and `ChartData` formats seamlessly
- **🛡️ Type Safety** - Complete TypeScript integration with strict typing
- **🎯 Error Boundaries** - Graceful degradation with user-friendly fallbacks
- **⚙️ Configuration Driven** - Each chart exports its own configuration metadata
- **🎨 Theme Support** - Customizable themes with light/dark mode
- **📱 Responsive Design** - Automatic adaptation to container dimensions
- **🔗 Interactive Events** - Rich interaction handling (click, hover, select)

## 🏗️ Architecture

```
plugins/charts/
├── factory/
│   └── ChartFactory.tsx          # Main factory and component loader
├── registry/
│   └── ChartRegistry.ts          # Dynamic plugin registration
├── utils/
│   └── chartDataUtils.ts         # Data normalization utilities
├── echarts/                      # ECharts implementations
│   ├── BarChart.tsx
│   ├── PieChart.tsx
│   ├── LineChart.tsx
│   ├── ScatterChart.tsx
│   ├── WaterfallChart.tsx
│   ├── RadarChart.tsx
│   ├── SunburstChart.tsx
│   └── ParallelChart.tsx
└── index.ts                      # Main export file
```

## 🚀 Quick Start

### 1. Installation

The Chart Factory is included as part of the BI Platform. Ensure you have the required dependencies:

```json
{
  "dependencies": {
    "echarts": "^5.4.3",
    "@mui/material": "^5.15.0",
    "react": "^18.0.0",
    "typescript": "^5.3.0"
  }
}
```

### 2. Basic Usage

```typescript
import { ChartFactory, ChartFactoryComponent } from '@/plugins/charts';

// Initialize the factory (call once in your app)
await ChartFactory.initialize();

// React component usage (recommended)
<ChartFactoryComponent
  chartType="bar"
  chartLibrary="echarts"
  data={[
    { category: 'Q1', sales: 100000 },
    { category: 'Q2', sales: 150000 },
    { category: 'Q3', sales: 120000 }
  ]}
  config={{
    title: 'Quarterly Sales',
    xField: 'category',
    yField: 'sales',
    showGrid: true
  }}
  dimensions={{ width: 800, height: 400 }}
  onError={(error) => console.error('Chart error:', error)}
  onInteraction={(event) => console.log('Chart interaction:', event)}
/>
```

### 3. Complete Integration with ChartBuilder

```typescript
import ChartBuilder from '@/components/builder/ChartBuilder';

<ChartBuilder
  data={yourData}
  columns={columnDefinitions}
  onChartSelect={(type, library) => {
    console.log('Selected chart:', type, library);
  }}
  onChartCreate={(chartElement) => {
    setCurrentChart(chartElement);
  }}
  workspaceId={workspaceId}
  dashboardId={dashboardId}
/>
```

## 📊 Available Charts

### ECharts Library (Primary)

| Chart Type | Category | Best For | Configuration |
|------------|----------|----------|---------------|
| **Bar** | Basic | Comparing categories, rankings | `xField`, `yField`, `orientation` |
| **Line** | Basic | Time series, trends | `xField`, `yField`, `smooth` |
| **Pie** | Basic | Parts of a whole, percentages | `labelField`, `valueField`, `isDonut` |
| **Scatter** | Statistical | Correlations, distributions | `xField`, `yField`, `sizeField` |
| **Radar** | Advanced | Multi-dimensional comparisons | `dimensions`, `valueField` |
| **Waterfall** | Financial | Flow analysis, variance tracking | `categoryField`, `valueField` |
| **Sunburst** | Hierarchical | Nested data, drill-down analysis | `nameField`, `valueField`, `childrenField` |
| **Parallel** | Advanced | Multi-dimensional data exploration | `dimensions`, `filters` |

### Coming Soon
- **Chart.js** integration (v1.1)
- **D3.js** custom visualizations (v1.2)
- **Plotly** scientific charts (v1.2)

## 🔧 API Reference

### ChartFactory Class

```typescript
class ChartFactory {
  // Async initialization (required before use)
  static async initialize(): Promise<void>

  // Create chart programmatically
  static createChart(
    type: string, 
    library: string, 
    props: ChartCreationProps
  ): React.ReactElement

  // Discovery methods
  static async getAllCharts(): Promise<ChartPluginInfo[]>
  static async getCategories(): Promise<string[]>
  static async searchCharts(query: string): Promise<ChartPluginInfo[]>

  // Validation
  static async validateConfig(
    type: string, 
    library: string, 
    config: any
  ): Promise<{ valid: boolean; errors: string[] }>

  // Support checking
  static async isChartSupported(
    type: string, 
    library: string
  ): Promise<boolean>

  // Status
  static isReady(): boolean
}
```

### ChartFactoryComponent Props

```typescript
interface ChartFactoryProps {
  // Required
  chartType: string;                    // Chart type identifier
  chartLibrary: string;                 // Library name ('echarts', etc.)
  data: any[] | ChartData;             // Universal data format
  config: any;                         // Chart-specific configuration

  // Dimensions
  dimensions?: { width: number; height: number };
  width?: number;                      // Alternative to dimensions
  height?: number;                     // Alternative to dimensions

  // Customization
  theme?: ChartTheme;                  // Theme customization
  
  // Event Handlers
  onInteraction?: (event: ChartInteractionEvent) => void;
  onError?: (error: Error) => void;
  onPluginLoadError?: (error: Error) => void;

  // Loading & Error States
  isLoading?: boolean;                 // External loading state
  error?: string;                      // External error state
  FallbackComponent?: React.ComponentType<ChartProps>;

  // Advanced
  enableDynamicLoading?: boolean;      // Enable dynamic plugin loading
}
```

### Data Formats

The Chart Factory accepts two primary data formats:

#### Format 1: Simple Array (Traditional)
```typescript
const data = [
  { category: 'Product A', sales: 100000, profit: 25000 },
  { category: 'Product B', sales: 150000, profit: 35000 },
  { category: 'Product C', sales: 120000, profit: 28000 }
];
```

#### Format 2: ChartData Object (Structured)
```typescript
const data = {
  rows: [
    { category: 'Product A', sales: 100000, profit: 25000 },
    { category: 'Product B', sales: 150000, profit: 35000 }
  ],
  columns: [
    { name: 'category', type: 'string', displayName: 'Product' },
    { name: 'sales', type: 'number', displayName: 'Sales Revenue' },
    { name: 'profit', type: 'number', displayName: 'Profit' }
  ],
  metadata: { 
    totalRows: 2, 
    generatedAt: '2024-01-01',
    source: 'Sales Database' 
  }
};
```

## 🎨 Chart Configuration Examples

### Bar Chart
```typescript
<ChartFactoryComponent
  chartType="bar"
  chartLibrary="echarts"
  config={{
    title: 'Sales by Region',
    xField: 'region',
    yField: 'sales',
    orientation: 'vertical',
    colors: ['#1976d2', '#388e3c', '#f57c00'],
    showGrid: true,
    barWidth: '60%'
  }}
/>
```

### Pie Chart
```typescript
<ChartFactoryComponent
  chartType="pie"
  chartLibrary="echarts"
  config={{
    title: 'Market Share',
    labelField: 'company',
    valueField: 'share',
    isDonut: true,
    radius: ['40%', '70%'],
    legendPosition: 'right'
  }}
/>
```

### Line Chart
```typescript
<ChartFactoryComponent
  chartType="line"
  chartLibrary="echarts"
  config={{
    title: 'Revenue Trend',
    xField: 'month',
    yField: 'revenue',
    smooth: true,
    showPoints: true,
    lineWidth: 3
  }}
/>
```

### Scatter Plot
```typescript
<ChartFactoryComponent
  chartType="scatter"
  chartLibrary="echarts"
  config={{
    title: 'Sales vs Profit Analysis',
    xField: 'sales',
    yField: 'profit',
    sizeField: 'employees',  // Bubble size
    categoryField: 'region', // Color grouping
    symbolSize: [10, 50]     // Size range
  }}
/>
```

## 🛠️ Creating Custom Charts

### Step 1: Create Chart Component

Create a new file in `src/plugins/charts/echarts/CustomChart.tsx`:

```typescript
import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { ChartProps } from '@/types/chart.types';
import { 
  normalizeChartData, 
  isChartDataEmpty, 
  createChartConfig 
} from '../utils/chartDataUtils';

interface CustomChartConfig {
  title?: string;
  xField: string;
  yField: string;
  showGrid?: boolean;
  colors?: string[];
}

export const CustomChart: React.FC<ChartProps> = ({
  data,
  config,
  width = 400,
  height = 300,
  onInteraction,
  onError
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  const options = useMemo(() => {
    // Handle empty data
    if (isChartDataEmpty(data)) {
      return {
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'middle',
          textStyle: { color: '#999', fontSize: 16 }
        }
      } as echarts.EChartsOption;
    }

    // Normalize data and create configuration
    const chartData = normalizeChartData(data);
    const chartConfig = createChartConfig(config, {
      title: 'Custom Chart',
      xField: 'x',
      yField: 'y',
      showGrid: true,
      colors: ['#5470c6', '#91cc75', '#fac858']
    }) as CustomChartConfig;

    // Return ECharts option
    return {
      title: {
        text: chartConfig.title,
        left: 'center'
      },
      grid: {
        show: chartConfig.showGrid
      },
      xAxis: {
        type: 'category',
        data: chartData.map(item => item[chartConfig.xField])
      },
      yAxis: {
        type: 'value'
      },
      series: [{
        type: 'bar',
        data: chartData.map(item => item[chartConfig.yField]),
        itemStyle: {
          color: chartConfig.colors?.[0] || '#5470c6'
        }
      }],
      animation: true
    } as echarts.EChartsOption;
  }, [data, config]);

  useEffect(() => {
    if (!chartRef.current) return;

    try {
      // Initialize chart
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      // Set options
      chartInstance.current.setOption(options, true);

      // Add interaction handler
      const handleClick = (params: any) => {
        onInteraction?.({
          type: 'click',
          data: params.data,
          dataIndex: params.dataIndex,
          seriesIndex: params.seriesIndex
        });
      };

      chartInstance.current.on('click', handleClick);

      return () => {
        chartInstance.current?.off('click', handleClick);
      };
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Chart rendering failed'));
    }
  }, [options, onInteraction, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height 
      }} 
    />
  );
};

// Export configuration (REQUIRED for plugin registration)
export const EChartsCustomChartConfig = {
  name: 'echarts-custom',
  displayName: 'Custom Bar Chart',
  category: 'basic',
  library: 'echarts',
  version: '1.0.0',
  description: 'Custom implementation of bar chart with enhanced features',
  tags: ['custom', 'bar', 'basic'],
  
  configSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Chart Title',
        default: 'Custom Chart'
      },
      xField: {
        type: 'string',
        title: 'X-Axis Field',
        default: 'category'
      },
      yField: {
        type: 'string',
        title: 'Y-Axis Field',
        default: 'value'
      },
      showGrid: {
        type: 'boolean',
        title: 'Show Grid',
        default: true
      }
    },
    required: ['xField', 'yField']
  },
  
  dataRequirements: {
    minColumns: 2,
    maxColumns: 10,
    requiredFields: ['x', 'y'],
    supportedTypes: ['string', 'number']
  },
  
  exportFormats: ['png', 'svg', 'pdf'],
  component: CustomChart
};
```

### Step 2: Register in ChartRegistry

Add your configuration to the registry (automatic registration):

```typescript
// In ChartRegistry.ts, add to the import list:
import('../echarts/CustomChart').then(m => m.EChartsCustomChartConfig),
```

### Step 3: Test Your Chart

```typescript
<ChartFactoryComponent
  chartType="custom"
  chartLibrary="echarts"
  data={[
    { category: 'A', value: 100 },
    { category: 'B', value: 200 }
  ]}
  config={{
    title: 'My Custom Chart',
    xField: 'category',
    yField: 'value',
    showGrid: true
  }}
  dimensions={{ width: 600, height: 400 }}
/>
```

## 📊 Chart Configuration Reference

### Standard Configuration Properties

```typescript
// Base configuration available to all charts
interface BaseChartConfig {
  title?: string;                 // Chart title
  colors?: string[];              // Color palette
  animation?: boolean;            // Enable animations
  showLegend?: boolean;           // Show/hide legend
  showGrid?: boolean;             // Show/hide grid lines
  theme?: 'light' | 'dark';       // Theme variant
}

// Field mapping (common patterns)
interface FieldMappingConfig {
  xField: string;                 // X-axis data field
  yField: string;                 // Y-axis data field
  categoryField?: string;         // Category grouping field
  sizeField?: string;             // Size dimension field (bubbles)
  colorField?: string;            // Color dimension field
}
```

### Chart-Specific Configurations

#### Bar Chart Configuration
```typescript
interface BarChartConfig extends BaseChartConfig {
  xField: string;
  yField: string;
  orientation?: 'vertical' | 'horizontal';
  barWidth?: string | number;
  stack?: string;                 // Stack series by field
  showValues?: boolean;           // Show value labels
}

// Example usage
const barConfig = {
  title: 'Revenue by Quarter',
  xField: 'quarter',
  yField: 'revenue',
  orientation: 'vertical',
  barWidth: '60%',
  colors: ['#1976d2', '#388e3c'],
  showGrid: true,
  showValues: true
};
```

#### Pie Chart Configuration
```typescript
interface PieChartConfig extends BaseChartConfig {
  labelField: string;
  valueField: string;
  isDonut?: boolean;
  radius?: string[];              // ['innerRadius', 'outerRadius']
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showPercentage?: boolean;
}

// Example usage
const pieConfig = {
  title: 'Market Share Distribution',
  labelField: 'company',
  valueField: 'marketShare',
  isDonut: true,
  radius: ['40%', '70%'],
  legendPosition: 'right',
  showPercentage: true
};
```

#### Scatter Chart Configuration
```typescript
interface ScatterChartConfig extends BaseChartConfig {
  xField: string;
  yField: string;
  sizeField?: string;             // For bubble charts
  categoryField?: string;         // Color grouping
  symbolSize?: number | [number, number];
  regressionLine?: boolean;       // Show trend line
}

// Example usage
const scatterConfig = {
  title: 'Sales vs Profit Analysis',
  xField: 'sales',
  yField: 'profit',
  sizeField: 'employees',
  categoryField: 'region',
  symbolSize: [10, 50],
  regressionLine: true
};
```

## 🎭 Theme Customization

### Using Built-in Themes

```typescript
<ChartFactoryComponent
  chartType="bar"
  chartLibrary="echarts"
  theme="dark"  // 'light' | 'dark'
  // ... other props
/>
```

### Custom Theme Creation

```typescript
const customTheme = {
  name: 'corporate',
  backgroundColor: '#ffffff',
  textColor: '#333333',
  gridColor: '#e0e0e0',
  colors: [
    '#1976d2',  // Primary blue
    '#388e3c',  // Success green
    '#f57c00',  // Warning orange
    '#d32f2f',  // Error red
    '#7b1fa2',  // Purple
    '#00796b'   // Teal
  ],
  fontSize: 12,
  fontFamily: 'Roboto, Arial, sans-serif'
};

<ChartFactoryComponent
  chartType="line"
  chartLibrary="echarts"
  theme={customTheme}
  // ... other props
/>
```

## 🎯 Interactive Events

### Event Types

```typescript
interface ChartInteractionEvent {
  type: 'click' | 'hover' | 'select' | 'brush';
  data: any;                      // Data point that was interacted with
  dataIndex?: number;             // Index of data point
  seriesIndex?: number;           // Index of series
  event?: MouseEvent;             // Original mouse event
}
```

### Event Handling Examples

```typescript
const handleChartInteraction = (event: ChartInteractionEvent) => {
  switch (event.type) {
    case 'click':
      // Navigate to detailed view
      router.replace(`/details/${event.data.id}`);
      break;
      
    case 'hover':
      // Show tooltip with additional information
      setTooltipData(event.data);
      break;
      
    case 'select':
      // Update filters based on selection
      setSelectedData(event.data);
      updateFilters(event.data);
      break;
      
    case 'brush':
      // Handle area selection
      const selectedRange = event.data;
      filterDataByRange(selectedRange);
      break;
  }
};

<ChartFactoryComponent
  chartType="scatter"
  chartLibrary="echarts"
  data={data}
  config={config}
  onInteraction={handleChartInteraction}
/>
```

## 🔄 Data Processing & Utilities

### Data Normalization

```typescript
import {
  normalizeChartData,
  isChartDataEmpty,
  extractFieldValues,
  extractNumericValues,
  createChartConfig,
  generateColorPalette,
  validateChartData
} from '@/plugins/charts/utils/chartDataUtils';

// Normalize any data format to array
const arrayData = normalizeChartData(data);

// Check if data is empty or invalid
if (isChartDataEmpty(data)) {
  console.log('No data available for chart');
  return;
}

// Extract specific field values with fallbacks
const categories = extractFieldValues(data, 'category', 'Unknown');
const values = extractNumericValues(data, 'value', 0);

// Create safe configuration with defaults
const safeConfig = createChartConfig(userConfig, defaultConfig);

// Generate consistent color palette
const colors = generateColorPalette(5);

// Validate data before rendering
try {
  validateChartData(data, 'MyChart');
} catch (error) {
  console.error('Data validation failed:', error.message);
}
```

### Advanced Data Transformations

```typescript
const processedData = useMemo(() => {
  const normalized = normalizeChartData(rawData);
  
  // Apply filters
  const filtered = normalized.filter(item => 
    item.category !== 'excluded' && item.value > 0
  );
  
  // Aggregate data by category
  const aggregated = filtered.reduce((acc, item) => {
    const key = item.category;
    if (!acc[key]) {
      acc[key] = { category: key, value: 0, count: 0 };
    }
    acc[key].value += item.value;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, any>);
  
  // Calculate averages and convert back to array
  return Object.values(aggregated).map(item => ({
    ...item,
    average: item.value / item.count
  }));
}, [rawData]);
```

## 🚨 Error Handling

### Component-Level Error Handling

```typescript
const [chartError, setChartError] = useState<string | null>(null);

<ChartFactoryComponent
  chartType="bar"
  chartLibrary="echarts"
  data={data}
  config={config}
  onError={(error) => {
    console.error('Chart rendering error:', error);
    setChartError(error.message);
    
    // Report to error tracking service
    reportError('chart_rendering', {
      chartType: 'bar',
      library: 'echarts',
      error: error.message,
      data: data?.length || 0
    });
  }}
  onPluginLoadError={(error) => {
    console.error('Plugin load error:', error);
    setChartError('Failed to load chart plugin');
  }}
  FallbackComponent={ChartErrorFallback}
/>

{chartError && (
  <Alert severity="error" sx={{ mt: 2 }}>
    <AlertTitle>Chart Error</AlertTitle>
    {chartError}
    <Button 
      size="small" 
      onClick={() => setChartError(null)}
      sx={{ mt: 1 }}
    >
      Retry
    </Button>
  </Alert>
)}
```

### Global Error Boundary

```typescript
// ChartErrorBoundary.tsx
class ChartErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Factory Error:', error, errorInfo);
    // Report to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Chart Failed to Load
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {this.state.error?.message || 'Unknown error occurred'}
          </Typography>
          <Button 
            onClick={() => this.setState({ hasError: false, error: null })}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

## 🎯 Best Practices

### 1. Performance Optimization

```typescript
// Use React.memo for expensive chart components
const OptimizedChart = React.memo(ChartFactoryComponent);

// Debounce data updates to prevent excessive re-renders
const debouncedData = useDebounce(data, 300);

// Limit large datasets for better performance
const processedData = useMemo(() => {
  if (data.length > 1000) {
    console.warn(`Large dataset detected (${data.length} rows). Consider pagination.`);
    return data.slice(0, 1000);
  }
  return data;
}, [data]);

// Use loading states for async operations
const [isLoading, setIsLoading] = useState(false);

<ChartFactoryComponent
  isLoading={isLoading}
  data={debouncedData}
  // ... other props
/>
```

### 2. Accessibility

```typescript
<ChartFactoryComponent
  chartType="bar"
  chartLibrary="echarts"
  config={{
    title: 'Quarterly Sales Performance',
    ariaLabel: 'Bar chart showing sales figures across Q1-Q4 2024'
  }}
  // Accessibility attributes
  role="img"
  tabIndex={0}
  aria-describedby="chart-description"
  onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Handle keyboard navigation
      showChartDetails();
    }
  }}
/>

<Typography 
  id="chart-description" 
  variant="caption" 
  sx={{ display: 'none' }}
>
  Detailed description of chart data for screen readers
</Typography>
```

### 3. Responsive Design

```typescript
const useResponsiveChart = () => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: Math.max(300, clientWidth - 32), // Padding
          height: Math.max(200, Math.min(clientHeight, clientWidth * 0.6))
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return { dimensions, containerRef };
};

// Usage
const MyDashboard = () => {
  const { dimensions, containerRef } = useResponsiveChart();

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: '50vh' }}>
      <ChartFactoryComponent
        chartType="line"
        chartLibrary="echarts"
        dimensions={dimensions}
        // ... other props
      />
    </Box>
  );
};
```

## 🔧 Advanced Features

### 1. Real-time Data Updates

```typescript
const useRealTimeChart = (websocketUrl: string) => {
  const [data, setData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState<Date>();

  useEffect(() => {
    const ws = new WebSocket(websocketUrl);
    
    ws.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setData(prevData => [...prevData, ...newData]);
      setLastUpdate(Date.now());
    };

    return () => ws.close();
  }, [websocketUrl]);

  return { data, lastUpdate };
};

// Usage
const RealTimeChart = () => {
  const { data, lastUpdate } = useRealTimeChart('ws://localhost:3001/charts');

  return (
    <>
      <Typography variant="caption" color="text.secondary">
        Last updated: {lastUpdate?.toLocaleTimeString()}
      </Typography>
      <ChartFactoryComponent
        chartType="line"
        chartLibrary="echarts"
        data={data}
        config={{
          title: 'Live Data Stream',
          xField: 'timestamp',
          yField: 'value',
          animation: true
        }}
      />
    </>
  );
};
```

### 2. Chart Exports

```typescript
const useChartExport = () => {
  const exportChart = async (
    chartType: string,
    data: any[],
    config: any,
    format: 'png' | 'svg' | 'pdf' = 'png'
  ) => {
    try {
      const response = await fetch('/api/charts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType,
          data,
          config,
          format,
          dimensions: { width: 1200, height: 800 }
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chart-${Date.now()}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Chart export failed:', error);
      throw error;
    }
  };

  return { exportChart };
};
```

### 3. Chart Discovery & Metadata

```typescript
const ChartSelector = () => {
  const [availableCharts, setAvailableCharts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const loadCharts = async () => {
      await ChartFactory.initialize();
      const charts = await ChartFactory.getAllCharts();
      setAvailableCharts(charts);
    };
    
    loadCharts();
  }, []);

  const filteredCharts = availableCharts.filter(chart => 
    selectedCategory === 'all' || chart.category === selectedCategory
  );

  return (
    <Grid container spacing={2}>
      {filteredCharts.map(chart => (
        <Grid item xs={12} sm={6} md={4} key={chart.name}>
          <Card>
            <CardContent>
              <Typography variant="h6">{chart.displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {chart.description}
              </Typography>
              <Chip 
                label={chart.category} 
                size="small" 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
```

## 🧪 Testing

### Unit Testing Charts

```typescript
// ChartFactory.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ChartFactoryComponent } from '../ChartFactory';

describe('ChartFactory', () => {
  const mockData = [
    { category: 'A', value: 100 },
    { category: 'B', value: 200 }
  ];

  const mockConfig = {
    title: 'Test Chart',
    xField: 'category',
    yField: 'value'
  };

  beforeAll(async () => {
    await ChartFactory.initialize();
  });

  it('renders bar chart successfully', async () => {
    render(
      <ChartFactoryComponent
        chartType="bar"
        chartLibrary="echarts"
        data={mockData}
        config={mockConfig}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', () => {
    render(
      <ChartFactoryComponent
        chartType="bar"
        chartLibrary="echarts"
        data={[]}
        config={mockConfig}
      />
    );

    expect(screen.getByText('No Data Available')).toBeInTheDocument();
  });

  it('calls error handler on invalid configuration', async () => {
    const onError = jest.fn();
    
    render(
      <ChartFactoryComponent
        chartType="bar"
        chartLibrary="echarts"
        data={mockData}
        config={{}} // Invalid config
        onError={onError}
      />
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });
});
```

### Integration Testing

```typescript
// Dashboard integration test
describe('Dashboard with Chart Factory', () => {
  it('creates and displays multiple charts', async () => {
    const { user } = renderWithProviders(<DashboardBuilder />);
    
    // Add bar chart
    await user.click(screen.getByText('Add Chart'));
    await user.click(screen.getByText('Bar Chart'));
    
    // Configure chart
    await user.type(screen.getByLabelText('Chart Title'), 'Sales Chart');
    await user.selectOptions(screen.getByLabelText('X Field'), 'month');
    await user.selectOptions(screen.getByLabelText('Y Field'), 'sales');
    
    // Create chart
    await user.click(screen.getByText('Create Chart'));
    
    // Verify chart appears
    await waitFor(() => {
      expect(screen.getByText('Sales Chart')).toBeInTheDocument();
    });
  });
});
```

## 🚨 Troubleshooting

### Common Issues & Solutions

#### 1. Chart Not Loading
```typescript
// Check if factory is initialized
if (!ChartFactory.isReady()) {
  await ChartFactory.initialize();
}

// Verify chart support
const isSupported = await ChartFactory.isChartSupported('bar', 'echarts');
if (!isSupported) {
  console.error('Chart type not supported');
}
```

#### 2. Data Format Issues
```typescript
// Validate data before rendering
try {
  validateChartData(data, 'MyChart');
} catch (error) {
  console.error('Data validation failed:', error.message);
  // Handle validation error
}

// Check for required fields
const hasRequiredFields = data.every(item => 
  item.hasOwnProperty('category') && item.hasOwnProperty('value')
);
```

#### 3. Configuration Errors
```typescript
// Validate configuration schema
const validation = await ChartFactory.validateConfig('bar', 'echarts', config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  // Show user-friendly error messages
}
```

#### 4. Plugin Loading Issues
```typescript
<ChartFactoryComponent
  enableDynamicLoading={true}
  onPluginLoadError={(error) => {
    console.error('Plugin failed to load:', error);
    // Fallback to static component or show error
    setUseStaticChart(true);
  }}
  FallbackComponent={({ error }) => (
    <Alert severity="warning">
      Chart temporarily unavailable. Please try again later.
    </Alert>
  )}
/>
```

### Debug Mode

```typescript
// Enable debug information in development
{process.env.NODE_ENV === 'development' && (
  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
    <Typography variant="caption" component="div">
      <strong>Debug Information:</strong>
    </Typography>
    <Typography variant="caption" component="div">
      Factory Ready: {ChartFactory.isReady() ? '✅' : '❌'}
    </Typography>
    <Typography variant="caption" component="div">
      Data Rows: {Array.isArray(data) ? data.length : data?.rows?.length || 0}
    </Typography>
    <Typography variant="caption" component="div">
      Chart Type: {chartType} ({chartLibrary})
    </Typography>
  </Box>
)}
```

## 📈 Performance Guidelines

### 1. Data Size Recommendations

| Data Size | Recommendation | Performance Impact |
|-----------|----------------|-------------------|
| < 100 rows | ✅ Optimal | Excellent |
| 100-1,000 rows | ✅ Good | Good |
| 1,000-5,000 rows | ⚠️ Consider pagination | Moderate |
| 5,000+ rows | ❌ Use aggregation | Poor |

### 2. Optimization Strategies

```typescript
// Use data aggregation for large datasets
const aggregateData = (data: any[], groupBy: string, valueField: string) => {
  return Object.entries(
    data.reduce((acc, item) => {
      const key = item[groupBy];
      acc[key] = (acc[key] || 0) + (item[valueField] || 0);
      return acc;
    }, {})
  ).map(([key, value]) => ({ [groupBy]: key, [valueField]: value }));
};

// Implement virtual scrolling for large lists
const VirtualizedChartList = ({ charts }) => {
  const renderChart = useCallback(({ index, style }) => (
    <div style={style}>
      <ChartFactoryComponent {...charts[index]} />
    </div>
  ), [charts]);

  return (
    <FixedSizeList
      height={600}
      itemCount={charts.length}
      itemSize={400}
    >
      {renderChart}
    </FixedSizeList>
  );
};
```

---

**📊 Happy Charting! Built with ❤️ by the BI Platform Team**

*For the complete BI Platform documentation, see the [main README](../README.md).*