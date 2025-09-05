import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from './redux';
import { useGetDashboardsQuery } from '../store/api/dashboardApi';
import type { Dashboard } from '../store/api/dashboardApi';

export interface UseDashboardsReturn {
  dashboards: Dashboard[];
  categories: any[];
  loading: boolean;
  error: string | null;
  createDashboard: (data: any) => Promise<void>;
  updateDashboard: (id: string, data: any) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  duplicateDashboard: (id: string) => Promise<void>;
  refreshDashboards: () => void;
}

export const useDashboards = (filters?: any): UseDashboardsReturn => {
  // Use typed selector
  const auth = useAppSelector((state) => state.auth);
  const workspace = useAppSelector((state) => state.workspace.currentWorkspace);
  
  const [error, setError] = useState<string | null>(null);
  
  // Use RTK Query for data fetching
  const {
    data: dashboardData,
    error: queryError,
    isLoading,
    refetch
  } = useGetDashboardsQuery(filters || {}, {
    skip: !auth.isAuthenticated || !workspace,
    pollingInterval: 30000, // Refresh every 30 seconds
  });

  const dashboards = useMemo(() => {
    return dashboardData?.dashboards || [];
  }, [dashboardData]);

  // Mock functions - replace with actual implementations
  const createDashboard = async (data: any) => {
    console.log('Create dashboard:', data);
    // Implementation would go here
  };

  const updateDashboard = async (id: string, data: any) => {
    console.log('Update dashboard:', id, data);
    // Implementation would go here
  };

  const deleteDashboard = async (id: string) => {
    console.log('Delete dashboard:', id);
    // Implementation would go here
  };

  const duplicateDashboard = async (id: string) => {
    console.log('Duplicate dashboard:', id);
    // Implementation would go here
  };

  const refreshDashboards = () => {
    refetch();
  };

  return {
    dashboards,
    categories: [], // Mock - implement actual categories
    loading: isLoading,
    error: queryError ? 'Failed to load dashboards' : error,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    refreshDashboards,
  };
};
