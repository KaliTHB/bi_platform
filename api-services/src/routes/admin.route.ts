// api-services/src/routes/admin.route.ts - UPDATED WITH WORKSPACE ADMIN ROUTES
import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { requireAdmin } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const adminController = new AdminController();
const workspaceController = new WorkspaceController();

router.use(authenticate);

// 🏢 WORKSPACE ADMIN ROUTES (require system admin access)
// These routes manage workspaces across the entire system

/**
 * GET /api/admin/workspaces
 * Get all workspaces in the system (system admin only)
 */
router.get('/workspaces', 
  requireAdmin,
  asyncHandler(workspaceController.getAllWorkspacesAdmin.bind(workspaceController))
);

/**
 * POST /api/admin/workspaces
 * Create new workspace (system admin only)
 */
router.post('/workspaces', 
  requireAdmin,
  asyncHandler(workspaceController.createWorkspaceAdmin.bind(workspaceController))
);

/**
 * GET /api/admin/workspaces/:workspaceId
 * Get specific workspace details (system admin only)
 */
router.get('/workspaces/:workspaceId', 
  requireAdmin,
  asyncHandler(workspaceController.getWorkspaceByIdAdmin.bind(workspaceController))
);

/**
 * PUT /api/admin/workspaces/:workspaceId
 * Update workspace (system admin only)
 */
router.put('/workspaces/:workspaceId', 
  requireAdmin,
  asyncHandler(workspaceController.updateWorkspaceAdmin.bind(workspaceController))
);

/**
 * DELETE /api/admin/workspaces/:workspaceId
 * Delete workspace (system admin only)
 */
router.delete('/workspaces/:workspaceId', 
  requireAdmin,
  asyncHandler(workspaceController.deleteWorkspaceAdmin.bind(workspaceController))
);

/**
 * POST /api/admin/workspaces/:workspaceId/activate
 * Activate/deactivate workspace (system admin only)
 */
router.post('/workspaces/:workspaceId/activate', 
  requireAdmin,
  asyncHandler(workspaceController.toggleWorkspaceStatus.bind(workspaceController))
);

// 👥 USER MANAGEMENT ROUTES (require workspace admin access)
router.use(validateWorkspaceAccess);

router.get('/users', 
  requirePermission(['user.read']),
  asyncHandler(adminController.getUsers.bind(adminController))
);

router.post('/users', 
  requirePermission(['user.create']),
  asyncHandler(adminController.createUser.bind(adminController))
);

router.put('/users/:id', 
  requirePermission(['user.update']),
  asyncHandler(adminController.updateUser.bind(adminController))
);

router.delete('/users/:id', 
  requirePermission(['user.delete']),
  asyncHandler(adminController.deleteUser.bind(adminController))
);

// 🔐 ROLE MANAGEMENT ROUTES  
router.get('/roles',
  requirePermission(['user.read']),
  asyncHandler(adminController.getRoles.bind(adminController))
);

router.post('/roles',
  requirePermission(['user.update']),
  asyncHandler(adminController.createRole.bind(adminController))
);

// 📋 AUDIT ROUTES
router.get('/audit-logs',
  requirePermission(['audit.read']),
  asyncHandler(adminController.getAuditLogs.bind(adminController))
);

export default router;