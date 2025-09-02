// api-services/src/routes/webview.routes.ts
import { Router } from 'express';
import { WebviewController } from '../controllers/WebviewController';
import { authenticate } from '../middleware/authentication';
import { validateWorkspaceAccess, requireWorkspaceRole } from '../middleware/workspace';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const webviewController = new WebviewController();

// Public routes (no authentication required)
router.get('/public/:webviewName',
  asyncHandler(webviewController.getPublicWebview.bind(webviewController))
);

router.get('/public/:webviewId/categories',
  asyncHandler(webviewController.getPublicWebviewCategories.bind(webviewController))
);

router.get('/public/:webviewId/dashboard/:dashboardId',
  asyncHandler(webviewController.getPublicDashboard.bind(webviewController))
);

router.post('/public/:webviewId/activity',
  asyncHandler(webviewController.logPublicActivity.bind(webviewController))
);

// Protected routes (authentication required)
router.use(authenticate);

// Get all webviews
router.get('/',
  asyncHandler(webviewController.getWebviews.bind(webviewController))
);

// Create new webview
router.post('/',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(webviewController.createWebview.bind(webviewController))
);

// Get specific webview
router.get('/:id',
  asyncHandler(webviewController.getWebview.bind(webviewController))
);

// Update webview
router.put('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(webviewController.updateWebview.bind(webviewController))
);

// Delete webview
router.delete('/:id',
  validateWorkspaceAccess,
  requireWorkspaceRole(['owner']),
  asyncHandler(webviewController.deleteWebview.bind(webviewController))
);

// Get webview by name
router.get('/by-name/:webviewName',
  asyncHandler(webviewController.getWebviewByName.bind(webviewController))
);

// Get webview categories
router.get('/:id/categories',
  asyncHandler(webviewController.getWebviewCategories.bind(webviewController))
);

// Get webview statistics
router.get('/:id/stats',
  asyncHandler(webviewController.getWebviewStats.bind(webviewController))
);

// Log webview activity
router.post('/:id/activity',
  asyncHandler(webviewController.logWebviewActivity.bind(webviewController))
);

// Get webview analytics
router.get('/:id/analytics',
  validateWorkspaceAccess,
  requireWorkspaceRole(['analyst', 'editor', 'admin', 'owner']),
  asyncHandler(webviewController.getWebviewAnalytics.bind(webviewController))
);

// Update webview settings
router.put('/:id/settings',
  validateWorkspaceAccess,
  requireWorkspaceRole(['admin', 'owner']),
  asyncHandler(webviewController.updateWebviewSettings.bind(webviewController))
);

export default router;