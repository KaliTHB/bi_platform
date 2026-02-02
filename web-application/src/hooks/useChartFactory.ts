import { useState, useEffect, useCallback, useMemo } from 'react';
import ChartFactoryService from '@/services/ChartFactoryService';
import ChartCacheService from '@/services/ChartCacheService';
import { ChartCreationResult, ChartFactoryConfig } from '@/types/factory.types';

export interface UseChartFactoryReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  createChart: (
    chartType: string, 
    library: string, 
    config: ChartFactoryConfig
  ) => Promise<ChartCreationResult>;
  validateConfig: (
    chartType: string, 
    library: string, 
    config: any
  ) => Promise<any>;
  getConfigSchema: (chartType: string, library: string) => Promise<any>;
  reinitialize: () => Promise<void>;
  cacheStats: any;
}

export const useChartFactory = (): UseChartFactoryReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const factoryService = useMemo(() => ChartFactoryService, []);
  const cacheService = useMemo(() => ChartCacheService, []);

  // SSR-safe cache stats - only compute on client side
  const cacheStats = useMemo(() => {
    if (!isMounted) {
      // Return safe defaults during SSR
      return {
        sessionItems: 0,
        localStorageItems: 0,
        memoryItems: 0,
        totalMemorySize: 0,
        isBrowser: false
      };
    }
    
    return cacheService.getCacheStats();
  }, [cacheService, isMounted]);

  const initialize = useCallback(async () => {
    // Don't initialize during SSR
    if (!isMounted || isInitialized || isInitializing) return;

    try {
      setIsInitializing(true);
      setError(null);

      // Check if already initialized from cache (client-side only)
      if (cacheService.isFactoryInitialized() && factoryService.isFactoryReady()) {
        setIsInitialized(true);
        return;
      }

      console.log('🚀 Initializing Chart Factory...');
      
      await factoryService.initialize();
      
      cacheService.setFactoryInitialized(true);
      setIsInitialized(true);
      
      console.log('✅ Chart Factory ready');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
      setError(errorMessage);
      console.error('❌ Chart Factory initialization failed:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [isMounted, isInitialized, isInitializing, factoryService, cacheService]);

  const createChart = useCallback(async (
    chartType: string,
    library: string,
    config: ChartFactoryConfig
  ): Promise<ChartCreationResult> => {
    if (!isMounted) {
      return {
        success: false,
        error: 'Component not mounted',
        chartType,
        library
      };
    }

    if (!isInitialized) {
      await initialize();
    }

    try {
      const result = await factoryService.createChart(chartType, library, config);
      
      // Cache successful creation
      if (result.success) {
        cacheService.addRecentChart(`${chartType}-${library}`);
      }
      
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Chart creation failed',
        chartType,
        library
      };
    }
  }, [isMounted, isInitialized, initialize, factoryService, cacheService]);

  const validateConfig = useCallback(async (
    chartType: string,
    library: string,
    config: any
  ) => {
    if (!isMounted) {
      return { valid: false, errors: ['Component not mounted'], warnings: [] };
    }

    if (!isInitialized) {
      await initialize();
    }

    const cacheKey = `${chartType}_${library}_${JSON.stringify(config).slice(0, 100)}`;
    
    // Check cache first
    const cached = cacheService.getValidationResult(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await factoryService.validateConfiguration(chartType, library, config);
    
    // Cache the result
    cacheService.setValidationResult(cacheKey, result);
    
    return result;
  }, [isMounted, isInitialized, initialize, factoryService, cacheService]);

  const getConfigSchema = useCallback(async (chartType: string, library: string) => {
    if (!isMounted) {
      return {};
    }

    if (!isInitialized) {
      await initialize();
    }

    // Check cache first
    const cached = cacheService.getConfigSchema(chartType, library);
    if (cached) {
      return cached;
    }

    const schema = await factoryService.getConfigSchema(chartType, library);
    
    // Cache the schema
    cacheService.setConfigSchema(chartType, library, schema);
    
    return schema;
  }, [isMounted, isInitialized, initialize, factoryService, cacheService]);

  const reinitialize = useCallback(async () => {
    if (!isMounted) return;

    setIsInitialized(false);
    setError(null);
    cacheService.clearAllCaches();
    await initialize();
  }, [isMounted, initialize, cacheService]);

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize on client-side mount
  useEffect(() => {
    if (isMounted) {
      initialize();
    }
  }, [isMounted, initialize]);

  return {
    isInitialized: isMounted ? isInitialized : false,
    isInitializing: isMounted ? isInitializing : false,
    error: isMounted ? error : null,
    createChart,
    validateConfig,
    getConfigSchema,
    reinitialize,
    cacheStats
  };
};

export default useChartFactory;