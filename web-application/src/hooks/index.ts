// File: web-application/src/hooks/index.ts

// Redux hooks
export { useAppDispatch, useAppSelector } from './redux';

// Authentication & Permissions
export { useAuth } from './useAuth';
export { usePermissions } from './usePermissions';
export { usePermissionMatrix } from './usePermissionMatrix';

// Data Management - Fix: Import default export and re-export as named
import useDataSourcesHook from './useDataSources';
export { useDataSourcesHook as useDataSources };

export { useCategories } from './useCategories';

// Workspace & Context hooks (these should exist based on the BRD)
export { useWorkspace } from './useWorkspace';
export { useDatasets } from './useDatasets';
export { useCharts } from './useCharts';

// RLS Provider and Context - Import from separate provider component
export { RLSProvider, useRLSContext, withRLS, RLSGuard } from '../components/providers/RLSProvider';

// RLS Types
export type {
  RLSPolicy,
  RLSContext,
  DatasetRLSConfig,
  UseRLSResult
} from './useRLS';


// Performance & Caching
export { useCache } from './useCache';
export { useOptimisticState } from './useOptimisticState';

export { useWebview } from './useWebview';
export type { Category } from './useCategories';


// Real-time Communication - Now Available
export { useWebSocket, useDashboardWebSocket, useWorkspaceWebSocket } from './useWebSocket';
export type { 
  WebSocketStatus, 
  WebSocketMessage, 
  WebSocketEvent, 
  WebSocketEventType,
  WebSocketConfig,
  WebSocketSubscription,
  UseWebSocketResult 
} from './useWebSocket';