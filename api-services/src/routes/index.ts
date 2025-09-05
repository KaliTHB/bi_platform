// api-services/src/routes/index.ts - COMPLETE FIXED VERSION
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
import datasourceRoutes from './datasource.routes';
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

// 🔥 CRITICAL FIX 1: Fix workspace routes to properly handle /api/workspaces
router.use('/workspaces', authenticate, workspaceRoutes);

// 🔥 CRITICAL FIX 2: Change '/users' to '/user' to match frontend expectations  
router.use('/user', authenticate, userRoutes);  // ✅ SINGULAR - matches frontend

router.use('/categories', authenticate, categoryRoutes);
router.use('/datasets', authenticate, datasetRoutes);
router.use('/dashboards', authenticate, dashboardRoutes);
router.use('/charts', authenticate, chartRoutes);
router.use('/plugins', authenticate, pluginRoutes);
router.use('/datasources', authenticate, datasourceRoutes);

// API Documentation endpoint with updated paths
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'BI Platform API Documentation',
    version: '1.0.0',
    base_url: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      authentication: {
        base_path: '/auth',
        authentication_required: false,
        endpoints: [
          'POST /auth/login',
          'POST /auth/register', 
          'POST /auth/logout',
          'GET /auth/verify',
          'POST /auth/refresh'
        ]
      },
      // Fixed user endpoint documentation
      user: {
        base_path: '/user',
        authentication_required: true,
        endpoints: [
          'GET /user/default-workspace',
          'GET /user/workspaces', 
          'GET /user/:id',
          'PUT /user/:id',
          'DELETE /user/:id'
        ]
      },
      workspaces: {
        base_path: '/workspaces',
        authentication_required: true,
        endpoints: [
          'GET /workspaces',           // ✅ This should now work
          'POST /workspaces',
          'GET /workspaces/:id',
          'PUT /workspaces/:id',
          'DELETE /workspaces/:id',
          'GET /workspaces/:id/members',
          'POST /workspaces/:id/members',
          'PUT /workspaces/:id/members/:userId',
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
          'DELETE /datasets/:id'
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
          'DELETE /dashboards/:id'
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
          'DELETE /charts/:id'
        ]
      },
      plugins: {
        base_path: '/plugins',
        authentication_required: true,
        endpoints: [
          'GET /plugins/datasources',
          'GET /plugins/charts',
          'POST /plugins/test-connection'
        ]
      },
      webviews: {
        base_path: '/webviews',
        authentication_required: 'mixed',
        endpoints: [
          'GET /webviews/public/:webviewName',
          'GET /webviews',
          'POST /webviews',
          'GET /webviews/:id',
          'PUT /webviews/:id',
          'DELETE /webviews/:id'
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
    available_endpoints: '/docs',
    hint: 'Check the /docs endpoint for available API routes'
  });
});

export default router;