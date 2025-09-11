// web-application/src/hooks/useDashboard.ts
import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { RootState } from '../store';

export interface DashboardOperations {
  updateDashboard: (updates: any) => Promise<void>;
  incrementViewCount: () => Promise<void>;
  shareDashboard: () => Promise<void>;
  exportDashboard: (format: 'pdf' | 'png' | 'excel') => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useDashboard = (dashboardId: string): DashboardOperations => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get workspace from Redux state
  const workspace = useAppSelector((state: RootState) => state.auth.workspace);
  const workspaceId = workspace?.id || '';

  const updateDashboard = useCallback(async (updates: any) => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/dashboards/${dashboardId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update dashboard');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update dashboard');
      }

      // You could dispatch an action to update Redux state here
      // dispatch(updateDashboardAction(data.data));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update dashboard';
      setError(errorMessage);
      console.error('Error updating dashboard:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  const incrementViewCount = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Make a lightweight API call to increment view count
      await fetch(`${apiUrl}/api/v1/dashboards/${dashboardId}/views`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer || null
        })
      });

      // Don't throw errors for view count - it's not critical
    } catch (err) {
      console.warn('Failed to increment view count:', err);
    }
  }, [dashboardId]);

  const shareDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/dashboards/${dashboardId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          share_type: 'public_link',
          expires_in: '7d' // 7 days
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate share link');
      }

      return data.data.share_url;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share dashboard';
      setError(errorMessage);
      console.error('Error sharing dashboard:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  const exportDashboard = useCallback(async (format: 'pdf' | 'png' | 'excel') => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/dashboards/${dashboardId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format,
          options: {
            include_filters: true,
            include_data: format === 'excel',
            resolution: format === 'png' ? 'high' : undefined
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export dashboard');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `dashboard-${dashboardId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export dashboard';
      setError(errorMessage);
      console.error('Error exporting dashboard:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  return {
    updateDashboard,
    incrementViewCount,
    shareDashboard,
    exportDashboard,
    loading,
    error
  };
};