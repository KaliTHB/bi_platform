// api-services/src/controllers/DatasetController.ts
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

      // Check permissions
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

      // Validate required fields
      if (!datasetData.name || !datasetData.type) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Name and type are required' }]
        });
        return;
      }

      // Check permissions
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

      // Check permissions
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

      // Verify dataset belongs to workspace
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

      // Check if dataset exists and belongs to workspace
      const existingDataset = await this.datasetService.getDatasetById(id);
      if (!existingDataset || existingDataset.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
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

      // Check if dataset exists and belongs to workspace
      const existingDataset = await this.datasetService.getDatasetById(id);
      if (!existingDataset || existingDataset.workspace_id !== workspaceId) {
        res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
        return;
      }

      // Check permissions
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

      // Check if dataset is being used by charts or dashboards
      const isInUse = await this.datasetService.checkDatasetUsage(id);
      if (isInUse.inUse) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete dataset in use',
          errors: [{ 
            code: 'DATASET_IN_USE', 
            message: `Dataset is being used by ${isInUse.chartCount} chart(s) and ${isInUse.dashboardCount} dashboard(s)`
          }]
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

      // Check permissions
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
      const schemaData = req.body;

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

      const updatedSchema = await this.datasetService.updateDatasetSchema(id, schemaData);

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

      // Check permissions
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

      // Check permissions
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
        status: result.status
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
}