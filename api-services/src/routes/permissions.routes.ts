// api-services/src/routes/permissions.routes.ts - FIXED
import { Router, Response } from 'express';
import { PermissionService } from '../services/PermissionService';
import { authenticate } from '../middleware/authentication';
import { AuthenticatedRequest } from '../types/express'; // ✅ Import the correct type
import { validateWorkspaceAccess } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// ✅ FIXED: Now the route handler expects AuthenticatedRequest with REQUIRED user
router.get('/my-permissions/:workspaceId',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { workspaceId } = req.params;
    
    // ✅ No need for user check anymore - TypeScript guarantees user exists
    // if (!req.user) {
    //   return res.status(401).json({ success: false, message: 'Not authenticated' });
    // }

    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const permissions = await permissionService.getUserEffectivePermissions(
      req.user.user_id, // ✅ TypeScript knows this exists
      workspaceId
    );

    res.json({
      success: true,
      data: {
        permissions,
        user_id: req.user.user_id, // ✅ No more undefined errors
        workspace_id: workspaceId
      }
    });
  })
);

// ✅ FIXED: Use proper types for all routes
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

export default router;