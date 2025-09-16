// api-services/src/services/DashboardService.ts - CORRECT SCHEMA VERSION
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ChartService } from './ChartService';

// ============================================================================
// TypeScript Interfaces and Types
// ============================================================================

export interface Dashboard {
  id: string;
  workspace_id: string;
  category_id?: string;
  name: string;
  display_name: string;
  description?: string;
  config_json: Record<string, any>;
  theme_config: Record<string, any>;
  layout_config: Record<string, any>;
  global_filters: any[];
  filter_connections: any[];
  tags: string[];
  is_public: boolean;
  is_featured: boolean;
  status: 'draft' | 'published' | 'archived';
  created_by: string;
  created_at: Date;
  updated_at: Date;
  category_name?: string;
  owner_email?: string;
  owner_name?: string;
  charts?: Chart[];
}

export interface Chart {
  id: string;
  workspace_id: string;
  dashboard_id: string;
  tab_id?: string;
  dataset_ids: string[];
  plugin_name?: string;
  name: string;
  display_name?: string;
  description?: string;
  chart_type: string;
  chart_category: string;
  chart_library: string;
  config_json: Record<string, any>;
  position_json: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  styling_config: Record<string, any>;
  interaction_config: Record<string, any>;
  query_config: Record<string, any>;
  drilldown_config: Record<string, any>;
  calculated_fields: any[];
  conditional_formatting: any[];
  export_config: Record<string, any>;
  cache_config: Record<string, any>;
  is_active: boolean;
  order_index: number;
  last_rendered?: Date;
  render_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  data?: any[];
}

