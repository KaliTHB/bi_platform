// api-services/src/controllers/WebviewController.ts
import { Request, Response } from 'express';
import { WebviewService } from '../services/WebviewService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

interface WebviewCreateRequest {
  name: string;
  display_name?: string;
  description?: string;
  workspace_id: string;
  theme_config?: any;
  branding_config?: any;
  access_config?: any;
  seo_config?: any;
  is_active?: boolean;
}

interface WebviewUpdateRequest {
  name?: string;
  display_name?: string;
  description?: string;
  theme_config?: any;
  branding_config?: any;
  access_config?: any;
  seo_config?: any;
  is_active?: boolean;
}

interface ActivityLogRequest {
  event_type: string;
  category_id?: string;
  dashboard_id?: string;
  search_query?: string;
  navigation_path: string[];
  device_info: {
    type: string;
    screen_resolution: string;
    browser: string;
  };
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
}

export class WebviewController {
  private webviewService: WebviewService;
  private permissionService: PermissionService;

  constructor() {
    this.webviewService = new WebviewService();
    this.permissionService = new PermissionService();
  }

  // Public routes (no authentication required)

  getPublicWebview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { webviewName } = req.params;

      const webview = await this.webviewService.getWebviewByName(webviewName, true);

      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: `Webview '${webviewName}' not found` }]
        });
        return;
      }

      if (!webview.is_active) {
        res.status(404).json({
          success: false,
          message: 'Webview not available',
          errors: [{ code: 'WEBVIEW_INACTIVE', message: 'This webview is currently inactive' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        webview
      });
    } catch (error: any) {
      logger.error('Get public webview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview',
        errors: [{ code: 'GET_PUBLIC_WEBVIEW_FAILED', message: error.message }]
      });
    }
  };

  getPublicWebviewCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { webviewId } = req.params;
      const { search, include_dashboards = 'true', include_inactive = 'false' } = req.query;

      const categories = await this.webviewService.getWebviewCategories(webviewId, {
        search: search as string,
        include_dashboards: include_dashboards === 'true',
        include_inactive: include_inactive === 'true',
        public_access: true
      });

      res.status(200).json({
        success: true,
        categories
      });
    } catch (error: any) {
      logger.error('Get public webview categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        errors: [{ code: 'GET_PUBLIC_CATEGORIES_FAILED', message: error.message }]
      });
    }
  };

  getPublicDashboard = async (req: Request, res: Response): Promise<void> => {
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
        dashboard
      });
    } catch (error: any) {
      logger.error('Get public dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard',
        errors: [{ code: 'GET_PUBLIC_DASHBOARD_FAILED', message: error.message }]
      });
    }
  };

  logPublicActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { webviewId } = req.params;
      const activityData = req.body as ActivityLogRequest;

      // Add IP address and user agent from request
      const enrichedActivity = {
        ...activityData,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        timestamp: new Date()
      };

      await this.webviewService.logActivity(webviewId, enrichedActivity, false);

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
  };

  // Protected routes (authentication required)

  getWebviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const { workspace_id, include_inactive = 'false' } = req.query;

      // If workspace_id is provided, check permissions for that workspace
      if (workspace_id) {
        const hasPermission = await this.permissionService.hasPermission(
          userId!,
          workspace_id as string,
          'webview.read'
        );

        if (!hasPermission) {
          res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view webviews' }]
          });
          return;
        }
      }

      const webviews = await this.webviewService.getWebviews({
        workspace_id: workspace_id as string,
        include_inactive: include_inactive === 'true',
        user_id: userId // For filtering by user permissions
      });

      res.status(200).json({
        success: true,
        webviews
      });
    } catch (error: any) {
      logger.error('Get webviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webviews',
        errors: [{ code: 'GET_WEBVIEWS_FAILED', message: error.message }]
      });
    }
  };

  createWebview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const webviewData = req.body as WebviewCreateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate required fields
      if (!webviewData.name) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Name is required' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'webview.create'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to create webviews' }]
        });
        return;
      }

      const webview = await this.webviewService.createWebview({
        ...webviewData,
        workspace_id: workspaceId,
        created_by: userId!
      });

      res.status(201).json({
        success: true,
        webview,
        message: 'Webview created successfully'
      });
    } catch (error: any) {
      logger.error('Create webview error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create webview',
        errors: [{ code: 'WEBVIEW_CREATE_FAILED', message: error.message }]
      });
    }
  };

  getWebview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;

      const webview = await this.webviewService.getWebviewById(id);

      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: `Webview with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        webview.workspace_id,
        'webview.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view this webview' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        webview
      });
    } catch (error: any) {
      logger.error('Get webview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview',
        errors: [{ code: 'GET_WEBVIEW_FAILED', message: error.message }]
      });
    }
  };

  updateWebview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const updateData = req.body as WebviewUpdateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check if webview exists and belongs to workspace
      const existingWebview = await this.webviewService.getWebviewById(id);
      if (!existingWebview || existingWebview.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: `Webview with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'webview.update'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to update this webview' }]
        });
        return;
      }

      const updatedWebview = await this.webviewService.updateWebview(id, updateData, userId!);

      res.status(200).json({
        success: true,
        webview: updatedWebview,
        message: 'Webview updated successfully'
      });
    } catch (error: any) {
      logger.error('Update webview error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update webview',
        errors: [{ code: 'WEBVIEW_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  deleteWebview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check if webview exists and belongs to workspace
      const existingWebview = await this.webviewService.getWebviewById(id);
      if (!existingWebview || existingWebview.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: `Webview with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'webview.delete'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to delete this webview' }]
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
        errors: [{ code: 'WEBVIEW_DELETE_FAILED', message: error.message }]
      });
    }
  };

  getWebviewByName = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { webviewName } = req.params;
      const userId = req.user?.user_id;

      const webview = await this.webviewService.getWebviewByName(webviewName);

      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: `Webview '${webviewName}' not found` }]
        });
        return;
      }

      // Check permissions for authenticated access
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        webview.workspace_id,
        'webview.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view this webview' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        webview
      });
    } catch (error: any) {
      logger.error('Get webview by name error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview',
        errors: [{ code: 'GET_WEBVIEW_BY_NAME_FAILED', message: error.message }]
      });
    }
  };

  getWebviewCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { search, include_dashboards = 'true', include_inactive = 'false' } = req.query;
      const userId = req.user?.user_id;

      // Get webview to check permissions
      const webview = await this.webviewService.getWebviewById(id);
      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: `Webview with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        webview.workspace_id,
        'webview.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view webview categories' }]
        });
        return;
      }

      const categories = await this.webviewService.getWebviewCategories(id, {
        search: search as string,
        include_dashboards: include_dashboards === 'true',
        include_inactive: include_inactive === 'true',
        public_access: false
      });

      res.status(200).json({
        success: true,
        categories
      });
    } catch (error: any) {
      logger.error('Get webview categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve categories',
        errors: [{ code: 'GET_WEBVIEW_CATEGORIES_FAILED', message: error.message }]
      });
    }
  };

  getWebviewStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;

      // Get webview to check permissions
      const webview = await this.webviewService.getWebviewById(id);
      if (!webview) {
        res.status(404).json({
          success: false,
          message: 'Webview not found',
          errors: [{ code: 'WEBVIEW_NOT_FOUND', message: `Webview with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        webview.workspace_id,
        'webview.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view webview statistics' }]
        });
        return;
      }

      const stats = await this.webviewService.getWebviewStats(id);

      res.status(200).json({
        success: true,
        stats
      });
    } catch (error: any) {
      logger.error('Get webview stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview statistics',
        errors: [{ code: 'GET_WEBVIEW_STATS_FAILED', message: error.message }]
      });
    }
  };

  logWebviewActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;
      const activityData = req.body as ActivityLogRequest;

      // Add user information and enrich activity data
      const enrichedActivity = {
        ...activityData,
        user_id: userId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        timestamp: new Date()
      };

      await this.webviewService.logActivity(id, enrichedActivity, true);

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
  };

  getWebviewAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { period = 'month', start_date, end_date } = req.query;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'webview.analytics'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view webview analytics' }]
        });
        return;
      }

      const analytics = await this.webviewService.getWebviewAnalytics(id, {
        period: period as string,
        start_date: start_date as string,
        end_date: end_date as string
      });

      res.status(200).json({
        success: true,
        analytics
      });
    } catch (error: any) {
      logger.error('Get webview analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve webview analytics',
        errors: [{ code: 'GET_WEBVIEW_ANALYTICS_FAILED', message: error.message }]
      });
    }
  };

  updateWebviewSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const settings = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'webview.configure'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to configure webview settings' }]
        });
        return;
      }

      const updatedWebview = await this.webviewService.updateWebviewSettings(id, settings, userId!);

      res.status(200).json({
        success: true,
        webview: updatedWebview,
        message: 'Webview settings updated successfully'
      });
    } catch (error: any) {
      logger.error('Update webview settings error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update webview settings',
        errors: [{ code: 'UPDATE_WEBVIEW_SETTINGS_FAILED', message: error.message }]
      });
    }
  };
}