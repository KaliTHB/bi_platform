// api-services/src/server.ts
import dotenv from 'dotenv';
import app from './app';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = process.env.HOST || '0.0.0.0';

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize database connections
    await initializeDatabase();
    
    // Initialize cache connections
    await initializeCache();
    
    // Initialize external services
    await initializeExternalServices();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info('🚀 Server started successfully', {
        port: PORT,
        host: HOST,
        environment: NODE_ENV,
        node_version: process.version,
        pid: process.pid
      });
      
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
    logger.info('Initializing cache connections...');
    
    // In a real implementation, you would connect to Redis here
    // Example:
    // const redis = new Redis({
    //   host: process.env.REDIS_HOST,
    //   port: parseInt(process.env.REDIS_PORT || '6379'),
    //   password: process.env.REDIS_PASSWORD,
    // });
    // 
    // await redis.ping();
    
    // Mock cache initialization
    await new Promise(resolve => setTimeout(resolve, 500));
    
    logger.info('✅ Cache connections established');
  } catch (error) {
    logger.error('❌ Cache initialization failed:', error);
    throw error;
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
    
    // In a real implementation:
    // await redis.disconnect();
    
    // Mock cache cleanup
    await new Promise(resolve => setTimeout(resolve, 200));
    
    logger.info('✅ Cache connections closed');
  } catch (error) {
    logger.error('❌ Error closing cache connections:', error);
    throw error;
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
      verify: `GET ${baseUrl}/api/auth/verify`
    },
    workspaces: `${baseUrl}/api/workspaces`,
    datasets: `${baseUrl}/api/datasets`,
    dashboards: `${baseUrl}/api/dashboards`,
    charts: `${baseUrl}/api/charts`,
    plugins: `${baseUrl}/api/plugins`,
    webviews: `${baseUrl}/api/webviews`,
    public_webviews: `${baseUrl}/api/webviews/public/:webviewName`
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

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

export default startServer;