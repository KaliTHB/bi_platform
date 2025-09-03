// File: api-services/src/controllers/DashboardController.ts
import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import { ChartService } from '../services/ChartService';
import { logger } from '../utils/logger';

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
    this.dashboardService = new DashboardService();
    this.chartService = new ChartService();
  }

  // ✅ EXISTING CORE METHODS
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
      const userId = req.user.id;
      const workspace_id = req.user.workspace_id;
      
      const dashboardData = {
        ...req.body,
        workspace_id,
        created_by: userId
      };

      const dashboard = await this.dashboardService.createDashboard(dashboardData);

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
      const { include_charts = false } = req.query;
      
      const dashboard = await this.dashboardService.getDashboard(id, include_charts === 'true');
      
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

      const dashboard = await this.dashboardService.updateDashboard(id, updateData);

      res.json({
        success: true,
        data: dashboard,
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

  async duplicateDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name } = req.body;

      const duplicatedDashboard = await this.dashboardService.duplicateDashboard(id, {
        name: name || undefined,
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

  async getDashboardCharts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const charts = await this.dashboardService.getDashboardCharts(id);

      res.json({
        success: true,
        data: charts,
        message: 'Dashboard charts retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard charts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve dashboard charts'
      });
    }
  }

  // 🚀 NEW CACHE & FILTER OPERATIONS
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

  async applyGlobalFilter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filters } = req.body;

      if (!filters || typeof filters !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Filters object is required'
        });
        return;
      }

      const result = await this.dashboardService.applyGlobalFilter(id, filters);

      res.json({
        success: true,
        data: result,
        message: 'Global filter applied successfully'
      });
    } catch (error: any) {
      logger.error('Error applying global filter:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to apply global filter'
      });
    }
  }

  async exportDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const exportOptions = req.body;
      const userId = req.user.id;

      const exportResult = await this.dashboardService.exportDashboard(id, exportOptions, userId);

      res.json({
        success: true,
        data: {
          export_id: exportResult.export_id,
          format: exportResult.format,
          file_path: exportResult.file_path,
          download_url: exportResult.download_url,
          file_size_bytes: exportResult.file_size_bytes,
          status: exportResult.status,
          created_at: exportResult.created_at
        },
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

  // 🔧 ADDITIONAL UTILITY METHODS
  async updateDashboardLayout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { layout } = req.body;

      if (!layout) {
        res.status(400).json({
          success: false,
          message: 'Layout data is required'
        });
        return;
      }

      const updatedLayout = await this.dashboardService.updateDashboardLayout(id, layout);

      res.json({
        success: true,
        data: updatedLayout,
        message: 'Dashboard layout updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating dashboard layout:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update dashboard layout'
      });
    }
  }

  async updateDashboardFilters(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { filters } = req.body;

      if (!Array.isArray(filters)) {
        res.status(400).json({
          success: false,
          message: 'Filters must be an array'
        });
        return;
      }

      const updatedFilters = await this.dashboardService.updateDashboardFilters(id, filters);

      res.json({
        success: true,
        data: updatedFilters,
        message: 'Dashboard filters updated successfully'
      });
    } catch (error: any) {
      logger.error('Error updating dashboard filters:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update dashboard filters'
      });
    }
  }

  async clearDashboardCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.dashboardService.clearDashboardCache(id);

      res.json({
        success: true,
        data: {
          cache_cleared: result.cache_cleared,
          affected_charts: result.affected_charts
        },
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

  async getDashboardCacheStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const cacheStatus = await this.dashboardService.getDashboardCacheStatus(id);

      res.json({
        success: true,
        data: {
          dashboard_cached: cacheStatus.dashboard_cached,
          charts_cached: cacheStatus.charts_cached,
          total_charts: cacheStatus.total_charts,
          last_cache_update: cacheStatus.last_cache_update,
          cache_size_mb: cacheStatus.cache_size_mb
        },
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

  // ✅ EXISTING ROUTES (SHARING & ANALYTICS)
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
}