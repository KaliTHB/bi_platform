// api-services/src/routes/permissions.routes.ts - PAYLOAD-BASED VERSION
import { Router, Response } from 'express';
import { PermissionService } from '../services/PermissionService';
import { authenticate } from '../middleware/authentication';
import { AuthenticatedRequest } from '../types/express';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Apply authentication and admin checks to all routes
router.use(authenticate);
router.use(validateWorkspaceAccess);

// ==================== ADMIN PERMISSION MANAGEMENT ====================
// These routes are for ADMINS to manage the permission system
// User permissions are handled via /api/auth/permissions

/**
 * GET /api/permissions
 * Get all available permissions in the system (for admin UI)
 */
router.get('/',
  requirePermission(['role.read', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const permissions = await permissionService.getAllPermissions();

    res.json({
      success: true,
      data: permissions,
      message: 'System permissions retrieved successfully'
    });
  })
);

/**
 * GET /api/permissions/system
 * Get system-defined permissions (for admin reference)
 */
router.get('/system',
  requirePermission(['role.read', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const permissions = await permissionService.getSystemPermissions();

    res.json({
      success: true,
      data: permissions,
      message: 'System permissions retrieved successfully'
    });
  })
);

/**
 * GET /api/permissions/roles
 * Get all roles and their permissions (for admin UI)
 */
router.get('/roles',
  requirePermission(['role.read', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const roles = await permissionService.getAllRoles();

    res.json({
      success: true,
      data: roles,
      message: 'Roles retrieved successfully'
    });
  })
);

// ==================== ROLE MANAGEMENT (PAYLOAD-BASED) ====================

/**
 * POST /api/permissions/roles/create
 * Create a new custom role (admin only)
 * Payload: { name, description, permissions }
 */
router.post('/roles/create',
  requirePermission(['role.create', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { name, description, permissions } = req.body;
    const workspaceId = req.user?.workspace_id;
    const createdBy = req.user?.user_id;

    // Validate required fields
    if (!name || !permissions || !Array.isArray(permissions)) {
      res.status(400).json({
        success: false,
        message: 'Name and permissions array are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    if (!workspaceId || !createdBy) {
      res.status(400).json({
        success: false,
        message: 'Workspace context required',
        error: 'MISSING_WORKSPACE_CONTEXT'
      });
      return;
    }

    const role = await permissionService.createCustomRole(
      workspaceId,
      name,
      description,
      permissions,
      createdBy
    );

    res.status(201).json({
      success: true,
      data: role,
      message: 'Custom role created successfully'
    });
  })
);

/**
 * PUT /api/permissions/roles/update
 * Update a custom role (admin only)
 * Payload: { roleId, name?, description?, permissions? }
 */
router.put('/roles/update',
  requirePermission(['role.update', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { roleId, name, description, permissions } = req.body;

    // Validate required fields
    if (!roleId) {
      res.status(400).json({
        success: false,
        message: 'Role ID is required',
        error: 'MISSING_ROLE_ID'
      });
      return;
    }

    const updatedRole = await permissionService.updateCustomRole(
      roleId,
      name,
      description,
      permissions
    );

    res.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully'
    });
  })
);

/**
 * DELETE /api/permissions/roles/delete
 * Delete a custom role (admin only)
 * Payload: { roleId }
 */
router.delete('/roles/delete',
  requirePermission(['role.delete', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { roleId } = req.body;

    // Validate required fields
    if (!roleId) {
      res.status(400).json({
        success: false,
        message: 'Role ID is required',
        error: 'MISSING_ROLE_ID'
      });
      return;
    }

    await permissionService.deleteCustomRole(roleId);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  })
);

// ==================== USER ROLE ASSIGNMENT (PAYLOAD-BASED) ====================

/**
 * POST /api/permissions/assign-role
 * Assign role to user (admin only)
 * Payload: { userId, roleId, expiresAt? }
 */
