// web-application/src/pages/workspace-selector.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setCurrentWorkspace } from '@/store/slices/workspaceSlice';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  role: string;
  member_count: number;
  updated_at: string;
}

interface WorkspaceSelectorProps {
  // No server-side props to reduce initial data size
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, token } = useAppSelector(state => state.auth);
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchWorkspaces();
  }, [isAuthenticated, router, token]);

  const fetchWorkspaces = async () => {
    if (!token) {
      setError('No authentication token');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Optimized API call with minimal data
      const response = await fetch('/api/workspaces?limit=50&fields=id,name,description,role,member_count,updated_at', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.workspaces)) {
        // Only keep essential workspace data
        const optimizedWorkspaces = data.workspaces.map((ws: any) => ({
          id: ws.id,
          name: ws.name,
          description: ws.description,
          role: ws.role,
          member_count: ws.member_count || 0,
          updated_at: ws.updated_at
        }));
        
        setWorkspaces(optimizedWorkspaces);
      } else {
        throw new Error(data.message || 'Failed to fetch workspaces');
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSelect = (workspace: Workspace) => {
    // Only store essential workspace data in Redux
    dispatch(setCurrentWorkspace({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      role: workspace.role,
      member_count: workspace.member_count,
      created_at: new Date().toISOString(), // Placeholder
      updated_at: workspace.updated_at
    }));
    
    router.push(`/workspace/${workspace.id}/dashboard`);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20';
      case 'admin': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'editor': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'viewer': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting to login..." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Loading workspaces..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Error Loading Workspaces
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {error}
            </p>
            <button
              onClick={fetchWorkspaces}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Select Workspace
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Choose a workspace to access your dashboards and analytics
          </p>
        </div>

        {/* User Info - Minimal */}
        {user && (
          <div className="mb-8 text-center">
            <div className="inline-flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workspaces Grid - Optimized */}
        {workspaces.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => handleWorkspaceSelect(workspace)}
                className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {workspace.name}
                      </h3>
                      {workspace.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      {workspace.member_count}
                    </div>

                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(workspace.role)}`}>
                      {workspace.role}
                    </span>
                  </div>
                </div>

                <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No workspaces found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              You don't have access to any workspaces yet. Contact your administrator for access.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
};

// Remove getInitialProps to prevent server-side data loading
export default WorkspaceSelector;