// api-services/src/types/express.d.ts - UNIFIED VERSION
import { Request } from 'express';

// Consistent User Data Interface
export interface AuthUserData {
  user_id: string;
  email: string;
  username?: string;
  workspace_id?: string;
  workspace_slug?: string;
  workspace_role?: string;
  is_admin?: boolean;
  role_level?: number;
  roles?: string[];
  permissions?: string[];
}

// FIXED: Make user property REQUIRED (not optional) for authenticated routes
export interface AuthenticatedRequest extends Request {
  user: AuthUserData; // ✅ REQUIRED, not optional
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  userPermissions?: string[];
}

// Optional version for middleware that might not have user
export interface MaybeAuthenticatedRequest extends Request {
  user?: AuthUserData; // Optional for middleware
}

// Extend Express Request globally for compatibility
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserData; // Keep optional for general Express usage
      workspace?: {
        id: string;
        name: string;
        slug: string;
      };
      userPermissions?: string[];
    }
  }
}

// More specific types for different middleware contexts
export interface RequiredAuthRequest extends Request {
  user: AuthUserData; // Required, not optional
}

export interface WorkspaceAuthRequest extends AuthenticatedRequest {
  user: AuthUserData & { workspace_id: string }; // Workspace required
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

// Primary AuthenticatedRequest interface
export interface AuthenticatedRequest extends Request {
  user?: AuthUserData;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  userPermissions?: string[];
}

// Extend Express Request globally for compatibility
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserData;
      workspace?: {
        id: string;
        name: string;
        slug: string;
      };
      userPermissions?: string[];
    }
  }
}

// Optional: More specific types for different middleware contexts
export interface RequiredAuthRequest extends Request {
  user: AuthUserData; // Required, not optional
}

export interface WorkspaceAuthRequest extends AuthenticatedRequest {
  user: AuthUserData & { workspace_id: string }; // Workspace required
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

// ---

// api-services/src/middleware/authentication.ts - UPDATED
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AuthUserData, AuthenticatedRequest } from '../types/express';

// JWT Payload interface
export interface JWTPayload {
  user_id: string;
  email: string;
  username?: string;
  workspace_id?: string;
  workspace_slug?: string;
  workspace_role?: string;
  is_admin?: boolean;
  role_level?: number;
  iat?: number;
  exp?: number;
}

// Re-export types for convenience
export { AuthUserData, AuthenticatedRequest } from '../types/express';

/**
 * Authentication middleware
 * Verifies JWT token and extracts user information
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        service: 'bi-platform-api'
      });
      
      res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
        error: 'INVALID_TOKEN_FORMAT'
      });
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'your-jwt-secret'
      ) as JWTPayload;
      
      // Extract user data from token
      const userData: AuthUserData = {
        user_id: decoded.user_id,
        email: decoded.email,
        username: decoded.username,
        workspace_id: decoded.workspace_id,
        workspace_slug: decoded.workspace_slug,
        workspace_role: decoded.workspace_role,
        is_admin: decoded.is_admin || false,
        role_level: decoded.role_level || 0
      };

      // Attach user to request
      req.user = userData;

      logger.debug('Authentication successful', {
        userId: userData.user_id,
        workspaceId: userData.workspace_id,
        service: 'bi-platform-api'
      });

      next();
      
    } catch (jwtError: any) {
      logger.warn('JWT verification failed', {
        error: jwtError.message,
        ip: req.ip,
        service: 'bi-platform-api'
      });
      
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'TOKEN_INVALID'
      });
      return;
    }
    
  } catch (error: any) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      service: 'bi-platform-api'
    });
    
    res.status(500).json({
      success: false,
      message: 'Authentication service error',
      error: 'AUTH_SERVICE_ERROR'
    });
    return;
  }
};

/**
 * Extract token from request
 */
export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
};

/**
 * Check if user is admin
 */
export const isAdmin = (req: AuthenticatedRequest): boolean => {
  return req.user?.is_admin === true || 
         (req.user?.role_level || 0) >= 90;
};

/**
 * Require admin access middleware
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }
  
  if (!isAdmin(req)) {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'ADMIN_ACCESS_REQUIRED'
    });
    return;
  }
  
  next();
};

/**
 * Require workspace context middleware
 */
export const requireWorkspace = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }
  
  if (!req.user.workspace_id) {
    res.status(400).json({
      success: false,
      message: 'Workspace context required',
      error: 'WORKSPACE_REQUIRED'
    });
    return;
  }
  
  next();
};

// Default export for backward compatibility
export default authenticate;

// ---

