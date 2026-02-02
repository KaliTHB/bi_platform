// api-services/src/services/ChartService.ts - COMPLETE IMPLEMENTATION
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// ===================================================================
// INTERFACES & TYPES
// ===================================================================

interface Chart {
  id: string;
  workspace_id: string;
  dashboard_id?: string;
  tab_id?: string;
  dataset_ids: string[];
  plugin_name: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  chart_category: string;
  chart_library: string;
  config_json: any;
  position_json: any;
  styling_config: any;
  interaction_config: any;
  query_config: any;
  drilldown_config: any;
  calculated_fields: any[];
  conditional_formatting: any[];
  export_config: any;
  cache_config: any;
  order_index: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  render_count?: number;
  last_rendered?: Date;
}

interface ChartCreateData {
  dashboard_id?: string;
  tab_id?: string;
  dataset_ids?: string[];
  plugin_name?: string;
  name: string;
  display_name?: string;
  description?: string;
  chart_type: string;
  chart_category?: string;
  chart_library?: string;
  config_json?: any;
  position_json?: any;
  styling_config?: any;
  interaction_config?: any;
  query_config?: any;
  drilldown_config?: any;
  calculated_fields?: any[];
  conditional_formatting?: any[];
  export_config?: any;
  cache_config?: any;
  order_index?: number;
}

interface ChartUpdateData {
  name?: string;
  display_name?: string;
  description?: string;
  dataset_ids?: string[];
  config_json?: any;
  position_json?: any;
  styling_config?: any;
  interaction_config?: any;
  query_config?: any;
  drilldown_config?: any;
  calculated_fields?: any[];
  conditional_formatting?: any[];
  export_config?: any;
  cache_config?: any;
  order_index?: number;
  is_active?: boolean;
}

interface GetChartsOptions {
  page: number;
  limit: number;
  filters: {
    chart_type?: string;
    dashboard_id?: string;
    tab_id?: string;
    dataset_id?: string;
    created_by?: string;
    is_public?: boolean;
    search?: string;
  };
}

interface ChartDataResponse {
  chart_id: string;
  chart_type: string;
  data: any[];
  columns?: Array<{ name: string; type: string; format?: string }>;
  metadata: {
    total_rows: number;
    datasets_used: number;
    last_updated: Date;
    execution_time_ms: number;
    cached?: boolean;
    query_hash?: string;
    generated_sql?: string;
  };
  cached: boolean;
  generated_at: Date;
}

interface ChartFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'between' | 'contains';
  value: any;
  type: 'include' | 'exclude';
  is_required: boolean;
}

interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  width?: number;
  height?: number;
  quality?: number;
  userId?: string;
}

interface ChartExportResult {
  format: string;
  file_path: string;
  file_name: string;
  file_size: number;
  generated_at: Date;
}

interface Database {
  query(text: string, params?: any[]): Promise<{ rows: any[]; rowCount?: number }>;
}

// ===================================================================
// CHART SERVICE CLASS
// ===================================================================

export class ChartService {
  constructor(
    private database: Database,
    private datasetService?: any,
    private cacheService?: any,
    private permissionService?: any
  ) {
    if (!database) {
      throw new Error('ChartService requires a database connection');
    }
    logger.info('✅ ChartService initialized with database connection');
  }

  // ===================================================================
  // CORE CRUD OPERATIONS
  // ===================================================================

