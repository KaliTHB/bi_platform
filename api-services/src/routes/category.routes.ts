// api-services/src/routes/category.routes.ts
import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authenticate } from '../middleware/authentication';

const router = Router();
const categoryController = new CategoryController();

router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.put('/:categoryId', categoryController.updateCategory);
router.delete('/:categoryId', categoryController.deleteCategory);

export default router;