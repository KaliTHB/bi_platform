import { Router } from 'express';
import { DatasetController } from '../controllers/DatasetController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const datasetController = new DatasetController();

router.use(authenticate);

// All dataset routes with new permission system
router.get('/', 
  validateWorkspaceAccess, 
  requirePermission(['dataset.read']),
  asyncHandler(datasetController.getDatasets.bind(datasetController))
);

router.post('/', 
  validateWorkspaceAccess, 
  requirePermission(['dataset.create']),
  asyncHandler(datasetController.createDataset.bind(datasetController))
);

router.get('/:id', 
  validateWorkspaceAccess, 
  requirePermission(['dataset.read']),
  asyncHandler(datasetController.getDataset.bind(datasetController))
);

router.put('/:id', 
  validateWorkspaceAccess, 
  requirePermission(['dataset.update']),
  asyncHandler(datasetController.updateDataset.bind(datasetController))
);

router.delete('/:id', 
  validateWorkspaceAccess, 
  requirePermission(['dataset.delete']),
  asyncHandler(datasetController.deleteDataset.bind(datasetController))
);

export default router;