// File: web-application/src/hooks/useCache.ts
import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Improved useCache hook with better type safety
export const useCache = () => {
  const getCached = useCallback(<T = any>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      
      // Check if cache has expired
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      // Ensure we return the actual data, not an empty object
      return parsed.data || null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }, []);

  const setCached = useCallback((key: string, data: any, ttlSeconds?: number) => {
    try {
      const cacheData = {
        data,
        expiresAt: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null,
        timestamp: Date.now()
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }, []);

  const invalidateCache = useCallback((key: string) => {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error(`Cache invalidate error for key ${key}:`, error);
    }
  }, []);

  return {
    getCached,
    setCached,
    invalidateCache
  };
};
