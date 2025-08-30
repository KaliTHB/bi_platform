# api-services/src/config/redis.ts
import Redis from 'ioredis';
import { logger } from '../utils/logger';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  enableReadyCheck: boolean;
  maxRetriesPerRequest: number;
}

class Cache {
  private client: Redis | null = null;
  private config: CacheConfig;

  constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    };
  }

  async initialize(): Promise<void> {
    try {
      this.client = new Redis(this.config);

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      // Test connection
      await this.client.ping();
      logger.info('Redis cache initialized successfully');
    } catch (error) {
      logger.error('Redis initialization failed:', error);
      throw error;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) {
      throw new Error('Cache not initialized');
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Cache not initialized');
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error('Cache set error:', { key, error });
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.client) {
      throw new Error('Cache not initialized');
    }

    try {
      if (Array.isArray(key)) {
        await this.client.del(...key);
      } else {
        await this.client.del(key);
      }
    } catch (error) {
      logger.error('Cache del error:', { key, error });
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Cache not initialized');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Cache not initialized');
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error:', { pattern, error });
      return [];
    }
  }

  async flushWorkspace(workspaceId: string): Promise<void> {
    const keys = await this.keys(`workspace:${workspaceId}:*`);
    if (keys.length > 0) {
      await this.del(keys);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis client closed');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }
}

export const CacheService = new Cache();