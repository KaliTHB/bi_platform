// api-services/src/controllers/ChartController.ts
import { Request, Response } from 'express';
import { ChartService } from '../services/ChartService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

interface ChartCreateRequest {
  name: string;
  display_name?: string;
  description?: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'funnel' | 'heatmap';
  dataset_id: string;
  query_config: any;
  visualization_config: any;
  filters?: any[];
  tags?: string[];
  is_public?: boolean;
}

interface ChartUpdateRequest {
  name?: string;
  display_name?: string;
  description?: string;
  type?: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'table' | 'metric' | 'funnel' | 'heatmap';
  query_config?: any;
  visualization_config?: any;
  filters?: any[];
  tags?: string[];
  is_public?: boolean;
}

export class ChartController {
  private chartService: ChartService;
  private permissionService: PermissionService;

  constructor() {
    this.chartService = new ChartService();
    this.permissionService = new PermissionService();
  }

  getCharts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        type,
        dataset_id,
        created_by,
        is_public,
        dashboard_id 
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
        'chart.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view charts' }]
        });
        return;
      }

      const filters = {
        type: type as string,
        dataset_id: dataset_id as string,
        created_by: created_by as string,
        is_public: is_public === 'true' ? true : is_public === 'false' ? false : undefined,
        dashboard_id: dashboard_id as string,
        search: search as string
      };

      const result = await this.chartService.getCharts(workspaceId, {
        page: Number(page),
        limit: Number(limit),
        filters
      });

      res.status(200).json({
        success: true,
        charts: result.charts,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error: any) {
      logger.error('Get charts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve charts',
        errors: [{ code: 'GET_CHARTS_FAILED', message: error.message }]
      });
    }
  };

  createChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const chartData = req.body as ChartCreateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate required fields
      if (!chartData.name || !chartData.type || !chartData.dataset_id) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Name, type, and dataset_id are required' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'chart.create'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to create charts' }]
        });
        return;
      }

      const chart = await this.chartService.createChart(workspaceId, {
        ...chartData,
        workspace_id: workspaceId,
        created_by: userId!
      });

      res.status(201).json({
        success: true,
        chart,
        message: 'Chart created successfully'
      });
    } catch (error: any) {
      logger.error('Create chart error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create chart',
        errors: [{ code: 'CHART_CREATE_FAILED', message: error.message }]
      });
    }
  };

  getChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        'chart.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view this chart' }]
        });
        return;
      }

      const chart = await this.chartService.getChartById(id);

      if (!chart) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      // Verify chart belongs to workspace
      if (chart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found in this workspace` }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        chart
      });
    } catch (error: any) {
      logger.error('Get chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart',
        errors: [{ code: 'GET_CHART_FAILED', message: error.message }]
      });
    }
  };

  updateChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const updateData = req.body as ChartUpdateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check if chart exists and belongs to workspace
      const existingChart = await this.chartService.getChartById(id);
      if (!existingChart || existingChart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'chart.update'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to update this chart' }]
        });
        return;
      }

      const updatedChart = await this.chartService.updateChart(id, updateData);

      res.status(200).json({
        success: true,
        chart: updatedChart,
        message: 'Chart updated successfully'
      });
    } catch (error: any) {
      logger.error('Update chart error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update chart',
        errors: [{ code: 'CHART_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  deleteChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Check if chart exists and belongs to workspace
      const existingChart = await this.chartService.getChartById(id);
      if (!existingChart || existingChart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'chart.delete'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to delete this chart' }]
        });
        return;
      }

      // Check if chart is used in any dashboards
      const usage = await this.chartService.checkChartUsage(id);
      if (usage.inUse) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete chart in use',
          errors: [{ 
            code: 'CHART_IN_USE', 
            message: `Chart is being used in ${usage.dashboardCount} dashboard(s)`
          }]
        });
        return;
      }

      await this.chartService.deleteChart(id);

      res.status(200).json({
        success: true,
        message: 'Chart deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete chart',
        errors: [{ code: 'CHART_DELETE_FAILED', message: error.message }]
      });
    }
  };

  duplicateChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { name } = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Check if source chart exists and belongs to workspace
      const sourceChart = await this.chartService.getChartById(id);
      if (!sourceChart || sourceChart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
      const hasCreatePermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'chart.create'
      );

      const hasReadPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'chart.read'
      );

      if (!hasCreatePermission || !hasReadPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to duplicate this chart' }]
        });
        return;
      }

      const duplicatedChart = await this.chartService.duplicateChart(id, userId!, name);

      res.status(201).json({
        success: true,
        chart: duplicatedChart,
        message: 'Chart duplicated successfully'
      });
    } catch (error: any) {
      logger.error('Duplicate chart error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to duplicate chart',
        errors: [{ code: 'CHART_DUPLICATE_FAILED', message: error.message }]
      });
    }
  };

  getChartData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { limit, filters } = req.query;

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
        'chart.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view chart data' }]
        });
        return;
      }

      // Check if chart exists and belongs to workspace
      const chart = await this.chartService.getChartById(id);
      if (!chart || chart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      const chartData = await this.chartService.getChartData(id, {
        limit: limit ? Number(limit) : undefined,
        filters: filters ? JSON.parse(filters as string) : undefined
      });

      res.status(200).json({
        success: true,
        data: chartData.data,
        metadata: chartData.metadata,
        cached: chartData.cached
      });
    } catch (error: any) {
      logger.error('Get chart data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart data',
        errors: [{ code: 'GET_CHART_DATA_FAILED', message: error.message }]
      });
    }
  };

  refreshChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        'chart.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to refresh this chart' }]
        });
        return;
      }

      // Check if chart exists and belongs to workspace
      const chart = await this.chartService.getChartById(id);
      if (!chart || chart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      const result = await this.chartService.refreshChart(id);

      res.status(200).json({
        success: true,
        message: 'Chart refresh initiated successfully',
        refresh_id: result.refresh_id,
        status: result.status
      });
    } catch (error: any) {
      logger.error('Refresh chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh chart',
        errors: [{ code: 'CHART_REFRESH_FAILED', message: error.message }]
      });
    }
  };

  exportChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { format = 'png', width = 800, height = 600, include_data = 'false' } = req.query;

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
        'chart.export'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to export this chart' }]
        });
        return;
      }

      // Check if chart exists and belongs to workspace
      const chart = await this.chartService.getChartById(id);
      if (!chart || chart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      const exportResult = await this.chartService.exportChart(id, {
        format: format as string,
        width: Number(width),
        height: Number(height),
        include_data: include_data === 'true'
      });

      res.status(200).json({
        success: true,
        export: exportResult,
        message: 'Chart export completed successfully'
      });
    } catch (error: any) {
      logger.error('Export chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export chart',
        errors: [{ code: 'CHART_EXPORT_FAILED', message: error.message }]
      });
    }
  };

  getChartQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      // Check permissions - only editors and above can view raw queries
      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'chart.query'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view chart queries' }]
        });
        return;
      }

      // Check if chart exists and belongs to workspace
      const chart = await this.chartService.getChartById(id);
      if (!chart || chart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      const queryInfo = await this.chartService.getChartQuery(id);

      res.status(200).json({
        success: true,
        query: queryInfo
      });
    } catch (error: any) {
      logger.error('Get chart query error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart query',
        errors: [{ code: 'GET_CHART_QUERY_FAILED', message: error.message }]
      });
    }
  };
}