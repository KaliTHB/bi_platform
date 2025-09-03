// api-services/src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authController = new AuthController();

// Login with email
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