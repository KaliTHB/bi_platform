// api-services/src/routes/dashboard.routes.ts - FIXED VERSION
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const dashboardController = new DashboardController();

// Apply authentication to all routes
router.use(authenticate);

// ✅ FIXED: Get all dashboards in workspace
router.get('/',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(dashboardController.getDashboards.bind(dashboardController))
);

// ✅ FIXED: Create new dashboard
router.post('/',
  validateWorkspaceAccess,
  requirePermission(['dashboard.create']),
  asyncHandler(dashboardController.createDashboard.bind(dashboardController))
);

// ✅ FIXED: Get specific dashboard by ID
router.get('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(dashboardController.getDashboard.bind(dashboardController))
);

// ✅ FIXED: Update dashboard by ID
router.put('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(dashboardController.updateDashboard.bind(dashboardController))
);

// ✅ FIXED: Delete dashboard by ID
router.delete('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.delete']),
  asyncHandler(dashboardController.deleteDashboard.bind(dashboardController))
);

// ✅ ADDITIONAL ROUTES: Dashboard sharing and analytics
router.post('/:id/share',
  validateWorkspaceAccess,
  requirePermission(['dashboard.share']),
  asyncHandler(dashboardController.shareDashboard.bind(dashboardController))
);

router.put('/:id/sharing',
  validateWorkspaceAccess,
  requirePermission(['dashboard.share']),
  asyncHandler(dashboardController.updateSharingSettings.bind(dashboardController))
);

router.get('/:id/analytics',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(dashboardController.getDashboardAnalytics.bind(dashboardController))
);

// ✅ CACHE MANAGEMENT ROUTES
router.get('/:id/cache/status',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(dashboardController.getCacheStatus.bind(dashboardController))
);

router.post('/:id/cache/refresh',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(dashboardController.refreshCache.bind(dashboardController))
);

router.delete('/:id/cache',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(dashboardController.clearCache.bind(dashboardController))
);

export default router;