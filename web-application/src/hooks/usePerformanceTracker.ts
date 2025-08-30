// File: web-application/src/hooks/usePerformanceTracker.ts
import { useEffect } from 'react';

export const usePerformanceTracker = (componentName: string) => {
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
