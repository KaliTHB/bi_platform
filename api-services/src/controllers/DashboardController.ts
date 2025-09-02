// api-services/src/controllers/DashboardController.ts
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

  // ✅ EXISTING METHODS
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
        dashboards: result.dashboards,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        },
        message: 'Dashboards retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboards:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboards'
      });
    }
  }

  async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const dashboard = await this.dashboardService.getDashboard(id);

      if (!dashboard) {
        res.status(404).json({
          success: false,
          message: 'Dashboard not found'
        });
        return;
      }

      res.json({
        success: true,
        dashboard,
        message: 'Dashboard retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard'
      });
    }
  }

  async createDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workspace_id, id: userId } = req.user;
      const dashboardData = {
        ...req.body,
        workspace_id,
        created_by: userId
      };

      const dashboard = await this.dashboardService.createDashboard(workspace_id, dashboardData);

      res.status(201).json({
        success: true,
        dashboard,
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

  async updateDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const dashboard = await this.dashboardService.updateDashboard(id, updateData);

      res.json({
        success: true,
        dashboard,
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
      const { name } = req.body;
      const { id: userId } = req.user;

      const dashboard = await this.dashboardService.duplicateDashboard(id, userId, name);

      res.status(201).json({
        success: true,
        dashboard,
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
        charts,
        total: charts.length,
        message: 'Dashboard charts retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard charts:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard charts'
      });
    }
  }

  // 🚀 NEW METHODS - CRITICAL CACHE & FILTER OPERATIONS

  async getDashboardData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { refresh, filters, limit, offset } = req.query;
      const userId = req.user.id;

      const params = {
        refresh: refresh === 'true',
        filters: filters ? JSON.parse(filters as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      };

      const data = await this.dashboardService.getDashboardData(id, userId, params);

      res.json({
        success: true,
        data,
        message: 'Dashboard data retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard data'
      });
    }
  }

  async refreshDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await this.dashboardService.refreshDashboard(id, userId);

      res.json({
        success: true,
        refresh_id: result.refresh_id,
        status: result.status,
        started_at: result.started_at,
        estimated_completion_time: result.estimated_completion_time,
        charts_to_refresh: result.charts_to_refresh,
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
      const { filter_id, filter_value } = req.body;
      const userId = req.user.id;

      if (!filter_id || filter_value === undefined) {
        res.status(400).json({
          success: false,
          message: 'filter_id and filter_value are required'
        });
        return;
      }

      const results = await this.dashboardService.applyGlobalFilter(
        id,
        filter_id,
        filter_value,
        userId
      );

      res.json({
        success: true,
        results: results.results,
        filter_id,
        applied_value: filter_value,
        affected_charts: results.affected_charts,
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
        export: {
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
        layout: updatedLayout,
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
        filters: updatedFilters,
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
        cache_cleared: result.cache_cleared,
        affected_charts: result.affected_charts,
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
        cache_status: {
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

  // ✅ EXISTING UTILITY METHODS
  async shareDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shareData = req.body;
      const { id: userId } = req.user;

      const sharingConfig = await this.dashboardService.shareDashboard(id, { ...shareData, created_by: userId });

      res.json({
        success: true,
        sharing_config: sharingConfig,
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

      const sharingConfig = await this.dashboardService.updateSharingSettings(id, updateData);

      res.json({
        success: true,
        sharing_config: sharingConfig,
        message: 'Dashboard sharing settings updated successfully'
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
      const { start_date, end_date, metrics } = req.query;

      const analytics = await this.dashboardService.getDashboardAnalytics(id, {
        start_date: start_date as string,
        end_date: end_date as string,
        metrics: metrics ? (metrics as string).split(',') : undefined
      });

      res.json({
        success: true,
        analytics,
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