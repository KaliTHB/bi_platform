// api-services/src/middleware/workspace.ts - LIVE DATABASE VERSION (NO MOCK DATA)
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthService } from '../services/AuthService';
import { WorkspaceService } from '../services/WorkspaceService';
import { PermissionService } from '../services/PermissionService';
import { db } from '../utils/database';

// Define types
interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    username?: string;
    workspace_id?: string;
    workspace_slug?: string;
    workspace_role?: string;
    is_admin?: boolean;
    role_level?: number;
  };
  workspace?: any;
}

// Create service instances for database operations
const authService = new AuthService(db);
const workspaceService = new WorkspaceService(db);
const permissionService = new PermissionService(db, undefined);

/**
 * Check if user has access to workspace using real database query
 */
async function hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  try {
    logger.debug('Checking workspace access', {
      userId,
      workspaceId,
      service: 'bi-platform-api'
    });

    // Use WorkspaceService to check if user has access to this workspace
    const workspace = await workspaceService.getWorkspaceById(workspaceId, userId);
    
    if (workspace) {
      logger.debug('User has access to workspace', {
        userId,
        workspaceId,
        workspaceName: workspace.name,
        userRole: workspace.user_role
      });
      return true;
    }

    logger.debug('User does not have access to workspace', {
      userId,
      workspaceId
    });
    return false;

  } catch (error: any) {
    logger.error('Error checking workspace access:', {
      userId,
      workspaceId,
      error: error.message,
      service: 'bi-platform-api'
    });
    return false;
  }
}

/**
 * Get workspace information from database
 */
