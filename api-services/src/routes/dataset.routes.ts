// api-services/src/routes/dataset.routes.ts - UPDATED WITH MISSING ROUTES
import { Router } from 'express';
import { DatasetController } from '../controllers/DatasetController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const datasetController = new DatasetController();

// Apply authentication to all routes
router.use(authenticate);

// ✅ EXISTING ROUTES (Already Implemented)

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

// 🚀 NEW ROUTES - MISSING CRITICAL CACHE & FILTER OPERATIONS

// Get dataset data with caching and filtering support
router.get('/:id/data',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetData.bind(datasetController))
);

// Query dataset with advanced options
router.post('/:id/query',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.queryDataset.bind(datasetController))
);

// Validate dataset query
router.post('/:id/validate',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.validateDatasetQuery.bind(datasetController))
);

// Test dataset connection and query
router.post('/:id/test',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.testDataset.bind(datasetController))
);

// Get dataset statistics
router.get('/:id/stats',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetStats.bind(datasetController))
);

// Clear dataset cache
router.post('/:id/cache/clear',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.clearDatasetCache.bind(datasetController))
);

// Get dataset cache status
router.get('/:id/cache/status',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetCacheStatus.bind(datasetController))
);

// 🔧 ADDITIONAL UTILITY ROUTES

// Get dataset usage information
router.get('/:id/usage',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetUsage.bind(datasetController))
);

// Export dataset
router.post('/:id/export',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.exportDataset.bind(datasetController))
);

// Get dataset history/audit log
router.get('/:id/history',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetHistory.bind(datasetController))
);

// Get dataset performance metrics
router.get('/:id/metrics',
  validateWorkspaceAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetPerformanceMetrics.bind(datasetController))
);

// 📊 ADVANCED DATA OPERATIONS

// Execute custom SQL query on dataset
router.post('/:id/execute',
  validateWorkspaceAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.executeQuery.bind(datasetController))
);

// Create dataset snapshot
router.post('/:id/snapshot',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.createSnapshot.bind(datasetController))
);

// Get dataset snapshots
router.get('/:id/snapshots',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getSnapshots.bind(datasetController))
);

// Restore from snapshot
router.post('/:id/snapshots/:snapshotId/restore',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(datasetController.restoreFromSnapshot.bind(datasetController))
);

// 🔄 TRANSFORMATION OPERATIONS

// Apply transformation to dataset
router.post('/:id/transform',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.applyTransformation.bind(datasetController))
);

// Get transformation history
router.get('/:id/transformations',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getTransformationHistory.bind(datasetController))
);

// Revert transformation
router.post('/:id/transformations/:transformationId/revert',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.revertTransformation.bind(datasetController))
);

// 🔍 DATA PROFILING ROUTES

// Get data profile (statistical analysis)
router.get('/:id/profile',
  validateWorkspaceAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDataProfile.bind(datasetController))
);

// Get column analysis
router.get('/:id/columns/:columnName/analysis',
  validateWorkspaceAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getColumnAnalysis.bind(datasetController))
);

// Detect data quality issues
router.get('/:id/quality',
  validateWorkspaceAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDataQualityReport.bind(datasetController))
);

// 🚨 MONITORING & ALERTS

// Get dataset alerts
router.get('/:id/alerts',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(datasetController.getDatasetAlerts.bind(datasetController))
);

// Create dataset alert
router.post('/:id/alerts',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.createDatasetAlert.bind(datasetController))
);

// Update dataset alert
router.put('/:id/alerts/:alertId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.updateDatasetAlert.bind(datasetController))
);

// Delete dataset alert
router.delete('/:id/alerts/:alertId',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(datasetController.deleteDatasetAlert.bind(datasetController))
);

export default router;