// Fixed api-services/src/controllers/WorkspaceController.ts
// Robust version with comprehensive database validation
import { Pool } from 'pg';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authentication';
import { WorkspaceService, Workspace } from '../services/WorkspaceService';
import { logger } from '../utils/logger';

// Import database with validation
import { db, validateDbExport, getPoolHealth, testConnection } from '../utils/database';

export class WorkspaceController {
  private workspaceService: WorkspaceService;
  private db: Pool; // Add this property declaration

  constructor() {
    console.log('🔧 WorkspaceController: Starting initialization...');
    
    try {
      // Step 1: Validate database import
      console.log('🔍 Step 1: Validating database import...');
      
      if (!db) {
        throw new Error('Database connection is null or undefined');
      }
      
      console.log('Database object exists:', !!db);
      console.log('Database type:', typeof db);
      console.log('Database constructor:', db.constructor?.name);
      
      // Step 2: Validate database methods
      console.log('🔍 Step 2: Validating database methods...');
      
      if (typeof db.query !== 'function') {
        console.error('❌ Database query method validation failed');
        console.error('db.query type:', typeof db.query);
        console.error('db.query value:', db.query);
        console.error('Database object keys:', Object.keys(db));
        console.error('Database prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(db)));
        
        const validation = validateDbExport();
        console.error('Database validation result:', validation);
        
        throw new Error(`Database connection invalid - query method is ${typeof db.query}`);
      }
      
      console.log('✅ Database query method validated');
      
      // Step 3: Check pool health
      console.log('🔍 Step 3: Checking pool health...');
      const health = getPoolHealth();
      console.log('Pool health:', health);
      
      if (!health.hasQuery) {
        throw new Error('Pool health check failed - no query method');
      }
      
      // Step 4: Test actual connection
      console.log('🔍 Step 4: Testing database connection...');
      testConnection().then((success) => {
        if (success) {
          console.log('✅ Database connection test passed');
        } else {
          console.error('❌ Database connection test failed');
        }
      }).catch((error) => {
        console.error('❌ Database connection test error:', error);
      });
      
      // Step 5: Assign database connection to instance property
      console.log('🔍 Step 5: Assigning database connection...');
      this.db = db; // ADD THIS LINE!
      
      // Step 6: Initialize WorkspaceService
      console.log('🔍 Step 6: Initializing WorkspaceService...');
      this.workspaceService = new WorkspaceService(db);
      
      console.log('✅ WorkspaceController initialized successfully');
      
      logger.info('WorkspaceController initialized successfully', {
        service: 'bi-platform-api',
        dbType: typeof db,
        dbConstructor: db.constructor?.name,
        hasQuery: typeof db.query === 'function'
      });
      
    } catch (error) {
      console.error('❌ WorkspaceController initialization failed:', error);
      
      // Enhanced error logging for debugging
      console.error('=== DEBUGGING INFORMATION ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Database object:', !!db);
      console.error('Database type:', typeof db);
      console.error('Database constructor:', db?.constructor?.name);
      console.error('Database methods:', db ? Object.getOwnPropertyNames(Object.getPrototypeOf(db)) : 'N/A');
      
      if (db) {
        try {
          const validation = validateDbExport();
          console.error('Database validation:', validation);
          
          const health = getPoolHealth();
          console.error('Pool health:', health);
        } catch (validationError) {
          console.error('Could not run validation:', validationError.message);
        }
      }
      
      logger.error('WorkspaceController initialization failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        service: 'bi-platform-api',
        dbAvailable: !!db,
        dbType: typeof db
      });
      
      throw error;
    }
  }

  /**
   * Health check method for debugging
   */
  public healthCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const health = getPoolHealth();
      const connectionTest = await testConnection();
      
