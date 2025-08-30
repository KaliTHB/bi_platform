// api-services/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { DatabaseConfig } from './config/database';
import { CacheService } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authenticate } from './middleware/authentication';
import { workspaceContext } from './middleware/workspace';

// Route imports
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import userRoutes from './routes/user.routes';
import permissionRoutes from './routes/permission.routes';
import roleRoutes from './routes/role.routes';
import datasetRoutes from './routes/dataset.routes';
import dashboardRoutes from './routes/dashboard.routes';
import chartRoutes from './routes/chart.routes';
import pluginRoutes from './routes/plugin.routes';
import queryRoutes from './routes/query.routes';
import exportRoutes from './routes/export.routes';
import auditRoutes from './routes/audit.routes';
import healthRoutes from './routes/health.routes';
import webviewRoutes from './routes/webview.routes';
import categoryRoutes from './routes/category.routes';
import analyticsRoutes from './routes/analytics.routes';

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Global middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);
app.use(requestLogger);

// Health check (public)
app.use('/api/health', healthRoutes);

// Authentication routes (public)
app.use('/api/auth', authRoutes);

// Protected routes with authentication
app.use('/api', authenticate);

// Workspace context middleware for workspace-scoped routes
app.use('/api/workspaces', workspaceContext, workspaceRoutes);
app.use('/api/users', workspaceContext, userRoutes);
app.use('/api/permissions', workspaceContext, permissionRoutes);
app.use('/api/roles', workspaceContext, roleRoutes);
app.use('/api/datasets', workspaceContext, datasetRoutes);
app.use('/api/dashboards', workspaceContext, dashboardRoutes);
app.use('/api/charts', workspaceContext, chartRoutes);
app.use('/api/plugins', workspaceContext, pluginRoutes);
app.use('/api/queries', workspaceContext, queryRoutes);
app.use('/api/exports', workspaceContext, exportRoutes);
app.use('/api/audits', workspaceContext, auditRoutes);
app.use('/api/categories', workspaceContext, categoryRoutes);
app.use('/api/analytics', workspaceContext, analyticsRoutes);

// Webview routes (public with special auth)
app.use('/api/webview', webviewRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  socket.on('join-workspace', (workspaceId: string) => {
    socket.join(`workspace:${workspaceId}`);
    logger.info(`Socket ${socket.id} joined workspace ${workspaceId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Global error handler
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export { app, server, io };