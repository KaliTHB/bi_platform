// api-services/src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/authentication';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const userController = new UserController();

// Apply authentication to all routes
router.use(authenticate);

// Get all users
router.get('/',
  asyncHandler(userController.getUsers.bind(userController))
);

// Create new user
router.post('/',
  asyncHandler(userController.createUser.bind(userController))
);

// Update user
router.put('/:userId',
  asyncHandler(userController.updateUser.bind(userController))
);

// Delete user
router.delete('/:userId',
  asyncHandler(userController.deleteUser.bind(userController))
);

export default router;