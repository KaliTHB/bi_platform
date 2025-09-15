// api-services/src/config/redis.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class RedisConfig {
  private static instance: Redis | null = null;
  private static isConnected = false;
  private static isEnabled = process.env.REDIS_ENABLED !== 'false';

  public static async getClient(): Promise<Redis | null> {
    // Check if Redis is disabled via environment variable
    if (!this.isEnabled) {
      logger.info('🚫 Redis is disabled via REDIS_ENABLED=false');
      return null;
    }

    if (this.instance && this.isConnected) {
      return this.instance;
    }

    try {
      const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
      };

      this.instance = new Redis(config);

      // Set up event listeners
      this.instance.on('connect', () => {
        logger.info('✅ Redis client connected');
        this.isConnected = true;
      });

      this.instance.on('error', (error) => {
        logger.error('❌ Redis connection error:', error);
        this.isConnected = false;
      });

      this.instance.on('ready', () => {
        logger.info('✅ Redis client ready');
        this.isConnected = true;
      });

      this.instance.on('close', () => {
        logger.warn('⚠️ Redis connection closed');
        this.isConnected = false;
      });

      this.instance.on('reconnecting', () => {
        logger.info('🔄 Redis reconnecting...');
      });

      // Test connection
      await this.instance.connect();
      await this.instance.ping();
      
      logger.info('✅ Redis connection established successfully');
      return this.instance;

    } catch (error) {
      logger.warn('⚠️ Redis connection failed, running without cache:', error);
      this.instance = null;
      this.isConnected = false;
      return null;
    }
  }

  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  public static isRedisAvailable(): boolean {
    return this.isEnabled && this.isConnected && this.instance !== null;
  }

  public static isRedisEnabled(): boolean {
    return this.isEnabled;
  }
}