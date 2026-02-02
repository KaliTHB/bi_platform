// web-application/src/hooks/useCharts.ts
import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Chart, ChartConfiguration } from '@/types/chart.types';

// ✅ Use RTK Query hooks from the existing chartApi
import {
  useGetChartsQuery,
  useLazyGetChartsQuery,
  useCreateChartMutation,
  useUpdateChartMutation,
  useDeleteChartMutation,
  useDuplicateChartMutation,
} from '@/store/api/chartApi';

interface UseChartsReturn {
  charts: Chart[];
  loading: boolean;
  error: string | null;
  createChart: (chartData: Partial<Chart>) => Promise<Chart | null>;
  updateChart: (chartId: string, updates: Partial<Chart>) => Promise<Chart | null>;
  deleteChart: (chartId: string) => Promise<boolean>;
  duplicateChart: (chartId: string) => Promise<Chart | null>;
  refreshCharts: () => Promise<void>;
}

export const useCharts = (dashboardId?: string): UseChartsReturn => {
  
  // ✅ Get current workspace from Redux store
  const currentWorkspace = useSelector((state: RootState) => state.workspace.currentWorkspace);

  // ✅ Use RTK Query to fetch charts
  const {
    data: chartsResponse,
    isLoading,
    error: queryError,
    refetch,
  } = useGetChartsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      params: dashboardId ? { dashboard_id: dashboardId } : {},
    },
    {
      skip: !currentWorkspace?.id, // Skip if no workspace
    }
  );

  // ✅ RTK Query mutation hooks
  const [createChartMutation] = useCreateChartMutation();
  const [updateChartMutation] = useUpdateChartMutation();
  const [deleteChartMutation] = useDeleteChartMutation();
  const [duplicateChartMutation] = useDuplicateChartMutation();

  // Extract data from RTK Query response
  const charts = chartsResponse?.charts || [];
  const loading = isLoading;
  const error = queryError ? (queryError as any).message || 'Failed to load charts' : null;

  // ✅ Create chart function using RTK Query mutation
  const createChart = useCallback(async (chartData: Partial<Chart>): Promise<Chart | null> => {
    if (!currentWorkspace) return null;

    try {
      const newChartData = {
        ...chartData,
        workspace_id: currentWorkspace.id,
        dashboard_id: dashboardId || chartData.dashboard_id,
        is_active: true,
      };

      const result = await createChartMutation(newChartData).unwrap();
      
      if (result.success && result.chart) {
        return result.chart;
      }
      
      return null;
    } catch (err: any) {
      console.error('Failed to create chart:', err);
      throw new Error(err.message || 'Failed to create chart');
    }
  }, [currentWorkspace, dashboardId, createChartMutation]);

  // ✅ Update chart function using RTK Query mutation
  const updateChart = useCallback(async (chartId: string, updates: Partial<Chart>): Promise<Chart | null> => {
    try {
      const result = await updateChartMutation({ id: chartId, updates }).unwrap();
      
      if (result.success && result.chart) {
        return result.chart;
      }
      
      return null;
    } catch (err: any) {
      console.error('Failed to update chart:', err);
      throw new Error(err.message || 'Failed to update chart');
    }
  }, [updateChartMutation]);

  // ✅ Delete chart function using RTK Query mutation
  const deleteChart = useCallback(async (chartId: string): Promise<boolean> => {
    try {
      const result = await deleteChartMutation(chartId).unwrap();
      return result.success;
    } catch (err: any) {
      console.error('Failed to delete chart:', err);
      throw new Error(err.message || 'Failed to delete chart');
    }
  }, [deleteChartMutation]);

  // ✅ Duplicate chart function using RTK Query mutation
  const duplicateChart = useCallback(async (chartId: string): Promise<Chart | null> => {
    try {
      const result = await duplicateChartMutation(chartId).unwrap();
      
      if (result.success && result.chart) {
        return result.chart;
      }
      
      return null;
    } catch (err: any) {
      console.error('Failed to duplicate chart:', err);
      throw new Error(err.message || 'Failed to duplicate chart');
    }
  }, [duplicateChartMutation]);

  // ✅ Refresh charts function using RTK Query refetch
  const refreshCharts = useCallback(async (): Promise<void> => {
    try {
      await refetch().unwrap();
    } catch (err: any) {
      console.error('Failed to refresh charts:', err);
    }
  }, [refetch]);

  return {
    charts,
    loading,
    error,
    createChart,
    updateChart,
    deleteChart,
    duplicateChart,
    refreshCharts,
  };
};

export default useCharts;