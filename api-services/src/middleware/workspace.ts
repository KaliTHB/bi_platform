// api-services/src/middleware/workspace.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authentication';
import { PermissionService } from '../services/PermissionService';
import { logger } from '../utils/logger';

// Mock workspace database for development
const mockWorkspaces = new Map([
  ['sample-workspace', {
    id: 'sample-workspace',
    name: 'sample_workspace',
    display_name: 'Sample Workspace',
    description: 'A sample workspace for development',
    is_active: true,
    created_by: 'sample-user',
    created_at: new Date(),
    updated_at: new Date()
  }],
  ['test-workspace', {
    id: 'test-workspace', 
    name: 'test_workspace',
    display_name: 'Test Workspace',
    description: 'Test workspace for development',
    is_active: true,
    created_by: 'sample-user',
    created_at: new Date(),
    updated_at: new Date()
  }]
]);

const permissionService = new PermissionService();

/**
 * Middleware to validate workspace access
 * Expects workspace ID to be provided either in:
 * 1. URL parameter (:workspaceId)
 * 2. Request header (X-Workspace-Id)
 * 3. Request body (workspace_id)
 */
export async function validateWorkspaceAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errors: [{
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to access workspace resources'
        }]
      });
      return;
    }

    // Get workspace ID from various sources
    const workspaceId = req.params.workspaceId || 
                       req.headers['x-workspace-id'] as string || 
                       req.body?.workspace_id;

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: 'Workspace ID required',
        errors: [{
          code: 'WORKSPACE_ID_REQUIRED',
          message: 'Workspace ID must be provided in URL parameter, header, or request body'
        }]
      });
      return;
    }

    // Validate workspace exists and is active
    const workspace = mockWorkspaces.get(workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        message: 'Workspace not found',
        errors: [{
          code: 'WORKSPACE_NOT_FOUND',
          message: `Workspace with ID '${workspaceId}' not found`
        }]
      });
      return;
    }

    if (!workspace.is_active) {
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
        workspace_id: workspaceId,
        ip: req.ip,
        user_agent: req.get('User-Agent')
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
    req.headers['x-workspace-id'] = workspaceId;
    
    // Attach workspace info to request (optional)
    (req as any).workspace = workspace;

    logger.debug('Workspace access validated', {
      user_id: req.user.user_id,
      workspace_id: workspaceId,
      workspace_name: workspace.name
    });

    next();
  } catch (error: any) {
    logger.error('Workspace validation error:', error);
    
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

      const workspaceId = req.headers['x-workspace-id'] as string;
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

      // Get user roles for this workspace
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
          ip: req.ip
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
        user_roles: userRoleNames
      });

      next();
    } catch (error: any) {
      logger.error('Workspace role validation error:', error);
      
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

      const workspaceId = req.headers['x-workspace-id'] as string;
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

      // Check each required permission
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
            ip: req.ip
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
        required_permissions: permissions
      });

      next();
    } catch (error: any) {
      logger.error('Workspace permission validation error:', error);
      
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
                       req.headers['x-workspace-id'] as string || 
                       req.body?.workspace_id;

    if (workspaceId) {
      const workspace = mockWorkspaces.get(workspaceId);
      if (workspace && workspace.is_active) {
        req.headers['x-workspace-id'] = workspaceId;
        (req as any).workspace = workspace;
        
        logger.debug('Workspace context added', {
          workspace_id: workspaceId,
          workspace_name: workspace.name
        });
      }
    }

    next();
  } catch (error: any) {
    logger.debug('Error adding workspace context:', error);
    // Continue without workspace context
    next();
  }
}

/**
 * Helper function to check if user has access to workspace
 */
async function hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  try {
    // In a real implementation, this would check the workspace_memberships table
    // For now, we'll use a simple check with the permission service
    return await permissionService.hasPermission(userId, workspaceId, 'workspace.read');
  } catch (error: any) {
    logger.error('Error checking workspace access:', error);
    return false;
  }
}

/**
 * Helper function to get user's workspaces
 */
export async function getUserWorkspaces(userId: string): Promise<any[]> {
  try {
    // In a real implementation, this would query the database
    // For now, return mock workspaces where user has access
    const workspaces: any[] = [];
    
    for (const [workspaceId, workspace] of mockWorkspaces.entries()) {
      const hasAccess = await hasWorkspaceAccess(userId, workspaceId);
      if (hasAccess) {
        const roles = await permissionService.getUserRoles(userId, workspaceId);
        workspaces.push({
          ...workspace,
          user_roles: roles.map(role => ({
            id: role.id,
            name: role.name,
            display_name: role.display_name
          }))
        });
      }
    }

    return workspaces;
  } catch (error: any) {
    logger.error('Error getting user workspaces:', error);
    return [];
  }
}

/**
 * Helper function to validate workspace ownership
 */
export async function validateWorkspaceOwnership(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    const roles = await permissionService.getUserRoles(userId, workspaceId);
    return roles.some(role => role.name === 'owner');
  } catch (error: any) {
    logger.error('Error validating workspace ownership:', error);
    return false;
  }
}