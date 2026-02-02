// web-application/src/store/api/roleApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  permissions?: string[];
  is_system?: boolean;
  is_active?: boolean;
  role_level?: number;
  color?: string;
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  resource_type?: string;
  action?: string;
  is_system?: boolean;
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  permissions?: string[];
  color?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  display_name?: string;
  description?: string;
  permissions?: string[];
  color?: string;
}

export interface RoleResponse {
  success: boolean;
  data: Role;
  message?: string;
}

export interface RolesResponse {
  success: boolean;
  data: Role[];
  message?: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  expiresAt?: string;
}

export interface RemoveRoleRequest {
  userId: string;
  roleId: string;
}

export interface BulkAssignRoleRequest {
  userIds: string[];
  roleId: string;
  expiresAt?: string;
}

export interface RoleQueryFilters {
  include_permissions?: boolean;
  is_system?: boolean;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// ROLE API SLICE
// ============================================================================

export const roleApi = createApi({
  reducerPath: 'roleApi',
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
  tagTypes: ['Role', 'RoleList', 'RoleAssignment', 'UserRoles'],
  endpoints: (builder) => ({
    
    // ============================================================================
    // ROLE MANAGEMENT ENDPOINTS
    // ============================================================================
    
    /**
     * GET /api/permissions/roles - Get all roles with permissions
     */
    getRoles: builder.query<RolesResponse, RoleQueryFilters | void>({
      query: (params = {}) => ({
        url: 'permissions/roles',
        params,
      }),
      providesTags: ['RoleList'],
    }),

    /**
     * GET /api/admin/roles - Get workspace roles (admin endpoint)
     */
    getAdminRoles: builder.query<RolesResponse, void>({
      query: () => 'admin/roles',
      providesTags: ['RoleList'],
    }),

    /**
     * GET /api/permissions/roles/:id - Get role by ID with permissions
     */
    getRoleById: builder.query<RoleResponse, string>({
      query: (id) => `permissions/roles/${id}`,
      providesTags: (result, error, id) => [{ type: 'Role', id }],
    }),

    /**
     * POST /api/permissions/roles/create - Create new role
     */
    createRole: builder.mutation<RoleResponse, CreateRoleRequest>({
      query: (roleData) => ({
        url: 'permissions/roles/create',
        method: 'POST',
        body: roleData,
      }),
      invalidatesTags: ['RoleList'],
    }),

    /**
     * POST /api/admin/roles - Create role via admin endpoint
     */
    createAdminRole: builder.mutation<RoleResponse, CreateRoleRequest>({
      query: (roleData) => ({
        url: 'admin/roles',
        method: 'POST',
        body: roleData,
      }),
      invalidatesTags: ['RoleList'],
    }),

    /**
     * POST /api/permissions/roles/update - Update existing role
     */
    updateRole: builder.mutation<RoleResponse, { roleId: string } & UpdateRoleRequest>({
      query: ({ roleId, ...updates }) => ({
        url: 'permissions/roles/update',
        method: 'POST',
        body: {
          roleId,
          ...updates,
        },
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        'RoleList',
      ],
    }),

    /**
     * DELETE /api/permissions/roles/delete - Delete role
     */
    deleteRole: builder.mutation<{ success: boolean; message: string }, string>({
      query: (roleId) => ({
        url: 'permissions/roles/delete',
        method: 'DELETE',
        body: { roleId },
      }),
      invalidatesTags: (result, error, roleId) => [
        { type: 'Role', id: roleId },
        'RoleList',
      ],
    }),

    // ============================================================================
    // ROLE ASSIGNMENT ENDPOINTS
    // ============================================================================

    /**
     * POST /api/permissions/assign-role - Assign role to user
     */
    assignRoleToUser: builder.mutation<{
      success: boolean;
      message: string;
      data: {
        userId: string;
        roleId: string;
        workspaceId: string;
        assignedBy: string;
        expiresAt?: string;
      };
    }, AssignRoleRequest>({
      query: ({ userId, roleId, expiresAt }) => ({
        url: 'permissions/assign-role',
        method: 'POST',
        body: {
          userId,
          roleId,
          expiresAt,
        },
      }),
      invalidatesTags: ['RoleAssignment', 'UserRoles'],
    }),

    /**
     * POST /api/permissions/remove-role - Remove role from user
     */
    removeRoleAssignment: builder.mutation<{
      success: boolean;
      message: string;
      data: {
        userId: string;
        roleId: string;
        workspaceId: string;
      };
    }, RemoveRoleRequest>({
      query: ({ userId, roleId }) => ({
        url: 'permissions/remove-role',
        method: 'POST',
        body: {
          userId,
          roleId,
        },
      }),
      invalidatesTags: ['RoleAssignment', 'UserRoles'],
    }),

    /**
     * POST /api/permissions/bulk-assign - Bulk assign role to multiple users
     */
    bulkAssignRole: builder.mutation<{
      success: boolean;
      data: {
        successful: string[];
        failed: Array<{
          userId: string;
          error: string;
        }>;
      };
      message: string;
    }, BulkAssignRoleRequest>({
      query: ({ userIds, roleId, expiresAt }) => ({
        url: 'permissions/bulk-assign',
        method: 'POST',
        body: {
          userIds,
          roleId,
          expiresAt,
        },
      }),
      invalidatesTags: ['RoleAssignment', 'UserRoles'],
    }),

    // ============================================================================
    // ROLE ANALYTICS & INFORMATION
    // ============================================================================

    /**
     * GET /api/permissions/roles/:id/users - Get users assigned to role
     */
    getRoleUsers: builder.query<{
      success: boolean;
      data: Array<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        display_name: string;
        assigned_at: string;
        expires_at?: string;
        is_active: boolean;
      }>;
    }, string>({
      query: (roleId) => `permissions/roles/${roleId}/users`,
      providesTags: (result, error, roleId) => [{ type: 'Role', id: roleId }],
    }),

    /**
     * GET /api/permissions/roles/:id/permissions - Get permissions for role
     */
    getRolePermissions: builder.query<{
      success: boolean;
      data: Permission[];
    }, string>({
      query: (roleId) => `permissions/roles/${roleId}/permissions`,
      providesTags: (result, error, roleId) => [{ type: 'Role', id: roleId }],
    }),

    /**
     * GET /api/permissions/roles/stats - Get role statistics
     */
    getRoleStats: builder.query<{
      success: boolean;
      data: {
        total_roles: number;
        system_roles: number;
        custom_roles: number;
        most_used_roles: Array<{
          role_id: string;
          role_name: string;
          user_count: number;
        }>;
        recent_assignments: Array<{
          user_email: string;
          role_name: string;
          assigned_at: string;
        }>;
      };
    }, void>({
      query: () => 'permissions/roles/stats',
    }),

    // ============================================================================
    // USER ROLE QUERIES
    // ============================================================================

    /**
     * GET /api/permissions/user/:userId/roles - Get user's roles
     */
    getUserRoles: builder.query<{
      success: boolean;
      data: Array<{
        id: string;
        name: string;
        display_name: string;
        description?: string;
        assigned_at: string;
        expires_at?: string;
        is_active: boolean;
      }>;
    }, string>({
      query: (userId) => `permissions/user/${userId}/roles`,
      providesTags: (result, error, userId) => [{ type: 'UserRoles', id: userId }],
    }),

    /**
     * GET /api/permissions/user/:userId/effective-permissions - Get user's effective permissions
     */
    getUserEffectivePermissions: builder.query<{
      success: boolean;
      data: {
        direct_permissions: string[];
        role_permissions: string[];
        effective_permissions: string[];
        roles: Role[];
      };
    }, string>({
      query: (userId) => `permissions/user/${userId}/effective-permissions`,
      providesTags: (result, error, userId) => [{ type: 'UserRoles', id: userId }],
    }),

    // ============================================================================
    // ROLE SEARCH & FILTERING
    // ============================================================================

    /**
     * GET /api/permissions/roles/search - Search roles
     */
    searchRoles: builder.query<RolesResponse, {
      query: string;
      filters?: {
        is_system?: boolean;
        has_users?: boolean;
      };
      limit?: number;
      offset?: number;
    }>({
      query: ({ query, filters, limit = 20, offset = 0 }) => ({
        url: 'permissions/roles/search',
        params: {
          query,
          ...filters,
          limit,
          offset,
        },
      }),
      providesTags: ['RoleList'],
    }),

    // ============================================================================
    // ROLE PERMISSIONS MANAGEMENT
    // ============================================================================

    /**
     * POST /api/permissions/roles/:id/add-permission - Add permission to role
     */
    addPermissionToRole: builder.mutation<{
      success: boolean;
      message: string;
    }, {
      roleId: string;
      permissionId: string;
    }>({
      query: ({ roleId, permissionId }) => ({
        url: `permissions/roles/${roleId}/add-permission`,
        method: 'POST',
        body: { permissionId },
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        'RoleList',
      ],
    }),

    /**
     * DELETE /api/permissions/roles/:id/remove-permission - Remove permission from role
     */
    removePermissionFromRole: builder.mutation<{
      success: boolean;
      message: string;
    }, {
      roleId: string;
      permissionId: string;
    }>({
      query: ({ roleId, permissionId }) => ({
        url: `permissions/roles/${roleId}/remove-permission`,
        method: 'DELETE',
        body: { permissionId },
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        'RoleList',
      ],
    }),

    /**
     * PUT /api/permissions/roles/:id/sync-permissions - Sync role permissions (replace all)
     */
    syncRolePermissions: builder.mutation<{
      success: boolean;
      message: string;
      data: {
        added: string[];
        removed: string[];
      };
    }, {
      roleId: string;
      permissionIds: string[];
    }>({
      query: ({ roleId, permissionIds }) => ({
        url: `permissions/roles/${roleId}/sync-permissions`,
        method: 'PUT',
        body: { permissionIds },
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'Role', id: roleId },
        'RoleList',
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Role CRUD operations
  useGetRolesQuery,
  useGetAdminRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useCreateAdminRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  
  // Role assignment operations
  useAssignRoleToUserMutation,
  useRemoveRoleAssignmentMutation,
  useBulkAssignRoleMutation,
  
  // Role information queries
  useGetRoleUsersQuery,
  useGetRolePermissionsQuery,
  useGetRoleStatsQuery,
  
  // User role queries
  useGetUserRolesQuery,
  useGetUserEffectivePermissionsQuery,
  
  // Search and filtering
  useSearchRolesQuery,
  
  // Role permissions management
  useAddPermissionToRoleMutation,
  useRemovePermissionFromRoleMutation,
  useSyncRolePermissionsMutation,
  
  // Lazy queries for on-demand loading
  useLazyGetRolesQuery,
  useLazyGetRoleByIdQuery,
  useLazySearchRolesQuery,
  useLazyGetUserRolesQuery,
  useLazyGetUserEffectivePermissionsQuery,
} = roleApi;

export default roleApi;