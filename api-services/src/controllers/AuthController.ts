// api-services/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { ValidationError, UnauthorizedError } from '../middleware/errorHandler';

interface LoginRequest {
  email: string;
  password: string;
  workspace_slug?: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
    logger.info('AuthController initialized', {
      service: 'bi-platform-api'
    });
  }

  // Login method
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, workspace_slug } = req.body as LoginRequest;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Authenticate user with proper error handling
      let user;
      try {
        user = await this.authService.authenticateUser(email, password);
      } catch (dbError: any) {
        // Handle database connection errors specifically
        logger.error('Database connection error during authentication:', {
          error: dbError.message,
          code: dbError.code,
          service: 'bi-platform-api'
        });
        
        res.status(503).json({
          success: false,
          message: 'Database connection error. Please try again.',
          error: 'SERVICE_UNAVAILABLE'
        });
        return;
      }
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
        return;
      }

      // Get workspace if slug provided
      let workspace = null;
      if (workspace_slug) {
        try {
          workspace = await this.authService.getWorkspaceBySlug(workspace_slug);
          if (!workspace) {
            res.status(400).json({
              success: false,
              message: 'Invalid workspace'
            });
            return;
          }

          // Check if user has access to this workspace
          const hasAccess = await this.authService.checkUserWorkspaceAccess(user.id, workspace.id);
          if (!hasAccess) {
            res.status(403).json({
              success: false,
              message: 'No access to this workspace'
            });
            return;
          }
        } catch (workspaceError: any) {
          logger.error('Workspace access error:', workspaceError);
          res.status(500).json({
            success: false,
            message: 'Error checking workspace access'
          });
          return;
        }
      }

      // Update last login (non-blocking)
      this.authService.updateLastLogin(user.id).catch(updateError => {
        logger.warn('Failed to update last login:', updateError);
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          user_id: user.id,
          email: user.email,
          workspace_id: workspace?.id || null,
        },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        workspaceId: workspace?.id,
        service: 'bi-platform-api'
      });

      // Send success response
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          },
          workspace: workspace ? {
            id: workspace.id,
            name: workspace.name,
            display_name: workspace.display_name,
            slug: workspace.slug
          } : null
        }
      });

    } catch (error: any) {
      logger.error('Unexpected login error:', {
        error: error.message,
        stack: error.stack,
        service: 'bi-platform-api'
      });
      
      // Send generic error response
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'AUTHENTICATION_ERROR'
      });
    }
  }

  // Register method
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, first_name, last_name } = req.body;

      // Basic validation (more handled by middleware)
      if (!username || !email || !password || !first_name || !last_name) {
        res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
        return;
      }

      // Create user
      const user = await this.authService.createUser({
        username,
        email,
        password,
        first_name,
        last_name
      });

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        service: 'bi-platform-api'
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          }
        }
      });

    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Logout method
  public async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('User logged out', {
        userId: req.user?.user_id
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get current user method
  public async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.user_id) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const user = await this.authService.getUserById(req.user.user_id);
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url
        }
      });
    } catch (error: any) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Validate token method
  public async validateToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user_id: req.user?.user_id,
          email: req.user?.email,
          workspace_id: req.user?.workspace_id
        }
      });
    } catch (error: any) {
      logger.error('Token validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}