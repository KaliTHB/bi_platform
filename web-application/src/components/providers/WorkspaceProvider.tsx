// web-application/src/components/providers/WorkspaceProvider.tsx - ENHANCED VERSION
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setCurrentWorkspace } from '../../store/slices/workspaceSlice';
import { useRouter } from 'next/router';

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
  switchToFirstWorkspace: () => void;
}

// Context creation with default values
const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
  error: null,
  switchToFirstWorkspace: () => {},
});

// Provider Props
interface WorkspaceProviderProps {
  children: ReactNode;
}

// Provider Component
export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  
  // Get workspace state from Redux store
  const workspaceState = useSelector((state: RootState) => {
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

  // Get auth state to check if user is authenticated
  const authState = useSelector((state: RootState) => state.auth);

  // Function to switch to first available workspace
  const switchToFirstWorkspace = React.useCallback(async () => {
    const workspaces = workspaceState?.workspaces || [];
    const currentWorkspace = workspaceState?.currentWorkspace;
    
    if (!currentWorkspace && workspaces.length > 0 && authState.isAuthenticated) {
      console.log('🔄 Auto-selecting first workspace:', workspaces[0].name);
      
      try {
        // Find the default workspace or use the first one
        const defaultWorkspace = workspaces.find(ws => ws.is_default) || workspaces[0];
        
        // Update Redux state
        dispatch(setCurrentWorkspace(defaultWorkspace));
        
        // Store in localStorage for persistence
        localStorage.setItem('currentWorkspace', JSON.stringify(defaultWorkspace));
        
        // If we're on the overview page with no workspace selected, redirect
        if (router.pathname === '/workspace/overview' && router.query.slug === undefined) {
          await router.replace(`/workspace/${defaultWorkspace.slug}`);
        }
        
        console.log('✅ Auto-selected workspace:', defaultWorkspace.name);
        
      } catch (error) {
        console.error('❌ Failed to auto-select workspace:', error);
      }
    }
  }, [workspaceState, authState.isAuthenticated, dispatch, router]);

  // Auto-select first workspace when:
  // 1. User is authenticated
  // 2. We have workspaces available  
  // 3. No current workspace is selected
  useEffect(() => {
    const workspaces = workspaceState?.workspaces || [];
    const currentWorkspace = workspaceState?.currentWorkspace;
    
    if (authState.isAuthenticated && 
        workspaces.length > 0 && 
        !currentWorkspace &&
        !workspaceState.isLoading) {
      
      console.log('🔄 WorkspaceProvider: Triggering auto-select for first workspace');
      switchToFirstWorkspace();
    }
  }, [
    authState.isAuthenticated, 
    workspaceState?.workspaces, 
    workspaceState?.currentWorkspace,
    workspaceState?.isLoading,
    switchToFirstWorkspace
  ]);

  // Also try to restore workspace from localStorage on mount
  useEffect(() => {
    if (authState.isAuthenticated && !workspaceState?.currentWorkspace && !workspaceState?.isLoading) {
      try {
        const savedWorkspace = localStorage.getItem('currentWorkspace');
        if (savedWorkspace) {
          const workspace = JSON.parse(savedWorkspace);
          
          // Verify this workspace still exists in the available workspaces
          const workspaces = workspaceState?.workspaces || [];
          const workspaceExists = workspaces.find(ws => ws.id === workspace.id);
          
          if (workspaceExists) {
            console.log('🔄 Restoring workspace from localStorage:', workspace.name);
            dispatch(setCurrentWorkspace(workspace));
          } else {
            // Saved workspace no longer exists, clear it and auto-select first
            localStorage.removeItem('currentWorkspace');
            switchToFirstWorkspace();
          }
        } else if (workspaceState?.workspaces?.length > 0) {
          // No saved workspace, auto-select first
          switchToFirstWorkspace();
        }
      } catch (error) {
        console.error('❌ Error restoring workspace from localStorage:', error);
        localStorage.removeItem('currentWorkspace');
        switchToFirstWorkspace();
      }
    }
  }, [authState.isAuthenticated, workspaceState?.currentWorkspace, workspaceState?.workspaces, workspaceState?.isLoading, dispatch, switchToFirstWorkspace]);

  // Prepare context value with fallbacks
  const value: WorkspaceContextType = {
    currentWorkspace: workspaceState?.currentWorkspace || null,
    workspaces: workspaceState?.workspaces || [],
    isLoading: workspaceState?.isLoading || false,
    error: workspaceState?.error || null,
    switchToFirstWorkspace,
  };

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('WorkspaceProvider context value:', {
      currentWorkspace: value.currentWorkspace?.name || 'None',
      workspacesCount: value.workspaces?.length || 0,
      isLoading: value.isLoading,
      hasError: !!value.error,
      isAuthenticated: authState.isAuthenticated
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