export interface Dataset {
  id: string;
  name: string;
  display_name: string;
  datasource_id: string;
  query_config: Record<string, any>;
  schema_config: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Datasource {
  id: string;
  name: string;
  display_name: string;
  connection_type: string;
  connection_config: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GetDashboardsOptions {
  page: number;
  limit: number;
  include_charts?: boolean;
  include_data?: boolean;
  filters: {
    category_id?: string;
    created_by?: string;
    is_public?: boolean;
    is_featured?: boolean;
    search?: string;
    status?: string;
  };
  sort_by?: 'name' | 'display_name' | 'created_at' | 'updated_at';
  sort_order?: 'ASC' | 'DESC';
}

export interface CreateDashboardData {
  workspace_id: string;
  category_id?: string;
  name: string;
  display_name: string;
  description?: string;
  config_json?: Record<string, any>;
  theme_config?: Record<string, any>;
  layout_config?: Record<string, any>;
  global_filters?: any[];
  filter_connections?: any[];
  tags?: string[];
  is_public?: boolean;
  is_featured?: boolean;
  status?: 'draft' | 'published' | 'archived';
  created_by: string;
}

export interface UpdateDashboardData {
  name?: string;
  display_name?: string;
  description?: string;
  config_json?: Record<string, any>;
  theme_config?: Record<string, any>;
  layout_config?: Record<string, any>;
  global_filters?: any[];
  filter_connections?: any[];
  tags?: string[];
  is_public?: boolean;
  is_featured?: boolean;
  status?: 'draft' | 'published' | 'archived';
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// DASHBOARD SERVICE - CORRECT SCHEMA VERSION
// ============================================================================

export class DashboardService {
  private database: Pool;
  private chartService: ChartService;

  constructor(database?: Pool) {
    if (!database) {
      throw new Error('Database connection is required for DashboardService');
    }
    
    this.database = database;
    
    if (typeof this.database.query !== 'function') {
      throw new Error('Invalid database connection - missing query method');
    }
    
    this.chartService = new ChartService(database);
    
    logger.info('DashboardService initialized successfully', {
      service: 'bi-platform-api',
      hasDatabase: !!this.database,
      hasQuery: typeof this.database.query === 'function'
    });
  }

  // ============================================================================
  // GET SINGLE DASHBOARD
  // ============================================================================

  async getDashboard(
    dashboardId: string, 
    includeCharts = false, 
    includeData = false
  ): Promise<Dashboard | null> {
    try {
      logger.info('Getting dashboard from database', { 
        dashboardId, 
        includeCharts, 
        includeData 
      });

      const dashboardQuery = `
        SELECT 
          d.*,
          c.name as category_name,
          u.email as owner_email,
          u.username as owner_name
        FROM dashboards d
        LEFT JOIN dashboard_categories c ON d.category_id = c.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.id = $1 AND d.status != 'archived'
      `;

      const dashboardResult = await this.database.query(dashboardQuery, [dashboardId]);
      
      if (dashboardResult.rows.length === 0) {
        logger.warn('Dashboard not found in database', { dashboardId });
        return null;
      }

      const dashboard = this.parseDashboardRow(dashboardResult.rows[0]);
      
      logger.info('Dashboard found in database', {
        dashboardId: dashboard.id,
        displayName: dashboard.display_name,
        workspaceId: dashboard.workspace_id,
        status: dashboard.status
      });

      // Include charts if requested
      if (includeCharts) {
        dashboard.charts = await this.getDashboardCharts(dashboardId, includeData);
      }

      return dashboard;

    } catch (error: any) {
      logger.error('Error getting dashboard from database:', {
        error: error.message,
        stack: error.stack,
        dashboardId,
        includeCharts,
        includeData
      });
      throw new Error(`Failed to get dashboard: ${error.message}`);
    }
  }

  // ============================================================================
  // GET MULTIPLE DASHBOARDS WITH PAGINATION
  // ============================================================================

  async getDashboards(
    workspaceId: string, 
    options: GetDashboardsOptions
  ): Promise<PaginationResult<Dashboard>> {
    try {
      logger.info('Getting dashboards from database', { workspaceId, options });

      // Build WHERE conditions
      const conditions = ['d.workspace_id = $1', "d.status != 'archived'"];
      const params = [workspaceId];
      let paramIndex = 2;

      // Add filters
      if (options.filters.category_id) {
        conditions.push(`d.category_id = $${paramIndex++}`);
        params.push(options.filters.category_id);
      }

      if (options.filters.created_by) {
        conditions.push(`d.created_by = $${paramIndex++}`);
        params.push(options.filters.created_by);
      }

      if (options.filters.is_public !== undefined) {
        conditions.push(`d.is_public = $${paramIndex++}`);
        params.push(options.filters.is_public);
      }

      if (options.filters.is_featured !== undefined) {
        conditions.push(`d.is_featured = $${paramIndex++}`);
        params.push(options.filters.is_featured);
      }

      if (options.filters.status) {
        conditions.push(`d.status = $${paramIndex++}`);
        params.push(options.filters.status);
      }

      if (options.filters.search) {
        conditions.push(`(
          LOWER(d.name) LIKE LOWER($${paramIndex}) OR 
          LOWER(d.display_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(d.description) LIKE LOWER($${paramIndex})
        )`);
        params.push(`%${options.filters.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM dashboards d
        WHERE ${whereClause}
      `;

      const countResult = await this.database.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Build ORDER BY clause
      const sortBy = options.sort_by || 'updated_at';
      const sortOrder = options.sort_order || 'DESC';
      const orderClause = `ORDER BY d.${sortBy} ${sortOrder}`;

      // Main query with joins
      const offset = (options.page - 1) * options.limit;
      
      const dashboardQuery = `
        SELECT 
          d.*,
          c.name as category_name,
          u.name as owner_name,
          u.email as owner_email
        FROM dashboards d
        LEFT JOIN dashboard_categories c ON d.category_id = c.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(options.limit, offset);
      
      const dashboardResult = await this.database.query(dashboardQuery, params);
      
      let dashboards = dashboardResult.rows.map(row => this.parseDashboardRow(row));

      // Include charts if requested
      if (options.include_charts && dashboards.length > 0) {
        const dashboardIds = dashboards.map(d => d.id);
        const chartsByDashboard = await this.getChartsForDashboards(dashboardIds, options.include_data);
        
        dashboards = dashboards.map(dashboard => ({
          ...dashboard,
          charts: chartsByDashboard.get(dashboard.id) || []
        }));
      }

      const pages = Math.ceil(total / options.limit);

      logger.info('Dashboards retrieved from database', {
        workspaceId,
        total,
        returned: dashboards.length,
        page: options.page,
        pages
      });

      return {
        data: dashboards,
        total,
        page: options.page,
        limit: options.limit,
        pages,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages: pages,
          hasNext: options.page < pages,
          hasPrev: options.page > 1
        }
      };

    } catch (error: any) {
      logger.error('Error getting dashboards from database:', {
        error: error.message,
        stack: error.stack,
        workspaceId,
        options
      });
      throw new Error(`Failed to get dashboards: ${error.message}`);
    }
  }

  // ============================================================================
  // CREATE DASHBOARD
  // ============================================================================

  async createDashboard(dashboardData: CreateDashboardData): Promise<Dashboard> {
    const client = await this.database.connect();
    
    try {
      await client.query('BEGIN');

      logger.info('Creating dashboard', { 
        workspaceId: dashboardData.workspace_id,
        name: dashboardData.name 
      });

      const query = `
        INSERT INTO dashboards (
          id, workspace_id, category_id, name, display_name, description,
          config_json, theme_config, layout_config, global_filters, 
          filter_connections, tags, is_public, is_featured, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const id = uuidv4();
      const values = [
        id,
        dashboardData.workspace_id,
        dashboardData.category_id || null,
        dashboardData.name,
        dashboardData.display_name,
        dashboardData.description || null,
        JSON.stringify(dashboardData.config_json || {}),
        JSON.stringify(dashboardData.theme_config || {}),
        JSON.stringify(dashboardData.layout_config || {}),
        JSON.stringify(dashboardData.global_filters || []),
        JSON.stringify(dashboardData.filter_connections || []),
        JSON.stringify(dashboardData.tags || []),
        dashboardData.is_public || false,
        dashboardData.is_featured || false,
        dashboardData.status || 'draft',
        dashboardData.created_by
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      const dashboard = this.parseDashboardRow(result.rows[0]);
      
      logger.info('Dashboard created successfully', {
        dashboardId: dashboard.id,
        name: dashboard.name
      });

      return dashboard;

    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error creating dashboard:', {
        error: error.message,
        stack: error.stack,
        dashboardData
      });
      throw new Error(`Failed to create dashboard: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // UPDATE DASHBOARD
  // ============================================================================

  async updateDashboard(dashboardId: string, updateData: UpdateDashboardData): Promise<Dashboard> {
    const client = await this.database.connect();
    
    try {
      await client.query('BEGIN');

      logger.info('Updating dashboard', { dashboardId, updateData });

      const updates = [];
      const values = [dashboardId];
      let paramIndex = 2;

      if (updateData.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }
      
      if (updateData.display_name !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(updateData.display_name);
      }
      
      if (updateData.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(updateData.description);
      }
      
      if (updateData.config_json !== undefined) {
        updates.push(`config_json = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.config_json));
      }
      
      if (updateData.theme_config !== undefined) {
        updates.push(`theme_config = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.theme_config));
      }
      
      if (updateData.layout_config !== undefined) {
        updates.push(`layout_config = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.layout_config));
      }

      if (updateData.global_filters !== undefined) {
        updates.push(`global_filters = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.global_filters));
      }

      if (updateData.filter_connections !== undefined) {
        updates.push(`filter_connections = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.filter_connections));
      }

      if (updateData.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.tags));
      }

      if (updateData.is_public !== undefined) {
        updates.push(`is_public = $${paramIndex++}`);
        values.push(updateData.is_public);
      }

      if (updateData.is_featured !== undefined) {
        updates.push(`is_featured = $${paramIndex++}`);
        values.push(updateData.is_featured);
      }

      if (updateData.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(updateData.status);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE dashboards
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Dashboard not found');
      }

      await client.query('COMMIT');

      const dashboard = this.parseDashboardRow(result.rows[0]);
      
      logger.info('Dashboard updated successfully', {
        dashboardId: dashboard.id,
        updatedFields: Object.keys(updateData)
      });

      return dashboard;

    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error updating dashboard:', {
        error: error.message,
        stack: error.stack,
        dashboardId,
        updateData
      });
      throw new Error(`Failed to update dashboard: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // DELETE DASHBOARD (SOFT DELETE)
  // ============================================================================

  async deleteDashboard(dashboardId: string): Promise<boolean> {
    const client = await this.database.connect();
    
    try {
      await client.query('BEGIN');

      logger.info('Deleting dashboard', { dashboardId });

      // Soft delete by updating status
      const dashboardQuery = `
        UPDATE dashboards
        SET status = 'archived', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status != 'archived'
        RETURNING id
      `;

      const dashboardResult = await client.query(dashboardQuery, [dashboardId]);
      
      if (dashboardResult.rows.length === 0) {
        logger.warn('Dashboard not found or already archived', { dashboardId });
        return false;
      }

      // Also set charts as inactive
      await client.query(`
        UPDATE charts 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE dashboard_id = $1
      `, [dashboardId]);

      await client.query('COMMIT');

      logger.info('Dashboard archived successfully', { dashboardId });
      return true;

    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error deleting dashboard:', {
        error: error.message,
        stack: error.stack,
        dashboardId
      });
      throw new Error(`Failed to delete dashboard: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // CHART MANAGEMENT FOR DASHBOARDS
  // ============================================================================

  async addChartToDashboard(
    dashboardId: string,
    chartData: {
      dataset_ids: string[];
      name: string;
      display_name?: string;
      chart_type: string;
      chart_category: string;
      chart_library: string;
      position_json: { x: number; y: number; w: number; h: number };
      config_json?: Record<string, any>;
      styling_config?: Record<string, any>;
      tab_id?: string;
    },
    userId: string
  ): Promise<Chart> {
    const client = await this.database.connect();
    
    try {
      await client.query('BEGIN');

      logger.info('Adding chart to dashboard', { dashboardId, chartName: chartData.name });

      // Get dashboard workspace_id
      const dashboardResult = await client.query(
        'SELECT workspace_id FROM dashboards WHERE id = $1',
        [dashboardId]
      );

      if (dashboardResult.rows.length === 0) {
        throw new Error('Dashboard not found');
      }

      const workspaceId = dashboardResult.rows[0].workspace_id;

      // Get the next order index for this dashboard
      const orderResult = await client.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM charts WHERE dashboard_id = $1',
        [dashboardId]
      );

      const query = `
        INSERT INTO charts (
          id, workspace_id, dashboard_id, tab_id, dataset_ids, name, display_name,
          chart_type, chart_category, chart_library, config_json, position_json,
          styling_config, order_index, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;

      const values = [
        uuidv4(),
        workspaceId,
        dashboardId,
        chartData.tab_id || null,
        chartData.dataset_ids,
        chartData.name,
        chartData.display_name || chartData.name,
        chartData.chart_type,
        chartData.chart_category,
        chartData.chart_library,
        JSON.stringify(chartData.config_json || {}),
        JSON.stringify(chartData.position_json),
        JSON.stringify(chartData.styling_config || {}),
        orderResult.rows[0].next_order,
        userId
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const chart = this.parseChartRow(result.rows[0]);

      logger.info('Chart added to dashboard successfully', {
        dashboardId,
        chartId: chart.id,
        chartName: chart.name
      });

      return chart;

    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error adding chart to dashboard:', {
        error: error.message,
        stack: error.stack,
        dashboardId,
        chartData
      });
      throw new Error(`Failed to add chart to dashboard: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async removeChartFromDashboard(dashboardId: string, chartId: string): Promise<boolean> {
    try {
      logger.info('Removing chart from dashboard', { dashboardId, chartId });

      const query = `
        UPDATE charts
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND dashboard_id = $2
        RETURNING id
      `;

      const result = await this.database.query(query, [chartId, dashboardId]);
      
      const removed = result.rows.length > 0;
      
      logger.info('Chart removal result', {
        dashboardId,
        chartId,
        removed
      });

      return removed;

    } catch (error: any) {
      logger.error('Error removing chart from dashboard:', {
        error: error.message,
        stack: error.stack,
        dashboardId,
        chartId
      });
      throw new Error(`Failed to remove chart from dashboard: ${error.message}`);
    }
  }

  // ============================================================================
  // LIVE DATA FETCHING METHODS
  // ============================================================================

  async getChartData(chartId: string, filters?: Record<string, any>): Promise<any[]> {
    try {
      logger.info('Fetching live chart data', { chartId, filters });

      // Get chart with dataset information
      const chartQuery = `
        SELECT 
          c.*,
          array_agg(
            json_build_object(
              'id', d.id,
              'name', d.name,
              'query_config', d.query_config,
              'schema_config', d.schema_config,
              'datasource_id', d.datasource_id,
              'datasource_type', ds.connection_type,
              'datasource_config', ds.connection_config
            )
          ) as datasets
        FROM charts c
        JOIN datasets d ON d.id = ANY(c.dataset_ids)
        JOIN datasources ds ON ds.id = d.datasource_id
        WHERE c.id = $1 AND c.is_active = true AND d.is_active = true AND ds.is_active = true
        GROUP BY c.id
      `;

      const chartResult = await this.database.query(chartQuery, [chartId]);
      
      if (chartResult.rows.length === 0) {
        logger.warn('Chart or associated dataset/datasource not found', { chartId });
        return [];
      }

      const chart = chartResult.rows[0];
      
      // Use the first dataset for now (could be enhanced for multi-dataset charts)
      const dataset = chart.datasets[0];
      
      // Execute the dataset query to get live data
      const data = await this.executeDatasetQuery(dataset, filters);
      
      logger.info('Live chart data fetched successfully', {
        chartId,
        rowCount: data.length
      });

      return data;

    } catch (error: any) {
      logger.error('Error fetching live chart data:', {
        error: error.message,
        stack: error.stack,
        chartId,
        filters
      });
      throw new Error(`Failed to fetch chart data: ${error.message}`);
    }
  }

  private async executeDatasetQuery(dataset: any, filters?: Record<string, any>): Promise<any[]> {
    try {
      let query = dataset.query_config.sql || dataset.query_config.query;
      const params: any[] = [];

      // Apply filters if provided
      if (filters && Object.keys(filters).length > 0) {
        const filterClauses = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            filterClauses.push(`${key} = $${paramIndex++}`);
            params.push(value);
          }
        }

        if (filterClauses.length > 0) {
          // Add WHERE clause or append to existing WHERE
          if (query.toLowerCase().includes('where')) {
            query += ` AND ${filterClauses.join(' AND ')}`;
          } else {
            query += ` WHERE ${filterClauses.join(' AND ')}`;
          }
        }
      }

      logger.info('Executing dataset query', { 
        query: query.substring(0, 200) + '...',
        paramCount: params.length
      });

      const result = await this.database.query(query, params);
      return result.rows;

    } catch (error: any) {
      logger.error('Error executing dataset query:', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to execute dataset query: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private parseDashboardRow(row: any): Dashboard {
    const dashboard = { ...row };
    
    // Parse JSON fields
    if (dashboard.config_json && typeof dashboard.config_json === 'string') {
      dashboard.config_json = JSON.parse(dashboard.config_json);
    }
    if (dashboard.theme_config && typeof dashboard.theme_config === 'string') {
      dashboard.theme_config = JSON.parse(dashboard.theme_config);
    }
    if (dashboard.layout_config && typeof dashboard.layout_config === 'string') {
      dashboard.layout_config = JSON.parse(dashboard.layout_config);
    }
    if (dashboard.global_filters && typeof dashboard.global_filters === 'string') {
      dashboard.global_filters = JSON.parse(dashboard.global_filters);
    }
    if (dashboard.filter_connections && typeof dashboard.filter_connections === 'string') {
      dashboard.filter_connections = JSON.parse(dashboard.filter_connections);
    }
    if (dashboard.tags && typeof dashboard.tags === 'string') {
      dashboard.tags = JSON.parse(dashboard.tags);
    }

    return dashboard;
  }

  private parseChartRow(row: any): Chart {
    const chart = { ...row };
    
    // Parse JSON fields
    if (chart.config_json && typeof chart.config_json === 'string') {
      chart.config_json = JSON.parse(chart.config_json);
    }
    if (chart.position_json && typeof chart.position_json === 'string') {
      chart.position_json = JSON.parse(chart.position_json);
    }
    if (chart.styling_config && typeof chart.styling_config === 'string') {
      chart.styling_config = JSON.parse(chart.styling_config);
    }
    if (chart.interaction_config && typeof chart.interaction_config === 'string') {
      chart.interaction_config = JSON.parse(chart.interaction_config);
    }
    if (chart.query_config && typeof chart.query_config === 'string') {
      chart.query_config = JSON.parse(chart.query_config);
    }
    if (chart.drilldown_config && typeof chart.drilldown_config === 'string') {
      chart.drilldown_config = JSON.parse(chart.drilldown_config);
    }
    if (chart.calculated_fields && typeof chart.calculated_fields === 'string') {
      chart.calculated_fields = JSON.parse(chart.calculated_fields);
    }
    if (chart.conditional_formatting && typeof chart.conditional_formatting === 'string') {
      chart.conditional_formatting = JSON.parse(chart.conditional_formatting);
    }
    if (chart.export_config && typeof chart.export_config === 'string') {
      chart.export_config = JSON.parse(chart.export_config);
    }
    if (chart.cache_config && typeof chart.cache_config === 'string') {
      chart.cache_config = JSON.parse(chart.cache_config);
    }

    return chart;
  }

  private async getDashboardCharts(dashboardId: string, includeData = false): Promise<Chart[]> {
    const chartsQuery = `
      SELECT *
      FROM charts
      WHERE dashboard_id = $1 AND is_active = true
      ORDER BY order_index ASC
    `;

    const chartsResult = await this.database.query(chartsQuery, [dashboardId]);
    
    const charts: Chart[] = [];
    
    for (const row of chartsResult.rows) {
      const chart = this.parseChartRow(row);

      // Fetch live data if requested
      if (includeData) {
        try {
          chart.data = await this.getChartData(row.id);
        } catch (error: any) {
          logger.warn('Failed to fetch data for chart, skipping data inclusion', {
            chartId: row.id,
            error: error.message
          });
          chart.data = [];
        }
      }

      charts.push(chart);
    }

    return charts;
  }

  private async getChartsForDashboards(
    dashboardIds: string[], 
    includeData = false
  ): Promise<Map<string, Chart[]>> {
    if (dashboardIds.length === 0) {
      return new Map();
    }

    const placeholders = dashboardIds.map((_, i) => `$${i + 1}`).join(',');
    
    const chartsQuery = `
      SELECT *
      FROM charts
      WHERE dashboard_id IN (${placeholders}) AND is_active = true
      ORDER BY dashboard_id, order_index ASC
    `;

    const chartsResult = await this.database.query(chartsQuery, dashboardIds);
    
    // Group charts by dashboard
    const chartsByDashboard = new Map<string, Chart[]>();
    
    for (const row of chartsResult.rows) {
      if (!chartsByDashboard.has(row.dashboard_id)) {
        chartsByDashboard.set(row.dashboard_id, []);
      }
      
      const chart = this.parseChartRow(row);

      // Fetch live data if requested
      if (includeData) {
        try {
          chart.data = await this.getChartData(row.id);
        } catch (error: any) {
          logger.warn('Failed to fetch data for chart, skipping data inclusion', {
            chartId: row.id,
            error: error.message
          });
          chart.data = [];
        }
      }

      chartsByDashboard.get(row.dashboard_id)!.push(chart);
    }

    return chartsByDashboard;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getDashboardsByWorkspace(workspaceId: string): Promise<Dashboard[]> {
    const options: GetDashboardsOptions = {
      page: 1,
      limit: 1000, // Large limit to get all
      filters: {}
    };

    const result = await this.getDashboards(workspaceId, options);
    return result.data;
  }

  async getDashboardsByUser(userId: string, workspaceId: string): Promise<Dashboard[]> {
    const options: GetDashboardsOptions = {
      page: 1,
      limit: 1000,
      filters: {
        created_by: userId
      }
    };

    const result = await this.getDashboards(workspaceId, options);
    return result.data;
  }

  async searchDashboards(workspaceId: string, searchTerm: string): Promise<Dashboard[]> {
    const options: GetDashboardsOptions = {
      page: 1,
      limit: 100,
      filters: {
        search: searchTerm
      }
    };

    const result = await this.getDashboards(workspaceId, options);
    return result.data;
  }

  async duplicateDashboard(dashboardId: string, newName: string, userId: string): Promise<Dashboard> {
    const original = await this.getDashboard(dashboardId, true);
    if (!original) {
      throw new Error('Dashboard not found');
    }

    const duplicateData: CreateDashboardData = {
      workspace_id: original.workspace_id,
      category_id: original.category_id,
      name: newName,
      display_name: `${original.display_name} (Copy)`,
      description: original.description,
      config_json: original.config_json,
      theme_config: original.theme_config,
      layout_config: original.layout_config,
      global_filters: original.global_filters,
      filter_connections: original.filter_connections,
      tags: original.tags,
      is_public: false, // Copies are private by default
      is_featured: false,
      status: 'draft',
      created_by: userId
    };

    const newDashboard = await this.createDashboard(duplicateData);

    // Copy charts if they exist
    if (original.charts && original.charts.length > 0) {
      for (const chart of original.charts) {
        await this.addChartToDashboard(
          newDashboard.id,
          {
            dataset_ids: chart.dataset_ids,
            name: chart.name,
            display_name: chart.display_name,
            chart_type: chart.chart_type,
            chart_category: chart.chart_category,
            chart_library: chart.chart_library,
            position_json: chart.position_json,
            config_json: chart.config_json,
            styling_config: chart.styling_config,
            tab_id: chart.tab_id
          },
          userId
        );
      }
    }

    return newDashboard;
  }

  async getDashboardStats(workspaceId: string): Promise<{
    total: number;
    published: number;
    draft: number;
    featured: number;
    public: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN is_featured = true THEN 1 END) as featured,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public
      FROM dashboards 
      WHERE workspace_id = $1 AND status != 'archived'
    `;

    const result = await this.database.query(query, [workspaceId]);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      published: parseInt(stats.published),
      draft: parseInt(stats.draft),
      featured: parseInt(stats.featured),
      public: parseInt(stats.public)
    };
  }
}