import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';

export class AuthController {
  constructor(private authService: AuthService) {}

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, workspace_slug } = req.body;
      
      const result = await this.authService.login(username, password, workspace_slug);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = req.body;
      
      const result = await this.authService.register(userData);
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      const result = await this.authService.refreshTokens(refreshToken);
      
      res.json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      
      if (userId) {
        await this.authService.logout(userId);
      }
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const workspaceId = req.headers['x-workspace-id'] as string;
      
      const profile = await this.authService.getUserProfile(userId, workspaceId);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }
}