// File: api-services/src/middleware/workspace.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { db } from '../config/database';
import { cache } from '../config/redis';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './authentication';

export interface WorkspaceRequest extends AuthenticatedRequest {
  workspace?: any;
}

export const validateWorkspaceAccess: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { workspaceId } = req.params;

    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
      return;
    }

    // Check if user has access to this workspace
    const result = await db.query(
      `SELECT w.*, uw.status, r.name as role_name, r.level as role_level
       FROM workspaces w
       JOIN user_workspaces uw ON w.id = uw.workspace_id
       LEFT JOIN user_workspace_roles uwr ON w.id = uwr.workspace_id AND uwr.user_id = uw.user_id
       LEFT JOIN roles r ON uwr.role_id = r.id
       WHERE w.id = $1 AND uw.user_id = $2 AND w.is_active = true`,
      [workspaceId, authReq.user.id]
    );

    if (result.rows.length === 0) {
      res.status(403).json({
        success: false,
        error: { code: 'WORKSPACE_ACCESS_DENIED', message: 'Access to workspace denied' }
      });
      return;
    }

    const workspace = result.rows[0];
    
    if (workspace.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        error: { code: 'WORKSPACE_INACTIVE', message: 'Workspace is not active' }
      });
      return;
    }

    (req as WorkspaceRequest).workspace = workspace;
    next();
  } catch (error) {
    logger.error('Workspace validation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WORKSPACE_VALIDATION_ERROR', message: 'Error validating workspace access' }
    });
    return;
  }
};

export const requireWorkspaceRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceReq = req as WorkspaceRequest;
      
      if (!workspaceReq.user) {
        res.status(401).json({
          success: false,
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
        });
        return;
      }

      if (!workspaceReq.workspace) {
        res.status(403).json({
          success: false,
          error: { code: 'WORKSPACE_REQUIRED', message: 'Workspace context required' }
        });
        return;
      }

      const userRole = workspaceReq.workspace.role_name;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          error: { 
            code: 'INSUFFICIENT_WORKSPACE_ROLE', 
            message: `Workspace role must be one of: ${allowedRoles.join(', ')}` 
          }
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Workspace role check error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'ROLE_CHECK_ERROR', message: 'Error checking workspace role' }
      });
      return;
    }
  };
};

export const checkDatasetAccess: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { datasetId } = req.params;

    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
      return;
    }

    // Check if user has access to the dataset
    const result = await db.query(
      `SELECT d.*, 
              CASE WHEN da.user_id IS NOT NULL THEN true ELSE false END as has_direct_access,
              CASE WHEN uw.user_id IS NOT NULL THEN true ELSE false END as has_workspace_access
       FROM datasets d
       LEFT JOIN dataset_access da ON d.id = da.dataset_id AND da.user_id = $2
       LEFT JOIN user_workspaces uw ON d.workspace_id = uw.workspace_id AND uw.user_id = $2
       WHERE d.id = $1 AND d.is_active = true`,
      [datasetId, authReq.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'DATASET_NOT_FOUND', message: 'Dataset not found' }
      });
      return;
    }

    const dataset = result.rows[0];
    
    if (!dataset.has_direct_access && !dataset.has_workspace_access) {
      res.status(403).json({
        success: false,
        error: { code: 'DATASET_ACCESS_DENIED', message: 'Access to dataset denied' }
      });
      return;
    }

    (req as any).dataset = dataset;
    next();
  } catch (error) {
    logger.error('Dataset access check error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATASET_ACCESS_ERROR', message: 'Error checking dataset access' }
    });
    return;
  }
};