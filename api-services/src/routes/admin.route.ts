import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const adminController = new AdminController();

router.use(authenticate);
router.use(validateWorkspaceAccess);

// User Management Routes
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

// Role Management Routes  
router.get('/roles',
  requirePermission(['user.read']),
  asyncHandler(adminController.getRoles.bind(adminController))
);

router.post('/roles',
  requirePermission(['user.update']),
  asyncHandler(adminController.createRole.bind(adminController))
);

// Audit Routes
router.get('/audit-logs',
  requirePermission(['audit.read']),
  asyncHandler(adminController.getAuditLogs.bind(adminController))
);

export default router;