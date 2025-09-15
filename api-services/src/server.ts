// api-services/src/server.ts
import dotenv from 'dotenv';
import app from './app';
import { logger } from './utils/logger';
import { cacheService } from './services/CacheService';
import { RedisConfig } from './config/redis';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0';

// Start server
async function startServer(): Promise<void> {
  try {
    logger.info('🚀 Starting BI Platform API Server...');
    
    // Log environment configuration
    logger.info('📋 Environment Configuration:', {
      NODE_ENV: NODE_ENV,
      PORT: PORT,
      HOST: HOST,
      REDIS_ENABLED: process.env.REDIS_ENABLED !== 'false',
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
      node_version: process.version,
      pid: process.pid
    });

    // Initialize database connections
    await initializeDatabase();
    
    // Initialize cache connections
    await initializeCache();
    
    // Initialize external services
    await initializeExternalServices();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info('🌟 BI Platform API Server running successfully', {
        url: `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`,
        port: PORT,
        host: HOST,
        environment: NODE_ENV
      });
      
      // Log cache configuration
      const cacheInfo = cacheService.getCacheInfo();
      if (process.env.REDIS_ENABLED === 'false') {
        logger.info('💾 Running with in-memory cache (Redis disabled)');
      } else {
        logger.info(`💾 Cache Type: ${cacheInfo.type} (${cacheInfo.enabled ? 'enabled' : 'disabled'})`);
      }
      
      // Log available endpoints in development
      if (NODE_ENV === 'development') {
        logAvailableEndpoints();
      }
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal, closing server...');
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close database connections
          await closeDatabase();
          
          // Close cache connections
          await closeCache();
          
          logger.info('All connections closed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize database connections
async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database connections...');
    
    // In a real implementation, you would connect to your database here
    // Example with PostgreSQL:
    // const dbConfig = {
    //   host: process.env.DB_HOST,
    //   port: parseInt(process.env.DB_PORT || '5432'),
    //   database: process.env.DB_NAME,
    //   username: process.env.DB_USER,
    //   password: process.env.DB_PASSWORD,
    // };
    // 
    // await sequelize.authenticate();
    // await sequelize.sync();
    
    // Mock database initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('✅ Database connections established');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Initialize cache connections
async function initializeCache(): Promise<void> {
  try {
    logger.info('🔧 Initializing cache service...');
    
    // Check if Redis is enabled
    const isRedisEnabled = process.env.REDIS_ENABLED !== 'false';
    
    if (!isRedisEnabled) {
      logger.info('🚫 Redis disabled via REDIS_ENABLED=false, using memory cache');
    } else {
      logger.info('🔄 Attempting Redis connection...');
      
      // Try to initialize Redis connection
      try {
        const redisClient = await RedisConfig.getClient();
        if (redisClient) {
          logger.info('✅ Redis connection established successfully');
        } else {
          logger.warn('⚠️ Redis connection failed, falling back to memory cache');
        }
      } catch (redisError) {
        logger.warn('⚠️ Redis connection error, using memory fallback:', redisError);
      }
    }
    
    // Get cache service info
    const cacheInfo = cacheService.getCacheInfo();
    logger.info(`✅ Cache service initialized: ${cacheInfo.type} (${cacheInfo.enabled ? 'enabled' : 'disabled'})`);
    
    // Start periodic cleanup for memory cache if needed
    if (!cacheService.isRedisEnabled()) {
      cacheService.startPeriodicCleanup();
      logger.info('🧹 Memory cache cleanup initialized');
    }
    
  } catch (error) {
    logger.error('❌ Cache initialization failed:', error);
    // Don't throw error - cache is not critical for startup, fallback to no caching
    logger.warn('⚠️ Continuing without cache service');
  }
}

// Initialize external services
async function initializeExternalServices(): Promise<void> {
  try {
    logger.info('Initializing external services...');
    
    // Initialize third-party services like:
    // - Email service (SendGrid, AWS SES)
    // - File storage (AWS S3, Google Cloud Storage)
    // - Analytics service
    // - Monitoring service (DataDog, New Relic)
    
    // Mock external services initialization
    await new Promise(resolve => setTimeout(resolve, 300));
    
    logger.info('✅ External services initialized');
  } catch (error) {
    logger.error('❌ External services initialization failed:', error);
    // Don't throw error for external services - they're not critical for startup
    logger.warn('Continuing without some external services');
  }
}

// Close database connections
async function closeDatabase(): Promise<void> {
  try {
    logger.info('Closing database connections...');
    
    // In a real implementation:
    // await sequelize.close();
    
    // Mock database cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    logger.info('✅ Database connections closed');
  } catch (error) {
    logger.error('❌ Error closing database connections:', error);
    throw error;
  }
}

// Close cache connections
async function closeCache(): Promise<void> {
  try {
    logger.info('Closing cache connections...');
    
    // Close cache service
    await cacheService.close();
    
    // Disconnect Redis if connected
    await RedisConfig.disconnect();
    
    logger.info('✅ Cache connections closed');
  } catch (error) {
    logger.error('❌ Error closing cache connections:', error);
    // Don't throw error for cache cleanup
    logger.warn('Cache cleanup completed with warnings');
  }
}

// Log available endpoints in development
function logAvailableEndpoints(): void {
  const baseUrl = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
  
  logger.info('📋 Available API endpoints:', {
    health_check: `${baseUrl}/health`,
    api_docs: `${baseUrl}/api/docs`,
    authentication: {
      login: `POST ${baseUrl}/api/auth/login`,
      register: `POST ${baseUrl}/api/auth/register`,
      verify: `POST ${baseUrl}/api/auth/verify-token`,
      logout: `POST ${baseUrl}/api/auth/logout`,
      switch_workspace: `POST ${baseUrl}/api/auth/switch-workspace`
    },
    workspaces: `${baseUrl}/api/workspaces`,
    users: `${baseUrl}/api/users`,
    datasets: `${baseUrl}/api/datasets`,
    dashboards: `${baseUrl}/api/dashboards`,
    charts: `${baseUrl}/api/charts`,
    plugins: `${baseUrl}/api/plugins`,
    webviews: `${baseUrl}/api/webviews`,
    public_webviews: `${baseUrl}/api/webviews/public/:webviewName`
  });
  
  // Log cache status
  const cacheInfo = cacheService.getCacheInfo();
  logger.info('💾 Cache Status:', {
    type: cacheInfo.type,
    enabled: cacheInfo.enabled,
    redis_available: RedisConfig.isRedisAvailable(),
    memory_cache_size: cacheInfo.memorySize || 0
  });
}

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('Process warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

export default startServer;