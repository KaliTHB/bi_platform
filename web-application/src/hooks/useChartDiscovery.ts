import { useState, useEffect, useCallback } from 'react';
import ChartDiscoveryService from '@/services/ChartDiscoveryService';
import ChartCacheService from '@/services/ChartCacheService';
import ChartFactoryService from '@/services/ChartFactoryService';
import { ChartCategoryStructure } from '@/types/chart.types';

export interface UseChartDiscoveryReturn {
  chartCategories: ChartCategoryStructure;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useChartDiscovery = (): UseChartDiscoveryReturn => {
  const [chartCategories, setChartCategories] = useState<ChartCategoryStructure>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const discoveryService = new ChartDiscoveryService(ChartCacheService, ChartFactoryService);

  const discoverCharts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Starting chart discovery...');
      
      const categories = await discoveryService.discoverAvailableCharts();
      setChartCategories(categories);
      
      console.log('✅ Chart discovery completed');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discover charts';
      console.error('❌ Chart discovery failed:', err);
      setError(errorMessage);
      
      // Set empty categories on error
      setChartCategories({});
    } finally {
      setIsLoading(false);
    }
  }, [discoveryService]);

  const refetch = useCallback(async () => {
    await discoverCharts();
  }, [discoverCharts]);

  // Initialize on mount
  useEffect(() => {
    discoverCharts();
  }, [discoverCharts]);

  return {
    chartCategories,
    isLoading,
    error,
    refetch
  };
};

export default useChartDiscovery;