// api-services/src/middleware/workspace.ts - UPDATED
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, WorkspaceAuthRequest } from '../types/express';
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
 * Gets workspace from token context, not URL params
 */
export const validateWorkspaceAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    // Get workspace from token context
    const workspaceId = req.user.workspace_id;
    
    if (!workspaceId) {
      res.status(400).json({
        success: false,
        message: 'No active workspace context',
        error: 'NO_WORKSPACE_CONTEXT'
      });
      return;
    }

    // Verify workspace exists and user has access
    // In production, this would query the database
    const workspace = mockWorkspaces.get(workspaceId);
    
    if (!workspace) {
      res.status(404).json({
        success: false,
        message: 'Workspace not found',
        error: 'WORKSPACE_NOT_FOUND'
      });
      return;
    }

    // Attach workspace info to request
    req.workspace = {
      id: workspace.id,
      name: workspace.display_name || workspace.name,
      slug: workspace.name
    };

    logger.debug('Workspace access validated', {
      userId: req.user.user_id,
      workspaceId: workspaceId,
      service: 'bi-platform-api'
    });

    next();
  } catch (error: any) {
    logger.error('Workspace validation error', {
      error: error.message,
      stack: error.stack,
      service: 'bi-platform-api'
    });

    res.status(500).json({
      success: false,
      message: 'Workspace validation failed',
      error: 'WORKSPACE_VALIDATION_ERROR'
    });
  }
};

/**
 * Require specific workspace role
 */
export const requireWorkspaceRole = (allowedRoles: string[]) => {
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
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Check if user is admin (bypasses role checks)
      if (req.user.is_admin) {
        next();
        return;
      }

      const userRole = req.user.workspace_role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        logger.warn('Insufficient workspace role', {
          userId: req.user.user_id,
          userRole: userRole,
          requiredRoles: allowedRoles,
          service: 'bi-platform-api'
        });

        res.status(403).json({
          success: false,
          message: `Required role: ${allowedRoles.join(' or ')}`,
          error: 'INSUFFICIENT_ROLE'
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Role validation error', {
        error: error.message,
        stack: error.stack,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Role validation failed',
        error: 'ROLE_VALIDATION_ERROR'
      });
    }
  };
};

// ---

// api-services/src/routes/datasource.routes.ts - UPDATED FOR NEW URL STRUCTURE
import express, { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController';
import { authenticate, AuthenticatedRequest } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router: Router = express.Router();
const dataSourceController = new DataSourceController();

// Apply authentication to all routes
router.use(authenticate);

// 🔧 GLOBAL ROUTES (no workspace context needed)

// Test connection with custom config (no workspace validation needed)
router.post('/test-connection', 
  asyncHandler(dataSourceController.testCustomConnection.bind(dataSourceController))
);

// 📊 WORKSPACE-SPECIFIC ROUTES (no workspace ID in URL)
// All routes below require workspace context from token
router.use(validateWorkspaceAccess);

// Get all datasources in workspace
router.get('/datasources',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.getDataSources.bind(dataSourceController))
);

// Create new datasource
router.post('/datasources',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.createDataSource.bind(dataSourceController))
);

// Get specific datasource
router.get('/datasources/:id',
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.getDataSource.bind(dataSourceController))
);

// Update datasource
router.put('/datasources/:id',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.updateDataSource.bind(dataSourceController))
);

// Delete datasource
router.delete('/datasources/:id',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(dataSourceController.deleteDataSource.bind(dataSourceController))
);

// 🔍 CONNECTION & TESTING ROUTES

// Test existing datasource connection
router.post('/datasources/:id/test',
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dataSourceController.testConnection.bind(dataSourceController))
);

// Export datasource configuration (without sensitive data)
router.get('/datasources/:id/export',
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { include_config = false } = req.query;

      // Get workspace from request context, not URL
      const workspaceId = req.workspace?.id;

      const exportData = {
        datasource: {
          name: 'Sample DataSource',
          description: 'Exported datasource configuration',
          type: 'postgres',
          tags: ['production', 'primary'],
        },
        export_metadata: {
          exported_at: new Date().toISOString(),
          exported_by: req.user?.user_id,
          workspace_id: workspaceId,
          version: '1.0',
          includes_sensitive_data: include_config === 'true'
        }
      };

      res.status(200).json({
        success: true,
        export_data: exportData,
        message: 'Datasource configuration exported successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to export datasource configuration',
        errors: [{ code: 'EXPORT_DATASOURCE_FAILED', message: error.message }]
      });
    }
  })
);

export default router;