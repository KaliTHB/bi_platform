// api-services/src/routes/dashboard.routes.ts
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const dashboardController = new DashboardController();

// Apply authentication to all routes
router.use(authenticate);

// Get all dashboards in workspace
router.get('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboards.bind(dashboardController))
);

// Create new dashboard
router.post('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.createDashboard.bind(dashboardController))
);

// Get specific dashboard
router.get('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboard.bind(dashboardController))
);

// Update dashboard
router.put('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.updateDashboard.bind(dashboardController))
);

// Delete dashboard
router.delete('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(dashboardController.deleteDashboard.bind(dashboardController))
);

// Duplicate dashboard
router.post('/:id/duplicate',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.duplicateDashboard.bind(dashboardController))
);

// Get dashboard charts
router.get('/:id/charts',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboardCharts.bind(dashboardController))
);

// Export dashboard
router.get('/:id/export',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.exportDashboard.bind(dashboardController))
);

// Share dashboard
router.post('/:id/share',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.shareDashboard.bind(dashboardController))
);

// Update dashboard sharing settings
router.put('/:id/share',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.updateSharingSettings.bind(dashboardController))
);

export default router;