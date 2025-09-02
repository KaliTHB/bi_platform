// api-services/src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import userRoutes from './user.routes';
import categoryRoutes from './category.routes';
import datasetRoutes from './dataset.routes';
import dashboardRoutes from './dashboard.routes';
import chartRoutes from './chart.routes';
import pluginRoutes from './plugin.routes';
import webviewRoutes from './webview.routes';
import datasourceRoutes from './datasource.route';
import { authenticate } from '../middleware/authentication';

const router = Router();

// API health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BI Platform API v1.0.0',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      authentication: 'active',
      workspaces: 'active',
      datasets: 'active',
      dashboards: 'active',
      charts: 'active',
      plugins: 'active',
      webviews: 'active',
      categories: 'active',
      users: 'active',
      datasources: 'active'
    }
  });
});

// Health check endpoint for monitoring
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Public routes (no authentication required)
router.use('/auth', authRoutes);
router.use('/webviews', webviewRoutes); // Includes both public and protected routes

// Protected routes (authentication required)
router.use('/workspaces', authenticate, workspaceRoutes);
router.use('/users', authenticate, userRoutes);
router.use('/categories', authenticate, categoryRoutes);
router.use('/datasets', authenticate, datasetRoutes);
router.use('/dashboards', authenticate, dashboardRoutes);
router.use('/charts', authenticate, chartRoutes);
router.use('/plugins', authenticate, pluginRoutes);
router.use('/datasources', authenticate, datasourceRoutes);

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'BI Platform API Documentation',
    version: '1.0.0',
    endpoints: {
      authentication: {
        base_path: '/auth',
        endpoints: [
          'POST /auth/login',
          'POST /auth/register', 
          'POST /auth/logout',
          'GET /auth/verify',
          'POST /auth/forgot-password',
          'POST /auth/reset-password'
        ]
      },
      workspaces: {
        base_path: '/workspaces',
        authentication_required: true,
        endpoints: [
          'GET /workspaces',
          'POST /workspaces',
          'GET /workspaces/:id',
          'PUT /workspaces/:id',
          'DELETE /workspaces/:id',
          'GET /workspaces/:id/members',
          'GET /workspaces/:id/activity',
          'POST /workspaces/:id/invite',
          'PUT /workspaces/:id/members/:userId/roles',
          'DELETE /workspaces/:id/members/:userId'
        ]
      },
      datasets: {
        base_path: '/datasets',
        authentication_required: true,
        endpoints: [
          'GET /datasets',
          'POST /datasets',
          'GET /datasets/:id',
          'PUT /datasets/:id',
          'DELETE /datasets/:id',
          'GET /datasets/:id/schema',
          'PUT /datasets/:id/schema',
          'GET /datasets/:id/preview',
          'POST /datasets/:id/refresh'
        ]
      },
      dashboards: {
        base_path: '/dashboards',
        authentication_required: true,
        endpoints: [
          'GET /dashboards',
          'POST /dashboards',
          'GET /dashboards/:id',
          'PUT /dashboards/:id',
          'DELETE /dashboards/:id',
          'POST /dashboards/:id/duplicate',
          'GET /dashboards/:id/charts',
          'GET /dashboards/:id/export',
          'POST /dashboards/:id/share',
          'PUT /dashboards/:id/share'
        ]
      },
      charts: {
        base_path: '/charts',
        authentication_required: true,
        endpoints: [
          'GET /charts',
          'POST /charts',
          'GET /charts/:id',
          'PUT /charts/:id',
          'DELETE /charts/:id',
          'POST /charts/:id/duplicate',
          'GET /charts/:id/data',
          'POST /charts/:id/refresh',
          'GET /charts/:id/export',
          'GET /charts/:id/query'
        ]
      },
      plugins: {
        base_path: '/plugins',
        authentication_required: true,
        endpoints: [
          'GET /plugins/datasources',
          'GET /plugins/charts',
          'POST /plugins/test-connection',
          'GET /plugins/configuration/:type/:name',
          'PUT /plugins/configuration/:type/:name',
          'DELETE /plugins/configuration/:type/:name',
          'GET /plugins/usage/:type/:name',
          'POST /plugins/validate/:type/:name'
        ]
      },
      webviews: {
        base_path: '/webviews',
        authentication_required: 'partial',
        public_endpoints: [
          'GET /webviews/public/:webviewName',
          'GET /webviews/public/:webviewId/categories',
          'GET /webviews/public/:webviewId/dashboard/:dashboardId',
          'POST /webviews/public/:webviewId/activity'
        ],
        protected_endpoints: [
          'GET /webviews',
          'POST /webviews',
          'GET /webviews/:id',
          'PUT /webviews/:id',
          'DELETE /webviews/:id',
          'GET /webviews/by-name/:webviewName',
          'GET /webviews/:id/categories',
          'GET /webviews/:id/stats',
          'POST /webviews/:id/activity',
          'GET /webviews/:id/analytics',
          'PUT /webviews/:id/settings'
        ]
      },
      categories: {
        base_path: '/categories',
        authentication_required: true,
        endpoints: [
          'GET /categories',
          'POST /categories',
          'PUT /categories/:categoryId',
          'DELETE /categories/:categoryId'
        ]
      },
      users: {
        base_path: '/users',
        authentication_required: true,
        endpoints: [
          'GET /users',
          'POST /users',
          'PUT /users/:userId',
          'DELETE /users/:userId'
        ]
      },
      datasources: {
        base_path: '/datasources',
        authentication_required: true,
        endpoints: [
          'POST /datasources/test-connection',
          'GET /datasources/:workspaceId/datasources',
          'POST /datasources/:workspaceId/datasources',
          'GET /datasources/:workspaceId/datasources/:id',
          'PUT /datasources/:workspaceId/datasources/:id',
          'DELETE /datasources/:workspaceId/datasources/:id',
          'POST /datasources/:workspaceId/datasources/:id/test',
          'GET /datasources/:workspaceId/datasources/:id/usage'
        ]
      }
    }
  });
});

// Catch-all route for undefined endpoints
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    errors: [{
      code: 'ENDPOINT_NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
    }],
    available_endpoints: '/docs'
  });
});

export default router;