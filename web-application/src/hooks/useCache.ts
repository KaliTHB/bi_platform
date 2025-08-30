// File: web-application/src/hooks/useCache.ts
import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export const useCache = () => {
  const cache = useRef<Map<string, CacheEntry<any>>>(new Map());

  const getCached = useCallback(<T>(key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      cache.current.delete(key);
      return null;
    }

    return entry.data;
  }, []);

  const setCached = useCallback(<T>(key: string, data: T, ttlSeconds: number = 300) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });
  }, []);

  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      cache.current.delete(key);
    } else {
      cache.current.clear();
    }
  }, []);

  return { getCached, setCached, invalidateCache };
};
