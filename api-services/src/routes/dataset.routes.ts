// api-services/src/routes/dataset.routes.ts
import { Router } from 'express';
import { DatasetController } from '../controllers/DatasetController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const datasetController = new DatasetController();

// Apply authentication to all routes
router.use(authenticate);

// Get all datasets in workspace
router.get('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasets.bind(datasetController))
);

// Create new dataset
router.post('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.createDataset.bind(datasetController))
);

// Get specific dataset
router.get('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDataset.bind(datasetController))
);

// Update dataset
router.put('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.updateDataset.bind(datasetController))
);

// Delete dataset
router.delete('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(datasetController.deleteDataset.bind(datasetController))
);

// Get dataset schema
router.get('/:id/schema',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetSchema.bind(datasetController))
);

// Update dataset schema
router.put('/:id/schema',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.updateDatasetSchema.bind(datasetController))
);

// Get dataset preview
router.get('/:id/preview',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetPreview.bind(datasetController))
);

// Refresh dataset
router.post('/:id/refresh',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.refreshDataset.bind(datasetController))
);

export default router;