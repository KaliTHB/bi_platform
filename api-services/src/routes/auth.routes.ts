import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../config/database';
import { CacheService } from '../config/redis';
import { validateLogin, validateRegister } from '../middleware/validation';
import { authRateLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/authentication';

const router = Router();

// Initialize services
const db = new DatabaseService();
const cache = new CacheService();
const authService = new AuthService(db, cache);
const authController = new AuthController(authService);

// Public routes
router.post('/login', 
  authRateLimiter,
  validateLogin,
  authController.login.bind(authController)
);

router.post('/register',
  authRateLimiter,
  validateRegister,
  authController.register.bind(authController)
);

router.post('/refresh',
  authRateLimiter,
  authController.refresh.bind(authController)
);

// Protected routes
router.post('/logout',
  authenticate,
  authController.logout.bind(authController)
);

router.get('/profile',
  authenticate,
  authController.getProfile.bind(authController)
);

export default router;