// File: web-application/src/types/rbac.types.ts
// Role-Based Access Control (RBAC) Type Definitions

/**
 * Core Permission Interface
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'workspace' | 'dataset' | 'dashboard' | 'chart' | 'export' | 'admin' | 'webview' | 'category';
  resource_type?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin' | 'share' | 'export';
  is_system?: boolean;
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
  is_system_role?: boolean;
  level?: number;
}

/**
 * Update Role Request
 */
export interface UpdateRoleRequest {
  name?: string;
  display_name?: string;
  description?: string;
  permissions?: string[];
  is_system_role?: boolean;
  level?: number;
  is_active?: boolean;
}

/**
 * Role Query Filters
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
}

/**
 * Bulk Assign Roles Request
 */
export interface BulkAssignRolesRequest {
  user_ids: string[];
  role_id: string;
  expires_at?: string;
}

/**
 * Update Role Assignment Request
 */
export interface UpdateRoleAssignmentRequest {
  expires_at?: string;
  is_active?: boolean;
}

/**
 * Role Assignment Query Filters
 */
export interface RoleAssignmentQueryFilters {
  user_id?: string;
  role_id?: string;
  is_active?: boolean;
  expires_before?: string;
  expires_after?: string;
  assigned_by?: string;
  page?: number;
  limit?: number;
  sort_by?: 'assigned_at' | 'expires_at' | 'user_name' | 'role_name';
  sort_order?: 'asc' | 'desc';
}

/**
 * Permission Category Definition
 */
export interface PermissionCategory {
  category: string;
  display_name: string;
  description: string;
  permissions: Permission[];
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
  user_count: number;
  active_assignments: number;
  expired_assignments: number;
  recent_assignments: UserRoleAssignment[];
  permission_usage: {
    permission: string;
    usage_count: number;
  }[];
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
  CHART_SHARE = 'chart.share',
  CHART_EXPORT = 'chart.export',
  
  // Category permissions
  CATEGORY_READ = 'category.read',
  CATEGORY_CREATE = 'category.create',
  CATEGORY_UPDATE = 'category.update',
  CATEGORY_DELETE = 'category.delete',
  CATEGORY_ADMIN = 'category.admin',
  
  // Webview permissions
  WEBVIEW_READ = 'webview.read',
  WEBVIEW_CREATE = 'webview.create',
  WEBVIEW_UPDATE = 'webview.update',
  WEBVIEW_DELETE = 'webview.delete',
  WEBVIEW_ADMIN = 'webview.admin',
  
  // Export permissions
  EXPORT_DATA = 'export.data',
  EXPORT_DASHBOARD = 'export.dashboard',
  EXPORT_CHART = 'export.chart',
  
  // Audit permissions
  AUDIT_READ = 'audit.read',
  AUDIT_ADMIN = 'audit.admin',
}

/**
 * Permission Categories Enum
 */
export enum PermissionCategories {
  SYSTEM = 'system',
  WORKSPACE = 'workspace',
  USER = 'user',
  ROLE = 'role',
  DATASET = 'dataset',
  DASHBOARD = 'dashboard',
  CHART = 'chart',
  CATEGORY = 'category',
  WEBVIEW = 'webview',
  EXPORT = 'export',
  AUDIT = 'audit'
}

/**
 * Role Template for quick role creation
 */
export interface RoleTemplate {
  name: string;
  display_name: string;
  description: string;
  permissions: SystemPermissions[];
  level: RoleLevel;
  is_system_role: boolean;
}

/**
 * Pre-defined Role Templates
 */
export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: 'viewer',
    display_name: 'Viewer',
    description: 'Can view dashboards and charts',
    permissions: [
      SystemPermissions.WORKSPACE_READ,
      SystemPermissions.DASHBOARD_READ,
      SystemPermissions.CHART_READ,
      SystemPermissions.DATASET_READ,
      SystemPermissions.CATEGORY_READ,
      SystemPermissions.WEBVIEW_READ
    ],
    level: RoleLevel.VIEWER,
    is_system_role: true
  },
  {
    name: 'editor',
    display_name: 'Editor',
    description: 'Can create and edit dashboards and charts',
    permissions: [
      SystemPermissions.WORKSPACE_READ,
      SystemPermissions.DASHBOARD_READ,
      SystemPermissions.DASHBOARD_CREATE,
      SystemPermissions.DASHBOARD_UPDATE,
      SystemPermissions.DASHBOARD_SHARE,
      SystemPermissions.CHART_READ,
      SystemPermissions.CHART_CREATE,
      SystemPermissions.CHART_UPDATE,
      SystemPermissions.CHART_SHARE,
      SystemPermissions.DATASET_READ,
      SystemPermissions.CATEGORY_READ,
      SystemPermissions.WEBVIEW_READ,
      SystemPermissions.EXPORT_DATA,
      SystemPermissions.EXPORT_DASHBOARD,
      SystemPermissions.EXPORT_CHART
    ],
    level: RoleLevel.EDITOR,
    is_system_role: true
  },
  {
    name: 'admin',
    display_name: 'Admin',
    description: 'Full administrative access to workspace',
    permissions: Object.values(SystemPermissions).filter(
      perm => !perm.startsWith('system.')
    ),
    level: RoleLevel.WORKSPACE_ADMIN,
    is_system_role: true
  }
];

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
}

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
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  workspace_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}

// Add these missing types to your rbac.types.ts file:

/**
 * Permission Query Filters
 */
export interface PermissionQueryFilters {
  search?: string;
  category?: Permission['category'];
  resource_type?: string;
  action?: Permission['action'];
  is_system?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'description' | 'category' | 'created_at';
  sort_order?: 'asc' | 'desc';
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
}