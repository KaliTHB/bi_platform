// api-services/src/routes/chart.routes.ts
import { Router } from 'express';
import { ChartController } from '../controllers/ChartController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const chartController = new ChartController();

// Apply authentication to all routes
router.use(authenticate);

// Get all charts in workspace - FIXED: Changed from '/charts' to '/'
router.get('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(chartController.getCharts.bind(chartController))
);

// Create new chart
router.post('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(chartController.createChart.bind(chartController))
);

// Get specific chart
router.get('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(chartController.getChart.bind(chartController))
);

// Update chart
router.put('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(chartController.updateChart.bind(chartController))
);

// Delete chart
router.delete('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(chartController.deleteChart.bind(chartController))
);

// Duplicate chart
router.post('/:id/duplicate',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(chartController.duplicateChart.bind(chartController))
);

// Get chart data
router.get('/:id/data',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(chartController.getChartData.bind(chartController))
);

// Refresh chart data
router.post('/:id/refresh',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(chartController.refreshChart.bind(chartController))
);

// Export chart
router.get('/:id/export',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(chartController.exportChart.bind(chartController))
);

// Get chart query
router.get('/:id/query',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(chartController.getChartQuery.bind(chartController))
);

export default router;