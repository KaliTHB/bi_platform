// api-services/src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/authentication';
import { validateRequest } from '../middleware/validation';

const router = Router();
const authController = new AuthController();

// These should now work without TypeScript errors
router.post('/login', validateRequest('login'), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.get('/validate', authenticate, authController.validateToken);

export default router;