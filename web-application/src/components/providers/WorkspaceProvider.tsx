// web-application/src/components/providers/WorkspaceProvider.tsx - IMPROVED VERSION
import React, { createContext, useContext, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

// Types
interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  is_default?: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading?: boolean;
  error?: string | null;
}

// Context creation with default values
const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,
});

// Provider Props
interface WorkspaceProviderProps {
  children: ReactNode;
}

// Provider Component
export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  // Get workspace state from Redux store
  const workspaceState = useSelector((state: RootState) => {
    // Handle case where workspace slice might not exist
    if (!state.workspace) {
      console.warn('WorkspaceProvider: workspace slice not found in Redux store');
      return {
        currentWorkspace: null,
        workspaces: [],
        isLoading: false,
        error: null,
      };
    }
    return state.workspace;
  });

  // Prepare context value with fallbacks
  const value: WorkspaceContextType = {
    currentWorkspace: workspaceState?.currentWorkspace || null,
    workspaces: workspaceState?.workspaces || [],
    isLoading: workspaceState?.isLoading || false,
    error: workspaceState?.error || null,
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('WorkspaceProvider context value:', {
      currentWorkspace: value.currentWorkspace?.name || 'None',
      workspacesCount: value.workspaces?.length || 0,
      isLoading: value.isLoading,
      hasError: !!value.error,
    });
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// Hook to use workspace context
export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  
  return context;
};

// Export types for external use
export type { Workspace, WorkspaceContextType };

// Default export
export default WorkspaceProvider;