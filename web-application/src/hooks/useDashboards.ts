// web-application/src/hooks/useDashboards.ts
// ✅ MERGED: Combines useDashboard + useDashboards into single comprehensive file

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './redux';
import { 
  useGetDashboardsQuery,
  useGetDashboardQuery,
  useCreateDashboardMutation,
  useUpdateDashboardMutation,
  useDeleteDashboardMutation,
  useDuplicateDashboardMutation,
  useShareDashboardMutation,
  useExportDashboardMutation,
  useRefreshDashboardMutation,
  useToggleDashboardFavoriteMutation,
  useToggleDashboardStatusMutation,
  type Dashboard,
  type CreateDashboardRequest,
  type UpdateDashboardRequest,
  type DashboardFilters,
  type DashboardExportFormat
} from '../store/api/dashboardApi';
import { RootState } from '../store';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface DashboardCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  icon?: string;
  dashboard_count: number;
}

export interface DashboardOperationOptions {
  showSuccessMessage?: boolean;
  showErrorMessage?: boolean;
  onSuccess?: (data?: any) => void;
  onError?: (error: string) => void;
}

// Multiple dashboards management
export interface UseDashboardsReturn {
  // Data
  dashboards: Dashboard[];
  categories: DashboardCategory[];
  totalCount: number;
  
  // States  
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Filters & Search
  filters: DashboardFilters;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Operations
  createDashboard: (data: CreateDashboardRequest, options?: DashboardOperationOptions) => Promise<Dashboard | void>;
  updateDashboard: (id: string, data: UpdateDashboardRequest, options?: DashboardOperationOptions) => Promise<Dashboard | void>;
  deleteDashboard: (id: string, options?: DashboardOperationOptions) => Promise<void>;
  duplicateDashboard: (id: string, newName?: string, options?: DashboardOperationOptions) => Promise<Dashboard | void>;
  refreshDashboards: () => void;
  loadMore: () => void;
  
  // Bulk operations
  bulkDelete: (ids: string[], options?: DashboardOperationOptions) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: 'draft' | 'published' | 'archived', options?: DashboardOperationOptions) => Promise<void>;
}

// Single dashboard management  
export interface UseDashboardReturn {
  // Data
  dashboard: Dashboard | null;
  
  // States
  loading: boolean;
  error: string | null;
  
  // Operations
  updateDashboard: (updates: UpdateDashboardRequest, options?: DashboardOperationOptions) => Promise<Dashboard | void>;
  incrementViewCount: () => Promise<void>;
  shareDashboard: (shareSettings: any, options?: DashboardOperationOptions) => Promise<void>;
  exportDashboard: (format: DashboardExportFormat, options?: DashboardOperationOptions) => Promise<void>;
  toggleFavorite: (options?: DashboardOperationOptions) => Promise<void>;
  toggleStatus: (status: 'draft' | 'published' | 'archived', options?: DashboardOperationOptions) => Promise<void>;
  refreshDashboard: () => void;
}

// =============================================================================
// MULTIPLE DASHBOARDS HOOK
// =============================================================================

