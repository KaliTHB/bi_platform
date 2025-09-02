// api-services/src/controllers/DatasetController.ts - COMPLETE WITH ALL MISSING METHODS
import { Request, Response } from 'express';
import { DatasetService } from '../services/DatasetService';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

interface DatasetCreateRequest {
  name: string;
  display_name?: string;
  description?: string;
  type: 'sql' | 'file' | 'transformation' | 'api';
  datasource_id?: string;
  connection_config?: any;
  query?: string;
  file_path?: string;
  transformation_config?: any;
  parent_dataset_ids?: string[];
  is_public?: boolean;
  cache_ttl_minutes?: number;
  tags?: string[];
}

interface DatasetUpdateRequest {
  name?: string;
  display_name?: string;
  description?: string;
  query?: string;
  transformation_config?: any;
  is_public?: boolean;
  cache_ttl_minutes?: number;
  tags?: string[];
}

export class DatasetController {
  private datasetService: DatasetService;
  private permissionService: PermissionService;

  constructor() {
    this.datasetService = new DatasetService();
    this.permissionService = new PermissionService();
  }

  // ✅ EXISTING METHODS (Already Implemented)

  getDatasets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { 
        page = 1, 
        limit = 20, 
        search, 
        type, 
        datasource_id,
        created_by,
        include_schema 
      } = req.query;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view datasets' }]
        });
        return;
      }

      const filters = {
        type: type as string,
        datasource_id: datasource_id as string,
        created_by: created_by as string,
        search: search as string
      };

      const result = await this.datasetService.getDatasets(workspaceId, {
        page: Number(page),
        limit: Number(limit),
        filters,
        include_schema: include_schema === 'true'
      });

      res.status(200).json({
        success: true,
        datasets: result.datasets,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error: any) {
      logger.error('Get datasets error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve datasets',
        errors: [{ code: 'GET_DATASETS_FAILED', message: error.message }]
      });
    }
  };

  createDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const datasetData = req.body as DatasetCreateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      if (!datasetData.name || !datasetData.type) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Name and type are required' }]
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.create'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to create datasets' }]
        });
        return;
      }

      const dataset = await this.datasetService.createDataset(workspaceId, {
        ...datasetData,
        workspace_id: workspaceId,
        created_by: userId!
      });

      res.status(201).json({
        success: true,
        dataset,
        message: 'Dataset created successfully'
      });
    } catch (error: any) {
      logger.error('Create dataset error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to create dataset',
        errors: [{ code: 'DATASET_CREATE_FAILED', message: error.message }]
      });
    }
  };

  getDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { include_schema = 'false' } = req.query;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view this dataset' }]
        });
        return;
      }

      const dataset = await this.datasetService.getDatasetById(id, include_schema === 'true');

      if (!dataset) {
        res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
        return;
      }

      if (dataset.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found in this workspace` }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        dataset
      });
    } catch (error: any) {
      logger.error('Get dataset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dataset',
        errors: [{ code: 'GET_DATASET_FAILED', message: error.message }]
      });
    }
  };

  updateDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const updateData = req.body as DatasetUpdateRequest;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      const existingDataset = await this.datasetService.getDatasetById(id);
      if (!existingDataset || existingDataset.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.update'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to update this dataset' }]
        });
        return;
      }

      const updatedDataset = await this.datasetService.updateDataset(id, updateData);

      res.status(200).json({
        success: true,
        dataset: updatedDataset,
        message: 'Dataset updated successfully'
      });
    } catch (error: any) {
      logger.error('Update dataset error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update dataset',
        errors: [{ code: 'DATASET_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  deleteDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const existingDataset = await this.datasetService.getDatasetById(id);
      if (!existingDataset || existingDataset.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.delete'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to delete this dataset' }]
        });
        return;
      }

      await this.datasetService.deleteDataset(id);

      res.status(200).json({
        success: true,
        message: 'Dataset deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete dataset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete dataset',
        errors: [{ code: 'DATASET_DELETE_FAILED', message: error.message }]
      });
    }
  };

  getDatasetSchema = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to view dataset schema' }]
        });
        return;
      }

      const schema = await this.datasetService.getDatasetSchema(id);

      if (!schema) {
        res.status(404).json({
          success: false,
          message: 'Dataset schema not found',
          errors: [{ code: 'SCHEMA_NOT_FOUND', message: `Schema for dataset ${id} not found` }]
        });
        return;
      }

      res.status(200).json({
        success: true,
        schema
      });
    } catch (error: any) {
      logger.error('Get dataset schema error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dataset schema',
        errors: [{ code: 'GET_SCHEMA_FAILED', message: error.message }]
      });
    }
  };

  updateDatasetSchema = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { schema } = req.body;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      if (!schema) {
        res.status(400).json({
          success: false,
          message: 'Schema is required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Schema data is required' }]
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.update'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to update dataset schema' }]
        });
        return;
      }

      const updatedSchema = await this.datasetService.updateDatasetSchema(id, schema);

      res.status(200).json({
        success: true,
        schema: updatedSchema,
        message: 'Dataset schema updated successfully'
      });
    } catch (error: any) {
      logger.error('Update dataset schema error:', error);
      res.status(400).json({
        success: false,
        message: 'Failed to update dataset schema',
        errors: [{ code: 'UPDATE_SCHEMA_FAILED', message: error.message }]
      });
    }
  };

  getDatasetPreview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = req.user?.user_id;
      const { limit = 100 } = req.query;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'Workspace ID header is required' }]
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to preview this dataset' }]
        });
        return;
      }

      const preview = await this.datasetService.getDatasetPreview(id, Number(limit));

      res.status(200).json({
        success: true,
        preview
      });
    } catch (error: any) {
      logger.error('Get dataset preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dataset preview',
        errors: [{ code: 'GET_PREVIEW_FAILED', message: error.message }]
      });
    }
  };

  refreshDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.update'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{ code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to refresh this dataset' }]
        });
        return;
      }

      const result = await this.datasetService.refreshDataset(id);

      res.status(200).json({
        success: true,
        message: 'Dataset refresh initiated successfully',
        refresh_id: result.refresh_id,
        status: result.status,
        started_at: result.started_at,
        estimated_completion_time: result.estimated_completion_time
      });
    } catch (error: any) {
      logger.error('Refresh dataset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh dataset',
        errors: [{ code: 'DATASET_REFRESH_FAILED', message: error.message }]
      });
    }
  };

  // 🚀 NEW METHODS - MISSING CRITICAL CACHE & FILTER OPERATIONS

  getDatasetData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { refresh, filters, limit, offset, columns, sortBy, sortDirection } = req.query;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required'
        });
        return;
      }

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const params = {
        refresh: refresh === 'true',
        filters: filters ? JSON.parse(filters as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        columns: columns ? (columns as string).split(',') : undefined,
        sortBy: sortBy as string,
        sortDirection: sortDirection as 'asc' | 'desc'
      };

      const data = await this.datasetService.getDatasetData(id, params);

      res.json({
        success: true,
        data: data.data,
        columns: data.columns,
        metadata: data.metadata,
        cached: data.cached,
        message: 'Dataset data retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get dataset data error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dataset data'
      });
    }
  };

  queryDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const queryOptions = req.body;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const result = await this.datasetService.queryDataset(id, queryOptions);

      res.json({
        success: true,
        data: result.data,
        columns: result.columns,
        total_rows: result.total_rows,
        execution_time: result.execution_time,
        cached: result.cached,
        message: 'Dataset queried successfully'
      });
    } catch (error: any) {
      logger.error('Query dataset error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to query dataset'
      });
    }
  };

  validateDatasetQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { query } = req.body;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const validation = await this.datasetService.validateDatasetQuery(id, query);

      res.json({
        success: true,
        is_valid: validation.is_valid,
        errors: validation.errors,
        warnings: validation.warnings,
        estimated_execution_time: validation.estimated_execution_time,
        estimated_row_count: validation.estimated_row_count,
        message: 'Query validation completed'
      });
    } catch (error: any) {
      logger.error('Validate dataset query error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to validate query'
      });
    }
  };

  testDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const testResult = await this.datasetService.testDataset(id);

      res.json({
        success: true,
        is_valid: testResult.is_valid,
        preview: testResult.preview,
        columns: testResult.columns,
        execution_time: testResult.execution_time,
        error: testResult.error,
        message: 'Dataset test completed'
      });
    } catch (error: any) {
      logger.error('Test dataset error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to test dataset'
      });
    }
  };

  getDatasetStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const stats = await this.datasetService.getDatasetStats(id);

      res.json({
        success: true,
        stats,
        message: 'Dataset statistics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get dataset stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dataset statistics'
      });
    }
  };

  clearDatasetCache = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.update'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const result = await this.datasetService.clearDatasetCache(id);

      res.json({
        success: true,
        cache_cleared: result.cache_cleared,
        cache_size_cleared_bytes: result.cache_size_cleared_bytes,
        affected_queries: result.affected_queries,
        message: 'Dataset cache cleared successfully'
      });
    } catch (error: any) {
      logger.error('Clear dataset cache error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to clear dataset cache'
      });
    }
  };

  getDatasetCacheStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const status = await this.datasetService.getDatasetCacheStatus(id);

      res.json({
        success: true,
        cache_status: status,
        message: 'Dataset cache status retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get dataset cache status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get cache status'
      });
    }
  };

  // 🔧 ADDITIONAL UTILITY METHODS

  getDatasetUsage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const usage = await this.datasetService.getDatasetUsage(id);

      res.json({
        success: true,
        usage,
        message: 'Dataset usage information retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get dataset usage error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dataset usage'
      });
    }
  };

  exportDataset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const exportOptions = req.body;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const exportResult = await this.datasetService.exportDataset(id, exportOptions);

      res.json({
        success: true,
        export: exportResult,
        message: 'Dataset export initiated successfully'
      });
    } catch (error: any) {
      logger.error('Export dataset error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export dataset'
      });
    }
  };

  getDatasetHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit, offset, action_type } = req.query;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const params = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        action_type: action_type as string
      };

      const history = await this.datasetService.getDatasetHistory(id, params);

      res.json({
        success: true,
        history: history.history,
        total: history.total,
        message: 'Dataset history retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get dataset history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dataset history'
      });
    }
  };

  getDatasetPerformanceMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { start_date, end_date, granularity } = req.query;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.read'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const params = {
        start_date: start_date as string,
        end_date: end_date as string,
        granularity: granularity as 'hour' | 'day' | 'week'
      };

      const metrics = await this.datasetService.getDatasetPerformanceMetrics(id, params);

      res.json({
        success: true,
        metrics,
        message: 'Dataset performance metrics retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get dataset performance metrics error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get performance metrics'
      });
    }
  };

  // 📊 ADVANCED OPERATIONS (Placeholder methods for advanced features)

  executeQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { query, parameters } = req.body;
      const userId = req.user?.user_id;
      const workspaceId = req.headers['x-workspace-id'] as string;

      const hasPermission = await this.permissionService.hasPermission(
        userId!,
        workspaceId,
        'dataset.execute'
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      const result = await this.datasetService.executeCustomQuery(id, query, parameters);

      res.json({
        success: true,
        data: result.data,
        columns: result.columns,
        execution_time: result.execution_time,
        message: 'Query executed successfully'
      });
    } catch (error: any) {
      logger.error('Execute query error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to execute query'
      });
    }
  };

  createSnapshot = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const userId = req.user?.user_id;

      const snapshot = await this.datasetService.createSnapshot(id, { name, description, userId: userId! });

      res.json({
        success: true,
        snapshot,
        message: 'Dataset snapshot created successfully'
      });
    } catch (error: any) {
      logger.error('Create snapshot error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create snapshot'
      });
    }
  };

  getSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const snapshots = await this.datasetService.getSnapshots(id);

      res.json({
        success: true,
        snapshots,
        message: 'Dataset snapshots retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get snapshots error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get snapshots'
      });
    }
  };

  restoreFromSnapshot = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, snapshotId } = req.params;
      const userId = req.user?.user_id;

      await this.datasetService.restoreFromSnapshot(id, snapshotId, userId!);

      res.json({
        success: true,
        message: 'Dataset restored from snapshot successfully'
      });
    } catch (error: any) {
      logger.error('Restore from snapshot error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to restore from snapshot'
      });
    }
  };

  applyTransformation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const transformation = req.body;
      const userId = req.user?.user_id;

      const result = await this.datasetService.applyTransformation(id, transformation, userId!);

      res.json({
        success: true,
        transformation: result,
        message: 'Transformation applied successfully'
      });
    } catch (error: any) {
      logger.error('Apply transformation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to apply transformation'
      });
    }
  };

  getTransformationHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const history = await this.datasetService.getTransformationHistory(id);

      res.json({
        success: true,
        transformations: history,
        message: 'Transformation history retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get transformation history error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get transformation history'
      });
    }
  };

  revertTransformation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, transformationId } = req.params;
      const userId = req.user?.user_id;

      await this.datasetService.revertTransformation(id, transformationId, userId!);

      res.json({
        success: true,
        message: 'Transformation reverted successfully'
      });
    } catch (error: any) {
      logger.error('Revert transformation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to revert transformation'
      });
    }
  };

  getDataProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const profile = await this.datasetService.getDataProfile(id);

      res.json({
        success: true,
        profile,
        message: 'Data profile retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get data profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get data profile'
      });
    }
  };

  getColumnAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, columnName } = req.params;

      const analysis = await this.datasetService.getColumnAnalysis(id, columnName);

      res.json({
        success: true,
        analysis,
        message: 'Column analysis retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get column analysis error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get column analysis'
      });
    }
  };

  getDataQualityReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const report = await this.datasetService.getDataQualityReport(id);

      res.json({
        success: true,
        quality_report: report,
        message: 'Data quality report retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get data quality report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get data quality report'
      });
    }
  };

  // 🚨 ALERT MANAGEMENT METHODS (Placeholder implementations)

  getDatasetAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const alerts = await this.datasetService.getDatasetAlerts(id);

      res.json({
        success: true,
        alerts,
        message: 'Dataset alerts retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Get dataset alerts error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dataset alerts'
      });
    }
  };

  createDatasetAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const alertData = req.body;
      const userId = req.user?.user_id;

      const alert = await this.datasetService.createDatasetAlert(id, alertData, userId!);

      res.json({
        success: true,
        alert,
        message: 'Dataset alert created successfully'
      });
    } catch (error: any) {
      logger.error('Create dataset alert error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create dataset alert'
      });
    }
  };

  updateDatasetAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, alertId } = req.params;
      const updateData = req.body;

      const alert = await this.datasetService.updateDatasetAlert(id, alertId, updateData);

      res.json({
        success: true,
        alert,
        message: 'Dataset alert updated successfully'
      });
    } catch (error: any) {
      logger.error('Update dataset alert error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update dataset alert'
      });
    }
  };

  deleteDatasetAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, alertId } = req.params;

      await this.datasetService.deleteDatasetAlert(id, alertId);

      res.json({
        success: true,
        message: 'Dataset alert deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete dataset alert error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete dataset alert'
      });
    }
  };
}