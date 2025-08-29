import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password, workspace_slug } = req.body;
      
      const result = await this.authService.login(username, password, workspace_slug);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful'
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Login failed',
        errors: [{ code: 'AUTH_FAILED', message: 'Invalid credentials or workspace' }]
      });
    }
  };

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData = req.body;
      
      const result = await this.authService.register(userData);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed',
        errors: [{ code: 'REGISTRATION_FAILED', message: error.message }]
      });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        await this.authService.logout(token);
      }
      
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        errors: [{ code: 'LOGOUT_FAILED', message: error.message }]
      });
    }
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
          errors: [{ code: 'UNAUTHORIZED', message: 'User not authenticated' }]
        });
        return;
      }
      
      const profile = await this.authService.getUserProfile(userId);
      
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error: any) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile',
        errors: [{ code: 'PROFILE_ERROR', message: error.message }]
      });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refresh_token } = req.body;
      
      const result = await this.authService.refreshToken(refresh_token);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Token refreshed successfully'
      });
    } catch (error: any) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Token refresh failed',
        errors: [{ code: 'TOKEN_REFRESH_FAILED', message: error.message }]
      });
    }
  };

  getUserWorkspaces = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }
      
      const workspaces = await this.authService.getUserWorkspaces(userId);
      
      res.status(200).json({
        success: true,
        data: workspaces
      });
    } catch (error: any) {
      logger.error('Get user workspaces error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user workspaces',
        errors: [{ code: 'WORKSPACES_ERROR', message: error.message }]
      });
    }
  };
}