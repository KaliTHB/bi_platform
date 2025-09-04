// api-services/src/routes/auth.routes.ts (Debug Version)
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/authentication';
import { validateRequest } from '../middleware/validation';

const router = Router();
const authController = new AuthController();

// Debug: Check which methods exist
console.log('=== AuthController Debug Info ===');
console.log('authController:', typeof authController);
console.log('authController.login:', typeof authController.login);
console.log('authController.register:', typeof authController.register);
console.log('authController.logout:', typeof authController.logout);
console.log('authController.getCurrentUser:', typeof authController.getCurrentUser);
console.log('authController.validateToken:', typeof authController.validateToken);
console.log('validateRequest:', typeof validateRequest);
console.log('authenticate:', typeof authenticate);
console.log('===================================');

// Check if methods exist before using them
const loginHandler = authController.login ? authController.login.bind(authController) : 
  (req: any, res: any) => res.status(500).json({ error: 'login method not found' });

const registerHandler = authController.register ? authController.register.bind(authController) : 
  (req: any, res: any) => res.status(500).json({ error: 'register method not found' });

const logoutHandler = authController.logout ? authController.logout.bind(authController) : 
  (req: any, res: any) => res.status(500).json({ error: 'logout method not found' });

const getCurrentUserHandler = authController.getCurrentUser ? authController.getCurrentUser.bind(authController) : 
  (req: any, res: any) => res.status(500).json({ error: 'getCurrentUser method not found' });

const validateTokenHandler = authController.validateToken ? authController.validateToken.bind(authController) : 
  (req: any, res: any) => res.status(500).json({ error: 'validateToken method not found' });

// Routes with error handling
router.post('/login', validateRequest('login'), loginHandler);
router.post('/register', validateRequest('register'), registerHandler);
router.post('/logout', authenticate, logoutHandler);
router.get('/me', authenticate, getCurrentUserHandler);
router.get('/validate', authenticate, validateTokenHandler);

export default router;