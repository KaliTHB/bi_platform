// File: web-application/src/hooks/useRLS.ts

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// ============================================================================
// Types and Interfaces
// ============================================================================

// RLS (Row-Level Security) Types - Exported for use in other files
export interface RLSPolicy {
  id: string;
  name: string;
  dataset_id: string;
  condition: string;
  parameters: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RLSContext {
  user_id: string;
  workspace_id: string;
  roles: string[];
  permissions: string[];
  attributes: Record<string, any>;
}

export interface DatasetRLSConfig {
  dataset_id: string;
  policies: RLSPolicy[];
  context: RLSContext;
  is_enabled: boolean;
}

export interface UseRLSResult {
  policies: RLSPolicy[];
  context: RLSContext | null;
  loading: boolean;
  error: string | null;
  applyRLSToQuery: (baseQuery: string, datasetId: string) => Promise<string>;
  refreshPolicies: () => Promise<void>;
  checkDatasetAccess: (datasetId: string) => Promise<boolean>;
  getRLSContext: () => RLSContext | null;
  updateContext: (updates: Partial<RLSContext>) => void;
}

// ============================================================================
// Main RLS Hook Implementation
// ============================================================================

// Main RLS hook
export const useRLS = (): UseRLSResult => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [context, setContext] = useState<RLSContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Redux State
  // ============================================================================
  
  const auth = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  // Helper function to get auth headers
  const getAuthHeaders = useCallback(() => {
    const token = auth.token || localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [auth.token]);

  // ============================================================================
  // Context Initialization
  // ============================================================================

  // Initialize RLS context based on current user and workspace
  const initializeContext = useCallback(() => {
    if (auth.user && currentWorkspace) {
      const rlsContext: RLSContext = {
        user_id: auth.user.id,
        workspace_id: currentWorkspace.id,
        roles: auth.user.roles || [],
        permissions: auth.permissions || [],
        attributes: {
          // Add user attributes that can be used in RLS policies
          department: auth.user.department,
          region: auth.user.region,
          access_level: auth.user.access_level,
          // Additional custom attributes
          ...auth.user.custom_attributes,
        },
      };
      setContext(rlsContext);
    } else {
      setContext(null);
    }
  }, [auth.user, auth.permissions, currentWorkspace]);

  // ============================================================================
  // Policy Management
  // ============================================================================

  // Load RLS policies for the current workspace
  const loadPolicies = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setPolicies([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/rls/policies`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load RLS policies');
      }

      const data = await response.json();
      setPolicies(data.data || data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load RLS policies';
      setError(errorMessage);
      console.error('RLS policies loading error:', err);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, getAuthHeaders]);

  // ============================================================================
  // Query Application
  // ============================================================================

  // Apply RLS policies to a base query
  const applyRLSToQuery = useCallback(async (baseQuery: string, datasetId: string): Promise<string> => {
    if (!context || !currentWorkspace) {
      return baseQuery;
    }

    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/rls/apply-query`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          base_query: baseQuery,
          dataset_id: datasetId,
          context: context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply RLS to query');
      }

      const data = await response.json();
      return data.modified_query || baseQuery;
    } catch (err) {
      console.error('RLS query application error:', err);
      // Return original query if RLS application fails
      return baseQuery;
    }
  }, [context, currentWorkspace, getAuthHeaders]);

  // ============================================================================
  // Access Control
  // ============================================================================

  // Check if user has access to a specific dataset with RLS applied
  const checkDatasetAccess = useCallback(async (datasetId: string): Promise<boolean> => {
    if (!context || !currentWorkspace) {
      return false;
    }

    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/rls/check-access/${datasetId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.has_access === true;
    } catch (err) {
      console.error('RLS access check error:', err);
      return false;
    }
  }, [context, currentWorkspace, getAuthHeaders]);

  // ============================================================================
  // Context Management
  // ============================================================================

  // Get current RLS context
  const getRLSContext = useCallback((): RLSContext | null => {
    return context;
  }, [context]);

  // Update RLS context (for dynamic attribute changes)
  const updateContext = useCallback((updates: Partial<RLSContext>) => {
    if (context) {
      setContext({
        ...context,
        ...updates,
        attributes: {
          ...context.attributes,
          ...updates.attributes,
        },
      });
    }
  }, [context]);

  // Refresh policies
  const refreshPolicies = useCallback(async () => {
    await loadPolicies();
  }, [loadPolicies]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize context when auth or workspace changes
  useEffect(() => {
    initializeContext();
  }, [initializeContext]);

  // Load policies when workspace changes
  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    policies,
    context,
    loading,
    error,
    applyRLSToQuery,
    refreshPolicies,
    checkDatasetAccess,
    getRLSContext,
    updateContext,
  };
};

// ============================================================================
// Specialized Hooks
// ============================================================================

// Helper hooks for specific RLS operations
export const useDatasetRLS = (datasetId: string) => {
  const { policies, context, applyRLSToQuery, checkDatasetAccess } = useRLS();
  
  // Get policies specific to this dataset
  const datasetPolicies = policies.filter(policy => policy.dataset_id === datasetId);
  
  const applyRLS = useCallback((query: string) => {
    return applyRLSToQuery(query, datasetId);
  }, [applyRLSToQuery, datasetId]);
  
  const checkAccess = useCallback(() => {
    return checkDatasetAccess(datasetId);
  }, [checkDatasetAccess, datasetId]);

  return {
    policies: datasetPolicies,
    context,
    applyRLS,
    checkAccess,
    hasRLS: datasetPolicies.length > 0,
  };
};

// Hook for workspace-level RLS checking
export const useWorkspaceRLS = () => {
  const { context, policies, checkDatasetAccess } = useRLS();
  
  const checkMultipleDatasets = useCallback(async (datasetIds: string[]): Promise<Record<string, boolean>> => {
    const results: Record<string, boolean> = {};
    
    for (const datasetId of datasetIds) {
      results[datasetId] = await checkDatasetAccess(datasetId);
    }
    
    return results;
  }, [checkDatasetAccess]);

  const getApplicablePolicies = useCallback((datasetIds: string[]) => {
    return policies.filter(policy => 
      datasetIds.includes(policy.dataset_id) && policy.is_active
    );
  }, [policies]);

  return {
    context,
    checkMultipleDatasets,
    getApplicablePolicies,
    hasAnyPolicies: policies.length > 0,
  };
};

export default useRLS;