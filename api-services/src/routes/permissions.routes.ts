import { Router } from 'express';
import { PermissionService } from '../services/PermissionService';
import { authenticate, AuthenticatedRequest } from '../middleware/authentication';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Get current user's permissions in workspace
router.get('/my-permissions/:workspaceId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { workspaceId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const permissions = await permissionService.getUserEffectivePermissions(
      req.user.user_id,
      workspaceId
    );

    res.json({
      success: true,
      data: {
        permissions,
        user_id: req.user.user_id,
        workspace_id: workspaceId
      }
    });
  })
);

// Get all system permissions (for admin UI)
router.get('/system-permissions',
  validateWorkspaceAccess,
  asyncHandler(async (req, res) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const permissions = await permissionService.getSystemPermissions();

    res.json({
      success: true,
      data: permissions
    });
  })
);

export default router;