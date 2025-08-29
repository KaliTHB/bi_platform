import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateLogin, validateRegister } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimit';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to auth routes
router.use(rateLimiter);

router.post('/login', validateLogin, authController.login);
router.post('/register', validateRegister, authController.register);
router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.post('/refresh-token', authController.refreshToken);
router.get('/workspaces', authController.getUserWorkspaces);

export default router;