async function getWorkspaceFromDatabase(workspaceId: string, userId?: string): Promise<any | null> {
  try {
    logger.debug('Getting workspace from database', {
      workspaceId,
      userId,
      service: 'bi-platform-api'
    });

    let workspace = null;

    if (userId) {
      // Try to get workspace with user context first
      workspace = await workspaceService.getWorkspaceById(workspaceId, userId);
    }

    if (!workspace) {
      // Try with AuthService as fallback
      workspace = await authService.getWorkspaceById(workspaceId, userId);
    }

    if (!workspace) {
      // Final fallback: direct database query
      const result = await db.query(`
        SELECT 
          id, name, slug, display_name, description, 
          logo_url, is_active, created_at, updated_at
        FROM workspaces 
        WHERE (id = $1 OR slug = $1) AND is_active = true
        LIMIT 1
      `, [workspaceId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        workspace = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          display_name: row.display_name || row.name,
          description: row.description,
          logo_url: row.logo_url,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      }
    }

    if (workspace) {
      logger.debug('Workspace found in database', {
        workspaceId,
        workspaceName: workspace.name,
        isActive: workspace.is_active
      });
    }

    return workspace;

  } catch (error: any) {
    logger.error('Error getting workspace from database:', {
      workspaceId,
      userId,
      error: error.message,
      service: 'bi-platform-api'
    });
    return null;
  }
}

/**
 * Enhanced workspace validation middleware using live database
 * Completely removes mock data dependency
 */
export async function validateWorkspaceAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      logger.warn('Workspace validation: No user in request', {
        path: req.path,
        method: req.method,
        service: 'bi-platform-api'
      });
      
      res.status(401).json({
        success: false,
        message: 'Authentication required for workspace resources',
        errors: [{
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access workspace resources'
        }]
      });
      return;
    }

    // Get workspace ID from multiple sources (in order of preference)
    const workspaceId = req.params.workspaceId || 
                       req.headers['X-Workspace-ID'] as string || 
                       req.user.workspace_id ||  // From JWT token
                       req.body?.workspace_id;

    logger.debug('Workspace validation attempt', {
      user_id: req.user.user_id,
      user_email: req.user.email,
      path: req.path,
      method: req.method,
      workspace_sources: {
        from_params: req.params.workspaceId,
        from_headers: req.headers['X-Workspace-ID'],
        from_user_token: req.user.workspace_id,
        from_body: req.body?.workspace_id,
        final_workspace_id: workspaceId
      },
      service: 'bi-platform-api'
    });

    if (!workspaceId) {
      logger.warn('Workspace validation: No workspace ID found', {
        user_id: req.user.user_id,
        path: req.path,
        available_sources: {
          url_params: Object.keys(req.params),
          headers: Object.keys(req.headers).filter(h => h.toLowerCase().includes('workspace')),
          body_keys: req.body ? Object.keys(req.body) : [],
          user_token_keys: Object.keys(req.user)
        },
        service: 'bi-platform-api'
      });
      
      res.status(400).json({
        success: false,
        message: 'Workspace ID required',  // ✅ Clear error message
        errors: [{
          code: 'WORKSPACE_ID_REQUIRED',
          message: 'Workspace ID must be provided in URL parameter, header, JWT token, or request body'
        }]
      });
      return;
    }

    // Get workspace from database
    logger.info('Fetching workspace from database', {
      workspace_id: workspaceId,
      user_id: req.user.user_id,
      service: 'bi-platform-api'
    });

    const workspace = await getWorkspaceFromDatabase(workspaceId, req.user.user_id);

    if (!workspace) {
      logger.warn('Workspace not found in database', {
        user_id: req.user.user_id,
        workspace_id: workspaceId,
        path: req.path,
        service: 'bi-platform-api'
      });
      
      res.status(404).json({
        success: false,
        message: 'Workspace not found',
        errors: [{
          code: 'WORKSPACE_NOT_FOUND',
          message: `Workspace with ID '${workspaceId}' not found or is not active`
        }]
      });
      return;
    }

    if (!workspace.is_active) {
      logger.warn('Workspace is inactive', {
        user_id: req.user.user_id,
        workspace_id: workspaceId,
        workspace_name: workspace.name,
        service: 'bi-platform-api'
      });
      
      res.status(403).json({
        success: false,
        message: 'Workspace inactive',
        errors: [{
          code: 'WORKSPACE_INACTIVE',
          message: 'This workspace has been deactivated'
        }]
      });
      return;
    }

    // Check if user has access to this workspace
    const hasAccess = await hasWorkspaceAccess(req.user.user_id, workspaceId);
    
    if (!hasAccess) {
      logger.warn('Unauthorized workspace access attempt', {
        user_id: req.user.user_id,
        user_email: req.user.email,
        workspace_id: workspaceId,
        workspace_name: workspace.name,
        ip: req.ip,
        user_agent: req.get('User-Agent'),
        path: req.path,
        service: 'bi-platform-api'
      });

      res.status(403).json({
        success: false,
        message: 'Workspace access denied',
        errors: [{
          code: 'WORKSPACE_ACCESS_DENIED',
          message: 'You do not have access to this workspace'
        }]
      });
      return;
    }

    // Set workspace ID in header for downstream middleware/controllers
    req.headers['X-Workspace-ID'] = workspaceId;
    
    // Attach workspace info to request
    (req as any).workspace = workspace;

    logger.info('Workspace access validated successfully', {
      user_id: req.user.user_id,
      workspace_id: workspaceId,
      workspace_name: workspace.name,
      workspace_slug: workspace.slug,
      path: req.path,
      service: 'bi-platform-api'
    });

    next();

  } catch (error: any) {
    logger.error('Workspace validation error:', {
      error: error.message,
      stack: error.stack,
      user_id: req.user?.user_id,
      path: req.path,
      method: req.method,
      service: 'bi-platform-api'
    });
    
    res.status(500).json({
      success: false,
      message: 'Workspace validation failed',
      errors: [{
        code: 'WORKSPACE_VALIDATION_ERROR',
        message: 'An error occurred while validating workspace access'
      }]
    });
    return;
  }
}

/**
 * Middleware factory to require specific workspace roles
 */
export function requireWorkspaceRole(roles: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: [{
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated'
          }]
        });
        return;
      }

      const workspaceId = req.headers['X-Workspace-ID'] as string;
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          errors: [{
            code: 'WORKSPACE_CONTEXT_REQUIRED',
            message: 'Workspace ID must be set in request headers'
          }]
        });
        return;
      }

      // Get user roles for this workspace using database
      logger.debug('Checking workspace roles', {
        user_id: req.user.user_id,
        workspace_id: workspaceId,
        required_roles: roles,
        service: 'bi-platform-api'
      });

      const userRoles = await permissionService.getUserRoles(req.user.user_id, workspaceId);
      const userRoleNames = userRoles.map(role => role.name);

      // Check if user has any of the required roles
      const hasRequiredRole = roles.some(requiredRole => 
        userRoleNames.includes(requiredRole)
      );

      if (!hasRequiredRole) {
        logger.warn('Insufficient workspace role', {
          user_id: req.user.user_id,
          workspace_id: workspaceId,
          required_roles: roles,
          user_roles: userRoleNames,
          ip: req.ip,
          service: 'bi-platform-api'
        });

        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: [{
            code: 'INSUFFICIENT_WORKSPACE_ROLE',
            message: `User must have one of the following roles in this workspace: ${roles.join(', ')}`
          }]
        });
        return;
      }

      logger.debug('Workspace role check passed', {
        user_id: req.user.user_id,
        workspace_id: workspaceId,
        required_roles: roles,
        user_roles: userRoleNames,
        service: 'bi-platform-api'
      });

      next();
    } catch (error: any) {
      logger.error('Workspace role validation error:', {
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Role validation failed',
        errors: [{
          code: 'ROLE_VALIDATION_ERROR',
          message: 'An error occurred while validating workspace roles'
        }]
      });
      return;
    }
  };
}

