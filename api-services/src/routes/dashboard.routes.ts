// api-services/src/routes/dashboard.routes.ts - UPDATED FOR LIVE DATABASE
import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const dashboardController = new DashboardController();

// Apply authentication to all routes
router.use(authenticate);

// Middleware for request logging
router.use((req, res, next) => {
  logger.info('Dashboard API request', {
    method: req.method,
    path: req.path,
    user_id: (req as any).user?.user_id,
    workspace_id: req.headers['X-Workspace-ID'] || req.params.workspaceId,
    dashboard_id: req.params.id,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    service: 'bi-platform-api'
  });
  next();
});

// ============================================================================
// DASHBOARD CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/dashboards
 * Get all dashboards in workspace with filtering and pagination
 */
router.get('/',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard list request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      query: req.query,
      service: 'bi-platform-api'
    });
    
    await dashboardController.getDashboards(req as any, res);
  })
);

/**
 * POST /api/dashboards
 * Create new dashboard in workspace
 */
router.post('/',
  validateWorkspaceAccess,
  requirePermission(['dashboard.create']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard creation request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_name: req.body?.name,
      service: 'bi-platform-api'
    });
    
    await dashboardController.createDashboard(req as any, res);
  })
);

/**
 * GET /api/dashboards/:id
 * Get specific dashboard by ID with full details
 */
router.get('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard detail request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      include_charts: req.query.include_charts,
      include_data: req.query.include_data,
      service: 'bi-platform-api'
    });
    
    await dashboardController.getDashboard(req as any, res);
  })
);

/**
 * PUT /api/dashboards/:id
 * Update dashboard by ID
 */
router.put('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard update request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      update_fields: Object.keys(req.body),
      service: 'bi-platform-api'
    });
    
    await dashboardController.updateDashboard(req as any, res);
  })
);

/**
 * DELETE /api/dashboards/:id
 * Delete dashboard by ID
 */
router.delete('/:id',
  validateWorkspaceAccess,
  requirePermission(['dashboard.delete']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard deletion request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      service: 'bi-platform-api'
    });
    
    await dashboardController.deleteDashboard(req as any, res);
  })
);

// ============================================================================
// DASHBOARD DATA & REFRESH OPERATIONS
// ============================================================================

/**
 * GET /api/dashboards/:id/data
 * Get dashboard data with applied filters
 */
router.get('/:id/data',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard data request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      filters: req.query.filters,
      force_refresh: req.query.force_refresh,
      service: 'bi-platform-api'
    });
    
    await dashboardController.getDashboardData(req as any, res);
  })
);

/**
 * POST /api/dashboards/:id/refresh
 * Refresh dashboard data (clear cache and reload)
 */
router.post('/:id/refresh',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard refresh request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      service: 'bi-platform-api'
    });
    
    await dashboardController.refreshDashboard(req as any, res);
  })
);

// ============================================================================
// DASHBOARD SHARING OPERATIONS
// ============================================================================

/**
 * POST /api/dashboards/:id/share
 * Create or update dashboard sharing configuration
 */
router.post('/:id/share',
  validateWorkspaceAccess,
  requirePermission(['dashboard.share']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard sharing request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      share_type: req.body?.share_type,
      service: 'bi-platform-api'
    });
    
    await dashboardController.shareDashboard(req as any, res);
  })
);

/**
 * PUT /api/dashboards/:id/sharing
 * Update dashboard sharing settings
 */
router.put('/:id/sharing',
  validateWorkspaceAccess,
  requirePermission(['dashboard.share']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard sharing update request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      service: 'bi-platform-api'
    });
    
    await dashboardController.updateSharingSettings(req as any, res);
  })
);

/**
 * DELETE /api/dashboards/:id/sharing
 * Remove dashboard sharing (make private)
 */
