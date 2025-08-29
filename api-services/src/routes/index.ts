import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import userRoutes from './user.routes';
import datasetRoutes from './dataset.routes';
import dashboardRoutes from './dashboard.routes';
import chartRoutes from './chart.routes';
import categoryRoutes from './category.routes';
import webviewRoutes from './webview.routes';
import healthRoutes from './health.routes';

const router = Router();

// API version info
router.get('/', (req, res) => {
  res.json({
    name: 'Business Intelligence Platform API',
    version: '1.0.0',
    description: 'Multi-tenant BI platform with advanced analytics',
    endpoints: {
      auth: '/api/auth',
      workspaces: '/api/workspaces',
      users: '/api/users',
      datasets: '/api/datasets',
      dashboards: '/api/dashboards',
      charts: '/api/charts',
      categories: '/api/categories',
      webview: '/api/webview',
      health: '/api/health'
    }
  });
});

// Route handlers
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/users', userRoutes);
router.use('/datasets', datasetRoutes);
router.use('/dashboards', dashboardRoutes);
router.use('/charts', chartRoutes);
router.use('/categories', categoryRoutes);
router.use('/webview', webviewRoutes);
router.use('/health', healthRoutes);

export default router;