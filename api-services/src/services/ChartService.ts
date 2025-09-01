import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { PermissionService } from './PermissionService';
import { AuditService } from './AuditService';
import { DatasetService } from './DatasetService';

interface CreateChartRequest {
  name: string;
  description?: string;
  chart_type: string;
  dataset_ids: string[];
  config_json: any;
  tags?: string[];
}

interface Chart {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  chart_type: string;
  dataset_ids: string[];
  config_json: any;
  tags: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

interface ChartDataResponse {
  data: any[];
  metadata: {
    totalRows: number;
    executionTime: number;
    lastUpdated: Date;
    cacheHit: boolean;
  };
}

interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  width?: number;
  height?: number;
  userId: string;
}

interface ChartExportResult {
  format: string;
  file_path: string;
  file_name: string;
  file_size: number;
  generated_at: Date;
}

class ChartService {
  private permissionService: PermissionService;
  private auditService: AuditService;
  private datasetService: DatasetService;
  private readonly CACHE_TTL = 900; // 15 minutes

  constructor() {
    this.permissionService = new PermissionService();
    this.auditService = new AuditService();
    this.datasetService = new DatasetService();
  }

  async createChart(userId: string, workspaceId: string, data: CreateChartRequest): Promise<Chart> {
    try {
      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(userId, workspaceId, 'chart.create');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to create chart');
      }

      // Validate chart configuration
      await this.validateChartConfiguration(data);

      // Check access to all datasets
      for (const datasetId of data.dataset_ids) {
        const hasAccess = await this.permissionService.hasDatasetAccess(
          userId, workspaceId, datasetId, 'read'
        );
        if (!hasAccess) {
          throw new Error(`Insufficient permissions to access dataset: ${datasetId}`);
        }
      }

      const chartId = uuidv4();
      
      const query = `
        INSERT INTO charts (
          id, name, description, workspace_id, chart_type, dataset_ids, 
          config_json, tags, created_by, created_at, updated_at, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), true
        ) RETURNING *
      `;
      
      const values = [
        chartId,
        data.name,
        data.description,
        workspaceId,
        data.chart_type,
        JSON.stringify(data.dataset_ids),
        JSON.stringify(data.config_json),
        data.tags || [],
        userId
      ];

      const result = await db.query(query, values);
      const chart = result.rows[0];

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'chart.created',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: chartId,
        details: { 
          chart_name: data.name, 
          chart_type: data.chart_type,
          dataset_count: data.dataset_ids.length
        }
      });

      return chart;
    } catch (error) {
      logger.error('Create chart error:', error);
      throw error;
    }
  }

  async getCharts(userId: string, workspaceId: string, filters?: any): Promise<Chart[]> {
    try {
      let query = `
        SELECT c.*, u.display_name as created_by_name
        FROM charts c
        INNER JOIN users u ON c.created_by = u.id
        WHERE c.workspace_id = $1 AND c.is_active = true
      `;
      const params = [workspaceId];
      let paramIndex = 2;

      // Add filters
      if (filters?.search) {
        query += ` AND (c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.chart_type) {
        query += ` AND c.chart_type = $${paramIndex}`;
        params.push(filters.chart_type);
        paramIndex++;
      }

      if (filters?.tags && filters.tags.length > 0) {
        query += ` AND c.tags && $${paramIndex}`;
        params.push(filters.tags);
        paramIndex++;
      }

      query += ' ORDER BY c.updated_at DESC';

      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }

      if (filters?.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
      }

      const result = await db.query(query, params);
      
      // Filter charts based on dataset access
      const accessibleCharts = [];
      for (const chart of result.rows) {
        let hasAccess = true;
        for (const datasetId of chart.dataset_ids) {
          const hasDatasetAccess = await this.permissionService.hasDatasetAccess(
            userId, workspaceId, datasetId, 'read'
          );
          if (!hasDatasetAccess) {
            hasAccess = false;
            break;
          }
        }
        if (hasAccess) {
          accessibleCharts.push(chart);
        }
      }

      return accessibleCharts;
    } catch (error) {
      logger.error('Get charts error:', error);
      throw error;
    }
  }

  async getChart(userId: string, workspaceId: string, chartId: string): Promise<Chart | null> {
    try {
      const query = `
        SELECT c.*, u.display_name as created_by_name
        FROM charts c
        INNER JOIN users u ON c.created_by = u.id
        WHERE c.id = $1 AND c.workspace_id = $2 AND c.is_active = true
      `;
      
      const result = await db.query(query, [chartId, workspaceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const chart = result.rows[0];

      // Check access to all datasets
      for (const datasetId of chart.dataset_ids) {
        const hasAccess = await this.permissionService.hasDatasetAccess(
          userId, workspaceId, datasetId, 'read'
        );
        if (!hasAccess) {
          throw new Error('Insufficient permissions to access chart datasets');
        }
      }

      return chart;
    } catch (error) {
      logger.error('Get chart error:', error);
      throw error;
    }
  }

  async updateChart(userId: string, workspaceId: string, chartId: string, updates: Partial<CreateChartRequest>): Promise<Chart> {
    try {
      // Get existing chart
      const existingChart = await this.getChart(userId, workspaceId, chartId);
      if (!existingChart) {
        throw new Error('Chart not found');
      }

      // Check if user is owner or has edit permissions
      const isOwner = existingChart.created_by === userId;
      const hasPermission = await this.permissionService.hasPermission(userId, workspaceId, 'chart.edit');
      
      if (!isOwner && !hasPermission) {
        throw new Error('Insufficient permissions to update chart');
      }

      // If dataset_ids are being updated, check access
      if (updates.dataset_ids) {
        for (const datasetId of updates.dataset_ids) {
          const hasAccess = await this.permissionService.hasDatasetAccess(
            userId, workspaceId, datasetId, 'read'
          );
          if (!hasAccess) {
            throw new Error(`Insufficient permissions to access dataset: ${datasetId}`);
          }
        }
      }

      const allowedFields = ['name', 'description', 'chart_type', 'dataset_ids', 'config_json', 'tags'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === 'dataset_ids' || key === 'config_json') {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE charts 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1} AND is_active = true
        RETURNING *
      `;

      values.push(chartId, workspaceId);

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Chart not found');
      }

      // Clear cache
      await this.clearChartCache(chartId);

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'chart.updated',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: chartId,
        details: { updated_fields: Object.keys(updates) }
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Update chart error:', error);
      throw error;
    }
  }

  async deleteChart(userId: string, workspaceId: string, chartId: string): Promise<void> {
    try {
      // Get existing chart
      const existingChart = await this.getChart(userId, workspaceId, chartId);
      if (!existingChart) {
        throw new Error('Chart not found');
      }

      // Check if user is owner or has delete permissions
      const isOwner = existingChart.created_by === userId;
      const hasPermission = await this.permissionService.hasPermission(userId, workspaceId, 'chart.delete');
      
      if (!isOwner && !hasPermission) {
        throw new Error('Insufficient permissions to delete chart');
      }

      // Check if chart is used in any dashboards
      const dashboardQuery = `
        SELECT d.name 
        FROM dashboard_charts dc
        INNER JOIN dashboards d ON dc.dashboard_id = d.id
        WHERE dc.chart_id = $1 AND d.is_active = true
        LIMIT 5
      `;
      
      const dashboardResult = await db.query(dashboardQuery, [chartId]);
      
      if (dashboardResult.rows.length > 0) {
        const dashboardNames = dashboardResult.rows.map(row => row.name).join(', ');
        throw new Error(`Cannot delete chart: it is being used in dashboards: ${dashboardNames}`);
      }

      // Soft delete
      const query = `
        UPDATE charts 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2
      `;
      
      await db.query(query, [chartId, workspaceId]);

      // Clear cache
      await this.clearChartCache(chartId);

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'chart.deleted',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: chartId,
        details: { deletion_type: 'soft' }
      });
    } catch (error) {
      logger.error('Delete chart error:', error);
      throw error;
    }
  }

  async getChartData(userId: string, workspaceId: string, chartId: string, filters?: any): Promise<ChartDataResponse> {
    try {
      // Get chart
      const chart = await this.getChart(userId, workspaceId, chartId);
      if (!chart) {
        throw new Error('Chart not found');
      }

      const cacheKey = `chart_data:${chartId}:${JSON.stringify(filters)}`;
      const startTime = Date.now();

      // Try cache first
      const cached = await cache.get<ChartDataResponse>(cacheKey);
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cacheHit: true,
            executionTime: Date.now() - startTime
          }
        };
      }

      // Get data from all datasets
      const allData = [];
      for (const datasetId of chart.dataset_ids) {
        const datasetData = await this.datasetService.getDatasetData(
          userId, workspaceId, datasetId, { filters }
        );
        allData.push(...datasetData.data);
      }

      // Apply chart-specific transformations
      const processedData = this.processChartData(allData, chart.config_json);

      const response: ChartDataResponse = {
        data: processedData,
        metadata: {
          totalRows: processedData.length,
          executionTime: Date.now() - startTime,
          lastUpdated: Date.now(),
          cacheHit: false
        }
      };

      // Cache the result
      await cache.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      logger.error('Get chart data error:', error);
      throw error;
    }
  }

  async exportChart(userId: string, workspaceId: string, chartId: string, options: ChartExportOptions): Promise<ChartExportResult> {
    try {
      // Get chart and data
      const chart = await this.getChart(userId, workspaceId, chartId);
      if (!chart) {
        throw new Error('Chart not found');
      }

      const chartData = await this.getChartData(userId, workspaceId, chartId);

      let exportResult: ChartExportResult;

      switch (options.format) {
        case 'json':
          exportResult = await this.exportChartAsJSON(chart, chartData, options);
          break;
        case 'png':
        case 'svg':
          exportResult = await this.exportChartAsImage(chart, chartData, options.format, options);
          break;
        case 'pdf':
          exportResult = await this.exportChartAsPDF(chart, chartData, options);
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'chart.exported',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: chartId,
        details: { 
          format: options.format,
          file_name: exportResult.file_name
        }
      });

      return exportResult;
    } catch (error) {
      logger.error('Export chart error:', error);
      throw error;
    }
  }

  private processChartData(data: any[], chartConfig: any): any[] {
    // Apply chart-specific data transformations based on chart type and config
    // This would include aggregations, grouping, sorting, etc.
    
    try {
      // Example transformations - this would be expanded based on chart requirements
      let processedData = [...data];

      // Apply filters from chart config
      if (chartConfig.filters) {
        processedData = this.applyFilters(processedData, chartConfig.filters);
      }

      // Apply grouping
      if (chartConfig.groupBy) {
        processedData = this.groupData(processedData, chartConfig.groupBy);
      }

      // Apply aggregations
      if (chartConfig.aggregations) {
        processedData = this.applyAggregations(processedData, chartConfig.aggregations);
      }

      // Apply sorting
      if (chartConfig.sorting) {
        processedData = this.sortData(processedData, chartConfig.sorting);
      }

      // Apply limit
      if (chartConfig.limit) {
        processedData = processedData.slice(0, chartConfig.limit);
      }

      return processedData;
    } catch (error) {
      logger.error('Process chart data error:', error);
      return data;
    }
  }

  private applyFilters(data: any[], filters: any[]): any[] {
    return data.filter(row => {
      return filters.every(filter => {
        const value = row[filter.field];
        switch (filter.operator) {
          case 'equals':
            return value == filter.value;
          case 'not_equals':
            return value != filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater_than':
            return parseFloat(value) > parseFloat(filter.value);
          case 'less_than':
            return parseFloat(value) < parseFloat(filter.value);
          case 'in':
            return Array.isArray(filter.value) ? filter.value.includes(value) : false;
          default:
            return true;
        }
      });
    });
  }

  private groupData(data: any[], groupBy: string[]): any[] {
    // Simple grouping implementation
    const groups = new Map();
    
    data.forEach(row => {
      const key = groupBy.map(field => row[field]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    });

    return Array.from(groups.values()).map(group => group[0]); // Simplified
  }

  private applyAggregations(data: any[], aggregations: any[]): any[] {
    // Apply aggregation functions like SUM, AVG, COUNT, etc.
    // This is a simplified implementation
    return data;
  }

  private sortData(data: any[], sorting: { field: string; direction: 'asc' | 'desc' }[]): any[] {
    return data.sort((a, b) => {
      for (const sort of sorting) {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private async validateChartConfiguration(chartData: CreateChartRequest): Promise<void> {
    if (!chartData.dataset_ids || chartData.dataset_ids.length === 0) {
      throw new Error('At least one dataset is required');
    }

    if (!chartData.chart_type) {
      throw new Error('Chart type is required');
    }

    // Additional validation would go here based on chart type requirements
  }

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
      exported_at: Date.now().toISOString(),
      exported_by: options.userId
    };

    const fileName = `${chart.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    const filePath = await this.saveExportFile(fileName, JSON.stringify(exportData, null, 2));

    return {
      format: 'json',
      file_path: filePath,
      file_name: fileName,
      file_size: Buffer.byteLength(JSON.stringify(exportData), 'utf8'),
      generated_at: Date.now()
    };
  }

  private async exportChartAsImage(
    chart: Chart,
    chartData: ChartDataResponse,
    format: 'png' | 'svg',
    options: ChartExportOptions
  ): Promise<ChartExportResult> {
    // This would integrate with a headless browser or image generation service
    // For now, we'll return a placeholder
    const fileName = `${chart.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${format}`;

    return {
      format,
      file_path: `/exports/${fileName}`,
      file_name: fileName,
      file_size: 0, // Would be actual file size
      generated_at: Date.now()
    };
  }

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
      generated_at: Date.now()
    };
  }

  private async saveExportFile(fileName: string, content: string): Promise<string> {
    // Implementation would save file to disk or cloud storage
    const filePath = `/exports/${fileName}`;
    // fs.writeFileSync(filePath, content); // Actual implementation
    return filePath;
  }

  private async clearChartCache(chartId: string): Promise<void> {
    try {
      // Clear chart-specific cache entries
      await cache.del(`chart:${chartId}`);
      // Would need pattern-based clearing for chart_data entries
    } catch (error) {
      logger.error('Clear chart cache error:', error);
    }
  }
}

export { ChartService };