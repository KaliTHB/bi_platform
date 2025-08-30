// File: ./src/types/index.ts

// User related types
export type {
  User,
  Role,
  Permission,
  CreateUserRequest,
  UpdateUserRequest,
  UserRoleAssignment,
} from './user.types';

// Workspace related types
export type {
  Workspace,
  WorkspaceSettings,
  WorkspaceRole,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
} from './workspace.types';

// Dashboard related types
export type {
  Dashboard,
  DashboardLayout,
  DashboardComponent,
  DashboardFilter,
  Chart,
  ChartConfiguration,
  Dataset,
  TransformationConfig,
  TransformationStep,
  DataSource,
  Category,
  QueryFilter,
  QueryResult,
  ColumnInfo,
} from './dashboard.types';

// Plugin related types
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
} from './plugin.types';

// System monitoring types
export type {
  SystemHealthData,
  SystemMetrics,
  ServiceStatus,
  HealthAlert,
  DatabaseHealth,
  CacheHealth,
  AuditLog,
  ExportRequest,
  ExportOptions,
  ExportJob,
  SystemConfiguration,
  PerformanceMetric,
  QueryPerformance,
} from './system.types';

// UI and form types
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
  BreadcrumbItem,
  MenuItem,
  NavigationProps,
  LoadingState,
  AsyncState,
  ThemeConfig,
  LayoutProps,
  SearchProps,
  CardProps,
} from './ui.types';

// Common shared types
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

// Webview related types
export type {
  Webview,
  WebviewTheme,
  WebviewNavigation,
  WebviewCategory,
  WebviewLink,
  WebviewAnalytics,
  WebviewAccessControl,
  WebviewDashboard,
  WebviewSession,
  WebviewUsageStats,
  CreateWebviewRequest,
  UpdateWebviewRequest,
} from './webview.types';

// API related types
export type {
  ApiResponse,
  PaginatedResponse,
  ResponseMetadata,
  ApiError,
  ValidationError as ApiValidationError,
  HttpMethod,
  RequestConfig,
  RetryConfig,
  CacheConfig,
  ApiClientConfig,
  AuthConfig,
  ListQueryParams,
  BulkOperation,
  BulkOperationResult,
  UploadConfig,
  UploadResult,
  UploadProgress,
  WebhookEvent,
  WebhookSubscription,
  RateLimit,
  HealthCheck,
  ComponentHealth,
  ApiVersion,
  RequestLog,
  ResponseLog,
  ApiQuota,
  ApiUsage,
} from './api.types';

// Re-export specific types that are commonly used
export type { User as IUser } from './user.types';
export type { Workspace as IWorkspace } from './workspace.types';
export type { Dashboard as IDashboard } from './dashboard.types';

// Utility type helpers
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Generic CRUD operations
export interface CrudOperations<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  create: (data: CreateT) => Promise<T>;
  getById: (id: string) => Promise<T>;
  update: (id: string, data: UpdateT) => Promise<T>;
  delete: (id: string) => Promise<void>;
  list: (params?: ListQueryParams) => Promise<PaginatedResponse<T>>;
}