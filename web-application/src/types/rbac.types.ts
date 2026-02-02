// web-application/src/types/rbac.types.ts - FIXED VERSION
// Role-Based Access Control (RBAC) Type Definitions

/**
 * Core Permission Interface
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  display_name?: string;
  category: 'system' | 'workspace' | 'dataset' | 'dashboard' | 'chart' | 'export' | 'admin' | 'webview' | 'category';
  resource_type?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin' | 'share' | 'export';
  is_system?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Role Interface
 */
export interface Role {
  id: string;
  workspace_id: string;
  name: string;
  display_name?: string;
  description?: string;
  permissions: string[]; // Array of permission names
  is_system_role: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  user_count?: number;
  level?: number;
  is_active?: boolean;
}

/**
 * Role with expanded permissions (for UI display)
 */
export interface RoleWithPermissions extends Omit<Role, 'permissions'> {
  permissions: Permission[];
}

/**
 * Create Role Request
 */
export interface CreateRoleRequest {
  name: string;
  display_name?: string;
  description?: string;
  permissions: string[];
  permission_ids?: string[]; // Alternative field name for permission IDs
  is_system_role?: boolean;
  level?: number;
  workspace_id?: string;
}

/**
 * Update Role Request
 */
export interface UpdateRoleRequest {
  name?: string;
  display_name?: string;
  description?: string;
  permissions?: string[];
  permission_ids?: string[]; // Alternative field name for permission IDs
  is_system_role?: boolean;
  level?: number;
  is_active?: boolean;
}

/**
 * Role Query Filters - FIXED VERSION
 * Added missing include_permissions and other commonly needed filters
 */
export interface RoleQueryFilters {
  search?: string;
  is_system?: boolean;
  permissions?: string[];
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'display_name' | 'created_at' | 'updated_at' | 'user_count';
  sort_order?: 'asc' | 'desc';
  
  // ✅ MISSING PROPERTIES ADDED:
  include_permissions?: boolean; // Include permission details in response
  include_users?: boolean; // Include user count/details
  include_stats?: boolean; // Include usage statistics
  workspace_id?: string; // Filter by workspace
  category?: string; // Filter by permission category
  user_id?: string; // Filter roles assigned to specific user
  has_users?: boolean; // Filter roles that have/don't have users
  created_after?: string; // Filter by creation date
  created_before?: string; // Filter by creation date
  level_min?: number; // Filter by minimum role level
  level_max?: number; // Filter by maximum role level
}

/**
 * User Role Assignment Interface
 */
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  workspace_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  
  // Expanded user information
  user_name?: string;
  user_email?: string;
  user_avatar_url?: string;
  
  // Expanded role information
  role_name?: string;
  role_display_name?: string;
  role_description?: string;
  
  // Expanded assigner information
  assigned_by_name?: string;
  assigned_by_email?: string;
}

/**
 * Assign Role to User Request
 */
export interface AssignRoleToUserRequest {
  user_id: string;
  role_id: string;
  expires_at?: string;
  workspace_id?: string;
}

/**
 * Bulk Assign Roles Request
 */
export interface BulkAssignRolesRequest {
  user_ids: string[];
  role_id: string;
  expires_at?: string;
  workspace_id?: string;
}

/**
 * Update Role Assignment Request
 */
export interface UpdateRoleAssignmentRequest {
  expires_at?: string;
  is_active?: boolean;
}

/**
 * Role Assignment Query Filters - Enhanced
 */
export interface RoleAssignmentQueryFilters {
  user_id?: string;
  role_id?: string;
  workspace_id?: string;
  is_active?: boolean;
  expires_before?: string;
  expires_after?: string;
  assigned_by?: string;
  assigned_after?: string;
  assigned_before?: string;
  page?: number;
  limit?: number;
  sort_by?: 'assigned_at' | 'expires_at' | 'user_name' | 'role_name';
  sort_order?: 'asc' | 'desc';
  
  // ✅ ADDITIONAL FILTERS:
  include_user_details?: boolean;
  include_role_details?: boolean;
  include_assigner_details?: boolean;
  status?: 'active' | 'expired' | 'pending' | 'all';
}

/**
 * Permission Query Filters - Enhanced
 */
export interface PermissionQueryFilters {
  search?: string;
  category?: Permission['category'];
  resource_type?: string;
  action?: Permission['action'];
  is_system?: boolean;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'description' | 'category' | 'created_at';
  sort_order?: 'asc' | 'desc';
  
  // ✅ ADDITIONAL FILTERS:
  role_id?: string; // Filter permissions by role
  user_id?: string; // Filter permissions available to user
  workspace_id?: string; // Filter by workspace context
  has_roles?: boolean; // Filter permissions that are/aren't assigned to roles
}

