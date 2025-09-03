// File: api-services/src/app.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Import routes
import routes from './routes';

// Import middleware - using relative paths
import { 
  globalErrorHandler, 
  notFoundHandler, 
  asyncHandler 
} from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { timeoutHandler } from './middleware/timeout';

// Import utilities
import { logger } from './utils/logger';
import { PluginManager } from './services/PluginManager';

// Create Express app
const app: Application = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request logging middleware (use the dedicated middleware)
app.use(requestLogger);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.FRONTEND_URL,
      process.env.WEB_APP_URL
    ].filter(Boolean);

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Request-ID']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024
}));

// Global rate limiting with environment-based limits
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 1000, // High limit for dev
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later',
    errors: [{
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded'
    }]
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Authentication rate limiting with development-friendly settings
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min dev, 15 min prod
  max: process.env.NODE_ENV === 'development' ? 1000 : 10, // 1000 attempts for dev, 10 for prod
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again later',
    errors: [{
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts'
    }]
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Plugin system rate limiting
const pluginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 plugin requests per windowMs
  message: {
    success: false,
    error: 'Too many plugin requests',
    message: 'Too many plugin requests from this IP, please try again later',
    errors: [{
      code: 'PLUGIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many plugin requests'
    }]
  }
});

app.use('/api/plugins', pluginLimiter);

// Request timeout middleware
app.use(timeoutHandler(30000)); // 30 seconds

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req: Request, res: Response, buf: Buffer) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Health check endpoint (before API routes)
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'healthy', // This would be dynamic in real implementation
      cache: 'healthy',
      plugins: PluginManager.isInitialized() ? 'healthy' : 'degraded'
    },
    plugin_stats: PluginManager.isInitialized() ? PluginManager.getPluginStats() : null
  };

  res.status(200).json(healthData);
}));

// Basic ping endpoint for load balancer health checks
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Plugin system status endpoint
app.get('/api/system/plugins/status', asyncHandler(async (req: Request, res: Response) => {
  if (!PluginManager.isInitialized()) {
    return res.status(503).json({
      success: false,
      message: 'Plugin system not initialized',
      data: {
        initialized: false,
        stats: { dataSourcePlugins: 0, categories: [], pluginsByCategory: {} }
      }
    });
  }

  const stats = PluginManager.getPluginStats();
  const manifests = PluginManager.getDataSourceManifests();

  res.json({
    success: true,
    message: 'Plugin system is operational',
    data: {
      initialized: true,
      stats,
      plugins: manifests.map(p => ({
        name: p.name,
        displayName: p.displayName,
        category: p.category,
        version: p.version
      }))
    }
  });
}));

// API routes
app.use('/api', routes);

// Serve static files for development
if (process.env.NODE_ENV === 'development') {
  app.use('/uploads', express.static('uploads'));
  app.use('/assets', express.static('assets'));
}

// Handle 404 for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

// Initialize plugin system on app startup (async)
// This is a backup initialization in case server.ts doesn't call it
if (process.env.NODE_ENV !== 'test') {
  // Use setImmediate to avoid blocking the main thread during app creation
  setImmediate(async () => {
    if (!PluginManager.isInitialized()) {
      try {
        logger.info('🔌 Initializing PluginManager from app.ts...');
        await PluginManager.initialize();
        logger.info('✅ PluginManager initialized from app.ts');
      } catch (error) {
        logger.error('❌ Failed to initialize PluginManager from app.ts:', error);
        logger.warn('⚠️  Plugin system will not be available');
      }
    }
  });
}

export default app;