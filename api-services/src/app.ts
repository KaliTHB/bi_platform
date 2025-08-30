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
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(compression());
app.use(limiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Slug']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check (no auth required)
app.use('/api/v1/health', healthRoutes);

// Authentication routes (no auth required)
app.use('/api/v1/auth', authRoutes);

// All other routes require authentication
app.use('/api/v1/workspaces', authenticate, workspaceRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/permissions', authenticate, permissionRoutes);
app.use('/api/v1/roles', authenticate, roleRoutes);

// Workspace-specific routes
app.use('/api/v1/datasets', authenticate, workspaceContext, datasetRoutes);
app.use('/api/v1/dashboards', authenticate, workspaceContext, dashboardRoutes);
app.use('/api/v1/charts', authenticate, workspaceContext, chartRoutes);
app.use('/api/v1/plugins', authenticate, workspaceContext, pluginRoutes);
app.use('/api/v1/queries', authenticate, workspaceContext, queryRoutes);
app.use('/api/v1/exports', authenticate, workspaceContext, exportRoutes);
app.use('/api/v1/audit', authenticate, workspaceContext, auditRoutes);
app.use('/api/v1/webviews', authenticate, workspaceContext, webviewRoutes);
app.use('/api/v1/categories', authenticate, workspaceContext, categoryRoutes);
app.use('/api/v1/analytics', authenticate, workspaceContext, analyticsRoutes);

// WebSocket setup for real-time updates
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  // Add token validation logic here
  next();
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('joinWorkspace', (workspaceId: string) => {
    socket.join(`workspace:${workspaceId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errors: [{ code: 'NOT_FOUND', message: `Route ${req.originalUrl} not found` }]
  });
});

export { app, server, io };