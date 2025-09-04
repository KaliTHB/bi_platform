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
    logger.info('AuthController initialized');
  }

  login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, workspace_slug } = req.body as LoginRequest;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
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
      
      // Return early to prevent further processing
      return res.status(503).json({
        success: false,
        message: 'Database connection error. Please try again.',
        error: 'SERVICE_UNAVAILABLE'
      });
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get workspace if slug provided
    let workspace = null;
    if (workspace_slug) {
      try {
        workspace = await this.authService.getWorkspaceBySlug(workspace_slug);
        if (!workspace) {
          return res.status(400).json({
            success: false,
            message: 'Invalid workspace'
          });
        }

        // Check if user has access to this workspace
        const hasAccess = await this.authService.checkUserWorkspaceAccess(user.id, workspace.id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'No access to this workspace'
          });
        }
      } catch (workspaceError: any) {
        logger.error('Workspace access error:', workspaceError);
        return res.status(500).json({
          success: false,
          message: 'Error checking workspace access'
        });
      }
    }

    // Update last login (non-blocking, log errors but don't fail)
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
    
    // Check if response was already sent
    if (res.headersSent) {
      logger.error('Headers already sent, cannot send error response');
      return;
    }
    
    // Send generic error response
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'AUTHENTICATION_ERROR'
    });
  }
};

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // In a more sophisticated setup, you would blacklist the token
      // For now, we'll just respond with success
      
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
  };

  getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user?.user_id) {
        throw new UnauthorizedError('User not authenticated');
      }

      const user = await this.authService.getUserById(req.user.user_id);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
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
      
      if (error instanceof UnauthorizedError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  };

  validateToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // If we reach here, the authentication middleware has validated the token
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
  };
}