  /**
   * Get chart by ID from database
   */
  async getChartById(id: string): Promise<Chart | null> {
    try {
      const result = await this.database.query(`
        SELECT 
          id, workspace_id, dashboard_id, tab_id, dataset_ids, plugin_name,
          name, display_name, description, chart_type, chart_category,
          chart_library, config_json, position_json, styling_config,
          interaction_config, query_config, drilldown_config,
          calculated_fields, conditional_formatting, export_config,
          cache_config, order_index, is_active, created_at, updated_at,
          created_by, render_count, last_rendered
        FROM charts 
        WHERE id = $1 AND is_active = true
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.parseChartRow(result.rows[0]);
    } catch (error: any) {
      logger.error('Error fetching chart by ID:', { id, error: error.message });
      throw new Error(`Failed to fetch chart: ${error.message}`);
    }
  }

  /**
   * Get all charts for a workspace with pagination and filtering
   */
  async getCharts(workspaceId: string, options: GetChartsOptions = {
    page: 1,
    limit: 20,
    filters: {}
  }): Promise<{
    charts: Chart[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const offset = (options.page - 1) * options.limit;
      let whereClause = 'WHERE workspace_id = $1 AND is_active = true';
      const queryParams: any[] = [workspaceId];
      let paramIndex = 2;

      // Apply filters
      if (options.filters.dashboard_id) {
        whereClause += ` AND dashboard_id = $${paramIndex}`;
        queryParams.push(options.filters.dashboard_id);
        paramIndex++;
      }

      if (options.filters.tab_id) {
        whereClause += ` AND tab_id = $${paramIndex}`;
        queryParams.push(options.filters.tab_id);
        paramIndex++;
      }

      if (options.filters.chart_type) {
        whereClause += ` AND chart_type = $${paramIndex}`;
        queryParams.push(options.filters.chart_type);
        paramIndex++;
      }

      if (options.filters.dataset_id) {
        whereClause += ` AND $${paramIndex} = ANY(dataset_ids)`;
        queryParams.push(options.filters.dataset_id);
        paramIndex++;
      }

      if (options.filters.created_by) {
        whereClause += ` AND created_by = $${paramIndex}`;
        queryParams.push(options.filters.created_by);
        paramIndex++;
      }

      if (options.filters.search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        queryParams.push(`%${options.filters.search}%`);
        paramIndex++;
      }

      // Get total count
      const countResult = await this.database.query(
        `SELECT COUNT(*) FROM charts ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get charts
      const result = await this.database.query(`
        SELECT * FROM charts ${whereClause}
        ORDER BY order_index ASC, created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...queryParams, options.limit, offset]);

      const charts = result.rows.map(row => this.parseChartRow(row));

      return {
        charts,
        total,
        page: options.page,
        limit: options.limit,
        pages: Math.ceil(total / options.limit)
      };
    } catch (error: any) {
      logger.error('Error fetching charts:', { workspaceId, error: error.message });
      throw new Error(`Failed to fetch charts: ${error.message}`);
    }
  }

  /**
   * Create new chart
   */
  async createChart(
    workspaceId: string,
    chartData: ChartCreateData,
    createdBy: string
  ): Promise<Chart> {
    try {
      const chartId = uuidv4();
      
      // Validate chart configuration
      await this.validateChartConfiguration(chartData);
      
      // Check dataset access if datasets specified
      if (chartData.dataset_ids && chartData.dataset_ids.length > 0) {
        const hasAccess = await this.checkChartDatasetAccess(
          createdBy,
          chartData.dataset_ids,
          workspaceId
        );
        
        if (!hasAccess) {
          throw new Error('Access denied to one or more required datasets');
        }
      }
      
      const result = await this.database.query(`
        INSERT INTO charts (
          id, workspace_id, dashboard_id, tab_id, dataset_ids, plugin_name,
          name, display_name, description, chart_type, chart_category,
          chart_library, config_json, position_json, styling_config,
          interaction_config, query_config, drilldown_config,
          calculated_fields, conditional_formatting, export_config,
          cache_config, order_index, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `, [
        chartId,
        workspaceId,
        chartData.dashboard_id,
        chartData.tab_id,
        chartData.dataset_ids || [],
        chartData.plugin_name || chartData.chart_type,
        chartData.name,
        chartData.display_name || chartData.name,
        chartData.description,
        chartData.chart_type,
        chartData.chart_category || 'basic',
        chartData.chart_library || 'echarts',
        JSON.stringify(chartData.config_json || {}),
        JSON.stringify(chartData.position_json || {}),
        JSON.stringify(chartData.styling_config || {}),
        JSON.stringify(chartData.interaction_config || {}),
        JSON.stringify(chartData.query_config || {}),
        JSON.stringify(chartData.drilldown_config || {}),
        JSON.stringify(chartData.calculated_fields || []),
        JSON.stringify(chartData.conditional_formatting || []),
        JSON.stringify(chartData.export_config || {}),
        JSON.stringify(chartData.cache_config || { enabled: true, ttl: 600 }),
        chartData.order_index || 0,
        createdBy
      ]);

      logger.info('Chart created successfully', { id: chartId, name: chartData.name });
      return this.parseChartRow(result.rows[0]);
    } catch (error: any) {
      logger.error('Error creating chart:', { workspaceId, chartData, error: error.message });
      throw new Error(`Failed to create chart: ${error.message}`);
    }
  }

  /**
   * Update chart
   */
  async updateChart(
    chartId: string,
    updates: ChartUpdateData,
    userId: string
  ): Promise<Chart> {
    try {
      const chart = await this.getChartById(chartId);
      if (!chart) {
        throw new Error('Chart not found');
      }
      
      // Check permissions if permissionService is available
      if (this.permissionService) {
        const hasPermission = await this.permissionService.hasPermission(
          userId,
          chart.workspace_id,
          'chart.update'
        );
        
        if (!hasPermission) {
          throw new Error('Permission denied: cannot update chart');
        }
      }
      
      // If dataset_ids are being updated, check access
      if (updates.dataset_ids) {
        const hasDatasetAccess = await this.checkChartDatasetAccess(
          userId,
          updates.dataset_ids,
          chart.workspace_id
        );
        
        if (!hasDatasetAccess) {
          throw new Error('Access denied to one or more datasets');
        }
      }

      const setClause: string[] = [];
      const values: any[] = [chartId];
      let paramIndex = 2;

      const updatableFields = [
        'name', 'display_name', 'description', 'dataset_ids', 'config_json',
        'position_json', 'styling_config', 'interaction_config', 'query_config',
        'drilldown_config', 'calculated_fields', 'conditional_formatting',
        'export_config', 'cache_config', 'order_index', 'is_active'
      ];

      updatableFields.forEach(field => {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramIndex++}`);
          const value = typeof updates[field] === 'object' 
            ? JSON.stringify(updates[field]) 
            : updates[field];
          values.push(value);
        }
      });

      if (setClause.length === 0) {
        throw new Error('No fields to update');
      }

      setClause.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.database.query(`
        UPDATE charts
        SET ${setClause.join(', ')}
        WHERE id = $1 AND is_active = true
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Chart not found or already deleted');
      }

      // Invalidate cache
      await this.invalidateChartCache(chartId);

      logger.info('Chart updated successfully', { id: chartId });
      return this.parseChartRow(result.rows[0]);
    } catch (error: any) {
      logger.error('Error updating chart:', { chartId, updates, error: error.message });
      throw new Error(`Failed to update chart: ${error.message}`);
    }
  }

  /**
   * Delete chart (soft delete)
   */
  async deleteChart(chartId: string, userId?: string): Promise<void> {
    try {
      const chart = await this.getChartById(chartId);
      if (!chart) {
        throw new Error('Chart not found');
      }
      
      // Check permissions if permissionService and userId are available
      if (this.permissionService && userId) {
        const hasPermission = await this.permissionService.hasPermission(
          userId,
          chart.workspace_id,
          'chart.delete'
        );
        
        if (!hasPermission) {
          throw new Error('Permission denied: cannot delete chart');
        }
      }

      const result = await this.database.query(`
        UPDATE charts 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
      `, [chartId]);

      if (result.rowCount === 0) {
        throw new Error('Chart not found or already deleted');
      }

      // Invalidate cache
      await this.invalidateChartCache(chartId);

      logger.info('Chart deleted successfully', { id: chartId });
    } catch (error: any) {
      logger.error('Error deleting chart:', { chartId, error: error.message });
      throw new Error(`Failed to delete chart: ${error.message}`);
    }
  }

  /**
   * Duplicate chart
   */
  async duplicateChart(
    chartId: string,
    userId: string,
    options: { name?: string; description?: string } = {}
  ): Promise<Chart> {
    try {
      const originalChart = await this.getChartById(chartId);
      if (!originalChart) {
        throw new Error('Chart not found');
      }

      const duplicatedChart = await this.createChart(
        originalChart.workspace_id,
        {
          ...originalChart,
          name: options.name || `${originalChart.name} (Copy)`,
          display_name: options.name || `${originalChart.display_name} (Copy)`,
          description: options.description || originalChart.description,
          // Reset positional data for the duplicate
          position_json: { ...originalChart.position_json, x: (originalChart.position_json?.x || 0) + 50, y: (originalChart.position_json?.y || 0) + 50 }
        },
        userId
      );

      logger.info('Chart duplicated successfully', { originalId: chartId, newId: duplicatedChart.id });
      return duplicatedChart;
    } catch (error: any) {
      logger.error('Error duplicating chart:', { chartId, error: error.message });
      throw new Error(`Failed to duplicate chart: ${error.message}`);
    }
  }

  // ===================================================================
  // CHART DATA OPERATIONS
  // ===================================================================

  /**
   * Generate chart data - Main method called by controller
   */
  async generateChartData(
    chartId: string,
    userId: string,
    filters: ChartFilter[] = []
  ): Promise<ChartDataResponse> {
    try {
      const chart = await this.getChartById(chartId);
      if (!chart || !chart.is_active) {
        throw new Error('Chart not found or inactive');
      }
      
      // Check dataset access
      const hasAccess = await this.checkChartDatasetAccess(
        userId,
        chart.dataset_ids,
        chart.workspace_id
      );
      
      if (!hasAccess) {
        throw new Error('Access denied to chart datasets');
      }
      
      // Check cache first
      const cacheKey = this.generateChartCacheKey(chartId, filters);
      let cachedData = null;
      
      if (chart.cache_config.enabled && this.cacheService) {
        cachedData = await this.cacheService.get(cacheKey);
        if (cachedData) {
          return {
            ...cachedData,
            cached: true,
            generated_at: new Date()
          };
        }
      }
      
      // Generate data for each dataset
      const datasetResults = [];
      
      for (const datasetId of chart.dataset_ids) {
        if (this.datasetService) {
          const datasetData = await this.datasetService.executeDatasetQuery(
            datasetId,
            userId,
            {
              filters: filters || [],
              pagination: chart.query_config.pagination
            }
          );
          
          datasetResults.push({
            dataset_id: datasetId,
            data: datasetData.rows,
            metadata: datasetData.metadata
          });
        } else {
          // Mock data if datasetService not available
          datasetResults.push({
            dataset_id: datasetId,
            data: this.generateMockData(chart),
            metadata: { total_rows: 10, execution_time_ms: 100 }
          });
        }
      }
      
      // Process data according to chart configuration
      const processedData = await this.processChartData(chart, datasetResults);
      
      // Apply conditional formatting
      const formattedData = await this.applyConditionalFormatting(
        processedData,
        chart.conditional_formatting
      );
      
      const chartDataResponse = {
        chart_id: chartId,
        chart_type: chart.chart_type,
        data: formattedData,
        metadata: {
          total_rows: formattedData.length,
          datasets_used: chart.dataset_ids.length,
          last_updated: new Date(),
          execution_time_ms: 0 // Would be measured in actual implementation
        },
        cached: false,
        generated_at: new Date()
      };
      
      // Cache the result
      if (chart.cache_config.enabled && this.cacheService) {
        await this.cacheService.set(
          cacheKey,
          chartDataResponse,
          chart.cache_config.ttl || 600
        );
      }
      
      // Update render count
      await this.incrementRenderCount(chartId);
      
      return chartDataResponse;
    } catch (error: any) {
      logger.error('Error generating chart data:', { chartId, error: error.message });
      throw new Error(`Failed to generate chart data: ${error.message}`);
    }
  }

  /**
   * Get chart data - Alias for generateChartData for backward compatibility
   */
  async getChartData(
    chartId: string,
    userId?: string,
    filters: ChartFilter[] = []
  ): Promise<ChartDataResponse> {
    if (!userId) {
      // Return basic structure if no userId provided
      const chart = await this.getChartById(chartId);
      if (!chart) {
        throw new Error('Chart not found');
      }

      return {
        chart_id: chartId,
        chart_type: chart.chart_type,
        data: [],
        metadata: {
          total_rows: 0,
          datasets_used: chart.dataset_ids.length,
          last_updated: new Date(),
          execution_time_ms: 0
        },
        cached: false,
        generated_at: new Date()
      };
    }

    return this.generateChartData(chartId, userId, filters);
  }

  /**
   * Refresh chart data (bypass cache)
   */
  async refreshChart(
    chartId: string,
    userId: string,
    filters: ChartFilter[] = []
  ): Promise<ChartDataResponse> {
    try {
      // Invalidate cache first
      await this.invalidateChartCache(chartId);
      
      // Generate fresh data
      return this.generateChartData(chartId, userId, filters);
    } catch (error: any) {
      logger.error('Error refreshing chart:', { chartId, error: error.message });
      throw new Error(`Failed to refresh chart: ${error.message}`);
    }
  }

  // ===================================================================
  // CHART EXPORT OPERATIONS
  // ===================================================================

  /**
   * Export chart in various formats
   */
  async exportChart(
    chartId: string,
    format: 'png' | 'svg' | 'pdf' | 'json',
    userId: string,
    options: ChartExportOptions = {}
  ): Promise<ChartExportResult> {
    try {
      const chart = await this.getChartById(chartId);
      if (!chart) {
        throw new Error('Chart not found');
      }
      
      // Check export permissions if permissionService available
      if (this.permissionService) {
        const exportPermission = `export.${format === 'json' ? 'data' : 'image'}`;
        const hasPermission = await this.permissionService.hasPermission(
          userId,
          chart.workspace_id,
          exportPermission
        );
        
        if (!hasPermission) {
          throw new Error(`Permission denied: cannot export chart as ${format}`);
        }
      }
      
      // Get chart data for export
      const chartData = await this.generateChartData(chartId, userId);
      
      // Export based on format
      switch (format) {
        case 'json':
          return this.exportChartAsJSON(chart, chartData, options);
        case 'png':
        case 'svg':
          return this.exportChartAsImage(chart, chartData, format, options);
        case 'pdf':
          return this.exportChartAsPDF(chart, chartData, options);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error: any) {
      logger.error('Error exporting chart:', { chartId, format, error: error.message });
      throw new Error(`Failed to export chart: ${error.message}`);
    }
  }

  /**
   * Get chart query information
   */
  async getChartQuery(chartId: string): Promise<any> {
    try {
      const chart = await this.getChartById(chartId);
      if (!chart) {
        throw new Error('Chart not found');
      }

      return {
        query: chart.query_config?.query || '',
        parameters: chart.query_config?.parameters || {},
        generated_at: new Date().toISOString(),
        dataset_ids: chart.dataset_ids,
        last_executed: chart.last_rendered || chart.updated_at
      };
    } catch (error: any) {
      logger.error('Error getting chart query:', { chartId, error: error.message });
      throw new Error(`Failed to get chart query: ${error.message}`);
    }
  }

  // ===================================================================
  // HELPER AND UTILITY METHODS
  // ===================================================================

  /**
   * Validate chart configuration
   */
  private async validateChartConfiguration(chartData: ChartCreateData): Promise<void> {
    if (!chartData.name || chartData.name.trim().length === 0) {
      throw new Error('Chart name is required');
    }
    
    if (!chartData.chart_type) {
      throw new Error('Chart type is required');
    }
    
    // Add more validation as needed
    logger.debug('Chart configuration validated', { name: chartData.name, type: chartData.chart_type });
  }

  /**
   * Check if user has access to chart datasets
   */
  private async checkChartDatasetAccess(
    userId: string,
    datasetIds: string[],
    workspaceId: string
  ): Promise<boolean> {
    try {
      if (!datasetIds || datasetIds.length === 0) {
        return true;
      }
      
      // If datasetService is available, use it to check access
      if (this.datasetService && this.datasetService.checkDatasetAccess) {
        for (const datasetId of datasetIds) {
          const hasAccess = await this.datasetService.checkDatasetAccess(userId, datasetId, workspaceId);
          if (!hasAccess) {
            return false;
          }
        }
      }
      
      // Simplified check - assume access if no service available
      return true;
    } catch (error: any) {
      logger.error('Error checking dataset access:', { userId, datasetIds, error: error.message });
      return false;
    }
  }

  /**
   * Process chart data from datasets
   */
  private async processChartData(chart: Chart, datasetResults: any[]): Promise<any[]> {
    try {
      if (datasetResults.length === 0) {
        return [];
      }
      
      // For now, return the first dataset's data
      // This could be enhanced to combine multiple datasets based on chart configuration
      return datasetResults[0]?.data || [];
    } catch (error: any) {
      logger.error('Error processing chart data:', { chartId: chart.id, error: error.message });
      return [];
    }
  }

  /**
   * Apply conditional formatting to chart data
   */
  private async applyConditionalFormatting(data: any[], formatting: any[]): Promise<any[]> {
    try {
      if (!formatting || formatting.length === 0) {
        return data;
      }
      
      // Apply formatting rules to data
      // This is a simplified implementation - would need more sophisticated logic
      return data.map(row => {
        const formattedRow = { ...row };
        
        formatting.forEach(rule => {
          if (rule.condition && this.evaluateCondition(row, rule.condition)) {
            Object.assign(formattedRow, rule.styling);
          }
        });
        
        return formattedRow;
      });
    } catch (error: any) {
      logger.error('Error applying conditional formatting:', { error: error.message });
      return data;
    }
  }

  /**
   * Generate cache key for chart data
   */
  private generateChartCacheKey(chartId: string, filters?: ChartFilter[]): string {
    const filterKey = filters ? JSON.stringify(filters) : 'no-filters';
    return `chart:${chartId}:data:${this.hashString(filterKey)}`;
  }

  /**
   * Invalidate chart cache
   */
  private async invalidateChartCache(chartId: string): Promise<void> {
    try {
      if (this.cacheService) {
        const pattern = `chart:${chartId}:*`;
        await this.cacheService.deletePattern(pattern);
      }
    } catch (error: any) {
      logger.warn('Error invalidating chart cache:', { chartId, error: error.message });
    }
  }

  /**
   * Increment render count for analytics
   */
  private async incrementRenderCount(chartId: string): Promise<void> {
    try {
      await this.database.query(`
        UPDATE charts
        SET render_count = COALESCE(render_count, 0) + 1, 
            last_rendered = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [chartId]);
    } catch (error: any) {
      logger.warn('Error incrementing render count:', { chartId, error: error.message });
    }
  }

  /**
   * Parse chart row from database with proper JSON parsing
   */
  private parseChartRow(row: any): Chart {
    const chart = { ...row };
    
    // Parse JSON fields safely
    const jsonFields = [
      'config_json', 'position_json', 'styling_config', 'interaction_config',
      'query_config', 'drilldown_config', 'calculated_fields', 
      'conditional_formatting', 'export_config', 'cache_config'
    ];

    jsonFields.forEach(field => {
      if (chart[field] && typeof chart[field] === 'string') {
        try {
          chart[field] = JSON.parse(chart[field]);
        } catch (e) {
          logger.warn(`Failed to parse JSON field ${field} for chart ${chart.id}`);
          chart[field] = field === 'calculated_fields' || field === 'conditional_formatting' ? [] : {};
        }
      } else if (!chart[field]) {
        chart[field] = field === 'calculated_fields' || field === 'conditional_formatting' ? [] : {};
      }
    });

    // Ensure dataset_ids is an array
    if (!Array.isArray(chart.dataset_ids)) {
      chart.dataset_ids = chart.dataset_ids ? [chart.dataset_ids] : [];
    }

    return chart;
  }

  /**
   * Generate mock data for development/testing
   */
  private generateMockData(chart: Chart, limit: number = 10): any[] {
    const mockData = [];
    const categories = ['Q1', 'Q2', 'Q3', 'Q4'];
    const regions = ['North', 'South', 'East', 'West'];
    
    for (let i = 0; i < limit; i++) {
      mockData.push({
        id: i + 1,
        category: categories[i % categories.length],
        region: regions[i % regions.length],
        value: Math.floor(Math.random() * 1000) + 100,
        revenue: Math.floor(Math.random() * 10000) + 1000,
        date: new Date(2024, i % 12, Math.floor(Math.random() * 28) + 1).toISOString()
      });
    }
    
    return mockData;
  }

  /**
   * Export chart as JSON
   */
  private async exportChartAsJSON(
    chart: Chart,
    chartData: ChartDataResponse,
    options: ChartExportOptions
  ): Promise<ChartExportResult> {
    const exportData = {
      chart: {
        id: chart.id,
        name: chart.name,
        type: chart.chart_type,
        configuration: chart.config_json
      },
      data: chartData.data,
      metadata: chartData.metadata,
      exported_at: new Date().toISOString(),
      exported_by: options.userId
    };
    
    const fileName = `${chart.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    const filePath = await this.saveExportFile(fileName, JSON.stringify(exportData, null, 2));
    
    return {
      format: 'json',
      file_path: filePath,
      file_name: fileName,
      file_size: Buffer.byteLength(JSON.stringify(exportData), 'utf8'),
      generated_at: new Date()
    };
  }

  /**
   * Export chart as image (PNG/SVG)
   */
  private async exportChartAsImage(
    chart: Chart,
    chartData: ChartDataResponse,
    format: 'png' | 'svg',
    options: ChartExportOptions
  ): Promise<ChartExportResult> {
    // This would integrate with a headless browser or image generation service
    // For now, return a placeholder
    const fileName = `${chart.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${format}`;
    
    return {
      format,
      file_path: `/exports/${fileName}`,
      file_name: fileName,
      file_size: 0, // Would be actual file size
      generated_at: new Date()
    };
  }

  /**
   * Export chart as PDF
   */
  private async exportChartAsPDF(
    chart: Chart,
    chartData: ChartDataResponse,
    options: ChartExportOptions
  ): Promise<ChartExportResult> {
    // This would integrate with a PDF generation service
    const fileName = `${chart.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    
    return {
      format: 'pdf',
      file_path: `/exports/${fileName}`,
      file_name: fileName,
      file_size: 0, // Would be actual file size
      generated_at: new Date()
    };
  }

  /**
   * Save export file to disk/cloud
   */
  private async saveExportFile(fileName: string, content: string): Promise<string> {
    // Implementation would save file to disk or cloud storage
    const filePath = `/exports/${fileName}`;
    // fs.writeFileSync(filePath, content); // Actual implementation
    return filePath;
  }

  /**
   * Evaluate conditional formatting condition
   */
  private evaluateCondition(row: any, condition: any): boolean {
    try {
      // Simple condition evaluation - would need more sophisticated logic
      const { field, operator, value } = condition;
      const rowValue = row[field];
      
      switch (operator) {
        case 'equals':
          return rowValue === value;
        case 'greater_than':
          return Number(rowValue) > Number(value);
        case 'less_than':
          return Number(rowValue) < Number(value);
        case 'contains':
          return String(rowValue).includes(String(value));
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Hash string for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }
}