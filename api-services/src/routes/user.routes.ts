// api-services/src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { validateRequest, validateQuery, validateUuid } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const userController = new UserController();

// Apply authentication to all routes
router.use(authenticate);

// Get all users in workspace with pagination and search
router.get('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  validateQuery('pagination'),
  asyncHandler(userController.getUsers.bind(userController))
);

// Get specific user by ID
router.get('/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  validateUuid('userId'),
  asyncHandler(userController.getUserById.bind(userController))
);

// Create new user
router.post('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  validateRequest('createUser'),
  asyncHandler(userController.createUser.bind(userController))
);

// Update user
router.put('/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  validateUuid('userId'),
  validateRequest('updateUser'),
  asyncHandler(userController.updateUser.bind(userController))
);

// Delete user
router.delete('/:userId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  validateUuid('userId'),
  asyncHandler(userController.deleteUser.bind(userController))
);

// Bulk operations
router.post('/bulk/invite',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  validateRequest('bulkInviteUsers'),
  asyncHandler(userController.bulkInviteUsers.bind(userController))
);

router.patch('/bulk/status',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  validateRequest('bulkUpdateStatus'),
  asyncHandler(userController.bulkUpdateUserStatus.bind(userController))
);

// User profile operations (self-service)
router.get('/profile/me',
  asyncHandler(userController.getCurrentUserProfile.bind(userController))
);

router.put('/profile/me',
  validateRequest('updateProfile'),
  asyncHandler(userController.updateCurrentUserProfile.bind(userController))
);

router.post('/profile/change-password',
  validateRequest('changePassword'),
  asyncHandler(userController.changePassword.bind(userController))
);

// User activity and audit
router.get('/:userId/activity',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  validateUuid('userId'),
  validateQuery('pagination'),
  asyncHandler(userController.getUserActivity.bind(userController))
);

export default router;

// ===================================================================
// api-services/src/routes/auth.routes.ts - Enhanced version
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/validation';
import { AuthController } from '../controllers/AuthController';

const router = express.Router();
const authController = new AuthController();

// Login with email or username
router.post('/login', 
  validateRequest('login'),
  asyncHandler(authController.login.bind(authController))
);

// Alternative login endpoint supporting both email and username
router.post('/login-flexible',
  validateRequest('loginWithUsername'), 
  asyncHandler(authController.loginFlexible.bind(authController))
);

// Register new user
router.post('/register',
  validateRequest('register'),
  asyncHandler(authController.register.bind(authController))
);

// Logout
router.post('/logout',
  asyncHandler(authController.logout.bind(authController))
);

// Verify token
router.get('/verify',
  asyncHandler(authController.verifyToken.bind(authController))
);

// Password reset flow
router.post('/forgot-password',
  validateRequest('forgotPassword'),
  asyncHandler(authController.forgotPassword.bind(authController))
);

router.post('/reset-password',
  validateRequest('resetPassword'),
  asyncHandler(authController.resetPassword.bind(authController))
);

// Check email/username availability
router.get('/check-availability',
  asyncHandler(authController.checkAvailability.bind(authController))
);

export default router;