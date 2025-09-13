// api-services/src/controllers/UserController.ts - Updated to use AuthService
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authentication';
import { Pool } from 'pg';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

export class UserController {
  private db: Pool;
  private authService: AuthService;

  constructor(database: Pool, authService: AuthService) {
    this.db = database;
    this.authService = authService;
  }

  /**
 * Get user's default workspace using AuthService - FIXED VERSION
 */
public async getDefaultWorkspace(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.user_id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to access default workspace',
        error: 'AUTHENTICATION_REQUIRED',
        workspace: null
      });
      return;
    }

    console.log('🔍 UserController: Getting default workspace for user:', userId);

    // Get user's first workspace using a single efficient query
    const defaultWorkspaceQuery = `
      SELECT 
        w.id,
        w.name,
        w.slug,
        w.display_name,
        w.description,
        w.logo_url,
        w.settings as settings,
        w.is_active,
        w.created_at,
        w.updated_at,
        ura.assigned_at,
        r.name as role,
        (SELECT COUNT(DISTINCT ura2.user_id) 
         FROM user_role_assignments ura2 
         WHERE ura2.workspace_id = w.id AND ura2.is_active = true) as member_count,
        (SELECT COUNT(*) 
         FROM dashboards d 
         WHERE d.workspace_id = w.id AND d.is_active = true) as dashboard_count,
        (SELECT COUNT(*) 
         FROM datasets ds 
         WHERE ds.workspace_id = w.id AND ds.is_active = true) as dataset_count
      FROM workspaces w
      INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
      INNER JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
        AND ura.is_active = true 
        AND w.is_active = true
      ORDER BY ura.assigned_at ASC
      LIMIT 1
    `;

    const result = await this.db.query(defaultWorkspaceQuery, [userId]);

    if (result.rows.length === 0) {
      console.log('⚠️ UserController: No workspace found for user:', userId);
      res.status(200).json({
        success: true,
        message: 'No default workspace assigned. Please select a workspace.',
        workspace: null
      });
      return;
    }

    const row = result.rows[0];

    // Build workspace response
    const workspace = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      display_name: row.display_name || row.name,
      description: row.description,
      logo_url: row.logo_url,
      user_count: parseInt(row.member_count) || 0,
      dashboard_count: parseInt(row.dashboard_count) || 0,
      dataset_count: parseInt(row.dataset_count) || 0,
      is_default: true,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active,
      settings: row.settings || {}
    };

    console.log('✅ UserController: Found default workspace:', {
      userId,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      userRole: workspace.role
    });

    res.status(200).json({
      success: true,
      message: 'Default workspace retrieved successfully',
      workspace: workspace
    });

  } catch (error: any) {
    console.error('❌ UserController: Get default workspace error:', error);
    
    logger.error('Get default workspace error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.user_id,
      service: 'bi-platform-api'
    });

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve default workspace due to server error',
      error: 'INTERNAL_SERVER_ERROR',
      workspace: null
    });
  }
}

  /**
 * Get all user workspaces using AuthService - FIXED VERSION
 */
public async getUserWorkspaces(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to access workspaces',
        error: 'AUTHENTICATION_REQUIRED',
        workspaces: []
      });
      return;
    }

    console.log('🔍 UserController: Getting workspaces for user:', userId);

    // Use a single efficient query to get all user workspaces
    const workspaceQuery = `
      SELECT 
        w.id,
        w.name,
        w.slug,
        w.display_name,
        w.description,
        w.logo_url,
        w.settings as settings,
        w.is_active,
        w.created_at,
        w.updated_at,
        MIN(ura.assigned_at) as assigned_at,
        -- Get the highest priority role as primary role
        (array_agg(r.name ORDER BY 
          CASE r.name 
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2  
            WHEN 'editor' THEN 3
            WHEN 'viewer' THEN 4
            WHEN 'guest' THEN 5
            ELSE 6 
          END))[1] as user_role,
        -- Collect all roles for this user in this workspace
        array_agg(DISTINCT r.name) as user_roles,
        -- Get workspace statistics
        (SELECT COUNT(DISTINCT ura2.user_id) 
         FROM user_role_assignments ura2 
         WHERE ura2.workspace_id = w.id AND ura2.is_active = true) as member_count,
        (SELECT COUNT(*) 
         FROM dashboards d 
         WHERE d.workspace_id = w.id AND d.is_active = true) as dashboard_count,
        (SELECT COUNT(*) 
         FROM datasets ds 
         WHERE ds.workspace_id = w.id AND ds.is_active = true) as dataset_count
      FROM workspaces w
      INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
      LEFT JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = $1 
        AND ura.is_active = true 
        AND w.is_active = true
      GROUP BY w.id, w.name, w.slug, w.display_name, w.description, 
               w.logo_url, w.settings, w.is_active, w.created_at, 
               w.updated_at
      ORDER BY w.name ASC
    `;

    const result = await this.db.query(workspaceQuery, [userId]);

    if (result.rows.length === 0) {
      console.log('⚠️ UserController: No workspaces found for user:', userId);
      res.status(200).json({
        success: true,
        message: 'No workspaces found for user',
        data: [],
        workspaces: [],
        count: 0
      });
      return;
    }

    // Format workspaces for response
    const workspaces = result.rows.map((row, index) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      display_name: row.display_name || row.name,
      description: row.description,
      logo_url: row.logo_url,
      user_count: parseInt(row.member_count) || 0,
      dashboard_count: parseInt(row.dashboard_count) || 0,
      dataset_count: parseInt(row.dataset_count) || 0,
      is_default: index === 0, // First workspace is default
      role: row.user_role,
      user_roles: row.user_roles || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active,
      settings: row.settings || {}
    }));

    console.log(`✅ UserController: Found ${workspaces.length} workspaces for user:`, userId);

    res.status(200).json({
      success: true,
      message: 'Workspaces retrieved successfully using AuthService',
      data: workspaces,
      workspaces: workspaces,
      count: workspaces.length
    });

  } catch (error: any) {
    console.error('❌ UserController: Get user workspaces error:', error);
    
    logger.error('Get user workspaces error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.user_id,
      service: 'bi-platform-api'
    });

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve workspaces due to server error',
      error: 'INTERNAL_SERVER_ERROR',
      workspaces: []
    });
  }
}

  /**
 * Get user permissions using AuthService - FIXED VERSION with better error handling
 */
