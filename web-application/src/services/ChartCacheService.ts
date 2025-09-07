import { ChartTypeInfo } from '@/types/chart.types';

export class ChartCacheService {
  private static readonly CACHE_KEYS = {
    CHART_TYPES: 'bi_chart_types',
    FACTORY_STATE: 'bi_factory_initialized',
    CONFIG_SCHEMAS: 'bi_config_schemas',
    LIBRARY_PREFERENCES: 'bi_library_preferences',
    RECENT_CHARTS: 'bi_recent_charts',
    FIELD_ASSIGNMENTS: 'bi_field_assignments'
  };

  private memoryCache = new Map<string, { data: any; expires: number }>();
  private readonly CACHE_DURATION = {
    CHART_TYPES: 15 * 60 * 1000, // 15 minutes
    PREVIEWS: 10 * 60 * 1000,    // 10 minutes
    VALIDATION: 5 * 60 * 1000,   // 5 minutes
    SCHEMAS: 30 * 60 * 1000      // 30 minutes
  };

  // SSR-safe check for browser environment
  private get isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // SSR-safe sessionStorage access
  private get sessionStorage(): Storage | null {
    if (!this.isBrowser) return null;
    try {
      return window.sessionStorage;
    } catch (error) {
      console.warn('SessionStorage not available:', error);
      return null;
    }
  }

  // SSR-safe localStorage access
  private get localStorage(): Storage | null {
    if (!this.isBrowser) return null;
    try {
      return window.localStorage;
    } catch (error) {
      console.warn('LocalStorage not available:', error);
      return null;
    }
  }

  // Chart Types Cache (Session Storage)
  setChartTypes(chartTypes: ChartTypeInfo[]): void {
    if (!this.sessionStorage) return;

    try {
      const cacheData = {
        data: chartTypes,
        timestamp: Date.now()
      };
      this.sessionStorage.setItem(this.CACHE_KEYS.CHART_TYPES, JSON.stringify(cacheData));
      console.log(`💾 Cached ${chartTypes.length} chart types`);
    } catch (error) {
      console.warn('Failed to cache chart types:', error);
    }
  }

  getChartTypes(): ChartTypeInfo[] | null {
    if (!this.sessionStorage) return null;

    try {
      const cached = this.sessionStorage.getItem(this.CACHE_KEYS.CHART_TYPES);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      
      // Check if cache is still valid (15 minutes)
      if (Date.now() - timestamp > this.CACHE_DURATION.CHART_TYPES) {
        this.sessionStorage.removeItem(this.CACHE_KEYS.CHART_TYPES);
        return null;
      }

      console.log('📦 Retrieved chart types from cache');
      return data;
    } catch (error) {
      console.warn('Error reading chart types cache:', error);
      return null;
    }
  }

