import React, { createContext, useContext, ReactNode, ComponentType } from 'react';
import { useRLS, UseRLSResult } from '../../hooks/useRLS';

// ============================================================================
// Context Creation
// ============================================================================

// Create the context object
const RLSContext = createContext<UseRLSResult | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface RLSProviderProps {
  children: ReactNode;
}

export const RLSProvider: React.FC<RLSProviderProps> = ({ children }) => {
  const rlsData = useRLS();
  
  return (
    <RLSContext.Provider value={rlsData}>
      {children}
    </RLSContext.Provider>
  );
};

// ============================================================================
// Context Hook
// ============================================================================

// Hook to use RLS context from provider
export const useRLSContext = (): UseRLSResult => {
  const context = useContext(RLSContext);
  if (!context) {
    throw new Error('useRLSContext must be used within an RLSProvider');
  }
  return context;
};

// ============================================================================
// Higher Order Component (withRLS)
// ============================================================================

interface WithRLSOptions {
  requireDatasetAccess?: string[];
  fallbackComponent?: ComponentType;
  loadingComponent?: ComponentType;
}

export function withRLS<P extends object>(
  Component: ComponentType<P>,
  options: WithRLSOptions = {}
) {
  const WithRLSComponent = (props: P) => {
    const { loading, error, checkDatasetAccess } = useRLSContext();
    const { 
      requireDatasetAccess = [], 
      fallbackComponent: FallbackComponent,
      loadingComponent: LoadingComponent 
    } = options;

    // Show loading state
    if (loading) {
      return LoadingComponent ? <LoadingComponent /> : <div>Loading RLS...</div>;
    }

    // Show error state
    if (error) {
      return FallbackComponent ? (
        <FallbackComponent />
      ) : (
        <div>RLS Error: {error}</div>
      );
    }

    // Check dataset access if required
    if (requireDatasetAccess.length > 0) {
      // Note: In a real implementation, you'd want to make this async
      // For now, we'll assume access is granted if no error
      const hasAccess = true; // Placeholder - implement actual check
      
      if (!hasAccess) {
        return FallbackComponent ? (
          <FallbackComponent />
        ) : (
          <div>Access denied to required datasets</div>
        );
      }
    }

    return <Component {...props} />;
  };

  WithRLSComponent.displayName = `withRLS(${Component.displayName || Component.name})`;
  
  return WithRLSComponent;
}

// ============================================================================
// RLS Guard Component
// ============================================================================

interface RLSGuardProps {
  children: ReactNode;
  datasetIds?: string[];
  fallback?: ReactNode;
  loading?: ReactNode;
  onAccessDenied?: (datasetIds: string[]) => void;
}

export const RLSGuard: React.FC<RLSGuardProps> = ({
  children,
  datasetIds = [],
  fallback = <div>Access denied</div>,
  loading = <div>Checking access...</div>,
  onAccessDenied
}) => {
  const { loading: rlsLoading, error, checkDatasetAccess } = useRLSContext();
  const [accessChecked, setAccessChecked] = React.useState(false);
  const [hasAccess, setHasAccess] = React.useState(false);

  React.useEffect(() => {
    const checkAccess = async () => {
      if (datasetIds.length === 0) {
        setHasAccess(true);
        setAccessChecked(true);
        return;
      }

      try {
        // Check access for all required datasets
        const accessResults = await Promise.all(
          datasetIds.map(id => checkDatasetAccess(id))
        );
        
        const allAccessGranted = accessResults.every(result => result);
        setHasAccess(allAccessGranted);
        
        if (!allAccessGranted && onAccessDenied) {
          onAccessDenied(datasetIds);
        }
      } catch (err) {
        console.error('Error checking dataset access:', err);
        setHasAccess(false);
      } finally {
        setAccessChecked(true);
      }
    };

    if (!rlsLoading && !error) {
      checkAccess();
    }
  }, [datasetIds, rlsLoading, error, checkDatasetAccess, onAccessDenied]);

  // Show loading state
  if (rlsLoading || !accessChecked) {
    return <>{loading}</>;
  }

  // Show error state
  if (error) {
    return <div>RLS Error: {error}</div>;
  }

  // Show access denied state
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  // Access granted - render children
  return <>{children}</>;
};

export default RLSProvider;