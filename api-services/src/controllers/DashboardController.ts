// api-services/src/controllers/DashboardController.ts
import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

interface DashboardCreateRequest {
  name: string;
  display_name?: string;
  description?: string;
  category_id?: string;
  layout_config?: any;
  theme_config?: any;
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
  auto_refresh_interval?: number;
}

interface DashboardUpdateRequest {
  name?: string;
  display_name?: string;
  description?: string;
  category_id?: string;
  layout_config?: any;
  theme_config?: any;
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
  auto_refresh_interval?: number;
}

export class DashboardController {
  private dashboardService: DashboardService;
  private permissionService: PermissionService;

  constructor() {
    this.dashboardService = new DashboardService();
    this.permissionService = new PermissionService();
  }

  getDashboards = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        category_id,
        created_by,
        is_public,
        is_featured,
        include_charts 
      } = req.query;

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
        'dashboard.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view dashboards' }]
        });
        return;
      }

      const filters = {
        category_id: category_id as string,
        created_by: created_by as string,
        is_public: is_public === 'true' ? true : is_public === 'false' ? false : undefined,
        is_featured: is_featured === 'true' ? true : is_featured === 'false' ? false : undefined,
        search: search as string
      };

      const result = await this.dashboardService.getDashboards(workspaceId, {
        page: Number(page),
        limit: Number(limit),
        filters,
        include_charts: include_charts === 'true'
      });

      res.status(200).json({
        success: true,
        dashboards: result.dashboards,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error: any) {
      logger.error('Get dashboards error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboards',
        errors: [{ code: 'GET_DASHBOARDS_FAILED', message: error.message }]
      });
    }
  };

  createDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const dashboardData = req.body as DashboardCreateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate required fields
      if (!dashboardData.name) {
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
        'dashboard.create'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to create dashboards' }]
        });
        return;
      }

      const dashboard = await this.dashboardService.createDashboard(workspaceId, {
        ...dashboardData,
        workspace_id: workspaceId,
        created_by: userId!
      });

      res.status(201).json({
        success: true,
        dashboard,
        message: 'Dashboard created successfully'
      });
    } catch (error: any) {
      logger.error('Create dashboard error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create dashboard',
        errors: [{ code: 'DASHBOARD_CREATE_FAILED', message: error.message }]
      });
    }
  };

  getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { include_charts = 'true' } = req.query;

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
        'dashboard.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view this dashboard' }]
        });
        return;
      }

      const dashboard = await this.dashboardService.getDashboardById(id, include_charts === 'true');

      if (!dashboard) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: `Dashboard with ID ${id} not found` }]
        });
        return;
      }

      // Verify dashboard belongs to workspace
      if (dashboard.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: `Dashboard with ID ${id} not found in this workspace` }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        dashboard
      });
    } catch (error: any) {
      logger.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard',
        errors: [{ code: 'GET_DASHBOARD_FAILED', message: error.message }]
      });
    }
  };

  updateDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const updateData = req.body as DashboardUpdateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check if dashboard exists and belongs to workspace
      const existingDashboard = await this.dashboardService.getDashboardById(id);
      if (!existingDashboard || existingDashboard.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: `Dashboard with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dashboard.update'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to update this dashboard' }]
        });
        return;
      }

      const updatedDashboard = await this.dashboardService.updateDashboard(id, updateData);

      res.status(200).json({
        success: true,
        dashboard: updatedDashboard,
        message: 'Dashboard updated successfully'
      });
    } catch (error: any) {
      logger.error('Update dashboard error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update dashboard',
        errors: [{ code: 'DASHBOARD_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  deleteDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Check if dashboard exists and belongs to workspace
      const existingDashboard = await this.dashboardService.getDashboardById(id);
      if (!existingDashboard || existingDashboard.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: `Dashboard with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dashboard.delete'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to delete this dashboard' }]
        });
        return;
      }

      await this.dashboardService.deleteDashboard(id);

      res.status(200).json({
        success: true,
        message: 'Dashboard deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete dashboard',
        errors: [{ code: 'DASHBOARD_DELETE_FAILED', message: error.message }]
      });
    }
  };

  duplicateDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { name, include_charts = true } = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check if source dashboard exists and belongs to workspace
      const sourceDashboard = await this.dashboardService.getDashboardById(id, true);
      if (!sourceDashboard || sourceDashboard.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: `Dashboard with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasCreatePermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dashboard.create'
      );

      const hasReadPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dashboard.read'
      );

      if (!hasCreatePermission || !hasReadPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to duplicate this dashboard' }]
        });
        return;
      }

      const duplicatedDashboard = await this.dashboardService.duplicateDashboard(
        id,
        userId!,
        name,
        include_charts
      );

      res.status(201).json({
        success: true,
        dashboard: duplicatedDashboard,
        message: 'Dashboard duplicated successfully'
      });
    } catch (error: any) {
      logger.error('Duplicate dashboard error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to duplicate dashboard',
        errors: [{ code: 'DASHBOARD_DUPLICATE_FAILED', message: error.message }]
      });
    }
  };

  getDashboardCharts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dashboard.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view dashboard charts' }]
        });
        return;
      }

      // Check if dashboard exists and belongs to workspace
      const dashboard = await this.dashboardService.getDashboardById(id);
      if (!dashboard || dashboard.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: `Dashboard with ID ${id} not found` }]
        });
        return;
      }

      const charts = await this.dashboardService.getDashboardCharts(id);

      res.status(200).json({
        success: true,
        charts
      });
    } catch (error: any) {
      logger.error('Get dashboard charts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard charts',
        errors: [{ code: 'GET_DASHBOARD_CHARTS_FAILED', message: error.message }]
      });
    }
  };

  exportDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { format = 'pdf', include_data = 'false' } = req.query;

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
        'dashboard.export'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to export this dashboard' }]
        });
        return;
      }

      // Check if dashboard exists and belongs to workspace
      const dashboard = await this.dashboardService.getDashboardById(id);
      if (!dashboard || dashboard.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found',
          errors: [{ code: 'DASHBOARD_NOT_FOUND', message: `Dashboard with ID ${id} not found` }]
        });
        return;
      }

      const exportResult = await this.dashboardService.exportDashboard(
        id,
        format as string,
        include_data === 'true'
      );

      res.status(200).json({
        success: true,
        export: exportResult,
        message: 'Dashboard export completed successfully'
      });
    } catch (error: any) {
      logger.error('Export dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export dashboard',
        errors: [{ code: 'DASHBOARD_EXPORT_FAILED', message: error.message }]
      });
    }
  };

  shareDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { share_type, expires_at, password } = req.body;

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
        'dashboard.share'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to share this dashboard' }]
        });
        return;
      }

      const shareResult = await this.dashboardService.shareDashboard(id, {
        share_type,
        expires_at,
        password,
        created_by: userId!
      });

      res.status(201).json({
        success: true,
        share: shareResult,
        message: 'Dashboard shared successfully'
      });
    } catch (error: any) {
      logger.error('Share dashboard error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to share dashboard',
        errors: [{ code: 'DASHBOARD_SHARE_FAILED', message: error.message }]
      });
    }
  };

  updateSharingSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const sharingSettings = req.body;

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
        'dashboard.share'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to update sharing settings' }]
        });
        return;
      }

      const updatedSettings = await this.dashboardService.updateSharingSettings(id, sharingSettings);

      res.status(200).json({
        success: true,
        share: updatedSettings,
        message: 'Sharing settings updated successfully'
      });
    } catch (error: any) {
      logger.error('Update sharing settings error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update sharing settings',
        errors: [{ code: 'SHARING_UPDATE_FAILED', message: error.message }]
      });
    }
  };
}