      res.status(200).json({
        success: true,
        status: 'healthy',
        database: {
          ...health,
          connectionTest,
          canQuery: typeof db.query === 'function'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Get all workspaces accessible to the user
   * GET /api/workspaces
   */
  public getUserWorkspaces = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const requestId = `req_${Date.now()}`;
    
    try {
      const userId = req.user?.user_id;
      const userEmail = req.user?.email;

      console.log(`🏢 [${requestId}] WorkspaceController: Getting user workspaces`);
      
      if (!userId || !userEmail) {
        console.log(`⚠️ [${requestId}] WorkspaceController: Missing authentication`);
        res.status(401).json({
          success: false,
          message: 'Authentication required to access workspaces',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      logger.info('Getting user workspaces via WorkspaceService', {
        requestId,
        userId,
        userEmail,
        service: 'bi-platform-api'
      });

      // Additional database connectivity check
      const health = getPoolHealth();
      if (!health.isHealthy || !health.hasQuery) {
        throw new Error('Database connection is not healthy');
      }

      console.log(`🔍 [${requestId}] Database health verified, calling WorkspaceService...`);

      // Get workspaces from WorkspaceService
      const workspaces = await this.workspaceService.getUserWorkspaces(userId);

      console.log(`✅ [${requestId}] WorkspaceController: Found ${workspaces.length} workspaces for user`);

      // Format workspaces for API response
      const formattedWorkspaces = workspaces.map(workspace => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        display_name: workspace.display_name,
        description: workspace.description,
        logo_url: workspace.logo_url,
        user_count: workspace.member_count,
        dashboard_count: workspace.dashboard_count,
        dataset_count: workspace.dataset_count,
        is_default: false,
        role: workspace.user_role,
        user_roles: workspace.user_roles,
        highest_role: workspace.highest_role,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        last_accessed: workspace.joined_at,
        settings: workspace.settings,
        is_active: workspace.is_active
      }));

      // Log successful response
      logger.info('User workspaces retrieved successfully', {
        requestId,
        userId,
        workspaceCount: formattedWorkspaces.length,
        workspaceIds: formattedWorkspaces.map(w => w.id),
        service: 'bi-platform-api'
      });

      res.status(200).json({
        success: true,
        data: formattedWorkspaces,
        message: 'Workspaces retrieved successfully',
        total: formattedWorkspaces.length
      });

    } catch (error: any) {
      console.error(`❌ [${requestId}] WorkspaceController: Get user workspaces error:`, error);
      
      logger.error('Get user workspaces controller error:', {
        requestId,
        error: error.message,
        stack: error.stack,
        code: error.code,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      // Provide specific error responses based on error type
      let statusCode = 500;
      let userMessage = 'Failed to retrieve workspaces';
      let errorCode = 'WORKSPACE_RETRIEVAL_ERROR';

      if (error.message.includes('Database connection')) {
        statusCode = 503;
        userMessage = 'Database temporarily unavailable';
        errorCode = 'DATABASE_UNAVAILABLE';
      } else if (error.message.includes('Authentication')) {
        statusCode = 401;
        userMessage = 'Authentication required';
        errorCode = 'AUTHENTICATION_REQUIRED';
      } else if (error.message.includes('schema error') || error.message.includes('column')) {
        statusCode = 500;
        userMessage = 'Database configuration error';
        errorCode = 'DATABASE_SCHEMA_ERROR';
      }

      if (!res.headersSent) {
        res.status(statusCode).json({
          success: false,
          message: userMessage,
          error: errorCode,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            code: error.code,
            requestId
          } : undefined
        });
      }
    }
  };

    /**
   * Get all workspaces (Admin-level access)
   * GET /api/admin/workspaces
   */
  public getAllWorkspacesAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;

      console.log('🏢 Admin WorkspaceController: Getting all workspaces');

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Query to get all workspaces with statistics
      const query = `
        SELECT 
          w.id,
          w.name,
          w.slug,
          w.display_name,
          w.description,
          w.logo_url,
          w.settings,
          w.is_active,
          w.created_at,
          w.updated_at,
          COUNT(DISTINCT ura.user_id) as member_count,
          COUNT(DISTINCT d.id) as dashboard_count,
          COUNT(DISTINCT dt.id) as dataset_count
        FROM workspaces w
        LEFT JOIN user_role_assignments ura ON w.id = ura.workspace_id AND ura.is_active = true
        LEFT JOIN dashboards d ON w.id = d.workspace_id AND d.is_active = true
        LEFT JOIN datasets dt ON w.id = dt.workspace_id AND dt.is_active = true
        GROUP BY w.id, w.name, w.slug, w.display_name, w.description, w.logo_url, w.settings, w.is_active, w.created_at, w.updated_at
        ORDER BY w.created_at DESC
      `;

      const result = await this.db.query(query, []);
      const workspaces = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        display_name: row.display_name,
        description: row.description,
        logo_url: row.logo_url,
        settings: row.settings,
        is_active: row.is_active,
        member_count: parseInt(row.member_count) || 0,
        dashboard_count: parseInt(row.dashboard_count) || 0,
        dataset_count: parseInt(row.dataset_count) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      res.status(200).json({
        success: true,
        message: 'All workspaces retrieved successfully',
        data: workspaces,
        count: workspaces.length
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Get all workspaces error:', error);
      logger.error('Admin get all workspaces controller error:', {
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspaces',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Create workspace (Admin-level)
   * POST /api/admin/workspaces
   */
  public createWorkspaceAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const { name, display_name, description, owner_id } = req.body;

      console.log('🏢 Admin WorkspaceController: Creating workspace:', { name, owner_id });

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Workspace name is required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      // Create workspace using WorkspaceService
      const workspace = await this.workspaceService.createWorkspace({
        name,
        display_name: display_name || name,
        description: description || '',
        owner_id: owner_id || userId // Use specified owner or current user
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspace
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Create workspace error:', error);
      logger.error('Admin create workspace controller error:', {
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Get workspace by ID (Admin-level)
   * GET /api/admin/workspaces/:workspaceId
   */
  public getWorkspaceByIdAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;

      console.log('🏢 Admin WorkspaceController: Getting workspace by ID:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Get detailed workspace information
      const query = `
        SELECT 
          w.*,
          COUNT(DISTINCT ura.user_id) as member_count,
          COUNT(DISTINCT d.id) as dashboard_count,
          COUNT(DISTINCT dt.id) as dataset_count,
          u.email as owner_email,
          u.name as owner_name
        FROM workspaces w
        LEFT JOIN user_role_assignments ura ON w.id = ura.workspace_id AND ura.is_active = true
        LEFT JOIN dashboards d ON w.id = d.workspace_id AND d.is_active = true
        LEFT JOIN datasets dt ON w.id = dt.workspace_id AND dt.is_active = true
        LEFT JOIN users u ON w.owner_id = u.id
        WHERE w.id = $1 OR w.slug = $1
        GROUP BY w.id, u.email, u.name
      `;

      const result = await this.db.query(query, [workspaceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      const row = result.rows[0];
      const workspace = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        display_name: row.display_name,
        description: row.description,
        logo_url: row.logo_url,
        settings: row.settings,
        is_active: row.is_active,
        owner_id: row.owner_id,
        owner_email: row.owner_email,
        owner_name: row.owner_name,
        member_count: parseInt(row.member_count) || 0,
        dashboard_count: parseInt(row.dashboard_count) || 0,
        dataset_count: parseInt(row.dataset_count) || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      res.status(200).json({
        success: true,
        message: 'Workspace retrieved successfully',
        data: workspace
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Get workspace by ID error:', error);
      logger.error('Admin get workspace by ID controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Update workspace (Admin-level)
   * PUT /api/admin/workspaces/:workspaceId
   */
  public updateWorkspaceAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;
      const updateData = req.body;

      console.log('🏢 Admin WorkspaceController: Updating workspace:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Admin can update any workspace, so we don't use the regular updateWorkspace method
      const allowedFields = ['name', 'display_name', 'description', 'logo_url', 'settings', 'is_active', 'owner_id'];
      const updates = {};
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates[key] = `$${paramIndex}`;
          values.push(value);
          paramIndex++;
        }
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
          error: 'NO_VALID_FIELDS'
        });
        return;
      }

      const updateQuery = `
        UPDATE workspaces 
        SET ${Object.entries(updates).map(([key, placeholder]) => `${key} = ${placeholder}`).join(', ')},
            updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(workspaceId);
      const result = await this.db.query(updateQuery, values);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Workspace updated successfully',
        data: result.rows[0]
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Update workspace error:', error);
      logger.error('Admin update workspace controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Delete workspace (Admin-level)
   * DELETE /api/admin/workspaces/:workspaceId
   */
  public deleteWorkspaceAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;

      console.log('🏢 Admin WorkspaceController: Deleting workspace:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // For safety, we'll do a soft delete by setting is_active = false
      const query = `
        UPDATE workspaces 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 OR slug = $1
        RETURNING id, name, slug
      `;

      const result = await this.db.query(query, [workspaceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Workspace deleted successfully',
        data: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          slug: result.rows[0].slug,
          deleted: true
        }
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Delete workspace error:', error);
      logger.error('Admin delete workspace controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Get workspace members (Admin-level)
   * GET /api/admin/workspaces/:workspaceId/members
   */
  public getWorkspaceMembersAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;

      console.log('🏢 Admin WorkspaceController: Getting workspace members:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      const query = `
        SELECT 
          u.id,
          u.email,
          u.name,
          u.avatar_url,
          u.is_active as user_active,
          ura.role_id,
          r.name as role_name,
          r.display_name as role_display_name,
          ura.assigned_at,
          ura.assigned_by,
          ura.is_active as assignment_active,
          assigner.email as assigned_by_email
        FROM users u
        INNER JOIN user_role_assignments ura ON u.id = ura.user_id
        LEFT JOIN roles r ON ura.role_id = r.id
        LEFT JOIN users assigner ON ura.assigned_by = assigner.id
        WHERE ura.workspace_id = $1
        ORDER BY ura.assigned_at ASC
      `;

      const result = await this.db.query(query, [workspaceId]);
      const members = result.rows.map(row => ({
        id: row.id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        user_active: row.user_active,
        role_id: row.role_id,
        role_name: row.role_name,
        role_display_name: row.role_display_name,
        assigned_at: row.assigned_at,
        assigned_by: row.assigned_by,
        assigned_by_email: row.assigned_by_email,
        assignment_active: row.assignment_active
      }));

      res.status(200).json({
        success: true,
        message: 'Workspace members retrieved successfully',
        data: members,
        count: members.length
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Get workspace members error:', error);
      logger.error('Admin get workspace members controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspace members',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Add member to workspace (Admin-level)
   * POST /api/admin/workspaces/:workspaceId/members
   */
  public addWorkspaceMemberAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;
      const { user_id, role_id, email } = req.body;

      console.log('🏢 Admin WorkspaceController: Adding workspace member:', { workspaceId, user_id, email });

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!user_id && !email) {
        res.status(400).json({
          success: false,
          message: 'User ID or email is required',
          error: 'MISSING_USER_IDENTIFIER'
        });
        return;
      }

      let targetUserId = user_id;

      // If email provided instead of user_id, find the user
      if (!targetUserId && email) {
        const userQuery = 'SELECT id FROM users WHERE email = $1';
        const userResult = await this.db.query(userQuery, [email]);
        
        if (userResult.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'User not found with that email',
            error: 'USER_NOT_FOUND'
          });
          return;
        }
        
        targetUserId = userResult.rows[0].id;
      }

      // Check if user is already a member
      const existingQuery = `
        SELECT id FROM user_role_assignments 
        WHERE user_id = $1 AND workspace_id = $2 AND is_active = true
      `;
      const existingResult = await this.db.query(existingQuery, [targetUserId, workspaceId]);

      if (existingResult.rows.length > 0) {
        res.status(409).json({
          success: false,
          message: 'User is already a member of this workspace',
          error: 'ALREADY_MEMBER'
        });
        return;
      }

      // Add the user to the workspace
      const insertQuery = `
        INSERT INTO user_role_assignments (user_id, workspace_id, role_id, assigned_by, assigned_at, is_active)
        VALUES ($1, $2, $3, $4, NOW(), true)
        RETURNING id
      `;

      const insertResult = await this.db.query(insertQuery, [
        targetUserId, 
        workspaceId, 
        role_id || 'viewer', // Default to viewer role if not specified
        userId
      ]);

      res.status(201).json({
        success: true,
        message: 'User added to workspace successfully',
        data: {
          assignment_id: insertResult.rows[0].id,
          user_id: targetUserId,
          workspace_id: workspaceId,
          role_id: role_id || 'viewer'
        }
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Add workspace member error:', error);
      logger.error('Admin add workspace member controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to add user to workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Update workspace member role (Admin-level)
   * PUT /api/admin/workspaces/:workspaceId/members/:userId
   */
  public updateWorkspaceMemberAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;
      const targetUserId = req.params.userId;
      const { role_id } = req.body;

      console.log('🏢 Admin WorkspaceController: Updating workspace member:', { workspaceId, targetUserId, role_id });

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!role_id) {
        res.status(400).json({
          success: false,
          message: 'Role ID is required',
          error: 'MISSING_ROLE_ID'
        });
        return;
      }

      const updateQuery = `
        UPDATE user_role_assignments 
        SET role_id = $1, updated_at = NOW()
        WHERE user_id = $2 AND workspace_id = $3 AND is_active = true
        RETURNING id
      `;

      const result = await this.db.query(updateQuery, [role_id, targetUserId, workspaceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Workspace member not found',
          error: 'MEMBER_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Workspace member role updated successfully',
        data: {
          assignment_id: result.rows[0].id,
          user_id: targetUserId,
          workspace_id: workspaceId,
          new_role_id: role_id
        }
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Update workspace member error:', error);
      logger.error('Admin update workspace member controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        targetUserId: req.params.userId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update workspace member',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Remove member from workspace (Admin-level)
   * DELETE /api/admin/workspaces/:workspaceId/members/:userId
   */
  public removeWorkspaceMemberAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;
      const targetUserId = req.params.userId;

      console.log('🏢 Admin WorkspaceController: Removing workspace member:', { workspaceId, targetUserId });

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Soft delete - set is_active to false
      const updateQuery = `
        UPDATE user_role_assignments 
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1 AND workspace_id = $2 AND is_active = true
        RETURNING id
      `;

      const result = await this.db.query(updateQuery, [targetUserId, workspaceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Workspace member not found',
          error: 'MEMBER_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User removed from workspace successfully',
        data: {
          assignment_id: result.rows[0].id,
          user_id: targetUserId,
          workspace_id: workspaceId,
          removed: true
        }
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Remove workspace member error:', error);
      logger.error('Admin remove workspace member controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        targetUserId: req.params.userId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to remove user from workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Get workspace statistics (Admin-level)
   * GET /api/admin/workspaces/:workspaceId/stats
   */
  public getWorkspaceStatsAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;

      console.log('🏢 Admin WorkspaceController: Getting workspace stats:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      // Get comprehensive workspace statistics
      const query = `
        SELECT 
          w.name,
          w.slug,
          w.created_at,
          COUNT(DISTINCT ura.user_id) FILTER (WHERE ura.is_active = true) as active_members,
          COUNT(DISTINCT d.id) FILTER (WHERE d.is_active = true) as active_dashboards,
          COUNT(DISTINCT dt.id) FILTER (WHERE dt.is_active = true) as active_datasets,
          COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = true) as active_charts,
          COUNT(DISTINCT ds.id) FILTER (WHERE ds.is_active = true) as active_datasources
        FROM workspaces w
        LEFT JOIN user_role_assignments ura ON w.id = ura.workspace_id
        LEFT JOIN dashboards d ON w.id = d.workspace_id
        LEFT JOIN datasets dt ON w.id = dt.workspace_id
        LEFT JOIN charts c ON w.id = c.workspace_id
        LEFT JOIN datasources ds ON w.id = ds.workspace_id
        WHERE w.id = $1 OR w.slug = $1
        GROUP BY w.id, w.name, w.slug, w.created_at
      `;

      const result = await this.db.query(query, [workspaceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      const row = result.rows[0];
      const stats = {
        workspace_name: row.name,
        workspace_slug: row.slug,
        created_at: row.created_at,
        active_members: parseInt(row.active_members) || 0,
        active_dashboards: parseInt(row.active_dashboards) || 0,
        active_datasets: parseInt(row.active_datasets) || 0,
        active_charts: parseInt(row.active_charts) || 0,
        active_datasources: parseInt(row.active_datasources) || 0
      };

      res.status(200).json({
        success: true,
        message: 'Workspace statistics retrieved successfully',
        data: stats
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Get workspace stats error:', error);
      logger.error('Admin get workspace stats controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve workspace statistics',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Update workspace status (Admin-level)
   * PATCH /api/admin/workspaces/:workspaceId/status
   */
  public updateWorkspaceStatusAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;
      const { is_active } = req.body;

      console.log('🏢 Admin WorkspaceController: Updating workspace status:', { workspaceId, is_active });

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (typeof is_active !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'is_active must be a boolean value',
          error: 'INVALID_STATUS_VALUE'
        });
        return;
      }

      const updateQuery = `
        UPDATE workspaces 
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2 OR slug = $2
        RETURNING id, name, slug, is_active
      `;

      const result = await this.db.query(updateQuery, [is_active, workspaceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      const workspace = result.rows[0];

      res.status(200).json({
        success: true,
        message: `Workspace ${is_active ? 'activated' : 'suspended'} successfully`,
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          is_active: workspace.is_active,
          status: workspace.is_active ? 'active' : 'suspended'
        }
      });

    } catch (error: any) {
      console.error('❌ Admin WorkspaceController: Update workspace status error:', error);
      logger.error('Admin update workspace status controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update workspace status',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Get workspace by ID
   * GET /api/workspaces/:workspaceId
   */
  public getWorkspaceById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const userId = req.user?.user_id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const workspace = await this.workspaceService.getWorkspaceById(workspaceId, userId);

      if (!workspace) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: workspace,
        message: 'Workspace retrieved successfully'
      });

    } catch (error: any) {
      logger.error('Get workspace by ID controller error:', {
        workspaceId: req.params.workspaceId,
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(400).json({
        success: false,
        message: error.message,
        error: 'GET_WORKSPACE_ERROR'
      });
    }
  };

  /**
   * Create new workspace
   * POST /api/workspaces
   */
  public createWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceData = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!workspaceData.name) {
        res.status(400).json({
          success: false,
          message: 'Workspace name is required'
        });
        return;
      }

      const workspace = await this.workspaceService.createWorkspace(workspaceData, userId);

      res.status(201).json({
        success: true,
        data: workspace,
        message: 'Workspace created successfully'
      });

    } catch (error: any) {
      logger.error('Create workspace controller error:', {
        error: error.message,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(400).json({
        success: false,
        message: error.message,
        error: 'CREATE_WORKSPACE_ERROR'
      });
    }
  };

  /**
   * Update workspace
   * PUT /api/workspaces/:workspaceId
   */
  public updateWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;
      const updateData = req.body;

      console.log('🏢 WorkspaceController: Updating workspace:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          error: 'MISSING_WORKSPACE_ID'
        });
        return;
      }

      // Update workspace using WorkspaceService
      const workspace = await this.workspaceService.updateWorkspace(workspaceId, updateData, userId);

      if (!workspace) {
        res.status(404).json({
          success: false,
          message: 'Workspace not found or access denied',
          error: 'WORKSPACE_NOT_FOUND'
        });
        return;
      }

      console.log('✅ WorkspaceController: Workspace updated:', workspace.id);

      res.status(200).json({
        success: true,
        message: 'Workspace updated successfully',
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          display_name: workspace.display_name,
          description: workspace.description,
          logo_url: workspace.logo_url,
          settings: workspace.settings,
          is_active: workspace.is_active,
          user_role: workspace.user_role,
          member_count: workspace.member_count,
          dashboard_count: workspace.dashboard_count,
          dataset_count: workspace.dataset_count,
          created_at: workspace.created_at,
          updated_at: workspace.updated_at
        }
      });

    } catch (error: any) {
      console.error('❌ WorkspaceController: Update workspace error:', error);
      logger.error('Update workspace controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
   * Delete workspace
   * DELETE /api/workspaces/:workspaceId
   */
  public deleteWorkspace = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.user_id;
      const workspaceId = req.params.workspaceId;

      console.log('🏢 WorkspaceController: Deleting workspace:', workspaceId);

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTHENTICATION_REQUIRED'
        });
        return;
      }

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: 'Workspace ID is required',
          error: 'MISSING_WORKSPACE_ID'
        });
        return;
      }

      // For now, we'll just return success since WorkspaceService doesn't have delete method
      // In a real implementation, you'd add a delete method to WorkspaceService

      res.status(200).json({
        success: true,
        message: 'Workspace deletion not implemented yet',
        data: {
          workspaceId,
          status: 'pending_implementation'
        }
      });

    } catch (error: any) {
      console.error('❌ WorkspaceController: Delete workspace error:', error);
      logger.error('Delete workspace controller error:', {
        error: error.message,
        workspaceId: req.params.workspaceId,
        user_id: req.user?.user_id,
        service: 'bi-platform-api'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete workspace',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };

  /**
 * Toggle workspace status (Admin-level)
 * POST /api/admin/workspaces/:workspaceId/activate
 */
public toggleWorkspaceStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.user_id;
    const workspaceId = req.params.workspaceId;
    const { is_active } = req.body;

    console.log('🏢 Admin WorkspaceController: Toggling workspace status:', { workspaceId, is_active });

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    if (typeof is_active !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'is_active must be a boolean value',
        error: 'INVALID_STATUS_VALUE'
      });
      return;
    }

    // Ensure database connection exists
    if (!this.db) {
      console.error('❌ Database connection not available in WorkspaceController');
      res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: 'DATABASE_CONNECTION_ERROR'
      });
      return;
    }

    const updateQuery = `
      UPDATE workspaces 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.db.query(updateQuery, [is_active, workspaceId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Workspace not found',
        error: 'WORKSPACE_NOT_FOUND'
      });
      return;
    }

    const workspace = result.rows[0];

    res.status(200).json({
      success: true,
      message: `Workspace ${is_active ? 'activated' : 'deactivated'} successfully`,
      data: workspace
    });

  } catch (error: any) {
    console.error('❌ Admin WorkspaceController: Toggle workspace status error:', error);
    logger.error('Admin toggle workspace status controller error:', {
      error: error.message,
      workspaceId: req.params.workspaceId,
      user_id: req.user?.user_id,
      service: 'bi-platform-api'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to toggle workspace status',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

}