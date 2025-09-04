import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const dashboardController = new DashboardController();

router.use(authenticate);

// Fixed: All middleware now uses standard RequestHandler type
router.get('/',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(dashboardController.getDashboards.bind(dashboardController))
);

router.post('/',
  validateWorkspaceAccess,
  requirePermission(['dashboard.create']),
  asyncHandler(dashboardController.createDashboard.bind(dashboardController))
);

router.get('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(dashboardController.getDashboard.bind(dashboardController))
);

router.put('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(dashboardController.updateDashboard.bind(dashboardController))
);

router.delete('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.delete']),
  asyncHandler(dashboardController.deleteDashboard.bind(dashboardController))
);

export default router;