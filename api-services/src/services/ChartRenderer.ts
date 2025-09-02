// api-services/src/services/ChartRenderer.ts
import { DatabaseConfig } from '../config/database';
import { logger } from '../utils/logger';

interface ChartConfig {
  id: string;
  name: string;
  type: string;
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataset_id: string;
}

interface ChartData {
  data: any[];
  columns: Array<{
    name: string;
    type: string;
  }>;
  metadata: {
    totalRows: number;
    queryTime: number;
    lastUpdated: string;
  };
}

export class ChartRenderer {
  /**
   * Render chart data for specific chart configuration
   */
  static async renderChart(chartId: string, workspaceId: string, filters?: any[]): Promise<ChartData> {
    try {
      // Get chart configuration
      const chartResult = await DatabaseConfig.query(
        `SELECT c.*, d.name as dataset_name, d.query as dataset_query
         FROM charts c
         LEFT JOIN datasets d ON c.dataset_id = d.id
         WHERE c.id = $1 AND c.workspace_id = $2 AND c.is_active = true`,
        [chartId, workspaceId]
      );

      if (chartResult.rows.length === 0) {
        throw new Error('Chart not found');
      }

      const chart = chartResult.rows[0];
      const startTime = Date.now();

      // Execute dataset query with applied filters
      const queryResult = await this.executeChartQuery(chart, filters);

      const endTime = Date.now();

      return {
        data: queryResult.rows,
        columns: queryResult.columns || [],
        metadata: {
          totalRows: queryResult.rows.length,
          queryTime: endTime - startTime,
          lastUpdated: Date.now().toISOString()
        }
      };
    } catch (error) {
      logger.error('Chart rendering failed', { chartId, error });
      throw error;
    }
  }

  /**
   * Execute chart query with filters applied
   */
  private static async executeChartQuery(chart: any, filters?: any[]): Promise<any> {
    let query = chart.dataset_query;
    const params: any[] = [];

    // Apply filters to query
    if (filters && filters.length > 0) {
      const whereConditions = filters.map((filter, index) => {
        params.push(filter.value);
        return `${filter.column} ${this.getOperatorSQL(filter.operator)} $${params.length}`;
      });

      if (query.toLowerCase().includes('where')) {
        query += ` AND ${whereConditions.join(' AND ')}`;
      } else {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }

    // Apply chart-specific transformations
    query = this.applyChartTransformations(query, chart);

    return await DatabaseConfig.query(query, params);
  }

  /**
   * Apply chart-specific data transformations
   */
  private static applyChartTransformations(query: string, chart: any): string {
    const config = chart.config;
    
    // Apply sorting if specified
    if (config.sorting) {
      const sortClause = config.sorting.map((sort: any) => 
        `${sort.column} ${sort.direction}`
      ).join(', ');
      query += ` ORDER BY ${sortClause}`;
    }

    // Apply limit if specified
    if (config.limit) {
      query += ` LIMIT ${config.limit}`;
    }

    // Apply grouping for aggregate charts
    if (config.groupBy && config.groupBy.length > 0) {
      const groupColumns = config.groupBy.join(', ');
      query += ` GROUP BY ${groupColumns}`;
    }

    return query;
  }

  /**
   * Convert filter operator to SQL
   */
  private static getOperatorSQL(operator: string): string {
    const operatorMap: { [key: string]: string } = {
      'equals': '=',
      'not_equals': '!=',
      'greater_than': '>',
      'less_than': '<',
      'greater_equal': '>=',
      'less_equal': '<=',
      'contains': 'ILIKE',
      'not_contains': 'NOT ILIKE',
      'starts_with': 'ILIKE',
      'ends_with': 'ILIKE',
      'in': 'IN',
      'not_in': 'NOT IN',
      'is_null': 'IS NULL',
      'is_not_null': 'IS NOT NULL'
    };

    return operatorMap[operator] || '=';
  }

  /**
   * Get chart export data in various formats
   */
  static async exportChart(chartId: string, workspaceId: string, format: 'json' | 'csv' | 'excel'): Promise<any> {
    try {
      const chartData = await this.renderChart(chartId, workspaceId);
      
      switch (format) {
        case 'json':
          return {
            format: 'json',
            data: JSON.stringify(chartData, null, 2),
            filename: `chart_${chartId}_${Date.now()}.json`
          };
        
        case 'csv':
          return {
            format: 'csv',
            data: this.convertToCSV(chartData),
            filename: `chart_${chartId}_${Date.now()}.csv`
          };
        
        case 'excel':
          return {
            format: 'excel',
            data: await this.convertToExcel(chartData),
            filename: `chart_${chartId}_${Date.now()}.xlsx`
          };
        
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      logger.error('Chart export failed', { chartId, format, error });
      throw error;
    }
  }

  /**
   * Convert chart data to CSV format
   */
  private static convertToCSV(chartData: ChartData): string {
    if (!chartData.data || chartData.data.length === 0) {
      return '';
    }

    const headers = chartData.columns.map(col => col.name);
    const csvRows = [headers.join(',')];

    chartData.data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Convert chart data to Excel format (placeholder - would need actual Excel library)
   */
  private static async convertToExcel(chartData: ChartData): Promise<Buffer> {
    // This would use a library like xlsx or exceljs
    // For now, returning empty buffer as placeholder
    return Buffer.from('Excel export not implemented');
  }

  /**
   * Validate chart configuration
   */
  static validateChartConfig(chartType: string, config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation based on chart type
    switch (chartType) {
      case 'echarts-bar':
      case 'echarts-line':
        if (!config.xAxis || !config.yAxis) {
          errors.push('xAxis and yAxis configuration required');
        }
        break;
      
      case 'echarts-pie':
        if (!config.labelField || !config.valueField) {
          errors.push('labelField and valueField required for pie charts');
        }
        break;
      
      default:
        // Allow unknown chart types for extensibility
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get chart performance metrics
   */
  static async getChartMetrics(chartId: string, workspaceId: string): Promise<any> {
    try {
      const result = await DatabaseConfig.query(
        `SELECT 
          COUNT(*) as view_count,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_render_time,
          MAX(updated_at) as last_viewed
         FROM chart_views 
         WHERE chart_id = $1 AND workspace_id = $2
         AND created_at > NOW() - INTERVAL '30 days'`,
        [chartId, workspaceId]
      );

      return result.rows[0] || {
        view_count: 0,
        avg_render_time: 0,
        last_viewed: null
      };
    } catch (error) {
      logger.error('Failed to get chart metrics', { chartId, error });
      return {
        view_count: 0,
        avg_render_time: 0,
        last_viewed: null
      };
    }
  }
}