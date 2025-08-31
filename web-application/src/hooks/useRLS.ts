// File: src/hooks/useRLS.ts

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

export const useRLS = (): UseRLSResult => {
  // State management
  const [policies, setPolicies] = useState<RLSPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Redux selectors - FIXED: Use currentWorkspace instead of current
  const auth = useSelector((state: RootState) => state.auth);
  const workspace = useSelector((state: RootState) => state.workspace.currentWorkspace);

  // ============================================================================
  // RLS Context Generation
  // ============================================================================

  const getRLSContext = useCallback((): RLSContext | null => {
    if (!auth.user || !workspace) {
      return null;
    }

    return {
      user_id: auth.user.id,
      workspace_id: workspace.id,
      roles: auth.user.roles || [], // roles is already string[] in auth.types.ts
      permissions: [], // Will be populated from roles if needed
      attributes: {
        // RLS-specific user attributes with safe fallbacks
        department: auth.user.department || auth.user.profile_data?.department || 'unknown',
        region: auth.user.region || auth.user.profile_data?.region || 'global',
        level: auth.user.level || auth.user.profile_data?.level || 'standard',
        location: auth.user.location || auth.user.profile_data?.location || 'default',
        team: auth.user.team || auth.user.profile_data?.team,
        cost_center: auth.user.cost_center || auth.user.profile_data?.cost_center,
        manager_id: auth.user.manager_id || auth.user.profile_data?.manager_id,
        
        // Standard user attributes
        first_name: auth.user.first_name,
        last_name: auth.user.last_name,
        email: auth.user.email,
        username: auth.user.username,
        is_active: auth.user.is_active,
        created_at: auth.user.created_at,
        
        // Additional profile data
        ...auth.user.profile_data,
      },
    };
  }, [auth.user, workspace]);

  // ============================================================================
  // Policy Management
  // ============================================================================

  const fetchRLSPolicies = useCallback(async () => {
    if (!workspace?.id || !auth.user?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/rls-policies`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch RLS policies');
      }

      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching RLS policies:', err);
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, auth.user?.id, auth.token]);

  const refreshPolicies = useCallback(async () => {
    await fetchRLSPolicies();
  }, [fetchRLSPolicies]);

  // ============================================================================
  // Query Modification with RLS
  // ============================================================================

  const applyRLSToQuery = useCallback(async (
    baseQuery: string, 
    datasetId: string
  ): Promise<string> => {
    const context = getRLSContext();
    if (!context) {
      return baseQuery;
    }

    try {
      const response = await fetch('/api/rls/apply-query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: baseQuery,
          dataset_id: datasetId,
          context: context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply RLS to query');
      }

      const result = await response.json();
      return result.modified_query || baseQuery;
    } catch (err) {
      console.error('Error applying RLS to query:', err);
      // Return original query if RLS application fails
      return baseQuery;
    }
  }, [getRLSContext, auth.token]);

  // ============================================================================
  // Access Control Checks
  // ============================================================================

  const checkDatasetAccess = useCallback(async (datasetId: string): Promise<boolean> => {
    const context = getRLSContext();
    if (!context) {
      return false;
    }

    try {
      const response = await fetch(`/api/datasets/${datasetId}/access-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: context,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.has_access === true;
    } catch (err) {
      console.error('Error checking dataset access:', err);
      return false;
    }
  }, [getRLSContext, auth.token]);

  // ============================================================================
  // Context Updates
  // ============================================================================

  const updateContext = useCallback((updates: Partial<RLSContext>) => {
    // This would typically trigger a context refresh or cache update
    // For now, we'll just log the updates
    console.log('RLS Context updates:', updates);
    
    // In a full implementation, you might:
    // 1. Update local storage/cache
    // 2. Trigger a re-fetch of policies
    // 3. Emit context change events
    
    // Refresh policies when context changes
    refreshPolicies();
  }, [refreshPolicies]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Fetch policies when workspace or user changes
  useEffect(() => {
    fetchRLSPolicies();
  }, [fetchRLSPolicies]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    policies,
    context: getRLSContext(),
    loading,
    error,
    applyRLSToQuery,
    refreshPolicies,
    checkDatasetAccess,
    getRLSContext,
    updateContext,
  };
};