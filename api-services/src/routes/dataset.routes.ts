import { Router } from 'express';
import { DatasetController } from '../controllers/DatasetController';
import { validateRequest } from '../middleware/validation';
import { createDatasetSchema, updateDatasetSchema } from '../schemas/dataset.schemas';
import { requirePermission } from '../middleware/permission';

const router = Router();
const datasetController = new DatasetController();

// Get all datasets
router.get('/', datasetController.getDatasets);

// Get single dataset
router.get('/:id', datasetController.getDataset);

// Create dataset
router.post(
  '/',
  requirePermission('dataset.create'),
  validateRequest(createDatasetSchema),
  datasetController.createDataset
);

// Update dataset
router.put(
  '/:id',
  validateRequest(updateDatasetSchema),
  datasetController.updateDataset
);

// Delete dataset
router.delete('/:id', datasetController.deleteDataset);

// Get dataset data
router.get('/:id/data', datasetController.getDatasetData);

// Refresh dataset
router.post('/:id/refresh', datasetController.refreshDataset);

// Get dataset schema
router.get('/:id/schema', datasetController.getDatasetSchema);

export default router;