// api-services/src/app.ts - COMPLETE SETUP WITH ALL ROUTES
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { logger } from './utils/logger';
import { db } from './utils/database';

// Import ALL routes
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import adminRoutes from './routes/admin.route';         
import userRoutes from './routes/user.routes';
import permissionRoutes from './routes/permissions.routes';
import pluginRoutes from './routes/plugin.routes';
import datasourceRoutes from './routes/datasource.routes';
import chartRoutes from './routes/chart.routes';
import webviewRoutes from './routes/webview.routes';
import categoryRoutes from './routes/category.routes';
import dashboardRoutes from './routes/dashboard.routes'; 

// Load environment variables
config();

const app: Express = express();


app.locals.db = db;

// Validate the setup
if (!app.locals.db) {
  console.error('❌ CRITICAL: app.locals.db is not set!');
  process.exit(1);
}

if (typeof app.locals.db.query !== 'function') {
  console.error('❌ CRITICAL: app.locals.db.query is not a function!');
  process.exit(1);
}

console.log('✅ app.locals.db initialized successfully');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Workspace-ID',
    'X-Workspace-Slug',
    'X-user-ID'
  ],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
});

app.use(limiter);

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim(), { service: 'bi-platform-api' });
    }
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'bi-platform-api',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// ✅ REGISTER ALL API ROUTES
console.log('🔧 Registering API routes...');

// Authentication routes
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered at /api/auth');

// User routes  
app.use('/api/user', userRoutes);
console.log('✅ User routes registered at /api/user');

// Workspace routes
app.use('/api/workspaces', workspaceRoutes);
console.log('✅ Workspace routes registered at /api/workspaces');

// ⚠️ CRITICAL: Admin routes (THIS WAS MISSING!)
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');

// Permission routes
app.use('/api/permissions', permissionRoutes);
console.log('✅ Permission routes registered at /api/permissions');

// Plugin routes
app.use('/api/plugins', pluginRoutes);
console.log('✅ Plugin routes registered at /api/plugins');

// Data source routes
app.use('/api/datasources', datasourceRoutes);
console.log('✅ Data source routes registered at /api/datasources');

// permission routes
app.use('/api/user', userRoutes);  // Make sure this line exists
console.log('✅ permission routes registered at /api/user');

// ✅ FIX: Dashboard routes (protected)
app.use('/api/dashboards', dashboardRoutes);
console.log('✅ Dashboard routes registered at /api/dashboards');

// Chart routes
app.use('/api/charts', chartRoutes);
console.log('✅ Chart routes registered at /api/charts');

// Webview routes
app.use('/api/webviews', webviewRoutes);
console.log('✅ Webview routes registered at /api/webviews');

// Category routes
app.use('/api/categories', categoryRoutes);
console.log('✅ Category routes registered at /api/categories');

console.log('🎉 All API routes registered successfully!');

// 404 handler
app.use('*', (req: Request, res: Response) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    service: 'bi-platform-api'
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    error: 'ROUTE_NOT_FOUND',
    availableRoutes: [
      '/api/auth',
      '/api/user', 
      '/api/workspaces',
      '/api/admin',
      '/api/permissions',
      '/api/plugins',
      '/api/dashboards',
      '/api/datasources',
      '/api/charts',
      '/api/webviews',
      '/api/categories',
      '/health'
    ]
  });
});

// Global error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  logger.error('Global error handler', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    service: 'bi-platform-api'
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_SERVER_ERROR'
  });
});

export default app;