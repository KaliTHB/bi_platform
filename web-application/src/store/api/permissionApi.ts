// src/store/api/permissionApi.ts - Merged Permissions Management & Assignment API
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  Permission,
  PermissionQueryFilters,
  RolePermissionAssignment,
  AssignPermissionToRoleRequest,
  RemovePermissionFromRoleRequest,
  BulkAssignPermissionsRequest,
  PaginatedResponse,
  ApiResponse
} from '@/types/rbac.types';

export const permissionApi = createApi({
  reducerPath: 'permissionApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;
      const workspaceId = state.workspace.current?.id;
      
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      if (workspaceId) {
        headers.set('x-workspace-id', workspaceId);
      }
      
      return headers;
    },
  }),
  tagTypes: ['Permission', 'PermissionCategories', 'PermissionAssignment', 'RolePermissions', 'PermissionRoles'],
  endpoints: (builder) => ({

    // ==================== PERMISSION MANAGEMENT ENDPOINTS ====================

    // Get all available permissions with filters
    getPermissions: builder.query<PaginatedResponse<Permission>, PermissionQueryFilters>({
      query: (filters) => ({
        url: 'permissions',
        params: filters,
      }),
      providesTags: ['Permission'],
    }),

    // Get permission by ID
    getPermissionById: builder.query<ApiResponse<Permission>, string>({
      query: (id) => `permissions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Permission', id }],
    }),

    // Get permissions grouped by category
    getPermissionsByCategory: builder.query<ApiResponse<{
      category: Permission['category'];
      permissions: Permission[];
    }[]>, void>({
      query: () => 'permissions/by-category',
      providesTags: ['Permission', 'PermissionCategories'],
    }),

    // Get permissions for a specific category
    getCategoryPermissions: builder.query<ApiResponse<Permission[]>, Permission['category']>({
      query: (category) => `permissions/category/${category}`,
      providesTags: (result, error, category) => [
        { type: 'Permission', id: `category-${category}` }
      ],
    }),

    // Get all permission categories with counts
    getPermissionCategories: builder.query<ApiResponse<{
      category: Permission['category'];
      count: number;
      description: string;
    }[]>, void>({
      query: () => 'permissions/categories',
      providesTags: ['PermissionCategories'],
    }),

    // Get permissions by resource type and action
    getResourcePermissions: builder.query<ApiResponse<Permission[]>, {
      resourceType?: string;
      action?: Permission['action'];
    }>({
      query: ({ resourceType, action }) => ({
        url: 'permissions/by-resource',
        params: { resource_type: resourceType, action },
      }),
      providesTags: (result, error, { resourceType, action }) => [
        { type: 'Permission', id: `resource-${resourceType}-${action}` }
      ],
    }),

    // Search permissions (for permission assignment UI)
    searchPermissions: builder.query<ApiResponse<Permission[]>, {
      query: string;
      category?: Permission['category'];
      limit?: number;
    }>({
      query: ({ query, category, limit = 20 }) => ({
        url: 'permissions/search',
        params: { q: query, category, limit },
      }),
    }),

    // Get permission hierarchy (for complex permission trees)
    getPermissionHierarchy: builder.query<ApiResponse<{
      permission: Permission;
      children: Permission[];
      parent?: Permission;
    }[]>, void>({
      query: () => 'permissions/hierarchy',
      providesTags: ['Permission'],
    }),

    // Create custom permission (admin only, for extending system)
    createCustomPermission: builder.mutation<ApiResponse<Permission>, {
      name: string;
      description: string;
      category: Permission['category'];
      resource_type?: string;
      action: Permission['action'];
    }>({
      query: (permissionData) => ({
        url: 'permissions/custom',
        method: 'POST',
        body: permissionData,
      }),
      invalidatesTags: ['Permission', 'PermissionCategories'],
    }),

    // Update custom permission
    updateCustomPermission: builder.mutation<ApiResponse<Permission>, {
      id: string;
      name?: string;
      description?: string;
      category?: Permission['category'];
      resource_type?: string;
      action?: Permission['action'];
    }>({
      query: ({ id, ...patch }) => ({
        url: `permissions/custom/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Permission', id },
        'Permission',
        'PermissionCategories'
      ],
    }),

    // Delete custom permission (admin only)
    deleteCustomPermission: builder.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `permissions/custom/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Permission', id },
        'Permission',
        'PermissionCategories',
        'PermissionAssignment' // Also invalidate assignments since permission is deleted
      ],
    }),

    // Check if permissions conflict (for validation)
    checkPermissionConflicts: builder.query<ApiResponse<{
      conflicts: {
        permission1: Permission;
        permission2: Permission;
        reason: string;
      }[];
    }>, string[]>({
      query: (permissionIds) => ({
        url: 'permissions/check-conflicts',
        method: 'POST',
        body: { permission_ids: permissionIds },
      }),
    }),

    // Get permission usage across roles
    getPermissionUsage: builder.query<ApiResponse<{
      permission_id: string;
      permission_name: string;
      roles_count: number;
      users_affected: number;
      workspaces: string[];
    }[]>, string[]>({
      query: (permissionIds) => ({
        url: 'permissions/usage',
        method: 'POST',
        body: { permission_ids: permissionIds },
      }),
    }),

    // ==================== PERMISSION ASSIGNMENT ENDPOINTS ====================

    // Get all permission assignments for a role
    getRolePermissionAssignments: builder.query<ApiResponse<RolePermissionAssignment[]>, string>({
      query: (roleId) => `permission-assignments/role/${roleId}`,
      providesTags: (result, error, roleId) => [
        { type: 'RolePermissions', id: roleId }
      ],
    }),

    // Get all roles that have a specific permission
    getPermissionRoleAssignments: builder.query<ApiResponse<{
      role_id: string;
      role_name: string;
      workspace_id: string;
      workspace_name: string;
      assigned_at: string;
    }[]>, string>({
      query: (permissionId) => `permission-assignments/permission/${permissionId}`,
      providesTags: (result, error, permissionId) => [
        { type: 'PermissionRoles', id: permissionId }
      ],
    }),

    // Get available permissions for assignment (not already assigned to role)
    getAvailablePermissions: builder.query<ApiResponse<Permission[]>, {
      roleId: string;
      category?: Permission['category'];
      action?: Permission['action'];
    }>({
      query: ({ roleId, category, action }) => ({
        url: `permission-assignments/role/${roleId}/available`,
        params: { category, action },
      }),
      providesTags: (result, error, { roleId }) => [
        { type: 'RolePermissions', id: `available-${roleId}` }
      ],
    }),

    // Assign single permission to role
    assignPermissionToRole: builder.mutation<ApiResponse<RolePermissionAssignment>, AssignPermissionToRoleRequest>({
      query: ({ role_id, permission_id }) => ({
        url: 'permission-assignments',
        method: 'POST',
        body: { role_id, permission_id },
      }),
      invalidatesTags: (result, error, { role_id, permission_id }) => [
        { type: 'RolePermissions', id: role_id },
        { type: 'RolePermissions', id: `available-${role_id}` },
        { type: 'PermissionRoles', id: permission_id },
        'PermissionAssignment'
      ],
    }),

    // Bulk assign permissions to role
    bulkAssignPermissions: builder.mutation<ApiResponse<RolePermissionAssignment[]>, BulkAssignPermissionsRequest>({
      query: ({ role_id, permission_ids, replace_existing = false }) => ({
        url: 'permission-assignments/bulk',
        method: 'POST',
        body: { role_id, permission_ids, replace_existing },
      }),
      invalidatesTags: (result, error, { role_id, permission_ids }) => [
        { type: 'RolePermissions', id: role_id },
        { type: 'RolePermissions', id: `available-${role_id}` },
        ...permission_ids.map(permissionId => ({ type: 'PermissionRoles' as const, id: permissionId })),
        'PermissionAssignment'
      ],
    }),

    // Remove permission from role
    removePermissionFromRole: builder.mutation<ApiResponse<{ success: boolean }>, RemovePermissionFromRoleRequest>({
      query: ({ role_id, permission_id }) => ({
        url: `permission-assignments/role/${role_id}/permission/${permission_id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { role_id, permission_id }) => [
        { type: 'RolePermissions', id: role_id },
        { type: 'RolePermissions', id: `available-${role_id}` },
        { type: 'PermissionRoles', id: permission_id },
        'PermissionAssignment'
      ],
    }),

    // Bulk remove permissions from role
    bulkRemovePermissions: builder.mutation<ApiResponse<{ removed_count: number }>, {
      role_id: string;
      permission_ids: string[];
    }>({
      query: ({ role_id, permission_ids }) => ({
        url: 'permission-assignments/bulk-remove',
        method: 'DELETE',
        body: { role_id, permission_ids },
      }),
      invalidatesTags: (result, error, { role_id, permission_ids }) => [
        { type: 'RolePermissions', id: role_id },
        { type: 'RolePermissions', id: `available-${role_id}` },
        ...permission_ids.map(permissionId => ({ type: 'PermissionRoles' as const, id: permissionId })),
        'PermissionAssignment'
      ],
    }),

    // Copy permissions from one role to another
    copyRolePermissions: builder.mutation<ApiResponse<RolePermissionAssignment[]>, {
      sourceRoleId: string;
      targetRoleId: string;
      replaceExisting?: boolean;
    }>({
      query: ({ sourceRoleId, targetRoleId, replaceExisting = false }) => ({
        url: 'permission-assignments/copy-permissions',
        method: 'POST',
        body: {
          source_role_id: sourceRoleId,
          target_role_id: targetRoleId,
          replace_existing: replaceExisting,
        },
      }),
      invalidatesTags: (result, error, { targetRoleId }) => [
        { type: 'RolePermissions', id: targetRoleId },
        { type: 'RolePermissions', id: `available-${targetRoleId}` },
        'PermissionAssignment',
        'PermissionRoles'
      ],
    }),

    // Get permission comparison between roles
    compareRolePermissions: builder.query<ApiResponse<{
      role1: { id: string; name: string; permissions: Permission[] };
      role2: { id: string; name: string; permissions: Permission[] };
      common_permissions: Permission[];
      role1_only: Permission[];
      role2_only: Permission[];
    }>, {
      role1Id: string;
      role2Id: string;
    }>({
      query: ({ role1Id, role2Id }) => ({
        url: 'permission-assignments/compare',
        params: { role1_id: role1Id, role2_id: role2Id },
      }),
    }),

    // Get permission assignment history for audit
    getPermissionAssignmentHistory: builder.query<ApiResponse<{
      role_id: string;
      role_name: string;
      permission_id: string;
      permission_name: string;
      action: 'assigned' | 'removed';
      changed_by: string;
      changed_by_name: string;
      changed_at: string;
    }[]>, {
      roleId?: string;
      permissionId?: string;
      workspaceId?: string;
      limit?: number;
    }>({
      query: ({ roleId, permissionId, workspaceId, limit = 50 }) => ({
        url: 'permission-assignments/history',
        params: { role_id: roleId, permission_id: permissionId, workspace_id: workspaceId, limit },
      }),
    }),

    // Get suggested permissions for a role (based on similar roles)
    getSuggestedPermissions: builder.query<ApiResponse<{
      permission: Permission;
      score: number;
      reason: string;
      similar_roles: string[];
    }[]>, {
      roleId: string;
      limit?: number;
    }>({
      query: ({ roleId, limit = 10 }) => ({
        url: 'permission-assignments/suggestions',
        params: { role_id: roleId, limit },
      }),
    }),

    // Validate permission set (check for conflicts, missing dependencies)
    validatePermissionSet: builder.query<ApiResponse<{
      is_valid: boolean;
      conflicts: {
        permission1: Permission;
        permission2: Permission;
        reason: string;
      }[];
      missing_dependencies: {
        permission: Permission;
        required_permissions: Permission[];
      }[];
      warnings: {
        type: 'redundant' | 'deprecated' | 'overprivileged';
        permission: Permission;
        message: string;
      }[];
    }>, {
      roleId: string;
      permissionIds: string[];
    }>({
      query: ({ roleId, permissionIds }) => ({
        url: 'permission-assignments/validate',
        method: 'POST',
        body: { role_id: roleId, permission_ids: permissionIds },
      }),
    }),

    // Get permission assignment statistics
    getPermissionAssignmentStats: builder.query<ApiResponse<{
      total_assignments: number;
      unique_permissions: number;
      most_assigned_permissions: {
        permission_name: string;
        assignment_count: number;
      }[];
      least_assigned_permissions: {
        permission_name: string;
        assignment_count: number;
      }[];
      permissions_by_category: {
        category: string;
        count: number;
      }[];
    }>, {
      workspaceId?: string;
      roleIds?: string[];
    }>({
      query: ({ workspaceId, roleIds }) => ({
        url: 'permission-assignments/stats',
        params: { 
          workspace_id: workspaceId, 
          role_ids: roleIds?.join(',') 
        },
      }),
      providesTags: (result, error, { workspaceId, roleIds }) => [
        { type: 'PermissionAssignment', id: `stats-${workspaceId}-${roleIds?.join(',')}` }
      ],
    }),

    // Sync permissions from template (for standardizing roles across workspaces)
    syncFromTemplate: builder.mutation<ApiResponse<{
      added: Permission[];
      removed: Permission[];
      unchanged: Permission[];
    }>, {
      roleId: string;
      templateRoleId: string;
      syncMode: 'merge' | 'replace' | 'addOnly';
    }>({
      query: ({ roleId, templateRoleId, syncMode }) => ({
        url: 'permission-assignments/sync-template',
        method: 'POST',
        body: {
          role_id: roleId,
          template_role_id: templateRoleId,
          sync_mode: syncMode,
        },
      }),
      invalidatesTags: (result, error, { roleId }) => [
        { type: 'RolePermissions', id: roleId },
        { type: 'RolePermissions', id: `available-${roleId}` },
        'PermissionAssignment'
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Permission Management hooks
  useGetPermissionsQuery,
  useGetPermissionByIdQuery,
  useGetPermissionsByCategoryQuery,
  useGetCategoryPermissionsQuery,
  useGetPermissionCategoriesQuery,
  useGetResourcePermissionsQuery,
  useSearchPermissionsQuery,
  useLazySearchPermissionsQuery,
  useGetPermissionHierarchyQuery,
  useCreateCustomPermissionMutation,
  useUpdateCustomPermissionMutation,
  useDeleteCustomPermissionMutation,
  useCheckPermissionConflictsQuery,
  useLazyCheckPermissionConflictsQuery,
  useGetPermissionUsageQuery,

  // Permission Assignment hooks
  useGetRolePermissionAssignmentsQuery,
  useGetPermissionRoleAssignmentsQuery,
  useGetAvailablePermissionsQuery,
  useAssignPermissionToRoleMutation,
  useBulkAssignPermissionsMutation,
  useRemovePermissionFromRoleMutation,
  useBulkRemovePermissionsMutation,
  useCopyRolePermissionsMutation,
  useCompareRolePermissionsQuery,
  useGetPermissionAssignmentHistoryQuery,
  useGetSuggestedPermissionsQuery,
  useValidatePermissionSetQuery,
  useLazyValidatePermissionSetQuery,
  useGetPermissionAssignmentStatsQuery,
  useSyncFromTemplateMutation,
} = permissionApi;