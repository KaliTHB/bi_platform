// File: bi_platform/web-application/src/hooks/index.ts

// Redux hooks
export { useAppDispatch, useAppSelector } from './redux';

// Authentication & Permissions
export { useAuth } from './useAuth';
export { usePermissions } from './usePermissions';
export { usePermissionMatrix } from './usePermissionMatrix';

// Data Management
export { useDataSources } from './useDataSources';
export { useCategories } from './useCategories';

// Workspace & Context hooks (these should exist based on the BRD)
export { useWorkspace } from './useWorkspace';
export { useDatasets } from './useDatasets';
export { useCharts } from './useCharts';
export { useRLS } from './useRLS';

// Plugin System
export { usePlugins } from './usePlugins';

// Performance & Caching
export { useCache } from './useCache';

// Real-time & Communication
export { useWebSocket } from './useWebSocket';
export { useWebview } from './useWebview';

// Re-export types for convenience
export type { 
  UseDataSourcesResult,
  User,
  Permission,
  UserPermissions,
  PermissionChange,
  Category
} from './useDataSources';
export type { Category as CategoryType } from './useCategories';