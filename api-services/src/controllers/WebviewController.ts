// api-services/src/controllers/WebviewController.ts - FIXED VERSION
import { Request, Response } from 'express';
import { WebviewService } from '../services/WebviewService';
import { CategoryService } from '../services/CategoryService';
import { AnalyticsService } from '../services/AnalyticsService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

// Import database connection directly (same pattern as other fixed controllers)
import { db } from '../utils/database';

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
    console.log('🔧 WebviewController: Starting initialization...');
    
    // Validate database connection first
    if (!db) {
      const error = new Error('WebviewController: Database connection is required but was null/undefined');
      logger.error('❌ WebviewController constructor error:', error.message);
      throw error;
    }
    
    if (typeof db.query !== 'function') {
      const error = new Error(`WebviewController: Invalid database connection - query method is ${typeof db.query}, expected function`);
      logger.error('❌ WebviewController constructor error:', {
        message: error.message,
        databaseType: typeof db,
        hasQuery: typeof db.query,
        constructorName: db.constructor?.name
      });
      throw error;
    }

    console.log('✅ WebviewController: Database connection validated');
    
    // Initialize services
    this.webviewService = new WebviewService();
    this.categoryService = new CategoryService();
    this.analyticsService = new AnalyticsService();
    this.permissionService = new PermissionService(db); // ✅ Pass database connection
    
    logger.info('✅ WebviewController: Initialized successfully', {
      hasWebviewService: !!this.webviewService,
      hasCategoryService: !!this.categoryService,
      hasAnalyticsService: !!this.analyticsService,
      hasPermissionService: !!this.permissionService,
      service: 'bi-platform-api'
    });
    
    console.log('✅ WebviewController: Initialization complete');
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
        message: 'Failed to retrieve public webview categories',
        errors: [{ code: 'GET_PUBLIC_WEBVIEW_CATEGORIES_FAILED', message: error.message }]
      });
    }
  }

  // Get public dashboard from webview
  async getPublicDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { webviewId, dashboardId } = req.params;
      const { include_charts = true } = req.query;

      // Verify webview is public
      const webview = await this.webviewService.getWebview(webviewId, null, {
        public_access: true
      });

      if (!webview || !webview.is_public) {
        res.status(404).json({
          success: false,
          message: 'Public webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview not found or not publicly accessible' }]
        });
        return;
      }

      const dashboard = await this.webviewService.getPublicDashboard(
        webviewId,
        dashboardId,
        {
          include_charts: include_charts === 'true'
        }
      );

      if (!dashboard) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: 'Dashboard not found in this webview' }]
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
        message: 'Failed to retrieve public dashboard',
        errors: [{ code: 'GET_PUBLIC_DASHBOARD_FAILED', message: error.message }]
      });
    }
  }

  // Log public activity
  async logPublicActivity(req: Request, res: Response): Promise<void> {
    try {
      const { webviewId } = req.params;
      const activityData = req.body as ActivityLogRequest;

      // Verify webview is public
      const webview = await this.webviewService.getWebview(webviewId, null, {
        public_access: true
      });

      if (!webview || !webview.is_public) {
        res.status(404).json({
          success: false,
          message: 'Public webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview not found or not publicly accessible' }]
        });
        return;
      }

      await this.analyticsService.logPublicActivity(webviewId, {
        ...activityData,
        user_agent: req.get('User-Agent'),
        ip_address: req.ip,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Activity logged successfully'
      });
    } catch (error: any) {
      logger.error('Log public activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log activity',
        errors: [{ code: 'LOG_PUBLIC_ACTIVITY_FAILED', message: error.message }]
      });
    }
  }

  // ========== AUTHENTICATED ENDPOINTS ==========

  // Get all webviews for workspace
  async getWebviews(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        is_public,
        include_categories = false,
        include_stats = false 
      } = req.query;

      const webviews = await this.webviewService.getWebviews(workspace_id, {
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        is_public: is_public === 'true' ? true : is_public === 'false' ? false : undefined,
        include_categories: include_categories === 'true',
        include_stats: include_stats === 'true'
      });

      res.status(200).json({
        success: true,
        webviews: webviews.webviews,
        pagination: {
          page: webviews.page,
          limit: webviews.limit,
          total: webviews.total,
          pages: webviews.pages
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
      const { workspace_id, id: userId } = req.user;
      const webviewData = req.body;

      // Validate required fields
      if (!webviewData.name || !webviewData.display_name) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Name and display_name are required' }]
        });
        return;
      }

      // Check if webview name already exists in workspace
      const existingWebview = await this.webviewService.getWebviewByName(
        webviewData.name,
        { workspace_id }
      );

      if (existingWebview) {
        res.status(409).json({
          success: false,
          message: 'Webview with this name already exists',
          errors: [{ code: 'DUPLICATE_NAME', message: 'A webview with this name already exists in your workspace' }]
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

      // Check if webview exists in workspace
      const existingWebview = await this.webviewService.getWebview(id, workspace_id);
      if (!existingWebview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      // If updating name, check for duplicates
      if (updateData.name && updateData.name !== existingWebview.name) {
        const duplicateWebview = await this.webviewService.getWebviewByName(
          updateData.name,
          { workspace_id }
        );

        if (duplicateWebview) {
          res.status(409).json({
            success: false,
            message: 'Webview with this name already exists',
            errors: [{ code: 'DUPLICATE_NAME', message: 'A webview with this name already exists in your workspace' }]
          });
          return;
        }
      }

      const updatedWebview = await this.webviewService.updateWebview(id, updateData);

      res.status(200).json({
        success: true,
        webview: updatedWebview,
        message: 'Webview updated successfully'
      });
    } catch (error: any) {
      logger.error('Update webview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update webview',
        errors: [{ code: 'UPDATE_WEBVIEW_FAILED', message: error.message }]
      });
    }
  }

  // Delete webview
  async deleteWebview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;

      // Check if webview exists in workspace
      const existingWebview = await this.webviewService.getWebview(id, workspace_id);
      if (!existingWebview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      await this.webviewService.deleteWebview(id);

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

  // Get webview by name
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
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview with this name does not exist in your workspace' }]
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

  // Get webview categories
  async getWebviewCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { 
        search, 
        include_dashboards = false, 
        include_inactive = false 
      } = req.query;

      // Verify webview exists in workspace
      const webview = await this.webviewService.getWebview(id, workspace_id);
      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      const categories = await this.categoryService.getWebviewCategories(id, {
        search: search as string,
        include_dashboards: include_dashboards === 'true',
        include_inactive: include_inactive === 'true'
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
        message: 'Failed to retrieve webview categories',
        errors: [{ code: 'GET_WEBVIEW_CATEGORIES_FAILED', message: error.message }]
      });
    }
  }

  // Get webview statistics
  async getWebviewStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;
      const { period = '7d' } = req.query;

      // Verify webview exists in workspace
      const webview = await this.webviewService.getWebview(id, workspace_id);
      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      const stats = await this.analyticsService.getWebviewStats(id, period as string);

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

  // Log webview activity
  async logWebviewActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { workspace_id, id: userId } = req.user;
      const activityData = req.body as ActivityLogRequest;

      // Verify webview exists in workspace
      const webview = await this.webviewService.getWebview(id, workspace_id);
      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      await this.analyticsService.logWebviewActivity(id, {
        ...activityData,
        user_id: userId,
        workspace_id,
        user_agent: req.get('User-Agent'),
        ip_address: req.ip,
        timestamp: new Date().toISOString()
      });

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
        group_by = 'day',
        metrics = 'views,interactions' 
      } = req.query;

      // Verify webview exists in workspace
      const webview = await this.webviewService.getWebview(id, workspace_id);
      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      const analytics = await this.analyticsService.getWebviewAnalytics(id, {
        start_date: start_date as string,
        end_date: end_date as string,
        group_by: group_by as string,
        metrics: (metrics as string).split(',')
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

      // Verify webview exists in workspace
      const webview = await this.webviewService.getWebview(id, workspace_id);
      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: 'Webview does not exist or access denied' }]
        });
        return;
      }

      const updatedWebview = await this.webviewService.updateWebviewSettings(id, settingsData);

      res.status(200).json({
        success: true,
        webview: updatedWebview,
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
}