public async getUserPermissions(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.user_id;
    const workspaceId = req.query.workspace as string || req.user?.workspace_id;

    console.log('🔍 UserController: Getting permissions for user:', { userId, workspaceId });

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to access permissions',
        error: 'AUTHENTICATION_REQUIRED',
        permissions: [],
        roles: []
      });
      return;
    }

    if (!workspaceId) {
      // If no workspace specified, try to get user's first available workspace
      console.log('⚠️ No workspace specified, trying to find user\'s first workspace');
      
      try {
        const firstWorkspaceQuery = `
          SELECT w.id
          FROM workspaces w
          INNER JOIN user_role_assignments ura ON w.id = ura.workspace_id
          WHERE ura.user_id = $1 
            AND ura.is_active = true 
            AND w.is_active = true
          ORDER BY ura.assigned_at ASC
          LIMIT 1
        `;
        
        console.log('🔍 Running query to find first workspace for user:', userId);
        const workspaceResult = await this.db.query(firstWorkspaceQuery, [userId]);
        
        // Add proper null checks
        if (!workspaceResult || !workspaceResult.rows || workspaceResult.rows.length === 0) {
          console.log('⚠️ No workspaces found for user:', userId);
          res.status(400).json({
            success: false,
            message: 'No workspace available for permissions check',
            error: 'NO_WORKSPACE_AVAILABLE',
            permissions: [],
            roles: []
          });
          return;
        }

        // Use the first available workspace
        const firstWorkspaceId = workspaceResult.rows[0].id;
        console.log('✅ Using first available workspace:', firstWorkspaceId);
        
        // Get permissions for this workspace using AuthService
        const userPermissions = await this.authService.getUserPermissions(userId, firstWorkspaceId);

        res.status(200).json({
          success: true,
          message: 'Permissions retrieved successfully (using first available workspace)',
          permissions: userPermissions.permissions || [],
          roles: userPermissions.roles || [],
          is_admin: userPermissions.is_admin || false,
          role_level: userPermissions.role_level || 0,
          user_info: {
            user_id: userId,
            email: req.user?.email,
            workspace_id: firstWorkspaceId
          },
          workspace_used: firstWorkspaceId
        });
        return;

      } catch (workspaceError: any) {
        console.error('❌ Error finding user workspace:', workspaceError);
        logger.error('Error finding user workspace:', {
          error: workspaceError.message,
          stack: workspaceError.stack,
          userId,
          service: 'bi-platform-api'
        });

        res.status(400).json({
          success: false,
          message: 'Workspace ID required to get permissions',
          error: 'MISSING_WORKSPACE_ID',
          permissions: [],
          roles: []
        });
        return;
      }
    }

    // Use AuthService to get permissions for specified workspace
    console.log('🔍 Getting permissions using AuthService for workspace:', workspaceId);
    
    try {
      const userPermissions = await this.authService.getUserPermissions(userId, workspaceId);

      console.log('✅ UserController: Got permissions:', {
        userId,
        workspaceId,
        permissionCount: userPermissions.permissions?.length || 0,
        roleCount: userPermissions.roles?.length || 0,
        isAdmin: userPermissions.is_admin
      });

      res.status(200).json({
        success: true,
        message: 'Permissions retrieved successfully using AuthService',
        permissions: userPermissions.permissions || [],
        roles: userPermissions.roles || [],
        is_admin: userPermissions.is_admin || false,
        role_level: userPermissions.role_level || 0,
        user_info: {
          user_id: userId,
          email: req.user?.email,
          workspace_id: workspaceId
        }
      });

    } catch (permissionError: any) {
      console.error('❌ Error getting permissions from AuthService:', permissionError);
      logger.error('AuthService getUserPermissions error:', {
        error: permissionError.message,
        stack: permissionError.stack,
        userId,
        workspaceId,
        service: 'bi-platform-api'
      });

      // Return empty permissions instead of failing
      res.status(200).json({
        success: true,
        message: 'Permissions retrieved with limited access (error occurred)',
        permissions: [],
        roles: [],
        is_admin: false,
        role_level: 0,
        user_info: {
          user_id: userId,
          email: req.user?.email,
          workspace_id: workspaceId
        },
        warning: 'Could not retrieve full permissions'
      });
    }

  } catch (error: any) {
    console.error('❌ UserController: Get user permissions error:', error);
    
    logger.error('Get user permissions error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.user_id,
      service: 'bi-platform-api'
    });

    res.status(500).json({
      success: false,
      message: 'Unable to retrieve permissions due to server error',
      error: 'INTERNAL_SERVER_ERROR',
      permissions: [],
      roles: []
    });
  }
}
  // Placeholder methods
  public async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }

  public async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented', error: 'NOT_IMPLEMENTED' });
  }
}