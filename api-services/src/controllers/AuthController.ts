// api-services/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../config/database'; // ✅ Correct import path
import { logger } from '../utils/logger';

export class AuthController {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  // Standard login with email
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, workspace_slug } = req.body;

      // Get user with workspace information
      const userResult = await this.db.query(`
        SELECT u.*, 
               ARRAY_AGG(DISTINCT uw.workspace_id) FILTER (WHERE uw.workspace_id IS NOT NULL) as workspace_ids
        FROM users u
        LEFT JOIN user_workspaces uw ON u.id = uw.user_id AND uw.status = 'ACTIVE'
        WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true
        GROUP BY u.id
      `, [email]);

      if (userResult.rows.length === 0) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      const user = userResult.rows[0];

      // Verify password
      if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Update last login
      await this.db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          },
          token,
          workspace_ids: user.workspace_ids || []
        },
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Error during login:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Flexible login with email or username
  async loginFlexible(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password, workspace_slug } = req.body;

      // Determine if identifier is email or username
      const isEmail = identifier.includes('@');
      const field = isEmail ? 'email' : 'username';

      const userResult = await this.db.query(`
        SELECT u.*, 
               ARRAY_AGG(DISTINCT uw.workspace_id) FILTER (WHERE uw.workspace_id IS NOT NULL) as workspace_ids
        FROM users u
        LEFT JOIN user_workspaces uw ON u.id = uw.user_id AND uw.status = 'ACTIVE'
        WHERE LOWER(u.${field}) = LOWER($1) AND u.is_active = true
        GROUP BY u.id
      `, [identifier]);

      if (userResult.rows.length === 0) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      const user = userResult.rows[0];

      // Verify password
      if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
        res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          username: user.username
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Update last login
      await this.db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          },
          token,
          workspace_ids: user.workspace_ids || []
        },
        message: 'Login successful'
      });
    } catch (error) {
      logger.error('Error during flexible login:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Register new user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        username,
        email,
        password,
        first_name,
        last_name,
        invitation_token
      } = req.body;

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userResult = await this.db.query(`
        INSERT INTO users (
          username, email, password_hash, first_name, last_name,
          is_active, email_verified, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, false, NOW(), NOW())
        RETURNING id, username, email, first_name, last_name, created_at
      `, [username.toLowerCase(), email.toLowerCase(), passwordHash, first_name, last_name]);

      const newUser = userResult.rows[0];

      logger.info('User registered successfully', {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            first_name: newUser.first_name,
            last_name: newUser.last_name
          }
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      logger.error('Error during registration:', error);

      // Handle specific database errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          res.status(409).json({
            success: false,
            message: 'User with this email or username already exists',
            error: 'DUPLICATE_USER'
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Logout
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a real implementation, you would blacklist the JWT token
      // For now, we'll just return success
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Error during logout:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Verify token
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({
          success: false,
          valid: false,
          message: 'No token provided'
        });
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
        
        // Get user information
        const userResult = await this.db.query(
          'SELECT id, username, email, first_name, last_name, avatar_url FROM users WHERE id = $1 AND is_active = true',
          [decoded.userId]
        );

        if (userResult.rows.length === 0) {
          res.status(401).json({
            success: false,
            valid: false,
            message: 'User not found'
          });
          return;
        }

        res.json({
          success: true,
          valid: true,
          user: userResult.rows[0]
        });
      } catch (jwtError) {
        res.status(401).json({
          success: false,
          valid: false,
          message: 'Invalid token'
        });
      }
    } catch (error) {
      logger.error('Error during token verification:', error);
      res.status(500).json({
        success: false,
        valid: false,
        message: 'Token verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Forgot password
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Check if user exists
      const userResult = await this.db.query(
        'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
        [email]
      );

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset email has been sent'
      });

      // If user exists, you would send a password reset email here
      if (userResult.rows.length > 0) {
        logger.info('Password reset requested', {
          email: userResult.rows[0].email,
          userId: userResult.rows[0].id
        });
        // TODO: Send password reset email
      }
    } catch (error) {
      logger.error('Error during forgot password:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, new_password } = req.body;

      // TODO: Verify reset token (this would be stored in database or JWT)
      // For now, we'll just return an error
      res.status(400).json({
        success: false,
        message: 'Password reset functionality not implemented'
      });
    } catch (error) {
      logger.error('Error during password reset:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check availability of email/username
  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { email, username } = req.query as { email?: string; username?: string };

      const results: { email?: boolean; username?: boolean } = {};

      if (email) {
        const emailResult = await this.db.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        );
        results.email = emailResult.rows.length === 0;
      }

      if (username) {
        const usernameResult = await this.db.query(
          'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
          [username]
        );
        results.username = usernameResult.rows.length === 0;
      }

      res.json({
        success: true,
        data: {
          available: results
        }
      });
    } catch (error) {
      logger.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check availability',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}