router.post('/assign-role',
  requirePermission(['role.assign', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { userId, roleId, expiresAt } = req.body;
    const workspaceId = req.user?.workspace_id;
    const assignedBy = req.user?.user_id;

    // Validate required fields
    if (!userId || !roleId) {
      res.status(400).json({
        success: false,
        message: 'User ID and Role ID are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    if (!workspaceId || !assignedBy) {
      res.status(400).json({
        success: false,
        message: 'Workspace context required',
        error: 'MISSING_WORKSPACE_CONTEXT'
      });
      return;
    }

    await permissionService.assignRoleToUser(
      userId,
      workspaceId,
      roleId,
      assignedBy,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.json({
      success: true,
      message: 'Role assigned to user successfully',
      data: {
        userId,
        roleId,
        workspaceId,
        assignedBy,
        expiresAt: expiresAt || null
      }
    });
  })
);

/**
 * POST /api/permissions/remove-role
 * Remove role from user (admin only)
 * Payload: { userId, roleId }
 */
router.post('/remove-role',
  requirePermission(['role.assign', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { userId, roleId } = req.body;
    const workspaceId = req.user?.workspace_id;

    // Validate required fields
    if (!userId || !roleId) {
      res.status(400).json({
        success: false,
        message: 'User ID and Role ID are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: 'Workspace context required',
        error: 'MISSING_WORKSPACE_CONTEXT'
      });
      return;
    }

    await permissionService.removeRoleFromUser(userId, workspaceId, roleId);

    res.json({
      success: true,
      message: 'Role removed from user successfully',
      data: {
        userId,
        roleId,
        workspaceId
      }
    });
  })
);

// ==================== BULK OPERATIONS (PAYLOAD-BASED) ====================

/**
 * POST /api/permissions/bulk-assign
 * Bulk assign role to multiple users (admin only)
 * Payload: { userIds: string[], roleId: string, expiresAt? }
 */
router.post('/bulk-assign',
  requirePermission(['role.assign', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { userIds, roleId, expiresAt } = req.body;
    const workspaceId = req.user?.workspace_id;
    const assignedBy = req.user?.user_id;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !roleId) {
      res.status(400).json({
        success: false,
        message: 'User IDs array and Role ID are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    if (!workspaceId || !assignedBy) {
      res.status(400).json({
        success: false,
        message: 'Workspace context required',
        error: 'MISSING_WORKSPACE_CONTEXT'
      });
      return;
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each user assignment
    for (const userId of userIds) {
      try {
        await permissionService.assignRoleToUser(
          userId,
          workspaceId,
          roleId,
          assignedBy,
          expiresAt ? new Date(expiresAt) : undefined
        );
        results.successful.push(userId);
      } catch (error) {
        results.failed.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });
  })
);

/**
 * POST /api/permissions/bulk-remove
 * Bulk remove role from multiple users (admin only)
 * Payload: { userIds: string[], roleId: string }
 */
router.post('/bulk-remove',
  requirePermission(['role.assign', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { userIds, roleId } = req.body;
    const workspaceId = req.user?.workspace_id;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !roleId) {
      res.status(400).json({
        success: false,
        message: 'User IDs array and Role ID are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: 'Workspace context required',
        error: 'MISSING_WORKSPACE_CONTEXT'
      });
      return;
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each user role removal
    for (const userId of userIds) {
      try {
        await permissionService.removeRoleFromUser(userId, workspaceId, roleId);
        results.successful.push(userId);
      } catch (error) {
        results.failed.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk removal completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });
  })
);

// ==================== QUERY ENDPOINTS (PAYLOAD-BASED) ====================

/**
 * POST /api/permissions/check-user-permissions
 * Check specific permissions for a user (admin only)
 * Payload: { userId, permissions: string[] }
 */
router.post('/check-user-permissions',
  requirePermission(['admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const permissionService = new PermissionService(req.app.locals.db, req.app.locals.cache);
    const { userId, permissions } = req.body;
    const workspaceId = req.user?.workspace_id;

    // Validate required fields
    if (!userId || !permissions || !Array.isArray(permissions)) {
      res.status(400).json({
        success: false,
        message: 'User ID and permissions array are required',
        error: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: 'Workspace context required',
        error: 'MISSING_WORKSPACE_CONTEXT'
      });
      return;
    }

    const userPermissions = await permissionService.getUserEffectivePermissions(userId, workspaceId);
    const permissionChecks = permissions.map(permission => ({
      permission,
      granted: userPermissions.includes(permission)
    }));

    res.json({
      success: true,
      data: {
        userId,
        workspaceId,
        permissionChecks,
        allGranted: permissionChecks.every(check => check.granted)
      },
      message: 'Permission check completed'
    });
  })
);

export default router;