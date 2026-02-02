// api-services/src/config/redis.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class RedisConfig {
  private static instance: Redis | null = null;
  private static isConnected = false;
  private static isEnabled = process.env.REDIS_ENABLED !== 'false';
  private static connectionAttempts = 0;
  private static maxConnectionAttempts = 3;

  public static async getClient(): Promise<Redis | null> {
    // Check if Redis is disabled via environment variable
    if (!this.isEnabled) {
      logger.info('🚫 Redis is disabled via REDIS_ENABLED=false');
      return null;
    }

    if (this.instance && this.isConnected) {
      return this.instance;
    }

    // ✅ FIX: Add connection attempt limit
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      logger.warn(`⚠️ Redis connection failed after ${this.maxConnectionAttempts} attempts, giving up`);
      return null;
    }

    this.connectionAttempts++;

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
        // ✅ FIX: Add better reconnection strategy
        enableReadyCheck: false,
        maxLoadingTimeout: 0,
      };

      this.instance = new Redis(config);

      // Set up event listeners
      this.instance.on('connect', () => {
        logger.info('✅ Redis client connected');
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset on successful connection
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

      // ✅ FIX: Better connection testing with timeout
      await Promise.race([
        this.instance.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      await this.instance.ping();
      
      logger.info('✅ Redis connection established successfully');
      return this.instance;

    } catch (error) {
      logger.warn(`⚠️ Redis connection attempt ${this.connectionAttempts} failed:`, error);
      
      if (this.instance) {
        try {
          await this.instance.disconnect();
        } catch (disconnectError) {
          logger.debug('Redis disconnect error (ignored):', disconnectError);
        }
      }
      
      this.instance = null;
      this.isConnected = false;

      // Only return null if all attempts failed
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        logger.warn('⚠️ All Redis connection attempts failed, using memory cache fallback');
      }
      
      return null;
    }
  }

  public static async disconnect(): Promise<void> {
    if (this.instance) {
      try {
        await this.instance.quit();
      } catch (error) {
        logger.debug('Redis quit error (ignored):', error);
      }
      this.instance = null;
      this.isConnected = false;
      this.connectionAttempts = 0;
      logger.info('Redis connection closed');
    }
  }

  public static isRedisAvailable(): boolean {
    return this.isEnabled && this.isConnected && this.instance !== null;
  }

  public static isRedisEnabled(): boolean {
    return this.isEnabled;
  }

  // ✅ FIX: Add reset method for testing
  public static reset(): void {
    this.connectionAttempts = 0;
    this.isConnected = false;
    if (this.instance) {
      this.instance.removeAllListeners();
    }
    this.instance = null;
  }
}