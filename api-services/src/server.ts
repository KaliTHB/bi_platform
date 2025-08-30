// api-services/src/server.ts
import dotenv from 'dotenv';
dotenv.config();

import { server } from './app';
import { DatabaseConfig } from './config/database';
import { CacheService } from './config/redis';
import { logger } from './utils/logger';
import { PluginManager } from './services/PluginManager';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Initialize database connection
    await DatabaseConfig.initialize();
    logger.info('Database connection established');

    // Initialize Redis cache
    await CacheService.initialize();
    logger.info('Redis cache connection established');

    // Initialize plugin manager
    await PluginManager.initialize();
    logger.info('Plugin system initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await DatabaseConfig.close();
        await CacheService.close();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await DatabaseConfig.close();
        await CacheService.close();
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();