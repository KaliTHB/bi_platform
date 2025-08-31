// File: bi_platform/web-application/src/hooks/useRLS.ts

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

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

// RLS Context for providing RLS data throughout the app
const RLSContextProvider = createContext<UseRLSResult | null>(null);

// RLS Context Provider Component
export const RLSProvider = ({ children }: { children: ReactNode }) => {
  const rlsData = useRLS();
  return (
    <RLSContextProvider.Provider value={rlsData}>
      {children}
    </RLSContextProvider.Provider>
  );
};

// Hook to use RLS context from provider
export const useRLSContext = (): UseRLSResult => {
  const context = useContext(RLSContextProvider);
  if (!context) {
    throw new Error('useRLSContext must be used within an RLSProvider');
  }
  return context;
};

// Main RLS hook
export const useRLS = (): UseRLSResult => {
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [context, setContext] = useState<RLSContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useSelector((state: RootState) => state.auth);
  const { currentWorkspace } = useSelector((state: RootState) => state.workspace);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = auth.token || localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

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
    }
  }, [auth.user, auth.permissions, currentWorkspace]);

  // Load RLS policies for the current workspace
  const loadPolicies = useCallback(async () => {
    if (!currentWorkspace?.id) return;

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
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

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
  }, [context, currentWorkspace]);

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
  }, [context, currentWorkspace]);

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

  // Initialize context when auth or workspace changes
  useEffect(() => {
    initializeContext();
  }, [initializeContext]);

  // Load policies when workspace changes
  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

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