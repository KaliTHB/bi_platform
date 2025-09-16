// web-application/src/store/api/permissionApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  resource_type?: string;
  action?: string;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PermissionCategory {
  category: string;
  display_name?: string;
  description?: string;
  permissions: Permission[];
  count?: number;
}

export interface SystemPermission {
  category: string;
  permissions: Array<{
    name: string;
    display_name: string;
    description: string;
  }>;
}

export interface PermissionsResponse {
  success: boolean;
  data: Permission[];
  message?: string;
}

export interface PermissionCategoriesResponse {
  success: boolean;
  data: PermissionCategory[];
  message?: string;
}

export interface SystemPermissionsResponse {
  success: boolean;
  data: SystemPermission[];
  message?: string;
}

export interface UserPermissions {
  user_id: string;
  workspace_id: string;
  direct_permissions: string[];
  role_permissions: string[];
  effective_permissions: string[];
  roles: Array<{
    id: string;
    name: string;
    display_name: string;
  }>;
  last_updated: string;
}

export interface PermissionQueryFilters {
  category?: string;
  resource_type?: string;
  action?: string;
  is_system?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PermissionCheckRequest {
  permissions: string[];
  resource_id?: string;
  resource_type?: string;
}

export interface PermissionCheckResponse {
  success: boolean;
  data: {
    user_id: string;
    workspace_id: string;
    permissions: Array<{
      permission: string;
      granted: boolean;
      reason?: string;
    }>;
    has_all_permissions: boolean;
    has_any_permission: boolean;
    checked_at: string;
  };
}

// ============================================================================
// PERMISSION API SLICE
// ============================================================================

export const permissionApi = createApi({
  reducerPath: 'permissionApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      const workspaceSlug = (getState() as RootState).workspace.currentWorkspace?.slug;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      if (workspaceSlug) {
        headers.set('X-Workspace-Slug', workspaceSlug);
      }
      
      headers.set('Content-Type', 'application/json');
      
      return headers;
    },
  }),
  tagTypes: ['Permission', 'PermissionList', 'UserPermissions', 'SystemPermissions'],
  endpoints: (builder) => ({
    
    // ============================================================================
    // PERMISSION LISTING & RETRIEVAL
    // ============================================================================
    
    /**
     * GET /api/permissions - Get all available permissions
     */
    getPermissions: builder.query<PermissionsResponse, PermissionQueryFilters | void>({
      query: (params = {}) => ({
        url: 'permissions',
        params,
      }),
      providesTags: ['PermissionList'],
    }),

    /**
     * GET /api/permissions/system - Get system-defined permissions
     */
    getSystemPermissions: builder.query<SystemPermissionsResponse, void>({
      query: () => 'permissions/system',
      providesTags: ['SystemPermissions'],
    }),

    /**
     * GET /api/permissions/categories - Get permissions grouped by category
     */
    getPermissionCategories: builder.query<PermissionCategoriesResponse, void>({
      query: () => 'permissions/categories',
      providesTags: ['PermissionList'],
    }),

    /**
     * GET /api/permissions/:id - Get permission by ID
     */
    getPermissionById: builder.query<{
      success: boolean;
      data: Permission;
    }, string>({
      query: (id) => `permissions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Permission', id }],
    }),

    /**
     * GET /api/permissions/category/:category - Get permissions by category
     */
    getPermissionsByCategory: builder.query<PermissionsResponse, string>({
      query: (category) => `permissions/category/${category}`,
      providesTags: (result, error, category) => [{ type: 'Permission', id: `category-${category}` }],
    }),

    // ============================================================================
    // PERMISSION SEARCH & FILTERING
    // ============================================================================

    /**
     * GET /api/permissions/search - Search permissions
     */
    searchPermissions: builder.query<PermissionsResponse, {
      query: string;
      filters?: {
        category?: string;
        resource_type?: string;
        is_system?: boolean;
      };
      limit?: number;
      offset?: number;
    }>({
      query: ({ query, filters, limit = 20, offset = 0 }) => ({
        url: 'permissions/search',
        params: {
          query,
          ...filters,
          limit,
          offset,
        },
      }),
      providesTags: ['PermissionList'],
    }),

    // ============================================================================
    // USER PERMISSION QUERIES
    // ============================================================================

    /**
     * GET /api/auth/permissions - Get current user's permissions
     */
    getCurrentUserPermissions: builder.query<{
      success: boolean;
      permissions: string[];
      roles: Array<{
        role_id: string;
        role_name: string;
        permissions: string[];
      }>;
      message?: string;
    }, void>({
      query: () => 'auth/permissions',
      providesTags: ['UserPermissions'],
    }),

    /**
     * GET /api/permissions/user/:userId/permissions - Get user's permissions
     */
    getUserPermissions: builder.query<{
      success: boolean;
      data: UserPermissions;
    }, string>({
      query: (userId) => `permissions/user/${userId}/permissions`,
      providesTags: (result, error, userId) => [{ type: 'UserPermissions', id: userId }],
    }),

    /**
     * POST /api/permissions/check - Check if current user has specific permissions
     */
    checkPermissions: builder.mutation<PermissionCheckResponse, PermissionCheckRequest>({
      query: (checkRequest) => ({
        url: 'permissions/check',
        method: 'POST',
        body: checkRequest,
      }),
    }),

    /**
     * POST /api/permissions/user/:userId/check - Check if specific user has permissions
     */
    checkUserPermissions: builder.mutation<PermissionCheckResponse, {
      userId: string;
      permissions: string[];
      resource_id?: string;
      resource_type?: string;
    }>({
      query: ({ userId, permissions, resource_id, resource_type }) => ({
        url: `permissions/user/${userId}/check`,
        method: 'POST',
        body: {
          permissions,
          resource_id,
          resource_type,
        },
      }),
    }),

    // ============================================================================
    // PERMISSION ANALYTICS & REPORTING
    // ============================================================================

    /**
     * GET /api/permissions/stats - Get permission statistics
     */
    getPermissionStats: builder.query<{
      success: boolean;
      data: {
        total_permissions: number;
        system_permissions: number;
        custom_permissions: number;
        permissions_by_category: Array<{
          category: string;
          count: number;
        }>;
        most_used_permissions: Array<{
          permission: string;
          display_name: string;
          usage_count: number;
        }>;
        least_used_permissions: Array<{
          permission: string;
          display_name: string;
          usage_count: number;
        }>;
      };
    }, void>({
      query: () => 'permissions/stats',
    }),

    /**
     * GET /api/permissions/:permissionId/usage - Get permission usage analytics
     */
    getPermissionUsage: builder.query<{
      success: boolean;
      data: {
        permission_id: string;
        permission_name: string;
        total_users: number;
        direct_assignments: number;
        role_assignments: number;
        roles_using: Array<{
          role_id: string;
          role_name: string;
          user_count: number;
        }>;
        users_with_permission: Array<{
          user_id: string;
          user_email: string;
          source: 'direct' | 'role';
          role_name?: string;
        }>;
      };
    }, string>({
      query: (permissionId) => `permissions/${permissionId}/usage`,
      providesTags: (result, error, permissionId) => [{ type: 'Permission', id: permissionId }],
    }),

    // ============================================================================
    // PERMISSION AUDITING
    // ============================================================================

    /**
     * GET /api/permissions/audit - Get permission audit log
     */
    getPermissionAudit: builder.query<{
      success: boolean;
      data: Array<{
        id: string;
        action: 'grant' | 'revoke' | 'check' | 'create' | 'update' | 'delete';
        permission_name: string;
        user_id?: string;
        role_id?: string;
        target_user_id?: string;
        details: Record<string, any>;
        performed_by: string;
        performed_at: string;
        ip_address: string;
        user_agent: string;
      }>;
      metadata: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
      };
    }, {
      action?: string;
      permission?: string;
      user_id?: string;
      role_id?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }>({
      query: (params = {}) => ({
        url: 'permissions/audit',
        params,
      }),
    }),

    // ============================================================================
    // WORKSPACE-SPECIFIC PERMISSIONS
    // ============================================================================

    /**
     * GET /api/permissions/workspace/:workspaceId/permissions - Get workspace-specific permissions
     */
    getWorkspacePermissions: builder.query<PermissionsResponse, string>({
      query: (workspaceId) => `permissions/workspace/${workspaceId}/permissions`,
      providesTags: (result, error, workspaceId) => [{ type: 'Permission', id: `workspace-${workspaceId}` }],
    }),

    /**
     * GET /api/permissions/workspace/:workspaceId/users/:userId - Get user permissions in specific workspace
     */
    getUserWorkspacePermissions: builder.query<{
      success: boolean;
      data: UserPermissions;
    }, {
      workspaceId: string;
      userId: string;
    }>({
      query: ({ workspaceId, userId }) => `permissions/workspace/${workspaceId}/users/${userId}`,
      providesTags: (result, error, { workspaceId, userId }) => [
        { type: 'UserPermissions', id: `${workspaceId}-${userId}` }
      ],
    }),

    // ============================================================================
    // PERMISSION HIERARCHY & DEPENDENCIES
    // ============================================================================

    /**
     * GET /api/permissions/:permissionId/dependencies - Get permission dependencies
     */
    getPermissionDependencies: builder.query<{
      success: boolean;
      data: {
        permission_id: string;
        permission_name: string;
        depends_on: Permission[];
        required_by: Permission[];
        conflicts_with: Permission[];
      };
    }, string>({
      query: (permissionId) => `permissions/${permissionId}/dependencies`,
      providesTags: (result, error, permissionId) => [{ type: 'Permission', id: permissionId }],
    }),

    /**
     * GET /api/permissions/hierarchy - Get permission hierarchy tree
     */
    getPermissionHierarchy: builder.query<{
      success: boolean;
      data: {
        categories: Array<{
          category: string;
          display_name: string;
          description: string;
          level: number;
          permissions: Permission[];
          subcategories: any[];
        }>;
      };
    }, void>({
      query: () => 'permissions/hierarchy',
      providesTags: ['PermissionList'],
    }),

    // ============================================================================
    // REFRESH & CACHE MANAGEMENT
    // ============================================================================

    /**
     * POST /api/permissions/refresh-cache - Refresh permission cache
     */
    refreshPermissionCache: builder.mutation<{
      success: boolean;
      message: string;
      data: {
        cache_cleared: boolean;
        permissions_reloaded: number;
        cache_updated_at: string;
      };
    }, void>({
      query: () => ({
        url: 'permissions/refresh-cache',
        method: 'POST',
      }),
      invalidatesTags: ['PermissionList', 'UserPermissions', 'SystemPermissions'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Permission listing and retrieval
  useGetPermissionsQuery,
  useGetSystemPermissionsQuery,
  useGetPermissionCategoriesQuery,
  useGetPermissionByIdQuery,
  useGetPermissionsByCategoryQuery,
  
  // Permission search and filtering
  useSearchPermissionsQuery,
  
  // User permission queries
  useGetCurrentUserPermissionsQuery,
  useGetUserPermissionsQuery,
  useCheckPermissionsMutation,
  useCheckUserPermissionsMutation,
  
  // Permission analytics and reporting
  useGetPermissionStatsQuery,
  useGetPermissionUsageQuery,
  
  // Permission auditing
  useGetPermissionAuditQuery,
  
  // Workspace-specific permissions
  useGetWorkspacePermissionsQuery,
  useGetUserWorkspacePermissionsQuery,
  
  // Permission hierarchy and dependencies
  useGetPermissionDependenciesQuery,
  useGetPermissionHierarchyQuery,
  
  // Cache management
  useRefreshPermissionCacheMutation,
  
  // Lazy queries for on-demand loading
  useLazyGetPermissionsQuery,
  useLazyGetSystemPermissionsQuery,
  useLazySearchPermissionsQuery,
  useLazyGetCurrentUserPermissionsQuery,
  useLazyGetUserPermissionsQuery,
} = permissionApi;

export default permissionApi;