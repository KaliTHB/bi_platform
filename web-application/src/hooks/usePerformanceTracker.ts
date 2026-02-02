// File: web-application/src/hooks/usePerformanceTracker.ts
// Simple implementation if you want to add performance tracking back later

import { useCallback, useEffect } from 'react';

export interface PerformanceEvent {
  event: string;
  data?: Record<string, any>;
  duration?: number;
  timestamp?: number;
}

export interface UsePerformanceTrackerResult {
  trackEvent: (event: string, data?: Record<string, any>) => void;
  trackDuration: <T>(event: string, fn: () => T | Promise<T>) => T | Promise<T>;
}

export const usePerformanceTracker = (componentName?: string): UsePerformanceTrackerResult => {
  const trackEvent = useCallback((event: string, data: Record<string, any> = {}) => {
    const eventData: PerformanceEvent = {
      event,
      data: {
        ...data,
        component: componentName,
        timestamp: Date.now()
      }
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance]', eventData);
    }

    // In production, send to analytics service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(event, eventData.data);
    }
  }, [componentName]);

  const trackDuration = useCallback(<T>(event: string, fn: () => T | Promise<T>): T | Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          trackEvent(event, { duration });
        });
      } else {
        const duration = performance.now() - startTime;
        trackEvent(event, { duration });
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      trackEvent(`${event}_error`, { 
        duration, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }, [trackEvent]);

  return {
    trackEvent,
    trackDuration
  };
};

// Alternative simpler version that just tracks component renders
export const useRenderPerformanceTracker = (componentName: string) => {
  // This matches the original implementation in your project
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Track component render time
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('component_render_time', {
          component: componentName,
          renderTime,
          timestamp: Date.now()
        });
      }
      
      // Console warning for slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 1000) {
        console.warn(`Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
};