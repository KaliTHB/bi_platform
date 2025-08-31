// File: api-services/src/routes/datasource.routes.ts
import express from 'express';
import { DataSourceController } from '../controllers/DataSourceController';
import { authenticate, AuthenticatedRequest } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();
const dataSourceController = new DataSourceController();

// Apply authentication to all routes
router.use(authenticate);

// Test connection with custom config (no workspace validation needed)
router.post('/test-connection', asyncHandler(dataSourceController.testCustomConnection.bind(dataSourceController)));

// Routes requiring workspace access
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

// Test datasource connection
router.post('/:workspaceId/datasources/:id/test',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.testConnection.bind(dataSourceController))
);

// Get datasource usage statistics
router.get('/:workspaceId/datasources/:id/usage',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.getUsageStats.bind(dataSourceController))
);

export default router;