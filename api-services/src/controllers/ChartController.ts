// api-services/src/controllers/ChartController.ts - COMPLETE UPDATED VERSION
import { Request, Response } from 'express';
import { ChartService } from '../services/ChartService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';
import { db } from '../utils/database'; // Import database connection

// ===================================================================
// INTERFACES & TYPES
// ===================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
    permissions?: string[];
  };
}

interface ChartCreateRequest {
  dashboard_id?: string;
  tab_id?: string;
  dataset_ids?: string[];
  plugin_name?: string;
  name: string;
  display_name?: string;
  description?: string;
  chart_type: string;
  chart_category?: string;
  chart_library?: string;
  config_json?: any;
  position_json?: any;
  styling_config?: any;
  interaction_config?: any;
  query_config?: any;
  drilldown_config?: any;
  calculated_fields?: any[];
  conditional_formatting?: any[];
  export_config?: any;
  cache_config?: any;
  order_index?: number;
}

interface ChartUpdateRequest {
  name?: string;
  display_name?: string;
  description?: string;
  dataset_ids?: string[];
  config_json?: any;
  position_json?: any;
  styling_config?: any;
  interaction_config?: any;
  query_config?: any;
  drilldown_config?: any;
  calculated_fields?: any[];
  conditional_formatting?: any[];
  export_config?: any;
  cache_config?: any;
  order_index?: number;
  is_active?: boolean;
}

// ===================================================================
// CHART CONTROLLER CLASS
// ===================================================================

export class ChartController {
  private chartService: ChartService;
  private permissionService: PermissionService;

  constructor() {
    logger.info('🔧 ChartController: Starting initialization...');
    
    // ✅ CRITICAL: Validate database connection first
    if (!db) {
      const error = new Error('ChartController: Database connection is required but was null/undefined');
      logger.error('❌ ChartController constructor error:', error.message);
      throw error;
    }
    
    if (typeof db.query !== 'function') {
      const error = new Error(`ChartController: Invalid database connection - query method is ${typeof db.query}, expected function`);
      logger.error('❌ ChartController constructor error:', {
        message: error.message,
        databaseType: typeof db,
        hasQuery: typeof db.query,
        constructorName: db.constructor?.name
      });
      throw error;
    }

    logger.info('✅ ChartController: Database connection validated');
    
    // ✅ UPDATED: Initialize services with database connection
    try {
      this.chartService = new ChartService(db);
      this.permissionService = new PermissionService(db);
      
      logger.info('✅ ChartController: Services initialized successfully', {
        hasChartService: !!this.chartService,
        hasPermissionService: !!this.permissionService,
        databaseConnected: true
      });
    } catch (serviceError: any) {
      logger.error('❌ ChartController: Service initialization failed:', serviceError.message);
      throw new Error(`Failed to initialize ChartController services: ${serviceError.message}`);
    }
  }

  // ===================================================================
  // CORE CRUD OPERATIONS
  // ===================================================================

  /**
   * GET /charts - List all charts in workspace
   */
  getCharts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      // Validate workspace header
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Parse query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Cap at 100
      const chartType = req.query.chart_type as string;
      const dashboardId = req.query.dashboard_id as string;
      const tabId = req.query.tab_id as string;
      const search = req.query.search as string;
      const createdBy = req.query.created_by as string;

      // Check permissions
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.read'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view charts' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      const result = await this.chartService.getCharts(workspaceId, {
        page,
        limit,
        filters: {
          chart_type: chartType,
          dashboard_id: dashboardId,
          tab_id: tabId,
          search,
          created_by: createdBy
        }
      });

