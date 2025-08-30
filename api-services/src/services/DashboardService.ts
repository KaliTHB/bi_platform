import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { PermissionService } from './PermissionService';
import { AuditService } from './AuditService';

interface CreateDashboardRequest {
  name: string;
  description?: string;
  category_id?: string;
  layout_config: any;
  filter_config?: any;
  theme_config?: any;
  is_public?: boolean;
  tags?: string[];
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  category_id?: string;
  layout_config: any;
  filter_config?: any;
  theme_config?: any;
  is_public: boolean;
  tags: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  slug: string;
}

interface DashboardWithCharts extends Dashboard {
  charts: Array<{
    id: string;
    name: string;
    chart_type: string;
    config_json: any;
    dataset_ids: string[];
    position: any;
  }>;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

class DashboardService {
  private permissionService: PermissionService;
  private auditService: AuditService;

  constructor() {
    this.permissionService = new PermissionService();
    this.auditService = new AuditService();
  }

  async createDashboard(userId: string, workspaceId: string, data: CreateDashboardRequest): Promise<Dashboard> {
    try {
      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(userId, workspaceId, 'dashboard.create');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to create dashboard');
      }

      const dashboardId = uuidv4();
      const slug = this.generateSlug(data.name);
      
      const query = `
        INSERT INTO dashboards (
          id, name, description, workspace_id, category_id, layout_config, 
          filter_config, theme_config, is_public, tags, created_by, 
          created_at, updated_at, is_active, slug
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), true, $12
        ) RETURNING *
      `;
      
      const values = [
        dashboardId,
        data.name,
        data.description,
        workspaceId,
        data.category_id,
        JSON.stringify(data.layout_config),
        data.filter_config ? JSON.stringify(data.filter_config) : null,
        data.theme_config ? JSON.stringify(data.theme_config) : null,
        data.is_public || false,
        data.tags || [],
        userId,
        slug
      ];

      const result = await db.query(query, values);
      const dashboard = result.rows[0];

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dashboard.created',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: dashboardId,
        details: { dashboard_name: data.name, slug }
      });