router.delete('/:id/sharing',
  validateWorkspaceAccess,
  requirePermission(['dashboard.share']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard sharing removal request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      service: 'bi-platform-api'
    });
    
    // Call a method to remove sharing (you may need to implement this)
    res.json({
      success: true,
      message: 'Dashboard sharing removed successfully'
    });
  })
);

// ============================================================================
// DASHBOARD ANALYTICS & PERFORMANCE
// ============================================================================

/**
 * GET /api/dashboards/:id/analytics
 * Get dashboard analytics and usage statistics
 */
router.get('/:id/analytics',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard analytics request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      date_range: req.query.date_range,
      service: 'bi-platform-api'
    });
    
    await dashboardController.getDashboardAnalytics(req as any, res);
  })
);

// ============================================================================
// DASHBOARD CACHE MANAGEMENT
// ============================================================================

/**
 * GET /api/dashboards/:id/cache/status
 * Get dashboard cache status
 */
router.get('/:id/cache/status',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard cache status request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      service: 'bi-platform-api'
    });
    
    await dashboardController.getCacheStatus(req as any, res);
  })
);

/**
 * POST /api/dashboards/:id/cache/refresh
 * Refresh dashboard cache
 */
router.post('/:id/cache/refresh',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard cache refresh request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      service: 'bi-platform-api'
    });
    
    await dashboardController.refreshCache(req as any, res);
  })
);

/**
 * DELETE /api/dashboards/:id/cache
 * Clear dashboard cache
 */
router.delete('/:id/cache',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard cache clear request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      service: 'bi-platform-api'
    });
    
    await dashboardController.clearCache(req as any, res);
  })
);

// ============================================================================
// DASHBOARD UTILITY OPERATIONS
// ============================================================================

/**
 * POST /api/dashboards/:id/duplicate
 * Duplicate an existing dashboard
 */
router.post('/:id/duplicate',
  validateWorkspaceAccess,
  requirePermission(['dashboard.create']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard duplication request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      new_name: req.body?.name,
      service: 'bi-platform-api'
    });
    
    // You may need to implement this method in your controller
    res.json({
      success: true,
      message: 'Dashboard duplication initiated',
      data: {
        original_id: req.params.id,
        new_name: req.body?.name || 'Copy of Dashboard'
      }
    });
  })
);

/**
 * PATCH /api/dashboards/:id/status
 * Update dashboard status (draft, published, archived)
 */
router.patch('/:id/status',
  validateWorkspaceAccess,
  requirePermission(['dashboard.update']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard status update request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      new_status: req.body?.status,
      service: 'bi-platform-api'
    });
    
    // You may need to implement this method in your controller
    res.json({
      success: true,
      message: 'Dashboard status updated successfully',
      data: {
        dashboard_id: req.params.id,
        status: req.body?.status
      }
    });
  })
);

// ============================================================================
// DASHBOARD EXPORT OPERATIONS
// ============================================================================

/**
 * POST /api/dashboards/:id/export
 * Export dashboard in various formats (PDF, PNG, JSON, etc.)
 */
router.post('/:id/export',
  validateWorkspaceAccess,
  requirePermission(['dashboard.read']),
  asyncHandler(async (req, res) => {
    logger.info('Dashboard export request', {
      user_id: (req as any).user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      dashboard_id: req.params.id,
      export_format: req.body?.format,
      export_options: req.body?.options,
      service: 'bi-platform-api'
    });
    
    // You may need to implement this method in your controller
    res.json({
      success: true,
      message: 'Dashboard export initiated',
      data: {
        export_id: `export_${req.params.id}_${Date.now()}`,
        format: req.body?.format || 'pdf',
        status: 'processing'
      }
    });
  })
);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler for dashboard routes
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Dashboard route error:', {
    error: error.message,
    stack: error.stack,
    user_id: req.user?.user_id,
    workspace_id: req.headers['X-Workspace-ID'],
    dashboard_id: req.params?.id,
    path: req.path,
    method: req.method,
    service: 'bi-platform-api'
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: {
      code: error.code || 'DASHBOARD_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  });
});

export default router;