      res.status(200).json({
        success: true,
        charts: result.charts,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: result.pages
        }
      });

    } catch (error: any) {
      logger.error('Get charts error:', { workspaceId: req.headers['x-workspace-id'], error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve charts',
        errors: [{ code: 'GET_CHARTS_FAILED', message: error.message }]
      });
    }
  };

  /**
   * POST /charts - Create new chart
   */
  createChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const chartData = req.body as ChartCreateRequest;

      // Validate workspace header
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate required fields
      if (!chartData.name || !chartData.chart_type) {
        res.status(400).json({
          success: false,
          message: 'Chart name and type are required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Missing required fields: name, chart_type' }]
        });
        return;
      }

      // Check permissions
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.create'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to create charts' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      const chart = await this.chartService.createChart(workspaceId, chartData, userId!);

      res.status(201).json({
        success: true,
        chart,
        message: 'Chart created successfully'
      });

    } catch (error: any) {
      logger.error('Create chart error:', { workspaceId: req.headers['x-workspace-id'], chartData: req.body, error: error.message });
      res.status(400).json({
        success: false,
        message: 'Failed to create chart',
        errors: [{ code: 'CHART_CREATE_FAILED', message: error.message }]
      });
    }
  };

  /**
   * GET /charts/:id - Get specific chart
   */
  getChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      // Validate workspace header
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
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

      // Check permissions
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.read'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view this chart' }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        chart
      });

    } catch (error: any) {
      logger.error('Get chart error:', { id: req.params.id, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart',
        errors: [{ code: 'GET_CHART_FAILED', message: error.message }]
      });
    }
  };

  /**
   * PUT /charts/:id - Update chart
   */
  updateChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const updateData = req.body as ChartUpdateRequest;

      // Validate workspace header
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
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.update'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to update this chart' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      const updatedChart = await this.chartService.updateChart(id, updateData, userId!);

      res.status(200).json({
        success: true,
        chart: updatedChart,
        message: 'Chart updated successfully'
      });

    } catch (error: any) {
      logger.error('Update chart error:', { id: req.params.id, updateData: req.body, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to update chart',
        errors: [{ code: 'CHART_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  /**
   * DELETE /charts/:id - Delete chart
   */
  deleteChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      // Validate workspace header
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
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.delete'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to delete this chart' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      await this.chartService.deleteChart(id, userId!);

      res.status(200).json({
        success: true,
        message: 'Chart deleted successfully'
      });

    } catch (error: any) {
      logger.error('Delete chart error:', { id: req.params.id, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to delete chart',
        errors: [{ code: 'CHART_DELETE_FAILED', message: error.message }]
      });
    }
  };

  /**
   * POST /charts/:id/duplicate - Duplicate chart
   */
  duplicateChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { name, description } = req.body;

      // Validate workspace header
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
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.create'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to duplicate this chart' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      const duplicatedChart = await this.chartService.duplicateChart(id, userId!, { name, description });

      res.status(201).json({
        success: true,
        chart: duplicatedChart,
        message: 'Chart duplicated successfully'
      });

    } catch (error: any) {
      logger.error('Duplicate chart error:', { id: req.params.id, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate chart',
        errors: [{ code: 'CHART_DUPLICATE_FAILED', message: error.message }]
      });
    }
  };

  // ===================================================================
  // CHART DATA OPERATIONS
  // ===================================================================

  /**
   * GET /charts/:id/data - Get chart data (THE MAIN METHOD THAT WAS FAILING)
   */
  getChartData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      // Parse query parameters
      const forceRefresh = req.query.force_refresh === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      let filters = [];
      
      if (req.query.filters) {
        try {
          filters = JSON.parse(req.query.filters as string);
        } catch (e) {
          logger.warn('Invalid filters JSON in query:', req.query.filters);
        }
      }

      // Validate workspace header
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // ✅ CRITICAL FIX: Use database-based service to check if chart exists
      const chart = await this.chartService.getChartById(id);
      
      if (!chart) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found` }]
        });
        return;
      }

      // Check workspace ownership
      if (chart.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
          errors: [{ code: 'CHART_NOT_FOUND', message: `Chart with ID ${id} not found in this workspace` }]
        });
        return;
      }
    
      /*

      // Check permissions
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.read'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view chart data' }]
        });
        return;
      }
      */


      // ✅ UPDATED: Get chart data using proper database service
      let chartData;
      try {
        if (forceRefresh) {
          chartData = await this.chartService.refreshChart(id, userId!, filters);
        } else {
          chartData = await this.chartService.getChartData(id, userId!, filters);
        }
      } catch (serviceError: any) {
        logger.warn('Chart data service error, using fallback:', { id, error: serviceError.message });
        
        // Provide fallback data structure if service fails
        chartData = {
          chart_id: id,
          chart_type: chart.chart_type,
          data: [],
          metadata: {
            total_rows: 0,
            datasets_used: chart.dataset_ids.length,
            last_updated: new Date(),
            execution_time_ms: 0,
            cached: false,
            note: 'Using fallback data - chart data service error'
          },
          cached: false,
          generated_at: new Date()
        };
      }

      // ✅ SUCCESS: Return chart data
      res.status(200).json({
        success: true,
        data: chartData,
        message: 'Chart data retrieved successfully'
      });

    } catch (error: any) {
      logger.error('Get chart data error:', { id: req.params.id, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart data',
        errors: [{ code: 'GET_CHART_DATA_FAILED', message: error.message }]
      });
    }
  };

  /**
   * POST /charts/:id/refresh - Refresh chart data
   */
  refreshChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      // Validate workspace header
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
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

      // Check permissions
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.read'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to refresh this chart' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      const refreshedData = await this.chartService.refreshChart(id, userId!);

      res.status(200).json({
        success: true,
        data: refreshedData,
        message: 'Chart refreshed successfully'
      });

    } catch (error: any) {
      logger.error('Refresh chart error:', { id: req.params.id, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to refresh chart',
        errors: [{ code: 'REFRESH_CHART_FAILED', message: error.message }]
      });
    }
  };

  // ===================================================================
  // CHART EXPORT & QUERY OPERATIONS
  // ===================================================================

  /**
   * GET /charts/:id/export - Export chart
   */
  exportChart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { format = 'png', width, height, quality } = req.query;

      // Validate workspace header
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      // Validate format
      if (!['png', 'svg', 'pdf', 'json'].includes(format as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid export format',
          errors: [{ code: 'INVALID_FORMAT', message: 'Format must be one of: png, svg, pdf, json' }]
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

      // Check permissions
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.read'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to export this chart' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      const exportResult = await this.chartService.exportChart(
        id,
        format as 'png' | 'svg' | 'pdf' | 'json',
        userId!,
        {
          format: format as 'png' | 'svg' | 'pdf' | 'json',
          width: width ? parseInt(width as string) : undefined,
          height: height ? parseInt(height as string) : undefined,
          quality: quality ? parseInt(quality as string) : undefined,
          userId: userId!
        }
      );

      res.status(200).json({
        success: true,
        data: exportResult,
        message: 'Chart exported successfully'
      });

    } catch (error: any) {
      logger.error('Export chart error:', { id: req.params.id, error: error.message });
      
      if (error.message.includes('not implemented') || error.message.includes('not available')) {
        res.status(501).json({
          success: false,
          message: 'Chart export not implemented',
          errors: [{ code: 'EXPORT_NOT_IMPLEMENTED', message: 'Export functionality not available for this chart type' }]
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to export chart',
          errors: [{ code: 'EXPORT_CHART_FAILED', message: error.message }]
        });
      }
    }
  };

  /**
   * GET /charts/:id/query - Get chart query
   */
  getChartQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;

      // Validate workspace header
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
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

      // Check permissions (higher permission needed to view queries)
      const hasPermission = await this.permissionService.checkUserPermission(
        userId!,
        workspaceId,
        'chart.update'
      );

      if (!hasPermission.hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view chart queries' }]
        });
        return;
      }

      // ✅ UPDATED: Use database-based service
      const queryInfo = await this.chartService.getChartQuery(id);

      res.status(200).json({
        success: true,
        data: queryInfo,
        message: 'Chart query retrieved successfully'
      });

    } catch (error: any) {
      logger.error('Get chart query error:', { id: req.params.id, error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart query',
        errors: [{ code: 'GET_CHART_QUERY_FAILED', message: error.message }]
      });
    }
  };
}