/**
 * Middleware factory to require specific workspace permissions
 */
export function requireWorkspacePermission(permissions: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: [{
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated'
          }]
        });
        return;
      }

      const workspaceId = req.headers['X-Workspace-ID'] as string;
      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace context required',
          errors: [{
            code: 'WORKSPACE_CONTEXT_REQUIRED',
            message: 'Workspace ID must be set in request headers'
          }]
        });
        return;
      }

      logger.debug('Checking workspace permissions', {
        user_id: req.user.user_id,
        workspace_id: workspaceId,
        required_permissions: permissions,
        service: 'bi-platform-api'
      });

      // Check each required permission using database
      for (const permission of permissions) {
        const hasPermission = await permissionService.hasPermission(
          req.user.user_id,
          workspaceId,
          permission
        );

        if (!hasPermission) {
          logger.warn('Insufficient workspace permission', {
            user_id: req.user.user_id,
            workspace_id: workspaceId,
            required_permission: permission,
            ip: req.ip,
            service: 'bi-platform-api'
          });

          res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            errors: [{
              code: 'INSUFFICIENT_WORKSPACE_PERMISSION',
              message: `User lacks required permission: ${permission}`
            }]
          });
          return;
        }
      }

      logger.debug('Workspace permission check passed', {
        user_id: req.user.user_id,
        workspace_id: workspaceId,
        required_permissions: permissions,
        service: 'bi-platform-api'
      });

      next();
    } catch (error: any) {
      logger.error('Workspace permission validation error:', {
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });
      
      res.status(500).json({
        success: false,
        message: 'Permission validation failed',
        errors: [{
          code: 'PERMISSION_VALIDATION_ERROR',
          message: 'An error occurred while validating workspace permissions'
        }]
      });
      return;
    }
  };
}

/**
 * Middleware to add workspace context without requiring it
 */
export async function addWorkspaceContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workspaceId = req.params.workspaceId || 
                       req.headers['X-Workspace-ID'] as string || 
                       req.body?.workspace_id;

    if (workspaceId && req.user) {
      const workspace = await getWorkspaceFromDatabase(workspaceId, req.user.user_id);
      
      if (workspace && workspace.is_active) {
        req.headers['X-Workspace-ID'] = workspaceId;
        (req as any).workspace = workspace;
        
        logger.debug('Workspace context added', {
          user_id: req.user.user_id,
          workspace_id: workspaceId,
          workspace_name: workspace.name,
          service: 'bi-platform-api'
        });
      }
    }

    next();
  } catch (error: any) {
    logger.error('Error adding workspace context:', {
      error: error.message,
      service: 'bi-platform-api'
    });
    
    // Don't fail the request, just continue without workspace context
    next();
  }
}

/**
 * Development helper to check database connectivity
 */
export async function testWorkspaceDatabase(): Promise<boolean> {
  try {
    const result = await db.query('SELECT COUNT(*) as workspace_count FROM workspaces WHERE is_active = true');
    const count = result.rows[0]?.workspace_count || 0;
    
    console.log('🏢 Workspace Database Test:', {
      connected: true,
      active_workspaces: count
    });
    
    return true;
  } catch (error: any) {
    console.error('❌ Workspace Database Test Failed:', error.message);
    return false;
  }
}

// Make database test available in development
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  // Server-side only
  testWorkspaceDatabase().then(success => {
    if (!success) {
      logger.warn('Workspace database connectivity test failed - check database connection');
    }
  });
}