export const useDashboards = (initialFilters?: Partial<DashboardFilters>): UseDashboardsReturn => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state: RootState) => state.auth);
  const workspace = useAppSelector((state: RootState) => state.workspace.currentWorkspace);
  
  // Local state for filters and search
  const [filters, setFiltersState] = useState<DashboardFilters>({
    workspace_id: workspace?.id || '',
    status: 'all',
    category_id: '',
    is_featured: false,
    is_public: undefined,
    created_by: '',
    page: 1,
    limit: 20,
    sort_by: 'updated_at',
    sort_order: 'desc',
    ...initialFilters
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // RTK Query hooks
  const {
    data: dashboardData,
    error: queryError,
    isLoading,
    refetch,
    isFetching
  } = useGetDashboardsQuery(
    { ...filters, search: searchQuery },
    {
      skip: !auth.isAuthenticated || !workspace?.id,
      pollingInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Mutation hooks
  const [createDashboardMutation, { isLoading: isCreating }] = useCreateDashboardMutation();
  const [updateDashboardMutation, { isLoading: isUpdating }] = useUpdateDashboardMutation();
  const [deleteDashboardMutation, { isLoading: isDeleting }] = useDeleteDashboardMutation();
  const [duplicateDashboardMutation, { isLoading: isDuplicating }] = useDuplicateDashboardMutation();
  
  // Computed values
  const dashboards = useMemo(() => {
    return dashboardData?.dashboards || [];
  }, [dashboardData]);

  const categories = useMemo(() => {
    return dashboardData?.categories || [];
  }, [dashboardData]);

  const totalCount = useMemo(() => {
    return dashboardData?.total_count || 0;
  }, [dashboardData]);

  const hasMore = useMemo(() => {
    return dashboards.length < totalCount;
  }, [dashboards.length, totalCount]);

  const loading = isLoading || isFetching || isCreating || isUpdating || isDeleting || isDuplicating;

  const error = useMemo(() => {
    if (localError) return localError;
    if (queryError) {
      if ('status' in queryError) {
        return `Failed to load dashboards: ${queryError.status}`;
      }
      return 'Failed to load dashboards';
    }
    return null;
  }, [localError, queryError]);

  // Filter management
  const setFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page || 1 // Reset to page 1 unless explicitly set
    }));
    setLocalError(null);
  }, []);

  // Operations
  const createDashboard = useCallback(async (
    data: CreateDashboardRequest,
    options: DashboardOperationOptions = {}
  ): Promise<Dashboard | void> => {
    try {
      setLocalError(null);
      const result = await createDashboardMutation({
        ...data,
        workspace_id: workspace?.id || ''
      }).unwrap();
      
      options.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to create dashboard';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [createDashboardMutation, workspace?.id]);

  const updateDashboard = useCallback(async (
    id: string,
    data: UpdateDashboardRequest,
    options: DashboardOperationOptions = {}
  ): Promise<Dashboard | void> => {
    try {
      setLocalError(null);
      const result = await updateDashboardMutation({ id, ...data }).unwrap();
      
      options.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to update dashboard';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [updateDashboardMutation]);

  const deleteDashboard = useCallback(async (
    id: string,
    options: DashboardOperationOptions = {}
  ): Promise<void> => {
    try {
      setLocalError(null);
      await deleteDashboardMutation(id).unwrap();
      
      options.onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to delete dashboard';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [deleteDashboardMutation]);

  const duplicateDashboard = useCallback(async (
    id: string,
    newName?: string,
    options: DashboardOperationOptions = {}
  ): Promise<Dashboard | void> => {
    try {
      setLocalError(null);
      const result = await duplicateDashboardMutation({ 
        id, 
        new_name: newName 
      }).unwrap();
      
      options.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to duplicate dashboard';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [duplicateDashboardMutation]);

  const refreshDashboards = useCallback(() => {
    setLocalError(null);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setFilters({ page: filters.page + 1 });
    }
  }, [hasMore, loading, filters.page, setFilters]);

  // Bulk operations
  const bulkDelete = useCallback(async (
    ids: string[],
    options: DashboardOperationOptions = {}
  ): Promise<void> => {
    try {
      setLocalError(null);
      await Promise.all(ids.map(id => deleteDashboardMutation(id).unwrap()));
      
      options.onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to delete dashboards';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [deleteDashboardMutation]);

  const bulkUpdateStatus = useCallback(async (
    ids: string[],
    status: 'draft' | 'published' | 'archived',
    options: DashboardOperationOptions = {}
  ): Promise<void> => {
    try {
      setLocalError(null);
      await Promise.all(
        ids.map(id => updateDashboardMutation({ id, status }).unwrap())
      );
      
      options.onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to update dashboard status';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [updateDashboardMutation]);

  return {
    // Data
    dashboards,
    categories,
    totalCount,
    
    // States
    loading,
    error,
    hasMore,
    
    // Filters & Search
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    
    // Operations
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    refreshDashboards,
    loadMore,
    
    // Bulk operations
    bulkDelete,
    bulkUpdateStatus,
  };
};

// =============================================================================
// SINGLE DASHBOARD HOOK
// =============================================================================

export const useDashboard = (dashboardId: string): UseDashboardReturn => {
  const dispatch = useAppDispatch();
  const workspace = useAppSelector((state: RootState) => state.workspace.currentWorkspace);
  const [localError, setLocalError] = useState<string | null>(null);

  // RTK Query hooks
  const {
    data: dashboard,
    error: queryError,
    isLoading,
    refetch
  } = useGetDashboardQuery(
    dashboardId,
    {
      skip: !dashboardId,
      pollingInterval: 60000, // Refresh every minute
    }
  );

  // Mutation hooks
  const [updateDashboardMutation, { isLoading: isUpdating }] = useUpdateDashboardMutation();
  const [shareDashboardMutation, { isLoading: isSharing }] = useShareDashboardMutation();
  const [exportDashboardMutation, { isLoading: isExporting }] = useExportDashboardMutation();
  const [refreshDashboardMutation, { isLoading: isRefreshing }] = useRefreshDashboardMutation();
  const [toggleFavoriteMutation, { isLoading: isTogglingFavorite }] = useToggleDashboardFavoriteMutation();
  const [toggleStatusMutation, { isLoading: isTogglingStatus }] = useToggleDashboardStatusMutation();

  // Computed values
  const loading = isLoading || isUpdating || isSharing || isExporting || isRefreshing || isTogglingFavorite || isTogglingStatus;

  const error = useMemo(() => {
    if (localError) return localError;
    if (queryError) {
      if ('status' in queryError) {
        return `Failed to load dashboard: ${queryError.status}`;
      }
      return 'Failed to load dashboard';
    }
    return null;
  }, [localError, queryError]);

  // Operations
  const updateDashboard = useCallback(async (
    updates: UpdateDashboardRequest,
    options: DashboardOperationOptions = {}
  ): Promise<Dashboard | void> => {
    try {
      setLocalError(null);
      const result = await updateDashboardMutation({
        id: dashboardId,
        ...updates
      }).unwrap();
      
      options.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to update dashboard';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [dashboardId, updateDashboardMutation]);

  const incrementViewCount = useCallback(async (): Promise<void> => {
    try {
      // This could be a separate mutation or part of update
      await updateDashboardMutation({
        id: dashboardId,
        increment_view_count: true
      }).unwrap();
    } catch (err: any) {
      // Silently fail for view count increment
      console.warn('Failed to increment view count:', err);
    }
  }, [dashboardId, updateDashboardMutation]);

  const shareDashboard = useCallback(async (
    shareSettings: any,
    options: DashboardOperationOptions = {}
  ): Promise<void> => {
    try {
      setLocalError(null);
      await shareDashboardMutation({
        id: dashboardId,
        ...shareSettings
      }).unwrap();
      
      options.onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to share dashboard';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [dashboardId, shareDashboardMutation]);

  const exportDashboard = useCallback(async (
    format: DashboardExportFormat,
    options: DashboardOperationOptions = {}
  ): Promise<void> => {
    try {
      setLocalError(null);
      const result = await exportDashboardMutation({
        id: dashboardId,
        format
      }).unwrap();
      
      // Handle file download
      if (result.download_url) {
        const link = document.createElement('a');
        link.href = result.download_url;
        link.download = result.filename || `dashboard-${dashboardId}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      options.onSuccess?.(result);
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to export dashboard';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [dashboardId, exportDashboardMutation]);

  const toggleFavorite = useCallback(async (
    options: DashboardOperationOptions = {}
  ): Promise<void> => {
    try {
      setLocalError(null);
      await toggleFavoriteMutation(dashboardId).unwrap();
      
      options.onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to toggle favorite status';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [dashboardId, toggleFavoriteMutation]);

  const toggleStatus = useCallback(async (
    status: 'draft' | 'published' | 'archived',
    options: DashboardOperationOptions = {}
  ): Promise<void> => {
    try {
      setLocalError(null);
      await toggleStatusMutation({ id: dashboardId, status }).unwrap();
      
      options.onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.data?.message || 'Failed to update dashboard status';
      setLocalError(errorMessage);
      options.onError?.(errorMessage);
      if (!options.onError) {
        throw new Error(errorMessage);
      }
    }
  }, [dashboardId, toggleStatusMutation]);

  const refreshDashboard = useCallback(() => {
    setLocalError(null);
    refetch();
  }, [refetch]);

  // Auto-increment view count on mount (only once)
  useEffect(() => {
    if (dashboard && dashboardId) {
      incrementViewCount();
    }
  }, [dashboard?.id]); // Only run when dashboard ID changes

  return {
    // Data
    dashboard: dashboard || null,
    
    // States
    loading,
    error,
    
    // Operations
    updateDashboard,
    incrementViewCount,
    shareDashboard,
    exportDashboard,
    toggleFavorite,
    toggleStatus,
    refreshDashboard,
  };
};

// =============================================================================
// UTILITY HOOKS (Additional helpers)
// =============================================================================

/**
 * Hook for dashboard categories management
 */
export const useDashboardCategories = () => {
  const { categories, loading, error, refreshDashboards } = useDashboards({
    limit: 1, // Minimal query just to get categories
  });
  
  return {
    categories,
    loading,
    error,
    refresh: refreshDashboards,
  };
};

/**
 * Hook for dashboard search with debouncing
 */
export const useDashboardSearch = (initialQuery = '', debounceMs = 300) => {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    
    return () => {
      clearTimeout(handler);
    };
  }, [query, debounceMs]);
  
  return {
    query,
    setQuery,
    debouncedQuery,
  };
};

// Export default as the main hook for multiple dashboards
export default useDashboards;