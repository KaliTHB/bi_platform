import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { validateRequest } from '../middleware/validation';
import { createDashboardSchema, updateDashboardSchema } from '../schemas/dashboard.schemas';
import { requirePermission } from '../middleware/permission';

const router = Router();
const dashboardController = new DashboardController();

// Get all dashboards
router.get('/', dashboardController.getDashboards);

// Get single dashboard
router.get('/:id', dashboardController.getDashboard);

// Get dashboard by slug
router.get('/slug/:slug', dashboardController.getDashboardBySlug);

// Create dashboard
router.post(
  '/',
  requirePermission('dashboard.create'),
  validateRequest(createDashboardSchema),
  dashboardController.createDashboard
);

// Update dashboard
router.put(
  '/:id',
  validateRequest(updateDashboardSchema),
  dashboardController.updateDashboard
);

// Delete dashboard
router.delete('/:id', dashboardController.deleteDashboard);

// Dashboard chart management
router.post('/:id/charts', dashboardController.addChartToDashboard);
router.delete('/:id/charts/:chartId', dashboardController.removeChartFromDashboard);
router.put('/:id/charts/:chartId/position', dashboardController.updateChartPosition);

export default router;