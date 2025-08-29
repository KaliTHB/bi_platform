// api-services/src/routes/user.routes.ts
import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/authentication';

const router = Router();
const userController = new UserController();

router.use(authenticate);

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:userId', userController.updateUser);
router.delete('/:userId', userController.deleteUser);

export default router;