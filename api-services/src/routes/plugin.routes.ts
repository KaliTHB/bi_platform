// api-services/src/routes/plugin.routes.ts
import { Router } from 'express';
import { PluginController } from '../controllers/PluginController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const pluginController = new PluginController();

// Apply authentication to all routes
router.use(authenticate);

// Get all available data source plugins (no workspace validation needed)
router.get('/datasources',
  asyncHandler(pluginController.getDataSourcePlugins.bind(pluginController))
);

// Get all available chart plugins (no workspace validation needed)
router.get('/charts',
  asyncHandler(pluginController.getChartPlugins.bind(pluginController))
);

// Test data source connection with custom config (no workspace validation needed)
router.post('/test-connection',
  asyncHandler(pluginController.testDataSourceConnection.bind(pluginController))
);

// Get plugin configuration for workspace
router.get('/configuration/:type/:name',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(pluginController.getPluginConfiguration.bind(pluginController))
);

// Validate plugin configuration
router.post('/validate/:type/:name',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(pluginController.validatePluginConfiguration.bind(pluginController))
);

export default router;