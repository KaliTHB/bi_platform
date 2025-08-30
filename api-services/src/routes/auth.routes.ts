import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validation';
import { loginSchema, refreshTokenSchema, switchWorkspaceSchema } from '../schemas/auth.schemas';

const router = Router();
const authController = new AuthController();

// Login
router.post('/login', validateRequest(loginSchema), authController.login);

// Refresh token
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

// Switch workspace
router.post('/switch-workspace', validateRequest(switchWorkspaceSchema), authController.switchWorkspace);

// Get current user info
router.get('/me', authController.getCurrentUser);

export default router;