/**
 * Permission Category Definition
 */
export interface PermissionCategory {
  category: string;
  display_name: string;
  description: string;
  permissions: Permission[];
  count?: number;
}

/**
 * Role Permission Assignment Interface
 */
export interface RolePermissionAssignment {
  id: string;
  role_id: string;
  permission_id: string;
  workspace_id: string;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  
  // Expanded role information
  role_name?: string;
  role_display_name?: string;
  role_description?: string;
  
  // Expanded permission information
  permission_name?: string;
  permission_description?: string;
  permission_category?: string;
  
  // Expanded assigner information
  assigned_by_name?: string;
  assigned_by_email?: string;
}

/**
 * Assign Permission to Role Request
 */
export interface AssignPermissionToRoleRequest {
  role_id: string;
  permission_id: string;
  workspace_id?: string;
}

/**
 * Remove Permission from Role Request
 */
export interface RemovePermissionFromRoleRequest {
  role_id: string;
  permission_id: string;
}

/**
 * Bulk Assign Permissions Request
 */
export interface BulkAssignPermissionsRequest {
  role_id: string;
  permission_ids: string[];
  replace_existing?: boolean;
  workspace_id?: string;
}

/**
 * User Permissions Summary
 */
export interface UserPermissionsSummary {
  user_id: string;
  workspace_id: string;
  direct_permissions: string[];
  role_permissions: string[];
  effective_permissions: string[];
  roles: Role[];
  last_updated: string;
}

/**
 * Role Analytics
 */
export interface RoleAnalytics {
  role_id: string;
  role_name: string;
  user_count: number;
  active_assignments: number;
  expired_assignments: number;
  recent_assignments: UserRoleAssignment[];
  permission_usage: {
    permission: string;
    usage_count: number;
  }[];
  created_at: string;
  last_used: string;
}

/**
 * User Query Filters - Enhanced
 */
export interface UserQueryFilters {
  search?: string;
  is_active?: boolean;
  role_id?: string;
  workspace_id?: string;
  department?: string;
  region?: string;
  team?: string;
  page?: number;
  limit?: number;
  sort_by?: 'username' | 'email' | 'first_name' | 'last_name' | 'created_at' | 'last_login';
  sort_order?: 'asc' | 'desc';
  
  // ✅ ADDITIONAL USER FILTERS:
  include_roles?: boolean;
  include_permissions?: boolean;
  include_profile?: boolean;
  has_roles?: boolean;
  created_after?: string;
  created_before?: string;
  last_login_after?: string;
  last_login_before?: string;
  user_type?: string;
}

/**
 * Generic Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  filters_applied?: Record<string, any>;
}

/**
 * Generic API Response
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp?: string;
  request_id?: string;
}

/**
 * Bulk Operation Response
 */
export interface BulkOperationResponse {
  success: boolean;
  total_processed: number;
  successful_operations: number;
  failed_operations: number;
  errors: {
    item_id: string;
    error: string;
  }[];
  message: string;
  details?: Record<string, any>;
}

/**
 * Permission Check Request
 */
export interface PermissionCheckRequest {
  user_id: string;
  workspace_id: string;
  permissions: string[];
  resource_id?: string;
}

/**
 * Permission Check Response
 */
export interface PermissionCheckResponse {
  user_id: string;
  workspace_id: string;
  permissions: {
    permission: string;
    granted: boolean;
    reason?: string;
  }[];
  has_all_permissions: boolean;
  has_any_permission: boolean;
  checked_at: string;
}

/**
 * Role Hierarchy Level
 */
export enum RoleLevel {
  SYSTEM_ADMIN = 100,
  WORKSPACE_ADMIN = 80,
  MANAGER = 60,
  EDITOR = 40,
  CONTRIBUTOR = 20,
  VIEWER = 10
}

/**
 * System Permissions Enum
 */
export enum SystemPermissions {
  // System-level permissions
  SYSTEM_ADMIN = 'system.admin',
  
  // Workspace permissions
  WORKSPACE_READ = 'workspace.read',
  WORKSPACE_CREATE = 'workspace.create',
  WORKSPACE_UPDATE = 'workspace.update',
  WORKSPACE_DELETE = 'workspace.delete',
  WORKSPACE_ADMIN = 'workspace.admin',
  
  // User management permissions
  USER_READ = 'user.read',
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_INVITE = 'user.invite',
  
  // Role management permissions
  ROLE_READ = 'role.read',
  ROLE_CREATE = 'role.create',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',
  ROLE_ASSIGN = 'role.assign',
  