  // Factory State Cache
  setFactoryInitialized(initialized: boolean): void {
    if (!this.sessionStorage) return;

    try {
      this.sessionStorage.setItem(this.CACHE_KEYS.FACTORY_STATE, JSON.stringify({
        initialized,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache factory state:', error);
    }
  }

  isFactoryInitialized(): boolean {
    if (!this.sessionStorage) return false;

    try {
      const cached = this.sessionStorage.getItem(this.CACHE_KEYS.FACTORY_STATE);
      if (!cached) return false;

      const { initialized, timestamp } = JSON.parse(cached);
      
      // Factory state expires after 30 minutes
      if (Date.now() - timestamp > 30 * 60 * 1000) {
        this.sessionStorage.removeItem(this.CACHE_KEYS.FACTORY_STATE);
        return false;
      }

      return initialized;
    } catch (error) {
      console.warn('Error reading factory state:', error);
      return false;
    }
  }

  // Memory Cache for Previews (max 15 items)
  setPreview(chartType: string, library: string, previewData: any): void {
    try {
      const key = `preview_${chartType}_${library}`;
      
      // Implement LRU eviction
      if (this.memoryCache.size >= 15) {
        const oldestKey = Array.from(this.memoryCache.keys())[0];
        this.memoryCache.delete(oldestKey);
      }

      this.memoryCache.set(key, {
        data: previewData,
        expires: Date.now() + this.CACHE_DURATION.PREVIEWS
      });
    } catch (error) {
      console.warn('Failed to cache preview:', error);
    }
  }

  getPreview(chartType: string, library: string): any | null {
    try {
      const key = `preview_${chartType}_${library}`;
      const cached = this.memoryCache.get(key);

      if (!cached || Date.now() > cached.expires) {
        this.memoryCache.delete(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Error reading preview cache:', error);
      return null;
    }
  }

  // Config Schema Cache
  setConfigSchema(chartType: string, library: string, schema: any): void {
    try {
      const key = `schema_${chartType}_${library}`;
      this.memoryCache.set(key, {
        data: schema,
        expires: Date.now() + this.CACHE_DURATION.SCHEMAS
      });
    } catch (error) {
      console.warn('Failed to cache config schema:', error);
    }
  }

  getConfigSchema(chartType: string, library: string): any | null {
    try {
      const key = `schema_${chartType}_${library}`;
      const cached = this.memoryCache.get(key);

      if (!cached || Date.now() > cached.expires) {
        this.memoryCache.delete(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Error reading config schema cache:', error);
      return null;
    }
  }

  // Library Preferences (Persistent)
  setLibraryPreferences(preferences: { primary: string[], secondary: string[] }): void {
    if (!this.localStorage) return;

    try {
      this.localStorage.setItem(this.CACHE_KEYS.LIBRARY_PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save library preferences:', error);
    }
  }

  getLibraryPreferences(): { primary: string[], secondary: string[] } {
    if (!this.localStorage) {
      // Return defaults for SSR
      return { 
        primary: ['d3js'], 
        secondary: ['echarts', 'chartjs', 'plotly'] 
      };
    }

    try {
      const cached = this.localStorage.getItem(this.CACHE_KEYS.LIBRARY_PREFERENCES);
      return cached ? JSON.parse(cached) : { 
        primary: ['d3js'], 
        secondary: ['echarts', 'chartjs', 'plotly'] 
      };
    } catch (error) {
      console.warn('Error reading library preferences:', error);
      return { 
        primary: ['d3js'], 
        secondary: ['echarts', 'chartjs', 'plotly'] 
      };
    }
  }

  // Recent Charts
  addRecentChart(chartId: string): void {
    if (!this.localStorage) return;

    try {
      const recent = this.getRecentCharts();
      const updated = [chartId, ...recent.filter(id => id !== chartId)].slice(0, 10);
      this.localStorage.setItem(this.CACHE_KEYS.RECENT_CHARTS, JSON.stringify(updated));
    } catch (error) {
      console.warn('Error updating recent charts:', error);
    }
  }

  getRecentCharts(): string[] {
    if (!this.localStorage) return [];

    try {
      const cached = this.localStorage.getItem(this.CACHE_KEYS.RECENT_CHARTS);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn('Error reading recent charts:', error);
      return [];
    }
  }

  // Validation Results Cache
  setValidationResult(key: string, result: any): void {
    try {
      this.memoryCache.set(`validation_${key}`, {
        data: result,
        expires: Date.now() + this.CACHE_DURATION.VALIDATION
      });
    } catch (error) {
      console.warn('Failed to cache validation result:', error);
    }
  }

  getValidationResult(key: string): any | null {
    try {
      const cached = this.memoryCache.get(`validation_${key}`);

      if (!cached || Date.now() > cached.expires) {
        this.memoryCache.delete(`validation_${key}`);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Error reading validation result:', error);
      return null;
    }
  }

  // Field Assignments (Auto-save)
  saveFieldAssignments(chartType: string, library: string, assignments: any): void {
    if (!this.sessionStorage) return;

    try {
      const key = `${this.CACHE_KEYS.FIELD_ASSIGNMENTS}_${chartType}_${library}`;
      const data = {
        assignments,
        timestamp: Date.now()
      };
      this.sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save field assignments:', error);
    }
  }

  getFieldAssignments(chartType: string, library: string): any | null {
    if (!this.sessionStorage) return null;

    try {
      const key = `${this.CACHE_KEYS.FIELD_ASSIGNMENTS}_${chartType}_${library}`;
      const cached = this.sessionStorage.getItem(key);
      
      if (!cached) return null;

      const { assignments, timestamp } = JSON.parse(cached);
      
      // Keep assignments for 1 hour
      if (Date.now() - timestamp > 60 * 60 * 1000) {
        this.sessionStorage.removeItem(key);
        return null;
      }

      return assignments;
    } catch (error) {
      console.warn('Error reading field assignments:', error);
      return null;
    }
  }

  // Cache Management
  clearAllCaches(): void {
    try {
      // Clear session storage (SSR-safe)
      if (this.sessionStorage) {
        Object.values(this.CACHE_KEYS).forEach(key => {
          try {
            this.sessionStorage!.removeItem(key);
          } catch (error) {
            console.warn(`Failed to remove session item ${key}:`, error);
          }
        });
      }

      // Clear local storage (SSR-safe)
      if (this.localStorage) {
        Object.values(this.CACHE_KEYS).forEach(key => {
          try {
            this.localStorage!.removeItem(key);
          } catch (error) {
            console.warn(`Failed to remove local item ${key}:`, error);
          }
        });
      }

      // Clear memory cache
      this.memoryCache.clear();
      
      console.log('🧹 All caches cleared');
    } catch (error) {
      console.warn('Error clearing caches:', error);
    }
  }

  // SSR-safe cache statistics
  getCacheStats() {
    try {
      // Default stats for SSR
      const defaultStats = {
        sessionItems: 0,
        localStorageItems: 0,
        memoryItems: this.memoryCache.size,
        totalMemorySize: 0,
        isBrowser: this.isBrowser
      };

      if (!this.isBrowser) {
        return defaultStats;
      }

      // Calculate session storage items (browser only)
      let sessionItems = 0;
      if (this.sessionStorage) {
        try {
          sessionItems = Object.values(this.CACHE_KEYS)
            .map(key => this.sessionStorage!.getItem(key))
            .filter(Boolean).length;
        } catch (error) {
          console.warn('Error counting session items:', error);
        }
      }

      // Calculate local storage items (browser only)
      let localStorageItems = 0;
      if (this.localStorage) {
        try {
          localStorageItems = Object.values(this.CACHE_KEYS)
            .map(key => this.localStorage!.getItem(key))
            .filter(Boolean).length;
        } catch (error) {
          console.warn('Error counting local storage items:', error);
        }
      }

      // Calculate memory cache size
      let totalMemorySize = 0;
      try {
        totalMemorySize = Array.from(this.memoryCache.values())
          .reduce((size, item) => size + JSON.stringify(item).length, 0);
      } catch (error) {
        console.warn('Error calculating memory size:', error);
      }

      return {
        sessionItems,
        localStorageItems,
        memoryItems: this.memoryCache.size,
        totalMemorySize,
        isBrowser: this.isBrowser
      };
    } catch (error) {
      console.warn('Error getting cache stats:', error);
      return {
        sessionItems: 0,
        localStorageItems: 0,
        memoryItems: 0,
        totalMemorySize: 0,
        isBrowser: this.isBrowser,
        error: (error as any).message
      };
    }
  }
}

export default new ChartCacheService();