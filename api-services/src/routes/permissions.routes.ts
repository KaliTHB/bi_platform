// api-services/src/routes/permissions.routes.ts - FIXED VERSION WITH PROPER DB HANDLING
import { Router, Response } from 'express';
import { PermissionService } from '../services/PermissionService';
import { authenticate } from '../middleware/authentication';
import { AuthenticatedRequest } from '../types/express';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication and admin checks to all routes
router.use(authenticate);
router.use(validateWorkspaceAccess);

// Helper function to create PermissionService with validation
function createPermissionService(req: AuthenticatedRequest): PermissionService {
  // Validate app.locals.db
  if (!req.app.locals.db) {
    logger.error('❌ req.app.locals.db is undefined', {
      hasLocals: !!req.app.locals,
      localsKeys: Object.keys(req.app.locals),
      service: 'bi-platform-api'
    });
    throw new Error('Database connection not available in app.locals');
  }

  if (typeof req.app.locals.db.query !== 'function') {
    logger.error('❌ Database connection invalid - missing query method', {
      dbType: typeof req.app.locals.db,
      hasQuery: typeof req.app.locals.db.query,
      service: 'bi-platform-api'
    });
    throw new Error('Invalid database connection');
  }

  // Create PermissionService with validated database
  return new PermissionService(req.app.locals.db);
}

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
    try {
      const permissionService = createPermissionService(req);
      const permissions = await permissionService.getAllPermissions();

      res.json({
        success: true,
        data: permissions,
        message: 'System permissions retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error in GET /api/permissions:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve permissions',
        error: 'PERMISSION_FETCH_ERROR'
      });
    }
  })
);

/**
 * GET /api/permissions/system
 * Get system-defined permissions (for admin reference)
 */
router.get('/system',
  requirePermission(['role.read', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const permissionService = createPermissionService(req);
      const permissions = await permissionService.getSystemPermissions();

      res.json({
        success: true,
        data: permissions,
        message: 'System permissions retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error in GET /api/permissions/system:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system permissions',
        error: 'SYSTEM_PERMISSION_FETCH_ERROR'
      });
    }
  })
);

/**
 * GET /api/permissions/roles
 * Get all roles and their permissions (for admin UI)
 */
router.get('/roles',
  requirePermission(['role.read', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const permissionService = createPermissionService(req);
      
      logger.info('Fetching all roles', {
        userId: req.user?.user_id,
        workspaceId: req.user?.workspace_id,
        service: 'bi-platform-api'
      });

      const roles = await permissionService.getAllRoles();

      logger.info('Successfully fetched roles', {
        roleCount: roles.length,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.json({
        success: true,
        data: roles,
        message: 'Roles retrieved successfully'
      });
    } catch (error: any) {
      logger.error('Error in GET /api/permissions/roles:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles',
        error: 'ROLE_FETCH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
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
    try {
      const permissionService = createPermissionService(req);
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
    } catch (error: any) {
      logger.error('Error in POST /api/permissions/roles/create:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: 'ROLE_CREATE_ERROR'
      });
    }
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
    try {
      const permissionService = createPermissionService(req);
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
    } catch (error: any) {
      logger.error('Error in PUT /api/permissions/roles/update:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: 'ROLE_UPDATE_ERROR'
      });
    }
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
    try {
      const permissionService = createPermissionService(req);
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
    } catch (error: any) {
      logger.error('Error in DELETE /api/permissions/roles/delete:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: 'ROLE_DELETE_ERROR'
      });
    }
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
    try {
      const permissionService = createPermissionService(req);
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
        expiresAt
      );

      res.json({
        success: true,
        message: 'Role assigned to user successfully'
      });
    } catch (error: any) {
      logger.error('Error in POST /api/permissions/assign-role:', {
        error: error.message,
        userId: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: 'ROLE_ASSIGN_ERROR'
      });
    }
  })
);

export default router;