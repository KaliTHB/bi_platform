// File: bi_platform/web-application/src/types/index.ts

// =============================================================================
// API Types
// =============================================================================
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  SortParams,
  FilterParams,
  HttpMethod,
  ApiEndpoint,
  RequestConfig,
  ErrorResponse,
  SuccessResponse,
} from './api.types';

// =============================================================================
// Common Base Types
// =============================================================================
export type {
  Status,
  Theme,
  DateFormat,
  TimeFormat,
  TimeZone,
  Locale,
  Currency,
  BaseEntity,
  AuditFields,
  SoftDeleteEntity,
  WorkspaceScopedEntity,
  UserAttributedEntity,
  SortableEntity,
  HierarchicalEntity,
  NamedEntity,
  ConfigurableEntity,
  FileReference,
  Color,
  Position,
  Size,
  Rectangle,
  CustomEvent,
  UserPreferences,
  NotificationPreferences,
  DashboardPreferences,
  DataPreferences,
  ValidationRule,
  ValidationResult,
  ValidationError,
  SearchQuery,
  SearchResult,
  Version,
  FeatureFlag,
} from './common.types';

// =============================================================================
// User Management Types
// =============================================================================
export type {
  User,
  Role,
  Permission,
  CreateUserRequest,
  UpdateUserRequest,
  UserRoleAssignment,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  PasswordResetRequest,
  InviteUserRequest,
} from './user.types';

// =============================================================================
// Workspace Types
// =============================================================================
export type {
  Workspace,
  WorkspaceSettings,
  WorkspaceRole,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceMember,
  WorkspaceInvitation,
} from './workspace.types';

// =============================================================================
// Dashboard System Types
// =============================================================================
export type {
  Dashboard,
  DashboardLayout,
  DashboardComponent,
  DashboardFilter,
  Chart,
  ChartConfiguration,
  ChartType,
  Dataset,
  DatasetColumn,
  TransformationConfig,
  TransformationStep,
  DataSource,
  QueryFilter,
  QueryResult,
  ColumnInfo,
  SqlQuery,
  QueryExecution,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  DuplicateDashboardRequest,
} from './dashboard.types';

// =============================================================================
// Category Management Types
// =============================================================================
export type {
  DashboardCategory,
  CategoryWithDashboards,
  CategoryTreeNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryStats,
} from './category.types';

// =============================================================================
// Plugin System Types
// =============================================================================
export type {
  DataSourcePlugin,
  ChartPlugin,
  PluginConfigSchema,
  SchemaProperty,
  DataSourceCapabilities,
  DataRequirements,
  PluginConfiguration,
  ConnectionTestResult,
  PluginRegistry,
  PluginManifest,
  PluginType,
  PluginStatus,
} from './plugin.types';

// =============================================================================
// System Monitoring Types
// =============================================================================
export type {
  SystemHealthData,
  SystemMetrics,
  ServiceStatus,
  HealthAlert,
  DatabaseHealth,
  CacheHealth,
  AuditLog,
  AuditAction,
  ExportRequest,
  ExportOptions,
  ExportJob,
  ExportFormat,
  SystemConfiguration,
  PerformanceMetric,
  QueryPerformance,
} from './system.types';

// =============================================================================
// UI Component Types
// =============================================================================
export type {
  TableColumn,
  TablePagination,
  TableProps,
  FormField,
  FormValidation,
  FormSchema,
  FilterOption,
  ActiveFilter,
  FilterProps,
  SortOption,
  SortState,
  ModalProps,
  Notification,
  NotificationAction,
  NotificationType,
  BreadcrumbItem,
  MenuItem,
  NavigationProps,
  LoadingState,
  AsyncState,
  ThemeConfig,
  LayoutProps,
  SearchProps,
  CardProps,
  ButtonProps,
  InputProps,
} from './ui.types';

// =============================================================================
// Webview System Types
// =============================================================================
export type {
  WebviewConfig,
  WebviewTheme,
  NavigationConfig,
  BrandingConfig,
  EmbedOptions,
  IframeProps,
  WebviewPanel,
  WebviewMessage,
  WebviewEvent,
} from './webview.types';

// =============================================================================
// Re-export commonly used type utilities
// =============================================================================
export type ID = string;
export type Timestamp = string;
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> 
  & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

// =============================================================================
// Legacy/Backwards compatibility exports (if needed)
// =============================================================================
// Re-export with different names for backwards compatibility
export type { User as UserType } from './user.types';
export type { Dashboard as DashboardType } from './dashboard.types';
export type { Workspace as WorkspaceType } from './workspace.types';
export type { DashboardCategory as Category } from './category.types';