// api-services/src/routes/permissions.routes.ts - CLEANED VERSION
import { Router, Response } from 'express';
import { PermissionService } from '../services/PermissionService';
import { authenticate } from '../middleware/authentication';
import { AuthenticatedRequest } from '../types/express';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// ✅ REMOVED: /my-permissions/:workspaceId endpoint - use /api/user/permissions instead

// System permissions endpoint (for admin use)
router.get('/system-permissions',
  validateWorkspaceAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const permissions = await permissionService.getSystemPermissions();

    res.json({
      success: true,
      data: permissions
    });
  })
);

// Get all available permissions (for admin UI)
router.get('/',
  validateWorkspaceAccess,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const permissions = await permissionService.getAllPermissions();

    res.json({
      success: true,
      data: permissions
    });
  })
);

export default router;