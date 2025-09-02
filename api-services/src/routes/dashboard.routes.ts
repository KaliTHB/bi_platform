// api-services/src/routes/dashboard.routes.ts
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const dashboardController = new DashboardController();

// Apply authentication to all routes
router.use(authenticate);

// ✅ EXISTING ROUTES
// Get all dashboards in workspace
router.get('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboards.bind(dashboardController))
);

// Create new dashboard
router.post('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.createDashboard.bind(dashboardController))
);

// Get specific dashboard
router.get('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboard.bind(dashboardController))
);

// Update dashboard
router.put('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.updateDashboard.bind(dashboardController))
);

// Delete dashboard
router.delete('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(dashboardController.deleteDashboard.bind(dashboardController))
);

// Duplicate dashboard
router.post('/:id/duplicate',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.duplicateDashboard.bind(dashboardController))
);

// Get dashboard charts
router.get('/:id/charts',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboardCharts.bind(dashboardController))
);

// 🚀 NEW ROUTES - CRITICAL CACHE & FILTER OPERATIONS

// Get dashboard data with caching and filtering support
router.get('/:id/data',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboardData.bind(dashboardController))
);

// Refresh dashboard cache
router.post('/:id/refresh',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.refreshDashboard.bind(dashboardController))
);

// Apply global filter to dashboard
router.post('/:id/filter',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.applyGlobalFilter.bind(dashboardController))
);

// Export dashboard
router.post('/:id/export',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.exportDashboard.bind(dashboardController))
);

// 🔧 ADDITIONAL UTILITY ROUTES

// Update dashboard layout
router.put('/:id/layout',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.updateDashboardLayout.bind(dashboardController))
);

// Update dashboard filters
router.put('/:id/filters',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.updateDashboardFilters.bind(dashboardController))
);

// Clear dashboard cache
router.post('/:id/cache/clear',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.clearDashboardCache.bind(dashboardController))
);

// Get dashboard cache status
router.get('/:id/cache/status',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboardCacheStatus.bind(dashboardController))
);

// ✅ EXISTING ROUTES (CONTINUED)
// Share dashboard
router.post('/:id/share',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.shareDashboard.bind(dashboardController))
);

// Update dashboard sharing settings
router.put('/:id/share',
  validateWorkspaceAccess,
  requireWorkspaceRole(['editor', 'admin', 'owner']),
  asyncHandler(dashboardController.updateSharingSettings.bind(dashboardController))
);

// Get dashboard analytics
router.get('/:id/analytics',
  validateWorkspaceAccess,
  requireWorkspaceRole(['viewer', 'analyst', 'editor', 'admin', 'owner']),
  asyncHandler(dashboardController.getDashboardAnalytics.bind(dashboardController))
);

export default router;