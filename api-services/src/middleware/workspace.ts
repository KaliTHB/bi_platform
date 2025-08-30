# api-services/src/middleware/workspace.ts
import { Request, Response, NextFunction } from 'express';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';
import { User, Workspace } from '../types/auth.types';

interface WorkspaceRequest extends Request {
  user?: User;
  workspace?: Workspace;
}

export const workspaceContext = async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    // Try to get workspace from cache first
    let workspace = await CacheService.get(`workspace:${workspaceId}`);
    
    if (!workspace) {
      // Get workspace from database
      const result = await DatabaseConfig.query(
        `SELECT w.*, 
                COUNT(DISTINCT uw.user_id) as user_count,
                COUNT(DISTINCT d.id) as dashboard_count,
                COUNT(DISTINCT ds.id) as dataset_count
         FROM workspaces w
         LEFT JOIN user_workspaces uw ON w.id = uw.workspace_id
         LEFT JOIN dashboards d ON w.id = d.workspace_id AND d.is_active = true
         LEFT JOIN datasets ds ON w.id = ds.workspace_id AND ds.is_active = true
         WHERE w.id = $1 AND w.is_active = true
         GROUP BY w.id`,
        [workspaceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      workspace = result.rows[0];
      
      // Cache workspace for 30 minutes
      await CacheService.set(`workspace:${workspaceId}`, workspace, 1800);
    }

    // Check if user has access to this workspace
    const accessResult = await DatabaseConfig.query(
      `SELECT uwr.role_id, r.name as role_name, r.level
       FROM user_workspace_roles uwr
       JOIN roles r ON uwr.role_id = r.id
       WHERE uwr.user_id = $1 AND uwr.workspace_id = $2`,
      [req.user.id, workspaceId]
    );

    if (accessResult.rows.length === 0 && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'No access to this workspace' });
    }

    // Add workspace roles to request
    if (accessResult.rows.length > 0) {
      workspace.user_roles = accessResult.rows;
      workspace.highest_role_level = Math.max(...accessResult.rows.map(r => r.level));
    } else if (req.user.role === 'SUPER_ADMIN') {
      workspace.user_roles = [{ role_id: null, role_name: 'SUPER_ADMIN', level: 100 }];
      workspace.highest_role_level = 100;
    }

    req.workspace = workspace;
    next();
  } catch (error) {
    logger.error('Workspace context error:', error);
    return res.status(500).json({ error: 'Failed to load workspace context' });
  }
};

export const validateWorkspaceAccess = (requiredLevel: number = 1) => {
  return async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.workspace) {
        return res.status(400).json({ error: 'Workspace context not available' });
      }

      if (req.user?.role === 'SUPER_ADMIN') {
        return next();
      }

      if (!req.workspace.highest_role_level || req.workspace.highest_role_level < requiredLevel) {
        return res.status(403).json({ error: 'Insufficient workspace access level' });
      }

      next();
    } catch (error) {
      logger.error('Workspace access validation error:', error);
      return res.status(500).json({ error: 'Access validation failed' });
    }
  };
};

export const requireWorkspaceRole = (roleNames: string[]) => {
  return async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.workspace) {
        return res.status(400).json({ error: 'Workspace context not available' });
      }

      if (req.user?.role === 'SUPER_ADMIN') {
        return next();
      }

      const userRoles = req.workspace.user_roles?.map(r => r.role_name) || [];
      const hasRequiredRole = roleNames.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({ 
          error: `Requires one of the following workspace roles: ${roleNames.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      logger.error('Workspace role check error:', error);
      return res.status(500).json({ error: 'Role check failed' });
    }
  };
};

export const checkDatasetAccess = async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
  try {
    const datasetId = req.params.datasetId || req.body.datasetId;
    
    if (!datasetId) {
      return next();
    }

    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user has access to the dataset
    const result = await DatabaseConfig.query(
      `SELECT COUNT(*) as count
       FROM datasets d
       JOIN dataset_permissions dp ON d.id = dp.dataset_id
       JOIN user_workspace_roles uwr ON dp.role_id = uwr.role_id
       WHERE d.id = $1 AND uwr.user_id = $2 AND uwr.workspace_id = $3 AND d.is_active = true`,
      [datasetId, req.user!.id, req.workspace!.id]
    );

    if (parseInt(result.rows[0].count) === 0) {
      return res.status(403).json({ error: 'No access to this dataset' });
    }

    next();
  } catch (error) {
    logger.error('Dataset access check error:', error);
    return res.status(500).json({ error: 'Dataset access check failed' });
  }
};