// api-services/src/services/ChartService.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface Chart {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'funnel' | 'heatmap';
  dataset_id: string;
  query_config: QueryConfig;
  visualization_config: VisualizationConfig;
  filters: ChartFilter[];
  tags: string[];
  is_public: boolean;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  last_executed_at?: Date;
  execution_count: number;
  cache_ttl_minutes: number;
  status: 'active' | 'inactive' | 'error';
  error_message?: string;
}

interface QueryConfig {
  dimensions: string[];
  measures: string[];
  aggregations: Record<string, 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct_count'>;
  sorts: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  custom_sql?: string;
}

interface VisualizationConfig {
  x_axis?: {
    field: string;
    label?: string;
    format?: string;
  };
  y_axis?: {
    field: string;
    label?: string;
    format?: string;
  };
  color?: {
    field?: string;
    palette?: string[];
    single_color?: string;
  };
  size?: {
    field?: string;
    range?: [number, number];
  };
  legend?: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  title?: {
    text: string;
    subtitle?: string;
  };
  theme?: string;
  custom_options?: any;
}

interface ChartFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'between' | 'contains';
  value: any;
  type: 'include' | 'exclude';
  is_required: boolean;
}

interface ChartCreateData {
  workspace_id: string;
  name: string;
  display_name?: string;
  description?: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'funnel' | 'heatmap';
  dataset_id: string;
  query_config: QueryConfig;
  visualization_config: VisualizationConfig;
  filters?: FilterConfig[];
  tags?: string[];
  is_public?: boolean;
  created_by: string;
}

interface ChartUpdateData {
  name?: string;
  display_name?: string;
  description?: string;
  type?: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'funnel' | 'heatmap';
  query_config?: QueryConfig;
  visualization_config?: VisualizationConfig;
  filters?: FilterConfig[];
  tags?: string[];
  is_public?: boolean;
}

interface GetChartsOptions {
  page: number;
  limit: number;
  filters: {
    type?: string;
    dataset_id?: string;
    created_by?: string;
    is_public?: boolean;
    dashboard_id?: string;
    search?: string;
  };
}

interface ChartData {
  data: any[];
  columns: Array<{ name: string; type: string; format?: string }>;
  metadata: {
    row_count: number;
    execution_time_ms: number;
    cache_hit: boolean;
    query_hash: string;
    generated_sql?: string;
  };
  cached: boolean;
}

interface ChartUsageInfo {
  inUse: boolean;
  dashboardCount: number;
  dashboards: Array<{ id: string; name: string }>;
}

interface RefreshResult {
  refresh_id: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  started_at: Date;
  estimated_completion_time?: Date;
}

interface ExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'csv' | 'xlsx';
  width?: number;
  height?: number;
  include_data?: boolean;
}

interface ExportResult {
  export_id: string;
  format: string;
  file_path?: string;
  download_url?: string;
  file_size_bytes?: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
}

interface ChartQueryInfo {
  generated_sql: string;
  parameters: Record<string, any>;
  execution_plan?: string;
  estimated_cost?: number;
  cache_key: string;
  last_executed_at?: Date;
}

export class ChartService {
  private charts: Map<string, Chart> = new Map();
  private chartCache: Map<string, ChartData> = new Map();
  private refreshJobs: Map<string, RefreshResult> = new Map();

  constructor() {
    // Initialize with some sample data for development
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample chart
    const sampleChart: Chart = {
      id: uuidv4(),
      workspace_id: 'sample-workspace',
      name: 'monthly_sales',
      display_name: 'Monthly Sales',
      description: 'Sales revenue by month',
      type: 'line',
      dataset_id: 'sample-dataset',
      query_config: {
        dimensions: ['month'],
        measures: ['total_revenue'],
        aggregations: { total_revenue: 'sum' },
        sorts: [{ field: 'month', direction: 'asc' }],
        limit: 12
      },
      visualization_config: {
        x_axis: { field: 'month', label: 'Month' },
        y_axis: { field: 'total_revenue', label: 'Revenue ($)', format: 'currency' },
        color: { single_color: '#007bff' },
        legend: { show: true, position: 'bottom' },
        title: { text: 'Monthly Sales Revenue' }
      },
      filters: [],
      tags: ['sales', 'revenue'],
      is_public: false,
      created_by: 'sample-user',
      created_at: new Date(),
      updated_at: new Date(),
      execution_count: 25,
      cache_ttl_minutes: 30,
      status: 'active'
    };

    this.charts.set(sampleChart.id, sampleChart);
  }

