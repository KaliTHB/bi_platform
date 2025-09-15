import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { RedisConfig } from '../config/redis';

export class CacheService {
  private redis: Redis | null = null;
  private isRedisEnabled: boolean = false;
  private memoryCache: Map<string, { value: any; expires?: number }> = new Map();
  private initialized: boolean = false;

  constructor() {
    // ✅ FIX: Don't initialize in constructor, allow async initialization
    this.initialize().catch(error => {
      logger.warn('⚠️ CacheService initialization failed:', error);
    });
  }

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if Redis is enabled via environment variable
      if (process.env.REDIS_ENABLED === 'false') {
        logger.info('🚫 Redis disabled via REDIS_ENABLED=false, using memory cache');
        this.redis = null;
        this.isRedisEnabled = false;
        this.initialized = true;
        return;
      }

      this.redis = await RedisConfig.getClient();
      this.isRedisEnabled = this.redis !== null;
      
      if (this.isRedisEnabled) {
        logger.info('✅ CacheService initialized with Redis');
      } else {
        logger.warn('⚠️ CacheService initialized with memory fallback (Redis unavailable)');
      }
    } catch (error) {
      logger.warn('⚠️ CacheService falling back to memory cache:', error);
      this.redis = null;
      this.isRedisEnabled = false;
    }
    
    this.initialized = true;
  }

  // ✅ FIX: Add initialization check to methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Memory fallback
        const cached = this.memoryCache.get(key);
        if (cached) {
          if (cached.expires && Date.now() > cached.expires) {
            this.memoryCache.delete(key);
            return null;
          }
          return cached.value;
        }
        return null;
      }
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          await this.redis.setex(key, ttl, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
        return true;
      } else {
        // Memory fallback
        const cached = {
          value,
          expires: ttl ? Date.now() + (ttl * 1000) : undefined
        };
        this.memoryCache.set(key, cached);
        return true;
      }
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        const result = await this.redis.del(key);
        return result > 0;
      } else {
        // Memory fallback
        return this.memoryCache.delete(key);
      }
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // ✅ FIX: Add missing deletePattern method
  async deletePattern(pattern: string): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return true;
      } else {
        // Memory fallback - convert Redis pattern to regex
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keysToDelete = Array.from(this.memoryCache.keys()).filter(key => regex.test(key));
        keysToDelete.forEach(key => this.memoryCache.delete(key));
        return true;
      }
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        const result = await this.redis.exists(key);
        return result === 1;
      } else {
        // Memory fallback
        const cached = this.memoryCache.get(key);
        if (cached && cached.expires && Date.now() > cached.expires) {
          this.memoryCache.delete(key);
          return false;
        }
        return this.memoryCache.has(key);
      }
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        return await this.redis.keys(pattern);
      } else {
        // Memory fallback
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.memoryCache.keys()).filter(key => regex.test(key));
      }
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }

  async flush(): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        await this.redis.flushdb();
        return true;
      } else {
        // Memory fallback
        this.memoryCache.clear();
        return true;
      }
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      if (this.redis && this.isRedisEnabled) {
        const result = await this.redis.ping();
        return result === 'PONG';
      } else {
        // Memory cache is always "healthy"
        return true;
      }
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }

  isRedisEnabled(): boolean {
    return this.isRedisEnabled && this.redis !== null;
  }

  getCacheType(): 'redis' | 'memory' {
    return this.isRedisEnabled ? 'redis' : 'memory';
  }

  getCacheInfo(): { type: 'redis' | 'memory'; enabled: boolean; memorySize?: number } {
    return {
      type: this.getCacheType(),
      enabled: this.isRedisEnabled || this.memoryCache.size > 0,
      memorySize: this.memoryCache.size
    };
  }

  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
      }
    }
    this.memoryCache.clear();
  }

  // Utility method to clean expired entries from memory cache
  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, cached] of this.memoryCache.entries()) {
      if (cached.expires && now > cached.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Start periodic cleanup for memory cache (only when using memory cache)
  startPeriodicCleanup(intervalMs: number = 60000): void {
    if (!this.isRedisEnabled) {
      setInterval(() => {
        this.cleanExpiredEntries();
      }, intervalMs);
      logger.info(`🧹 Memory cache cleanup started (every ${intervalMs}ms)`);
    }
  }
}

// Create and export singleton instance
export const cacheService = new CacheService();
export default cacheService;