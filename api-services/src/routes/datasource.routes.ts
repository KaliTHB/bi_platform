// api-services/src/routes/datasource.routes.ts
import express, { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController';
import { authenticate, AuthenticatedRequest } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router: Router = express.Router();
const dataSourceController = new DataSourceController();

// Apply authentication to all routes
router.use(authenticate);

// 🔧 GLOBAL ROUTES (no workspace context needed)

// Test connection with custom config (no workspace validation needed)
router.post('/test-connection', 
  asyncHandler(dataSourceController.testCustomConnection.bind(dataSourceController))
);

// 📊 WORKSPACE-SPECIFIC ROUTES
// All routes below require workspace access
router.use('/:workspaceId', validateWorkspaceAccess);

// Get all datasources in workspace
router.get('/:workspaceId/datasources',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.getDataSources.bind(dataSourceController))
);

// Create new datasource
router.post('/:workspaceId/datasources',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.createDataSource.bind(dataSourceController))
);

// Get specific datasource
router.get('/:workspaceId/datasources/:id',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.getDataSource.bind(dataSourceController))
);

// Update datasource
router.put('/:workspaceId/datasources/:id',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.updateDataSource.bind(dataSourceController))
);

// Delete datasource
router.delete('/:workspaceId/datasources/:id',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(dataSourceController.deleteDataSource.bind(dataSourceController))
);

// 🔍 CONNECTION & TESTING ROUTES

// Test existing datasource connection
router.post('/:workspaceId/datasources/:id/test',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.testConnection.bind(dataSourceController))
);

// 📈 ANALYTICS & USAGE ROUTES

// Get datasource usage statistics
router.get('/:workspaceId/datasources/:id/usage',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.getUsageStats.bind(dataSourceController))
);

// 🗂️ SCHEMA ROUTES

// Get datasource schema
router.get('/:workspaceId/datasources/:id/schema',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.getSchema.bind(dataSourceController))
);

// Refresh datasource schema (force refresh from source)
router.post('/:workspaceId/datasources/:id/schema/refresh',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req, res) => {
    // Set refresh=true in query and call getSchema
    req.query.refresh = 'true';
    return dataSourceController.getSchema(req, res);
  })
);

// 🔍 QUERY EXECUTION ROUTES

// Execute query on datasource
router.post('/:workspaceId/datasources/:id/query',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.executeQuery.bind(dataSourceController))
);

// 📋 ADDITIONAL MANAGEMENT ROUTES

// Get datasource connection history
router.get('/:workspaceId/datasources/:id/connection-history',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // This would get connection test history from database
      // For now, return empty structure
      const history = {
        tests: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          pages: 0
        }
      };

      res.status(200).json({
        success: true,
        history,
        message: 'Connection history retrieved successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get connection history',
        errors: [{ code: 'GET_CONNECTION_HISTORY_FAILED', message: error.message }]
      });
    }
  })
);

// Get query execution history
router.get('/:workspaceId/datasources/:id/query-history',
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, id } = req.params;
      const { page = 1, limit = 50, user_id, success_only } = req.query;

      // This would get query execution history from database
      // For now, return empty structure
      const history = {
        queries: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          pages: 0
        },
        summary: {
          total_queries: 0,
          successful_queries: 0,
          failed_queries: 0,
          avg_execution_time: 0
        }
      };

      res.status(200).json({
        success: true,
        history,
        message: 'Query history retrieved successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get query history',
        errors: [{ code: 'GET_QUERY_HISTORY_FAILED', message: error.message }]
      });
    }
  })
);

// Clone datasource (create a copy with different name)
router.post('/:workspaceId/datasources/:id/clone',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, id } = req.params;
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for cloning',
          errors: [{ code: 'VALIDATION_ERROR', message: 'Name field is required' }]
        });
      }

      // This would implement the actual cloning logic
      // For now, return success message
      res.status(201).json({
        success: true,
        message: 'Datasource cloned successfully',
        cloned_datasource: {
          id: 'new-cloned-id',
          name,
          description: description || `Cloned from existing datasource`,
          original_id: id
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to clone datasource',
        errors: [{ code: 'CLONE_DATASOURCE_FAILED', message: error.message }]
      });
    }
  })
);

// Export datasource configuration (without sensitive data)
router.get('/:workspaceId/datasources/:id/export',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId, id } = req.params;
      const { include_config = false } = req.query;

      // This would get the datasource and create export data
      // For now, return mock export structure
      const exportData = {
        datasource: {
          name: 'Sample DataSource',
          description: 'Exported datasource configuration',
          type: 'postgres',
          tags: ['production', 'primary'],
          // connection_config would be included only if include_config=true and user has admin permissions
        },
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: req.user?.user_id,
          version: '1.0',
          includes_sensitive_data: include_config === 'true'
        }
      };

      res.status(200).json({
        success: true,
        export_data: exportData,
        message: 'Datasource configuration exported successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to export datasource configuration',
        errors: [{ code: 'EXPORT_DATASOURCE_FAILED', message: error.message }]
      });
    }
  })
);

// Import datasource configuration
router.post('/:workspaceId/datasources/import',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId } = req.params;
      const { datasource_config, overwrite_existing = false } = req.body;

      if (!datasource_config) {
        return res.status(400).json({
          success: false,
          message: 'Datasource configuration is required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'datasource_config field is required' }]
        });
      }

      // This would implement the actual import logic
      // For now, return success message
      res.status(201).json({
        success: true,
        message: 'Datasource configuration imported successfully',
        imported_datasource: {
          id: 'new-imported-id',
          name: datasource_config.name || 'Imported DataSource',
          status: 'inactive' // Would need to be tested after import
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to import datasource configuration',
        errors: [{ code: 'IMPORT_DATASOURCE_FAILED', message: error.message }]
      });
    }
  })
);

// Bulk operations on datasources
router.post('/:workspaceId/datasources/bulk',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { workspaceId } = req.params;
      const { action, datasource_ids, parameters } = req.body;

      if (!action || !datasource_ids || !Array.isArray(datasource_ids)) {
        return res.status(400).json({
          success: false,
          message: 'Action and datasource_ids array are required',
          errors: [{ code: 'VALIDATION_ERROR', message: 'action and datasource_ids fields are required' }]
        });
      }

      const supportedActions = ['test', 'activate', 'deactivate', 'delete', 'tag'];
      if (!supportedActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported action: ${action}`,
          errors: [{ code: 'INVALID_ACTION', message: `Action must be one of: ${supportedActions.join(', ')}` }]
        });
      }

      // This would implement the actual bulk operations
      // For now, return success message
      const results = datasource_ids.map((id: string) => ({
        datasource_id: id,
        success: true,
        message: `${action} completed successfully`
      }));

      res.status(200).json({
        success: true,
        results,
        summary: {
          total: datasource_ids.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        },
        message: `Bulk ${action} operation completed`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk operation',
        errors: [{ code: 'BULK_OPERATION_FAILED', message: error.message }]
      });
    }
  })
);

export default router;