  // Dataset permissions
  DATASET_READ = 'dataset.read',
  DATASET_CREATE = 'dataset.create',
  DATASET_UPDATE = 'dataset.update',
  DATASET_DELETE = 'dataset.delete',
  DATASET_ADMIN = 'dataset.admin',
  
  // Dashboard permissions
  DASHBOARD_READ = 'dashboard.read',
  DASHBOARD_CREATE = 'dashboard.create',
  DASHBOARD_UPDATE = 'dashboard.update',
  DASHBOARD_DELETE = 'dashboard.delete',
  DASHBOARD_SHARE = 'dashboard.share',
  DASHBOARD_EXPORT = 'dashboard.export',
  DASHBOARD_ADMIN = 'dashboard.admin',
  
  // Chart permissions  
  CHART_READ = 'chart.read',
  CHART_CREATE = 'chart.create',
  CHART_UPDATE = 'chart.update',
  CHART_DELETE = 'chart.delete',
  
  // Category permissions
  CATEGORY_READ = 'category.read',
  CATEGORY_CREATE = 'category.create',
  CATEGORY_UPDATE = 'category.update',
  CATEGORY_DELETE = 'category.delete',
  
  // Webview permissions
  WEBVIEW_READ = 'webview.read',
  WEBVIEW_CREATE = 'webview.create',
  WEBVIEW_UPDATE = 'webview.update',
  WEBVIEW_DELETE = 'webview.delete',
  WEBVIEW_ACCESS = 'webview.access',
  
  // Export permissions
  EXPORT_CREATE = 'export.create',
  EXPORT_DOWNLOAD = 'export.download',
  EXPORT_ADMIN = 'export.admin',
}

/**
 * User Interface - Enhanced
 */
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  roles: Role[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  
  // RLS-related fields for Row Level Security policies
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  
  // Generic profile data for extensibility
  profile_data?: Record<string, any>;
  user_type?: string;
  permissions?: string[]; // Effective permissions when included
}

/**
 * Create User Request - Enhanced
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_ids?: string[];
  is_active?: boolean;
  
  // RLS-related fields for user creation
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  profile_data?: Record<string, any>;
  user_type?: string;
  avatar_url?: string;
}

/**
 * Update User Request - Enhanced
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role_ids?: string[];
  is_active?: boolean;
  password?: string;
  
  // RLS-related fields for user updates
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  profile_data?: Record<string, any>;
  user_type?: string;
}

/**
 * Assignment Statistics
 */
export interface AssignmentStats {
  total_users: number;
  active_users: number;
  total_roles: number;
  system_roles: number;
  custom_roles: number;
  total_assignments: number;
  active_assignments: number;
  expired_assignments: number;
  recent_assignments: UserRoleAssignment[];
  role_distribution: {
    role_name: string;
    user_count: number;
  }[];
  permission_coverage: {
    permission: string;
    role_count: number;
    user_count: number;
  }[];
}

// Default system roles
export const DEFAULT_SYSTEM_ROLES: Partial<Role>[] = [
  {
    name: 'workspace_admin',
    display_name: 'Workspace Administrator',
    description: 'Full administrative access to workspace',
    permissions: [
      SystemPermissions.WORKSPACE_ADMIN,
      SystemPermissions.USER_READ,
      SystemPermissions.USER_CREATE,
      SystemPermissions.USER_UPDATE,
      SystemPermissions.USER_DELETE,
      SystemPermissions.ROLE_READ,
      SystemPermissions.ROLE_CREATE,
      SystemPermissions.ROLE_UPDATE,
      SystemPermissions.ROLE_DELETE,
    ],
    level: RoleLevel.WORKSPACE_ADMIN,
    is_system_role: true
  },
  {
    name: 'editor',
    display_name: 'Editor', 
    description: 'Can create and edit dashboards and datasets',
    permissions: [
      SystemPermissions.DASHBOARD_READ,
      SystemPermissions.DASHBOARD_CREATE,
      SystemPermissions.DASHBOARD_UPDATE,
      SystemPermissions.DATASET_READ,
      SystemPermissions.DATASET_CREATE,
      SystemPermissions.DATASET_UPDATE,
      SystemPermissions.CHART_READ,
      SystemPermissions.CHART_CREATE,
      SystemPermissions.CHART_UPDATE,
    ],
    level: RoleLevel.EDITOR,
    is_system_role: true
  },
  {
    name: 'viewer',
    display_name: 'Viewer',
    description: 'Read-only access to dashboards and data',
    permissions: [
      SystemPermissions.DASHBOARD_READ,
      SystemPermissions.DATASET_READ,
      SystemPermissions.CHART_READ,
      SystemPermissions.WEBVIEW_READ,
      SystemPermissions.WEBVIEW_ACCESS,
    ],
    level: RoleLevel.VIEWER,
    is_system_role: true
  }
];