      return dashboard;
    } catch (error) {
      logger.error('Create dashboard error:', error);
      throw error;
    }
  }

  async getDashboards(userId: string, workspaceId: string, filters?: any): Promise<Dashboard[]> {
    try {
      let query = `
        SELECT d.*, u.display_name as created_by_name, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM dashboards d
        INNER JOIN users u ON d.created_by = u.id
        LEFT JOIN dashboard_categories c ON d.category_id = c.id
        WHERE d.workspace_id = $1 AND d.is_active = true
      `;
      const params = [workspaceId];
      let paramIndex = 2;

      // Add filters
      if (filters?.search) {
        query += ` AND (d.name ILIKE $${paramIndex} OR d.description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters?.category_id) {
        query += ` AND d.category_id = $${paramIndex}`;
        params.push(filters.category_id);
        paramIndex++;
      }

      if (filters?.tags && filters.tags.length > 0) {
        query += ` AND d.tags && $${paramIndex}`;
        params.push(filters.tags);
        paramIndex++;
      }

      if (filters?.is_public !== undefined) {
        query += ` AND d.is_public = $${paramIndex}`;
        params.push(filters.is_public);
        paramIndex++;
      }

      query += ' ORDER BY d.updated_at DESC';

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
      
      // Filter dashboards based on permissions
      const accessibleDashboards = [];
      for (const dashboard of result.rows) {
        const hasAccess = await this.permissionService.hasDashboardAccess(
          userId, workspaceId, dashboard.id, 'read'
        );
        if (hasAccess) {
          accessibleDashboards.push(dashboard);
        }
      }

      return accessibleDashboards;
    } catch (error) {
      logger.error('Get dashboards error:', error);
      throw error;
    }
  }

  async getDashboard(userId: string, workspaceId: string, dashboardId: string): Promise<DashboardWithCharts | null> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDashboardAccess(
        userId, workspaceId, dashboardId, 'read'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to access dashboard');
      }

      // Get dashboard
      const dashboardQuery = `
        SELECT d.*, u.display_name as created_by_name, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM dashboards d
        INNER JOIN users u ON d.created_by = u.id
        LEFT JOIN dashboard_categories c ON d.category_id = c.id
        WHERE d.id = $1 AND d.workspace_id = $2 AND d.is_active = true
      `;
      
      const dashboardResult = await db.query(dashboardQuery, [dashboardId, workspaceId]);
      
      if (dashboardResult.rows.length === 0) {
        return null;
      }

      const dashboard = dashboardResult.rows[0];

      // Get charts
      const chartsQuery = `
        SELECT c.id, c.name, c.chart_type, c.config_json, c.dataset_ids, dc.position
        FROM charts c
        INNER JOIN dashboard_charts dc ON c.id = dc.chart_id
        WHERE dc.dashboard_id = $1 AND c.is_active = true
        ORDER BY dc.position->>'order' ASC
      `;
      
      const chartsResult = await db.query(chartsQuery, [dashboardId]);

      const result: DashboardWithCharts = {
        ...dashboard,
        charts: chartsResult.rows,
        category: dashboard.category_name ? {
          id: dashboard.category_id,
          name: dashboard.category_name,
          color: dashboard.category_color,
          icon: dashboard.category_icon
        } : undefined
      };

      return result;
    } catch (error) {
      logger.error('Get dashboard error:', error);
      throw error;
    }
  }

  async getDashboardBySlug(userId: string, workspaceId: string, slug: string): Promise<DashboardWithCharts | null> {
    try {
      // Get dashboard by slug
      const dashboardQuery = `
        SELECT id FROM dashboards 
        WHERE slug = $1 AND workspace_id = $2 AND is_active = true
      `;
      
      const result = await db.query(dashboardQuery, [slug, workspaceId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.getDashboard(userId, workspaceId, result.rows[0].id);
    } catch (error) {
      logger.error('Get dashboard by slug error:', error);
      throw error;
    }
  }

  async updateDashboard(userId: string, workspaceId: string, dashboardId: string, updates: Partial<CreateDashboardRequest>): Promise<Dashboard> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDashboardAccess(
        userId, workspaceId, dashboardId, 'write'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to update dashboard');
      }

      const allowedFields = ['name', 'description', 'category_id', 'layout_config', 'filter_config', 'theme_config', 'is_public', 'tags'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (['layout_config', 'filter_config', 'theme_config'].includes(key)) {
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

      // Update slug if name changed
      if (updates.name) {
        const newSlug = this.generateSlug(updates.name);
        updateFields.push(`slug = $${paramIndex}`);
        values.push(newSlug);
        paramIndex++;
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE dashboards 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1} AND is_active = true
        RETURNING *
      `;

      values.push(dashboardId, workspaceId);

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Dashboard not found');
      }

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dashboard.updated',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: dashboardId,
        details: { updated_fields: Object.keys(updates) }
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Update dashboard error:', error);
      throw error;
    }
  }

  async deleteDashboard(userId: string, workspaceId: string, dashboardId: string): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDashboardAccess(
        userId, workspaceId, dashboardId, 'delete'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to delete dashboard');
      }

      await db.transaction(async (client) => {
        // Remove charts from dashboard
        await client.query(
          'DELETE FROM dashboard_charts WHERE dashboard_id = $1',
          [dashboardId]
        );

        // Soft delete dashboard
        await client.query(
          'UPDATE dashboards SET is_active = false, updated_at = NOW() WHERE id = $1',
          [dashboardId]
        );
      });

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dashboard.deleted',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: dashboardId,
        details: { deletion_type: 'soft' }
      });
    } catch (error) {
      logger.error('Delete dashboard error:', error);
      throw error;
    }
  }

  async addChartToDashboard(userId: string, workspaceId: string, dashboardId: string, chartId: string, position: any): Promise<void> {
    try {
      // Check dashboard permissions
      const hasAccess = await this.permissionService.hasDashboardAccess(
        userId, workspaceId, dashboardId, 'write'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to modify dashboard');
      }

      // Verify chart exists and user has access
      const chartQuery = `
        SELECT id, dataset_ids FROM charts 
        WHERE id = $1 AND workspace_id = $2 AND is_active = true
      `;
      
      const chartResult = await db.query(chartQuery, [chartId, workspaceId]);
      if (chartResult.rows.length === 0) {
        throw new Error('Chart not found');
      }

      const chart = chartResult.rows[0];

      // Check if user has access to all datasets used by the chart
      for (const datasetId of chart.dataset_ids) {
        const hasDatasetAccess = await this.permissionService.hasDatasetAccess(
          userId, workspaceId, datasetId, 'read'
        );
        if (!hasDatasetAccess) {
          throw new Error('Insufficient permissions to access chart datasets');
        }
      }

      // Add chart to dashboard
      const insertQuery = `
        INSERT INTO dashboard_charts (dashboard_id, chart_id, position, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (dashboard_id, chart_id) 
        DO UPDATE SET position = $3, updated_at = NOW()
      `;
      
      await db.query(insertQuery, [dashboardId, chartId, JSON.stringify(position)]);

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dashboard.chart_added',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: dashboardId,
        details: { chart_id: chartId, position }
      });
    } catch (error) {
      logger.error('Add chart to dashboard error:', error);
      throw error;
    }
  }

  async removeChartFromDashboard(userId: string, workspaceId: string, dashboardId: string, chartId: string): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDashboardAccess(
        userId, workspaceId, dashboardId, 'write'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to modify dashboard');
      }

      const query = `
        DELETE FROM dashboard_charts 
        WHERE dashboard_id = $1 AND chart_id = $2
      `;
      
      await db.query(query, [dashboardId, chartId]);

      // Log audit event
      await this.auditService.logEvent({
        event_type: 'dashboard.chart_removed',
        user_id: userId,
        workspace_id: workspaceId,
        resource_id: dashboardId,
        details: { chart_id: chartId }
      });
    } catch (error) {
      logger.error('Remove chart from dashboard error:', error);
      throw error;
    }
  }

  async updateChartPosition(userId: string, workspaceId: string, dashboardId: string, chartId: string, position: any): Promise<void> {
    try {
      // Check permissions
      const hasAccess = await this.permissionService.hasDashboardAccess(
        userId, workspaceId, dashboardId, 'write'
      );
      if (!hasAccess) {
        throw new Error('Insufficient permissions to modify dashboard');
      }

      const query = `
        UPDATE dashboard_charts 
        SET position = $1, updated_at = NOW()
        WHERE dashboard_id = $2 AND chart_id = $3
      `;
      
      await db.query(query, [JSON.stringify(position), dashboardId, chartId]);
    } catch (error) {
      logger.error('Update chart position error:', error);
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);
  }
}

export { DashboardService };