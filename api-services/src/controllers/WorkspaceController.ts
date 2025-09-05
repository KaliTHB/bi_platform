// Fixed api-services/src/controllers/WorkspaceController.ts
// Robust version with comprehensive database validation

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authentication';
import { WorkspaceService, Workspace } from '../services/WorkspaceService';
import { logger } from '../utils/logger';

// Import database with validation
import { db, validateDbExport, getPoolHealth, testConnection } from '../utils/database';

export class WorkspaceController {
  private workspaceService: WorkspaceService;

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
      
      // Step 5: Initialize WorkspaceService
      console.log('🔍 Step 5: Initializing WorkspaceService...');
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
  
}