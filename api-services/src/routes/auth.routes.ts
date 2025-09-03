// api-services/src/routes/auth.routes.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger, logAudit } from '../utils/logger';
import { generateToken, blacklistToken } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validation';
import {
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  User
} from '../types/auth.types';

const router = express.Router();

// Login
router.post('/login', validateRequest('login'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password, workspace_slug } = req.body as LoginRequest;

  // Get user with workspace information
  const userResult = await DatabaseConfig.query(
    `SELECT u.*, 
            ARRAY_AGG(DISTINCT uw.workspace_id) FILTER (WHERE uw.workspace_id IS NOT NULL) as workspace_ids
     FROM users u
     LEFT JOIN user_workspaces uw ON u.id = uw.user_id AND uw.status = 'ACTIVE'
     WHERE u.email = $1 AND u.is_active = true
     GROUP BY u.id`,
    [email.toLowerCase()]
  );

  if (userResult.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = userResult.rows[0];

  // Verify password
  if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Get user's workspaces
  const workspacesResult = await DatabaseConfig.query(
    `SELECT w.*, uw.status as membership_status,
            ARRAY_AGG(DISTINCT r.name) as roles
     FROM workspaces w
     JOIN user_workspaces uw ON w.id = uw.workspace_id
     LEFT JOIN user_workspace_roles uwr ON w.id = uwr.workspace_id AND uwr.user_id = uw.user_id
     LEFT JOIN roles r ON uwr.role_id = r.id
     WHERE uw.user_id = $1 AND w.is_active = true
     GROUP BY w.id, uw.status
     ORDER BY w.name`,
    [user.id]
  );

  const workspaces = workspacesResult.rows;

  // If workspace_slug provided, validate access
  let selectedWorkspace = null;
  if (workspace_slug) {
    selectedWorkspace = workspaces.find(w => w.slug === workspace_slug);
    if (!selectedWorkspace) {
      return res.status(403).json({ error: 'No access to specified workspace' });
    }
  }

  // Generate JWT token
  const token = generateToken(user);

  // Update last login
  await DatabaseConfig.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [user.id]
  );

  // Log audit event
  logAudit('USER_LOGIN', user.id, selectedWorkspace?.id || 'system', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    workspace_slug
  });

  // Cache user data
  await CacheService.set(`user:${user.id}`, user, 900); // 15 minutes

  const response: LoginResponse = {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
      workspace_ids: user.workspace_ids || []
    },
    token,
    expires_in: 24 * 60 * 60, // 24 hours in seconds
    workspaces: workspaces.map(w => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      description: w.description,
      logo_url: w.logo_url,
      settings: w.settings,
      is_active: w.is_active,
      created_at: w.created_at,
      updated_at: w.updated_at,
      user_roles: w.roles || []
    }))
  };

  res.json(response);
}));

// Logout
router.post('/logout', asyncHandler(async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    await blacklistToken(token);
  }

  res.json({ message: 'Logged out successfully' });
}));

// Register new user (admin only or invitation)
router.post('/register', validateRequest('register'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password, first_name, last_name, invitation_token } = req.body;

  // Check if registration is via invitation
  let invitation = null;
  if (invitation_token) {
    const inviteResult = await DatabaseConfig.query(
      `SELECT ui.*, w.name as workspace_name, w.slug as workspace_slug
       FROM user_invitations ui
       JOIN workspaces w ON ui.workspace_id = w.id
       WHERE ui.token = $1 AND ui.status = 'PENDING' AND ui.expires_at > NOW()`,
      [invitation_token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    invitation = inviteResult.rows[0];
  }

  // Check if user already exists
  const existingUser = await DatabaseConfig.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingUser.rows.length > 0) {
    return res.status(409).json({ error: 'User already exists' });
  }

  // Hash password
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Create user in transaction
  const result = await DatabaseConfig.transaction(async (client) => {
    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email.toLowerCase(), password_hash, first_name, last_name, !!invitation]
    );

    const newUser = userResult.rows[0];

    if (invitation) {
      // Add user to workspace
      await client.query(
        'INSERT INTO user_workspaces (user_id, workspace_id, status) VALUES ($1, $2, $3)',
        [newUser.id, invitation.workspace_id, 'ACTIVE']
      );

      // Assign roles from invitation
      for (const roleId of invitation.role_ids) {
        await client.query(
          'INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by) VALUES ($1, $2, $3, $4)',
          [newUser.id, invitation.workspace_id, roleId, invitation.invited_by]
        );
      }

      // Mark invitation as accepted
      await client.query(
        'UPDATE user_invitations SET status = $1 WHERE id = $2',
        ['ACCEPTED', invitation.id]
      );
    }

    return newUser;
  });

  // Log audit event
  logAudit('USER_REGISTER', result.id, invitation?.workspace_id || 'system', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    via_invitation: !!invitation
  });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: result.id,
      email: result.email,
      first_name: result.first_name,
      last_name: result.last_name,
      is_active: result.is_active
    }
  });
}));

// Request password reset
router.post('/forgot-password', validateRequest('forgotPassword'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email } = req.body as PasswordResetRequest;

  const user = await DatabaseConfig.query(
    'SELECT id, email FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase()]
  );

  // Always return success to prevent email enumeration
  if (user.rows.length === 0) {
    return res.json({ message: 'If the email exists, a reset link has been sent' });
  }

  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user.rows[0].id, type: 'password_reset' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  // Store reset token in cache (1 hour expiry)
  await CacheService.set(`password_reset:${resetToken}`, user.rows[0].id, 3600);

  // TODO: Send email with reset link
  // For now, log the token (in production, this should send an email)
  logger.info('Password reset requested', {
    userId: user.rows[0].id,
    email: user.rows[0].email,
    resetToken
  });

  logAudit('PASSWORD_RESET_REQUEST', user.rows[0].id, 'system', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({ message: 'If the email exists, a reset link has been sent' });
}));

// Reset password
router.post('/reset-password', validateRequest('resetPassword'), asyncHandler(async (req: express.Request, res: express.Response) => {
  const { token, new_password } = req.body as PasswordResetConfirm;

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Check if token exists in cache
    const cachedUserId = await CacheService.get(`password_reset:${token}`);
    if (!cachedUserId || cachedUserId !== decoded.userId) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await DatabaseConfig.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, decoded.userId]
    );

    // Remove reset token from cache
    await CacheService.del(`password_reset:${token}`);

    logAudit('PASSWORD_RESET_COMPLETE', decoded.userId, 'system', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
}));

// Verify token
router.get('/verify', asyncHandler(async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if token is blacklisted
    const isBlacklisted = await CacheService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Get current user data
    const result = await DatabaseConfig.query(
      'SELECT id, email, first_name, last_name, role, avatar_url, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      valid: true,
      user: result.rows[0]
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}));

export default router;