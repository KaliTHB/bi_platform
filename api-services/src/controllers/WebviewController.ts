// File: api-services/src/controllers/WebviewController.ts

import { Request, Response } from 'express';
import { WebviewService } from '../services/WebviewService';
import { CategoryService } from '../services/CategoryService';
import { PermissionService } from '../services/PermissionService';

export class WebviewController {
  constructor(
    private webviewService: WebviewService,
    private categoryService: CategoryService,
    private permissionService: PermissionService
  ) {}

  async getWebviewConfig(req: Request, res: Response) {
    try {
      const { webviewName } = req.params;
      const { workspace_id } = req.user;

      // Get webview configuration
      const webview = await this.webviewService.getWebviewByName(workspace_id, webviewName);
      if (!webview) {
        return res.status(404).json({
          success: false,
          error: { code: 'WEBVIEW_NOT_FOUND', message: 'Webview configuration not found' }
        });
      }

      // Check webview access
      const hasAccess = await this.webviewService.checkWebviewAccess(req.user.id, webview.id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Webview access denied' }
        });
      }

      // Get navigation data
      const navigationData = await this.webviewService.getWebviewNavigation(
        webview.id,
        req.user.id,
        workspace_id
      );

      res.json({
        success: true,
        data: navigationData
      });
    } catch (error) {
      console.error('Error fetching webview config:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load webview configuration' }
      });
    }
  }

  async getWebviewCategories(req: Request, res: Response) {
    try {
      const { webviewName } = req.params;
      const { workspace_id } = req.user;
      const { expanded_categories, search_query, filter_tags } = req.query;

      // Get webview configuration
      const webview = await this.webviewService.getWebviewByName(workspace_id, webviewName);
      if (!webview) {
        return res.status(404).json({
          success: false,
          error: { code: 'WEBVIEW_NOT_FOUND', message: 'Webview not found' }
        });
      }

      // Check webview access
      const hasAccess = await this.webviewService.checkWebviewAccess(req.user.id, webview.id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Webview access denied' }
        });
      }

      // Get categories with user access filtering
      const categories = await this.categoryService.getWorkspaceCategories(
        workspace_id,
        true, // Include dashboards
        true, // User accessible only
        req.user.id
      );

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching webview categories:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load categories' }
      });
    }
  }

  async getWebviewDashboard(req: Request, res: Response) {
    try {
      const { webviewName, dashboardSlug } = req.params;
      const { workspace_id } = req.user;

      // Get webview configuration
      const webview = await this.webviewService.getWebviewByName(workspace_id, webviewName);
      if (!webview) {
        return res.status(404).json({
          success: false,
          error: { code: 'WEBVIEW_NOT_FOUND', message: 'Webview not found' }
        });
      }

      // Get dashboard by slug
      const dashboardQuery = `
        SELECT d.*, c.display_name as category_name
        FROM dashboards d
        LEFT JOIN dashboard_categories c ON d.category_id = c.id
        WHERE d.workspace_id = $1 AND d.slug = $2 AND d.status = 'published'
      `;
      
      // This would use a dashboard service in practice
      const dashboardResult = await req.db.query(dashboardQuery, [workspace_id, dashboardSlug]);
      
      if (dashboardResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'DASHBOARD_NOT_FOUND', message: 'Dashboard not found' }
        });
      }

      const dashboard = dashboardResult.rows[0];

      // Check triple-layer access (webview + dashboard + datasets)
      const hasWebviewAccess = await this.webviewService.checkWebviewAccess(req.user.id, webview.id);
      const hasDashboardAccess = await this.permissionService.checkDashboardAccess(
        req.user.id,
        dashboard.id,
        'can_read'
      );

      if (!hasWebviewAccess || !hasDashboardAccess) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Dashboard access denied' }
        });
      }

      // Get accessible charts for this dashboard
      const chartsQuery = `
        SELECT c.*, array_agg(c.dataset_ids) as dataset_ids
        FROM charts c
        WHERE c.dashboard_id = $1 AND c.is_active = true
        GROUP BY c.id
      `;
      
      const chartsResult = await req.db.query(chartsQuery, [dashboard.id]);
      const accessibleCharts = [];

      // Check dataset access for each chart
      for (const chart of chartsResult.rows) {
        const hasDatasetAccess = await this.permissionService.checkDatasetArrayAccess(
          req.user.id,
          chart.dataset_ids,
          'read'
        );
        
        if (hasDatasetAccess) {
          accessibleCharts.push(chart);
        }
      }

      // Build breadcrumb path
      const breadcrumbPath = [];
      if (dashboard.category_name) {
        breadcrumbPath.push(dashboard.category_name);
      }
      breadcrumbPath.push(dashboard.display_name);

      res.json({
        success: true,
        data: {
          dashboard,
          accessible_charts: accessibleCharts,
          breadcrumb_path: breadcrumbPath,
          navigation_context: {
            webview_name: webviewName,
            category_id: dashboard.category_id
          }
        }
      });
    } catch (error) {
      console.error('Error fetching webview dashboard:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard' }
      });
    }
  }

  async trackWebviewAnalytics(req: Request, res: Response) {
    try {
      const { webviewName } = req.params;
      const { workspace_id } = req.user;
      const eventData = req.body;

      // Get webview configuration
      const webview = await this.webviewService.getWebviewByName(workspace_id, webviewName);
      if (!webview) {
        return res.status(404).json({
          success: false,
          error: { code: 'WEBVIEW_NOT_FOUND', message: 'Webview not found' }
        });
      }

      // Track the analytics event
      await this.webviewService.trackAnalytics({
        webview_id: webview.id,
        user_id: req.user.id,
        event_type: eventData.event_type,
        category_id: eventData.category_id,
        dashboard_id: eventData.dashboard_id,
        session_id: eventData.session_id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        action_timestamp: new Date(),
        duration_ms: eventData.duration_ms,
        metadata: eventData.metadata || {}
      });

      res.json({
        success: true,
        message: 'Event tracked successfully'
      });
    } catch (error) {
      console.error('Error tracking webview analytics:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to track event' }
      });
    }
  }

  async createWebview(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const webviewData = {
        ...req.body,
        workspace_id,
        created_by: req.user.id
      };

      const webview = await this.webviewService.createWebview(webviewData);

      res.status(201).json({
        success: true,
        data: webview
      });
    } catch (error) {
      console.error('Error creating webview:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create webview' }
      });
    }
  }

  async updateWebview(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const webviewData = req.body;

      const webview = await this.webviewService.updateWebview(id, webviewData);

      res.json({
        success: true,
        data: webview
      });
    } catch (error) {
      console.error('Error updating webview:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update webview' }
      });
    }
  }
}