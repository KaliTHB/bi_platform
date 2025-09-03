// api-services/src/controllers/WebviewController.ts
import { Request, Response } from 'express';
import { WebviewService } from '../services/WebviewService';
import { CategoryService } from '../services/CategoryService';
import { AnalyticsService } from '../services/AnalyticsService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    workspace_id: string;
    roles: string[];
  };
}

interface ActivityLogRequest {
  activity_type: 'view' | 'interaction' | 'filter' | 'export' | 'share';
  resource_type: 'dashboard' | 'chart' | 'category';
  resource_id: string;
  metadata?: any;
  session_id?: string;
  referrer?: string;
}

export class WebviewController {
  private webviewService: WebviewService;
  private categoryService: CategoryService;
  private analyticsService: AnalyticsService;
  private permissionService: PermissionService;

  constructor() {
    this.webviewService = new WebviewService();
    this.categoryService = new CategoryService();
    this.analyticsService = new AnalyticsService();
    this.permissionService = new PermissionService();
  }

  // ========== PUBLIC ENDPOINTS (No Authentication Required) ==========

  // Get public webview by name
  async getPublicWebview(req: Request, res: Response): Promise<void> {
    try {
      const { webviewName } = req.params;
      const { include_categories = true } = req.query;

      const webview = await this.webviewService.getWebviewByName(webviewName, {
        public_access: true,
        include_categories: include_categories === 'true'
      });

      if (!webview || !webview.is_public) {
        res.status(404).json({
          success: false,
          message: 'Public webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview not found or not publicly accessible' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        webview,
        message: 'Public webview retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get public webview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve public webview',
        errors: [{ code: 'GET_PUBLIC_WEBVIEW_FAILED', message: error.message }]
      });
    }
  }

  // Get public webview categories
  async getPublicWebviewCategories(req: Request, res: Response): Promise<void> {
    try {
      const { webviewId } = req.params;
      const { 
        search, 
        include_dashboards = false, 
        include_inactive = false 
      } = req.query;

      const categories = await this.categoryService.getWebviewCategories(webviewId, {
        search: search as string,
        include_dashboards: include_dashboards === 'true',
        include_inactive: include_inactive === 'true',
        public_access: true
      });

      res.status(200).json({
        success: true,
        categories,
        message: 'Public webview categories retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get public webview categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        errors: [{ code: 'GET_PUBLIC_CATEGORIES_FAILED', message: error.message }]
      });
    }
  }

  // Get public dashboard from webview
  async getPublicDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { webviewId, dashboardId } = req.params;

      const dashboard = await this.webviewService.getPublicDashboard(webviewId, dashboardId);

      if (!dashboard) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found or not accessible',
          errors: [{ code: 'DASHBOARD_NOT_ACCESSIBLE', message: 'Dashboard not found or not publicly accessible' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        dashboard,
        message: 'Public dashboard retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get public dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard',
        errors: [{ code: 'GET_PUBLIC_DASHBOARD_FAILED', message: error.message }]
      });
    }
  }

  // Log public activity (analytics)
  async logPublicActivity(req: Request, res: Response): Promise<void> {
    try {
      const { webviewId } = req.params;
      const activityData = req.body as ActivityLogRequest;

      // Add IP address and user agent from request
      const enrichedActivity = {
        ...activityData,
        webview_id: webviewId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        timestamp: new Date()
      };

      await this.analyticsService.logPublicActivity(enrichedActivity);

      res.status(200).json({
        success: true,
        message: 'Activity logged successfully'
      });
    } catch (error: any) {
      logger.error('Log public activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log activity',
        errors: [{ code: 'LOG_ACTIVITY_FAILED', message: error.message }]
      });
    }
  }

  // ========== PROTECTED ENDPOINTS (Authentication Required) ==========

  // Get all webviews (workspace-scoped)
  async getWebviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        search,
        status,
        created_by,
        sort_by = 'updated_at',
        sort_order = 'desc',
        include_stats = false
      } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters: {
          search: search as string,
          status: status as string,
          created_by: created_by as string
        },
        sort_by: sort_by as string,
        sort_order: sort_order as 'asc' | 'desc',
        include_stats: include_stats === 'true'
      };

      const result = await this.webviewService.getWebviews(workspace_id, options);

      res.status(200).json({
        success: true,
        webviews: result.webviews,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages,
          has_next: result.has_next,
          has_prev: result.has_prev
        },
        message: 'Webviews retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get webviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webviews',
        errors: [{ code: 'GET_WEBVIEWS_FAILED', message: error.message }]
      });
    }
  }

  // Create new webview
  async createWebview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId, workspace_id } = req.user;
      const webviewData = req.body;

      // Validate required fields
      if (!webviewData.name || !webviewData.webview_name) {
        res.status(400).json({
          success: false,
          message: 'Webview name and URL name are required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'name and webview_name fields are required' }]
        });
        return;
      }

      // Validate webview_name format (URL-safe)
      const webviewNameRegex = /^[a-z0-9-_]+$/;
      if (!webviewNameRegex.test(webviewData.webview_name)) {
        res.status(400).json({
          success: false,
          message: 'Invalid webview name format',
          errors: [{ code: 'INVALID_WEBVIEW_NAME', message: 'Webview name must contain only lowercase letters, numbers, hyphens, and underscores' }]
        });
        return;
      }

      const createData = {
        ...webviewData,
        workspace_id,
        created_by: userId
      };

      const webview = await this.webviewService.createWebview(createData);

      res.status(201).json({
        success: true,
        webview,
        message: 'Webview created successfully'
      });
    } catch (error: any) {
      logger.error('Create webview error:', error);
      
      if (error.code === 'WEBVIEW_NAME_EXISTS') {
        res.status(409).json({
          success: false,
          message: 'Webview with this name already exists',
          errors: [{ code: 'DUPLICATE_NAME', message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create webview',
          errors: [{ code: 'CREATE_WEBVIEW_FAILED', message: error.message }]
        });
      }
    }
  }

  // Get specific webview by ID
  async getWebview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        include_categories = true, 
        include_dashboards = false,
        include_stats = false 
      } = req.query;

      const webview = await this.webviewService.getWebview(id, workspace_id, {
        include_categories: include_categories === 'true',
        include_dashboards: include_dashboards === 'true',
        include_stats: include_stats === 'true'
      });

      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        webview,
        message: 'Webview retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get webview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview',
        errors: [{ code: 'GET_WEBVIEW_FAILED', message: error.message }]
      });
    }
  }

  // Update webview
  async updateWebview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const updateData = req.body;

      // Validate webview_name format if provided
      if (updateData.webview_name) {
        const webviewNameRegex = /^[a-z0-9-_]+$/;
        if (!webviewNameRegex.test(updateData.webview_name)) {
          res.status(400).json({
            success: false,
            message: 'Invalid webview name format',
            errors: [{ code: 'INVALID_WEBVIEW_NAME', message: 'Webview name must contain only lowercase letters, numbers, hyphens, and underscores' }]
          });
          return;
        }
      }

      const webview = await this.webviewService.updateWebview(id, workspace_id, updateData);

      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        webview,
        message: 'Webview updated successfully'
      });
    } catch (error: any) {
      logger.error('Update webview error:', error);
      
      if (error.code === 'WEBVIEW_NAME_EXISTS') {
        res.status(409).json({
          success: false,
          message: 'Webview with this name already exists',
          errors: [{ code: 'DUPLICATE_NAME', message: error.message }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update webview',
          errors: [{ code: 'UPDATE_WEBVIEW_FAILED', message: error.message }]
        });
      }
    }
  }

  // Delete webview
  async deleteWebview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { force = false } = req.query;

      const result = await this.webviewService.deleteWebview(id, workspace_id, force === 'true');

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.message || 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: result.message || 'Webview does not exist or access denied' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Webview deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete webview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete webview',
        errors: [{ code: 'DELETE_WEBVIEW_FAILED', message: error.message }]
      });
    }
  }

  // Get webview by name (protected)
  async getWebviewByName(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { webviewName } = req.params;
      const { workspace_id } = req.user;
      const { include_categories = true } = req.query;

      const webview = await this.webviewService.getWebviewByName(webviewName, {
        workspace_id,
        include_categories: include_categories === 'true'
      });

      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview not found in this workspace' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        webview,
        message: 'Webview retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get webview by name error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview',
        errors: [{ code: 'GET_WEBVIEW_BY_NAME_FAILED', message: error.message }]
      });
    }
  }

  // Get webview categories (protected)
  async getWebviewCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        search, 
        include_dashboards = false, 
        include_inactive = false 
      } = req.query;

      const categories = await this.categoryService.getWebviewCategories(id, {
        search: search as string,
        include_dashboards: include_dashboards === 'true',
        include_inactive: include_inactive === 'true',
        workspace_id
      });

      res.status(200).json({
        success: true,
        categories,
        message: 'Webview categories retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get webview categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        errors: [{ code: 'GET_CATEGORIES_FAILED', message: error.message }]
      });
    }
  }

  // Get webview statistics
  async getWebviewStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        start_date, 
        end_date, 
        include_detailed = false 
      } = req.query;

      const stats = await this.analyticsService.getWebviewStats(id, workspace_id, {
        start_date: start_date as string,
        end_date: end_date as string,
        include_detailed: include_detailed === 'true'
      });

      res.status(200).json({
        success: true,
        stats,
        message: 'Webview statistics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get webview stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview statistics',
        errors: [{ code: 'GET_WEBVIEW_STATS_FAILED', message: error.message }]
      });
    }
  }

  // Log webview activity (protected)
  async logWebviewActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { id: userId, workspace_id } = req.user;
      const activityData = req.body as ActivityLogRequest;

      const enrichedActivity = {
        ...activityData,
        webview_id: id,
        workspace_id,
        user_id: userId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        timestamp: new Date()
      };

      await this.analyticsService.logWebviewActivity(enrichedActivity);

      res.status(200).json({
        success: true,
        message: 'Activity logged successfully'
      });
    } catch (error: any) {
      logger.error('Log webview activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log activity',
        errors: [{ code: 'LOG_WEBVIEW_ACTIVITY_FAILED', message: error.message }]
      });
    }
  }

  // Get webview analytics
  async getWebviewAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        start_date, 
        end_date, 
        metrics,
        group_by = 'day' 
      } = req.query;

      const analytics = await this.analyticsService.getWebviewAnalytics(id, workspace_id, {
        start_date: start_date as string,
        end_date: end_date as string,
        metrics: metrics ? (metrics as string).split(',') : undefined,
        group_by: group_by as string
      });

      res.status(200).json({
        success: true,
        analytics,
        message: 'Webview analytics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get webview analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview analytics',
        errors: [{ code: 'GET_WEBVIEW_ANALYTICS_FAILED', message: error.message }]
      });
    }
  }

  // Update webview settings
  async updateWebviewSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const settingsData = req.body;

      const settings = await this.webviewService.updateWebviewSettings(id, workspace_id, settingsData);

      if (!settings) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        settings,
        message: 'Webview settings updated successfully'
      });
    } catch (error: any) {
      logger.error('Update webview settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update webview settings',
        errors: [{ code: 'UPDATE_WEBVIEW_SETTINGS_FAILED', message: error.message }]
      });
    }
  }

  // Generate webview embed code
  async generateEmbedCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        embed_type = 'iframe', 
        width = '100%', 
        height = '600px',
        theme = 'light',
        show_header = true,
        show_filters = true
      } = req.query;

      const embedCode = await this.webviewService.generateEmbedCode(id, workspace_id, {
        embed_type: embed_type as string,
        width: width as string,
        height: height as string,
        theme: theme as string,
        show_header: show_header === 'true',
        show_filters: show_filters === 'true'
      });

      res.status(200).json({
        success: true,
        embed_code: embedCode,
        message: 'Embed code generated successfully'
      });
    } catch (error: any) {
      logger.error('Generate embed code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate embed code',
        errors: [{ code: 'GENERATE_EMBED_CODE_FAILED', message: error.message }]
      });
    }
  }

  // Test webview access
  async testWebviewAccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;

      const accessTest = await this.webviewService.testWebviewAccess(id, workspace_id);

      res.status(200).json({
        success: true,
        access_test: accessTest,
        message: 'Webview access test completed'
      });
    } catch (error: any) {
      logger.error('Test webview access error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test webview access',
        errors: [{ code: 'TEST_WEBVIEW_ACCESS_FAILED', message: error.message }]
      });
    }
  }
}