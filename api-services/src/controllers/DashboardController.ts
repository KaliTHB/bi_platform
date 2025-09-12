// api-services/src/controllers/DashboardController.ts - COMPLETE WITH MISSING METHODS
import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import { ChartService } from '../services/ChartService';
import { logger } from '../utils/logger';
import { db } from '../utils/database';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    workspace_id: string;
    roles: string[];
  };
}

export class DashboardController {
  private dashboardService: DashboardService;
  private chartService: ChartService;

  constructor() {
    try {
      // Pass the required dependencies to services
      this.dashboardService = new DashboardService(db);
      this.chartService = new ChartService(db);
      
      logger.info('DashboardController initialized successfully');
    } catch (error: any) {
      logger.error('Failed to initialize DashboardController:', error);
      throw new Error(`DashboardController initialization failed: ${error.message}`);
    }
  }

  // ========================================================================
  // ✅ CORE CRUD METHODS (EXISTING - VERIFIED)
  // ========================================================================

  async getDashboards(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id } = req.user;
      const { 
        page = 1, 
        limit = 20, 
        category_id, 
        created_by, 
        is_public, 
        is_featured, 
        search,
        include_charts = false 
      } = req.query;

      const options = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filters: {
          category_id: category_id as string,
          created_by: created_by as string,
          is_public: is_public === 'true',
          is_featured: is_featured === 'true',
          search: search as string
        },
        include_charts: include_charts === 'true'
      };

      const result = await this.dashboardService.getDashboards(workspace_id, options);

      res.json({
        success: true,
        data: result.dashboards,
        pagination: result.pagination,
        message: 'Dashboards retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboards:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve dashboards'
      });
    }
  }

  async createDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id, id: user_id } = req.user;
      const dashboardData = req.body;

      const dashboard = await this.dashboardService.createDashboard(
        workspace_id,
        dashboardData,
        user_id
      );

      res.status(201).json({
        success: true,
        data: dashboard,
        message: 'Dashboard created successfully'
      });
    } catch (error: any) {
      logger.error('Error creating dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create dashboard'
      });
    }
  }

  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { include_charts = false, include_data = false } = req.query;

      const dashboard = await this.dashboardService.getDashboard(
        id,
        include_charts === 'true',
        include_data === 'true'
      );

      if (!dashboard) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found'
        });
        return;
      }

      res.json({
        success: true,
        data: dashboard,
        message: 'Dashboard retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve dashboard'
      });
    }
  }

  async updateDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedDashboard = await this.dashboardService.updateDashboard(id, updateData);

      res.json({
        success: true,
        data: updatedDashboard,
        message: 'Dashboard updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update dashboard'
      });
    }
  }

  async deleteDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.dashboardService.deleteDashboard(id);

      res.json({
        success: true,
        message: 'Dashboard deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete dashboard'
      });
    }
  }

  // ========================================================================
  // ✅ SHARING METHODS (EXISTING - VERIFIED)
  // ========================================================================

  async shareDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shareData = req.body;
      const userId = req.user.id;

      const sharingConfig = await this.dashboardService.shareDashboard(id, {
        ...shareData,
        created_by: userId
      });

      res.status(201).json({
        success: true,
        data: sharingConfig,
        message: 'Dashboard shared successfully'
      });
    } catch (error: any) {
      logger.error('Error sharing dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to share dashboard'
      });
    }
  }

  async updateSharingSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedConfig = await this.dashboardService.updateSharingSettings(id, updateData);

      if (!updatedConfig) {
        res.status(404).json({
          success: false,
          message: 'Sharing configuration not found'
        });
        return;
      }

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Sharing settings updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating sharing settings:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update sharing settings'
      });
    }
  }

  async getSharingSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const sharingConfig = await this.dashboardService.getSharingSettings(id);

      if (!sharingConfig) {
        res.status(404).json({
          success: false,
          message: 'Sharing configuration not found'
        });
        return;
      }

      res.json({
        success: true,
        data: sharingConfig,
        message: 'Sharing settings retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting sharing settings:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get sharing settings'
      });
    }
  }

  async revokeDashboardSharing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.dashboardService.revokeDashboardSharing(id);

      res.json({
        success: true,
        message: 'Dashboard sharing revoked successfully'
      });
    } catch (error: any) {
      logger.error('Error revoking dashboard sharing:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to revoke dashboard sharing'
      });
    }
  }

  // ========================================================================
  // ✅ ANALYTICS METHODS (EXISTING - VERIFIED)
  // ========================================================================

  async getDashboardAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const params = req.query;

      const analytics = await this.dashboardService.getDashboardAnalytics(id, params);

      res.json({
        success: true,
        data: analytics,
        message: 'Dashboard analytics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard analytics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard analytics'
      });
    }
  }

  // ========================================================================
  // ✅ CACHE MANAGEMENT METHODS (EXISTING - VERIFIED)
  // ========================================================================

  async getCacheStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const cacheStatus = await this.dashboardService.getCacheStatus(id);

      res.json({
        success: true,
        data: cacheStatus,
        message: 'Dashboard cache status retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard cache status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard cache status'
      });
    }
  }

  // ========================================================================
  // 🔧 MISSING METHOD: refreshCache
  // ========================================================================

  async refreshCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { force = false } = req.query;

      // Call the service method to refresh cache
      const refreshResult = await this.dashboardService.refreshCache(id, force === 'true');

      res.json({
        success: true,
        data: refreshResult,
        message: 'Dashboard cache refresh initiated successfully'
      });
    } catch (error: any) {
      logger.error('Error refreshing dashboard cache:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to refresh dashboard cache'
      });
    }
  }

  async clearCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.dashboardService.clearCache(id);

      res.json({
        success: true,
        message: 'Dashboard cache cleared successfully'
      });
    } catch (error: any) {
      logger.error('Error clearing dashboard cache:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to clear dashboard cache'
      });
    }
  }

  // ========================================================================
  // 📊 ADDITIONAL DATA METHODS (OPTIONAL - FOR COMPLETENESS)
  // ========================================================================

  async getDashboardData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filters, force_refresh = false } = req.query;

      let parsedFilters = {};
      if (filters && typeof filters === 'string') {
        try {
          parsedFilters = JSON.parse(filters);
        } catch (e) {
          logger.warn('Invalid filters JSON:', e);
        }
      }

      const dashboardData = await this.dashboardService.getDashboardData(
        id, 
        parsedFilters,
        force_refresh === 'true'
      );

      res.json({
        success: true,
        data: dashboardData,
        message: 'Dashboard data retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve dashboard data'
      });
    }
  }

  async refreshDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.dashboardService.refreshDashboard(id);

      res.json({
        success: true,
        data: {
          refresh_id: result.refresh_id,
          status: result.status,
          started_at: result.started_at,
          affected_charts: result.affected_charts
        },
        message: 'Dashboard refresh initiated successfully'
      });
    } catch (error: any) {
      logger.error('Error refreshing dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to refresh dashboard'
      });
    }
  }

  async exportDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { format = 'pdf', options = {} } = req.body;

      const exportResult = await this.dashboardService.exportDashboard(id, format, options);

      res.status(202).json({
        success: true,
        data: exportResult,
        message: 'Dashboard export initiated successfully'
      });
    } catch (error: any) {
      logger.error('Error exporting dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export dashboard'
      });
    }
  }

  async getExportStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;

      const status = await this.dashboardService.getExportStatus(exportId);

      if (!status) {
        res.status(404).json({
          success: false,
          message: 'Export job not found'
        });
        return;
      }

      res.json({
        success: true,
        data: status,
        message: 'Export status retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting export status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get export status'
      });
    }
  }

  async duplicateDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;

      const duplicatedDashboard = await this.dashboardService.duplicateDashboard(id, {
        name,
        description,
        created_by: userId
      });

      res.status(201).json({
        success: true,
        data: duplicatedDashboard,
        message: 'Dashboard duplicated successfully'
      });
    } catch (error: any) {
      logger.error('Error duplicating dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to duplicate dashboard'
      });
    }
  }
}