// File: api-services/src/config/redis.ts
// Enhanced Redis configuration with proper singleton CacheService

import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { redisConfig } from '../config/redis'

// Create Redis instance
const redis = new Redis(redisConfig);

// Redis event handlers
redis.on('connect', () => {
  logger.info('Redis client connected', { 
    host: redisConfig.host, 
    port: redisConfig.port,
    db: redisConfig.db 
  });
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('ready', () => {
  logger.info('Redis client ready and operational');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', (delay) => {
  logger.info(`Redis reconnecting in ${delay}ms`);
});

// Enhanced CacheService class
export class CacheService {
  private redis: Redis;
  private isHealthy: boolean = true;

  constructor(redisInstance: Redis) {
    this.redis = redisInstance;
    
    // Monitor Redis health
    this.redis.on('error', () => {
      this.isHealthy = false;
    });
    
    this.redis.on('ready', () => {
      this.isHealthy = true;
    });
  }

  private handleError(operation: string, error: any): void {
    logger.error(`Cache ${operation} error:`, {
      error: error.message,
      operation,
      isHealthy: this.isHealthy
    });
    this.isHealthy = false;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping cache get');
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      this.handleError('get', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping cache set');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl && ttl > 0) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      this.handleError('set', error);
      return false;
    }
  }

  async setex(key: string, seconds: number, value: any): Promise<boolean> {
    return this.set(key, value, seconds);
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping cache delete');
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.handleError('delete', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    return this.delete(key);
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping cache delete pattern');
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch (error) {
      this.handleError('deletePattern', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping cache exists check');
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.handleError('exists', error);
      return false;
    }
  }

  async flush(): Promise<boolean> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping cache flush');
      return false;
    }

    try {
      await this.redis.flushdb();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      this.handleError('flush', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping cache keys');
      return [];
    }

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.handleError('keys', error);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      this.isHealthy = result === 'PONG';
      return this.isHealthy;
    } catch (error) {
      this.handleError('healthCheck', error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping increment');
      return 0;
    }

    try {
      return await this.redis.incrby(key, by);
    } catch (error) {
      this.handleError('increment', error);
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isHealthy) {
      logger.warn('Redis unhealthy, skipping expire');
      return false;
    }

    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.handleError('expire', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }

  getClient(): Redis {
    return this.redis;
  }

  isRedisHealthy(): boolean {
    return this.isHealthy;
  }
}

// Create and export singleton instances
const cacheService = new CacheService(redis);

// Initialize Redis connection on module load
const initializeRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    logger.info('Redis connection initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis connection:', error);
    // Don't throw here - let the app continue without cache if Redis is unavailable
  }
};

// Initialize immediately (non-blocking)
initializeRedis().catch(error => {
  logger.warn('Redis initialization failed, continuing without cache:', error);
});

// Export everything
export { redis, cacheService as cache };
export default cacheService;