  async getCharts(workspaceId: string, options: GetChartsOptions): Promise<{
    charts: Chart[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      logger.info('Getting charts', { workspaceId, options });

      // Filter charts by workspace
      let allCharts = Array.from(this.charts.values())
        .filter(chart => chart.workspace_id === workspaceId);

      // Apply filters
      if (options.filters.type) {
        allCharts = allCharts.filter(c => c.type === options.filters.type);
      }
      if (options.filters.dataset_id) {
        allCharts = allCharts.filter(c => c.dataset_id === options.filters.dataset_id);
      }
      if (options.filters.created_by) {
        allCharts = allCharts.filter(c => c.created_by === options.filters.created_by);
      }
      if (options.filters.is_public !== undefined) {
        allCharts = allCharts.filter(c => c.is_public === options.filters.is_public);
      }
      if (options.filters.search) {
        const searchTerm = options.filters.search.toLowerCase();
        allCharts = allCharts.filter(c => 
          c.name.toLowerCase().includes(searchTerm) ||
          c.display_name.toLowerCase().includes(searchTerm) ||
          (c.description && c.description.toLowerCase().includes(searchTerm)) ||
          c.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Sort by created_at desc
      allCharts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      const total = allCharts.length;
      const pages = Math.ceil(total / options.limit);
      const offset = (options.page - 1) * options.limit;
      const charts = allCharts.slice(offset, offset + options.limit);

      return {
        charts,
        total,
        page: options.page,
        limit: options.limit,
        pages
      };
    } catch (error: any) {
      logger.error('Error getting charts:', error);
      throw new Error(`Failed to get charts: ${error.message}`);
    }
  }

  async createChart(workspaceId: string, chartData: ChartCreateData): Promise<Chart> {
    try {
      logger.info('Creating chart', { workspaceId, name: chartData.name });

      // Validate name uniqueness within workspace
      const existingChart = Array.from(this.charts.values())
        .find(c => c.workspace_id === workspaceId && c.name === chartData.name);

      if (existingChart) {
        throw new Error(`Chart with name '${chartData.name}' already exists in this workspace`);
      }

      // Validate dataset exists (in a real implementation)
      // const dataset = await this.datasetService.getDatasetById(chartData.dataset_id);
      // if (!dataset || dataset.workspace_id !== workspaceId) {
      //   throw new Error('Dataset not found or not accessible');
      // }

      // Validate query configuration
      this.validateQueryConfig(chartData.query_config, chartData.type);

      const chart: Chart = {
        id: uuidv4(),
        workspace_id: workspaceId,
        name: chartData.name,
        display_name: chartData.display_name || chartData.name,
        description: chartData.description,
        type: chartData.type,
        dataset_id: chartData.dataset_id,
        query_config: chartData.query_config,
        visualization_config: chartData.visualization_config,
        filters: chartData.filters || [],
        tags: chartData.tags || [],
        is_public: chartData.is_public || false,
        created_by: chartData.created_by,
        created_at: new Date(),
        updated_at: new Date(),
        execution_count: 0,
        cache_ttl_minutes: 30,
        status: 'active'
      };

      this.charts.set(chart.id, chart);

      logger.info('Chart created successfully', { id: chart.id, name: chart.name });
      return chart;
    } catch (error: any) {
      logger.error('Error creating chart:', error);
      throw new Error(`Failed to create chart: ${error.message}`);
    }
  }

  async getChartById(id: string): Promise<Chart | null> {
    try {
      const chart = this.charts.get(id);
      return chart || null;
    } catch (error: any) {
      logger.error('Error getting chart by ID:', error);
      throw new Error(`Failed to get chart: ${error.message}`);
    }
  }

  async updateChart(id: string, updateData: ChartUpdateData): Promise<Chart> {
    try {
      logger.info('Updating chart', { id, updateData });

      const chart = this.charts.get(id);
      if (!chart) {
        throw new Error('Chart not found');
      }

      // Validate name uniqueness if name is being updated
      if (updateData.name && updateData.name !== chart.name) {
        const existingChart = Array.from(this.charts.values())
          .find(c => c.workspace_id === chart.workspace_id && c.name === updateData.name);
        
        if (existingChart) {
          throw new Error(`Chart with name '${updateData.name}' already exists in this workspace`);
        }
      }

      // Validate query configuration if being updated
      if (updateData.query_config) {
        this.validateQueryConfig(updateData.query_config, updateData.type || chart.type);
      }

      const updatedChart: Chart = {
        ...chart,
        ...updateData,
        updated_at: new Date()
      };

      // Clear cache if query or filters changed
      if (updateData.query_config || updateData.filters) {
        const cacheKey = this.generateCacheKey(id, chart.query_config, chart.filters);
        this.chartCache.delete(cacheKey);
      }

      this.charts.set(id, updatedChart);

      logger.info('Chart updated successfully', { id });
      return updatedChart;
    } catch (error: any) {
      logger.error('Error updating chart:', error);
      throw new Error(`Failed to update chart: ${error.message}`);
    }
  }

  async deleteChart(id: string): Promise<void> {
    try {
      logger.info('Deleting chart', { id });

      const chart = this.charts.get(id);
      if (!chart) {
        throw new Error('Chart not found');
      }

      // Clean up related data
      this.charts.delete(id);
      
      // Clean up cache entries for this chart
      for (const [cacheKey, _] of this.chartCache.entries()) {
        if (cacheKey.startsWith(`${id}:`)) {
          this.chartCache.delete(cacheKey);
        }
      }

      logger.info('Chart deleted successfully', { id });
    } catch (error: any) {
      logger.error('Error deleting chart:', error);
      throw new Error(`Failed to delete chart: ${error.message}`);
    }
  }

  async duplicateChart(sourceId: string, createdBy: string, newName?: string): Promise<Chart> {
    try {
      logger.info('Duplicating chart', { sourceId, newName });

      const sourceChart = this.charts.get(sourceId);
      if (!sourceChart) {
        throw new Error('Source chart not found');
      }

      const duplicatedName = newName || `${sourceChart.name}_copy_${Date.now()}`;

      // Check name uniqueness
      const existingChart = Array.from(this.charts.values())
        .find(c => c.workspace_id === sourceChart.workspace_id && c.name === duplicatedName);

      if (existingChart) {
        throw new Error(`Chart with name '${duplicatedName}' already exists in this workspace`);
      }

      const duplicatedChart: Chart = {
        ...sourceChart,
        id: uuidv4(),
        name: duplicatedName,
        display_name: newName || `${sourceChart.display_name} (Copy)`,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date(),
        last_executed_at: undefined,
        execution_count: 0
      };

      this.charts.set(duplicatedChart.id, duplicatedChart);

      logger.info('Chart duplicated successfully', { 
        sourceId, 
        duplicatedId: duplicatedChart.id 
      });
      return duplicatedChart;
    } catch (error: any) {
      logger.error('Error duplicating chart:', error);
      throw new Error(`Failed to duplicate chart: ${error.message}`);
    }
  }

  async getChartData(id: string, options: { limit?: number; filters?: any[] } = {}): Promise<ChartData> {
    try {
      logger.info('Getting chart data', { id, options });

      const chart = this.charts.get(id);
      if (!chart) {
        throw new Error('Chart not found');
      }

      // Generate cache key
      const effectiveFilters = [...chart.filters, ...(options.filters || [])];
      const cacheKey = this.generateCacheKey(id, chart.query_config, effectiveFilters, options.limit);

      // Check cache
      const cachedData = this.chartCache.get(cacheKey);
      if (cachedData) {
        logger.info('Returning cached chart data', { id, cacheKey });
        return { ...cachedData, cached: true };
      }

      // Execute query (mock implementation)
      const startTime = Date.now();
      const mockData = this.generateMockData(chart, options.limit);
      const executionTime = Date.now() - startTime;

      const chartData: ChartData = {
        data: mockData,
        columns: this.getColumnsFromChart(chart),
        metadata: {
          row_count: mockData.length,
          execution_time_ms: executionTime,
          cache_hit: false,
          query_hash: cacheKey,
          generated_sql: this.generateSQL(chart, effectiveFilters, options.limit)
        },
        cached: false
      };

      // Cache the result
      this.chartCache.set(cacheKey, chartData);

      // Update chart execution stats
      chart.last_executed_at = new Date();
      chart.execution_count += 1;
      this.charts.set(id, chart);

      logger.info('Chart data generated successfully', { id, rowCount: mockData.length });
      return chartData;
    } catch (error: any) {
      logger.error('Error getting chart data:', error);
      throw new Error(`Failed to get chart data: ${error.message}`);
    }
  }

  async refreshChart(id: string): Promise<RefreshResult> {
    try {
      logger.info('Refreshing chart', { id });

      const chart = this.charts.get(id);
      if (!chart) {
        throw new Error('Chart not found');
      }

      const refreshId = uuidv4();
      const refreshJob: RefreshResult = {
        refresh_id: refreshId,
        status: 'initiated',
        started_at: new Date(),
        estimated_completion_time: new Date(Date.now() + 30000) // 30 seconds
      };

      this.refreshJobs.set(refreshId, refreshJob);

      // Clear all cache entries for this chart
      for (const [cacheKey, _] of this.chartCache.entries()) {
        if (cacheKey.startsWith(`${id}:`)) {
          this.chartCache.delete(cacheKey);
        }
      }

      // Simulate async refresh processing
      setTimeout(async () => {
        try {
          const job = this.refreshJobs.get(refreshId);
          if (job) {
            job.status = 'completed';
            this.refreshJobs.set(refreshId, job);
          }

          logger.info('Chart refresh completed', { id, refreshId });
        } catch (error) {
          logger.error('Error in chart refresh job:', error);
          const job = this.refreshJobs.get(refreshId);
          if (job) {
            job.status = 'failed';
            this.refreshJobs.set(refreshId, job);
          }
        }
      }, 3000);

      return refreshJob;
    } catch (error: any) {
      logger.error('Error refreshing chart:', error);
      throw new Error(`Failed to refresh chart: ${error.message}`);
    }
  }

  async exportChart(id: string, options: ExportOptions): Promise<ExportResult> {
    try {
      logger.info('Exporting chart', { id, options });

      const chart = this.charts.get(id);
      if (!chart) {
        throw new Error('Chart not found');
      }

      const exportResult: ExportResult = {
        export_id: uuidv4(),
        format: options.format,
        status: 'processing',
        created_at: new Date()
      };

      // Simulate async export processing
      setTimeout(async () => {
        try {
          const fileName = `chart_${chart.name}_${Date.now()}.${options.format}`;
          const mockFilePath = `/exports/${fileName}`;
          const mockDownloadUrl = `https://api.example.com/exports/${fileName}`;

          exportResult.status = 'completed';
          exportResult.file_path = mockFilePath;
          exportResult.download_url = mockDownloadUrl;
          exportResult.file_size_bytes = Math.floor(Math.random() * 500000) + 50000;
          exportResult.completed_at = new Date();

          logger.info('Chart export completed', { exportId: exportResult.export_id });
        } catch (error) {
          logger.error('Error in export processing:', error);
          exportResult.status = 'failed';
          exportResult.error_message = 'Export processing failed';
        }
      }, 2000);

      return exportResult;
    } catch (error: any) {
      logger.error('Error exporting chart:', error);
      throw new Error(`Failed to export chart: ${error.message}`);
    }
  }

  async getChartQuery(id: string): Promise<ChartQueryInfo> {
    try {
      const chart = this.charts.get(id);
      if (!chart) {
        throw new Error('Chart not found');
      }

      const cacheKey = this.generateCacheKey(id, chart.query_config, chart.filters);
      
      return {
        generated_sql: this.generateSQL(chart, chart.filters),
        parameters: this.extractParameters(chart),
        cache_key: cacheKey,
        last_executed_at: chart.last_executed_at,
        estimated_cost: Math.floor(Math.random() * 100) + 10 // Mock cost
      };
    } catch (error: any) {
      logger.error('Error getting chart query:', error);
      throw new Error(`Failed to get chart query: ${error.message}`);
    }
  }

  async checkChartUsage(id: string): Promise<ChartUsageInfo> {
    try {
      // In a real implementation, this would query the database for:
      // - Dashboards containing this chart
      // - Alerts based on this chart
      // - Scheduled reports including this chart

      // Mock implementation
      const mockUsage: ChartUsageInfo = {
        inUse: false,
        dashboardCount: 0,
        dashboards: []
      };

      return mockUsage;
    } catch (error: any) {
      logger.error('Error checking chart usage:', error);
      throw new Error(`Failed to check chart usage: ${error.message}`);
    }
  }

  private validateQueryConfig(queryConfig: QueryConfig, chartType: string): void {
    // Validate dimensions and measures
    if (!queryConfig.dimensions && !queryConfig.measures) {
      throw new Error('Chart must have at least one dimension or measure');
    }

    // Type-specific validations
    switch (chartType) {
      case 'pie':
        if (!queryConfig.dimensions || queryConfig.dimensions.length !== 1) {
          throw new Error('Pie charts must have exactly one dimension');
        }
        if (!queryConfig.measures || queryConfig.measures.length !== 1) {
          throw new Error('Pie charts must have exactly one measure');
        }
        break;
      
      case 'metric':
        if (!queryConfig.measures || queryConfig.measures.length === 0) {
          throw new Error('Metric charts must have at least one measure');
        }
        break;
      
      case 'table':
        if (!queryConfig.dimensions && !queryConfig.measures) {
          throw new Error('Table charts must have at least one dimension or measure');
        }
        break;
    }

    // Validate aggregations
    if (queryConfig.aggregations) {
      for (const [field, aggregation] of Object.entries(queryConfig.aggregations)) {
        if (!queryConfig.measures?.includes(field)) {
          throw new Error(`Aggregation specified for field '${field}' which is not in measures`);
        }
        
        const validAggregations = ['sum', 'count', 'avg', 'min', 'max', 'distinct_count'];
        if (!validAggregations.includes(aggregation)) {
          throw new Error(`Invalid aggregation type: ${aggregation}`);
        }
      }
    }
  }

  private generateCacheKey(
    chartId: string, 
    queryConfig: QueryConfig, 
    filters: FilterConfig[], 
    limit?: number
  ): string {
    const keyData = {
      chartId,
      queryConfig,
      filters,
      limit
    };
    
    // In a real implementation, use a proper hash function
    return `${chartId}:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private generateMockData(chart: Chart, limit?: number): any[] {
    const rowCount = Math.min(limit || 100, 1000);
    const data: any[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row: any = {};
      
      // Generate dimension values
      chart.query_config.dimensions?.forEach(dim => {
        switch (dim) {
          case 'month':
            row[dim] = `2024-${String(i % 12 + 1).padStart(2, '0')}`;
            break;
          case 'category':
            row[dim] = ['Electronics', 'Clothing', 'Books', 'Home'][i % 4];
            break;
          case 'region':
            row[dim] = ['North', 'South', 'East', 'West'][i % 4];
            break;
          default:
            row[dim] = `${dim}_${i + 1}`;
        }
      });

      // Generate measure values
      chart.query_config.measures?.forEach(measure => {
        switch (measure) {
          case 'revenue':
          case 'total_revenue':
            row[measure] = Math.round((Math.random() * 10000 + 1000) * 100) / 100;
            break;
          case 'count':
          case 'total_count':
            row[measure] = Math.floor(Math.random() * 1000) + 1;
            break;
          default:
            row[measure] = Math.round((Math.random() * 1000 + 100) * 100) / 100;
        }
      });

      data.push(row);
    }

    return data;
  }

  private getColumnsFromChart(chart: Chart): Array<{ name: string; type: string; format?: string }> {
    const columns: Array<{ name: string; type: string; format?: string }> = [];

    // Add dimension columns
    chart.query_config.dimensions?.forEach(dim => {
      columns.push({
        name: dim,
        type: 'string'
      });
    });

    // Add measure columns
    chart.query_config.measures?.forEach(measure => {
      columns.push({
        name: measure,
        type: 'number',
        format: measure.includes('revenue') || measure.includes('amount') ? 'currency' : 'number'
      });
    });

    return columns;
  }

  private generateSQL(chart: Chart, filters: ChartFilter[], limit?: number): string {
    // Mock SQL generation
    const dimensions = chart.query_config.dimensions || [];
    const measures = chart.query_config.measures || [];
    
    let sql = 'SELECT ';
    
    const selectItems: string[] = [];
    dimensions.forEach(dim => selectItems.push(dim));
    measures.forEach(measure => {
      const aggregation = chart.query_config.aggregations?.[measure] || 'sum';
      selectItems.push(`${aggregation.toUpperCase()}(${measure}) AS ${measure}`);
    });
    
    sql += selectItems.join(', ');
    sql += ` FROM dataset_${chart.dataset_id}`;
    
    if (filters.length > 0) {
      sql += ' WHERE ';
      const filterClauses = filters.map(filter => 
        `${filter.field} ${filter.operator} ${JSON.stringify(filter.value)}`
      );
      sql += filterClauses.join(' AND ');
    }
    
    if (dimensions.length > 0) {
      sql += ` GROUP BY ${dimensions.join(', ')}`;
    }
    
    if (chart.query_config.sorts) {
      sql += ' ORDER BY ';
      const sortClauses = chart.query_config.sorts.map(sort => 
        `${sort.field} ${sort.direction.toUpperCase()}`
      );
      sql += sortClauses.join(', ');
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    return sql;
  }

  private extractParameters(chart: Chart): Record<string, any> {
    // Extract parameters from filters and query config
    const params: Record<string, any> = {};
    
    chart.filters.forEach((filter, index) => {
      params[`filter_${index}_value`] = filter.value;
    });
    
    if (chart.query_config.limit) {
      params.limit = chart.query_config.limit;
    }
    
    return params;
  }
}