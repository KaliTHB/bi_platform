// web-application/src/hooks/useCharts.ts
import { useState, useEffect, useCallback } from 'react';
import { Chart } from '@/types/chart.types';
import { chartAPI } from '@/services/api';
import { useWorkspace } from '@/hooks/useWorkspace';

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
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentWorkspace } = useWorkspace();

  // Load charts function
  const loadCharts = useCallback(async () => {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      setError(null);

      const params: any = {
        workspaceId: currentWorkspace.id
      };

      // If dashboardId is provided, filter by dashboard
      if (dashboardId) {
        params.dashboardId = dashboardId;
      }

      const response = await chartAPI.getCharts(params);
      setCharts(response.charts || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load charts';
      setError(errorMessage);
      console.error('Failed to load charts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, dashboardId]);

  // Create chart function
  const createChart = useCallback(async (chartData: Partial<Chart>): Promise<Chart | null> => {
    if (!currentWorkspace) return null;

    try {
      setError(null);
      
      const newChartData = {
        ...chartData,
        workspace_id: currentWorkspace.id,
        dashboard_id: dashboardId || chartData.dashboard_id,
        is_active: true
      };

      const response = await chartAPI.createChart(newChartData);
      
      if (response.chart) {
        setCharts(prevCharts => [...prevCharts, response.chart]);
        return response.chart;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chart';
      setError(errorMessage);
      console.error('Failed to create chart:', err);
      return null;
    }
  }, [currentWorkspace, dashboardId]);

  // Update chart function
  const updateChart = useCallback(async (chartId: string, updates: Partial<Chart>): Promise<Chart | null> => {
    try {
      setError(null);
      
      const response = await chartAPI.updateChart(chartId, updates);
      
      if (response.chart) {
        setCharts(prevCharts => 
          prevCharts.map(chart => 
            chart.id === chartId ? response.chart : chart
          )
        );
        return response.chart;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update chart';
      setError(errorMessage);
      console.error('Failed to update chart:', err);
      return null;
    }
  }, []);

  // Delete chart function
  const deleteChart = useCallback(async (chartId: string): Promise<boolean> => {
    try {
      setError(null);
      
      await chartAPI.deleteChart(chartId);
      
      setCharts(prevCharts => 
        prevCharts.filter(chart => chart.id !== chartId)
      );
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete chart';
      setError(errorMessage);
      console.error('Failed to delete chart:', err);
      return false;
    }
  }, []);

  // Duplicate chart function
  const duplicateChart = useCallback(async (chartId: string): Promise<Chart | null> => {
    if (!currentWorkspace) return null;

    try {
      setError(null);
      
      // Find the chart to duplicate
      const originalChart = charts.find(chart => chart.id === chartId);
      if (!originalChart) {
        throw new Error('Chart not found');
      }

      // Create a new chart with duplicated data
      const duplicatedChartData = {
        ...originalChart,
        name: `${originalChart.name} (Copy)`,
        display_name: `${originalChart.display_name} (Copy)`,
        id: undefined, // Remove ID so a new one gets generated
        created_at: undefined,
        updated_at: undefined,
        created_by: undefined
      };

      const response = await chartAPI.createChart(duplicatedChartData);
      
      if (response.chart) {
        setCharts(prevCharts => [...prevCharts, response.chart]);
        return response.chart;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate chart';
      setError(errorMessage);
      console.error('Failed to duplicate chart:', err);
      return null;
    }
  }, [currentWorkspace, charts]);

  // Refresh charts function
  const refreshCharts = useCallback(async () => {
    await loadCharts();
  }, [loadCharts]);

  // Load charts on mount and when dependencies change
  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  return {
    charts,
    loading,
    error,
    createChart,
    updateChart,
    deleteChart,
    duplicateChart,
    refreshCharts
  };
};

export default useCharts;