import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import { authenticate } from '../middleware/authentication';

const router = Router();

// API version
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BI Platform API v1.0.0',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes (public)
router.use('/auth', authRoutes);

// Protected routes
router.use('/workspaces', authenticate, workspaceRoutes);

export default router;