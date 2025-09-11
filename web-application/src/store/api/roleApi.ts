// src/store/api/roleApi.ts - Merged Roles Management & Assignment API
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleQueryFilters,
  UserRoleAssignment,
  AssignRoleToUserRequest,
  UpdateRoleAssignmentRequest,
  RoleAssignmentQueryFilters,
  PaginatedResponse,
  ApiResponse,
  Permission
} from '@/types/rbac.types';

export const roleApi = createApi({
  reducerPath: 'roleApi',
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
  tagTypes: ['Role', 'RolePermissions', 'RoleAssignment', 'UserRoles', 'RoleUsers'],
  endpoints: (builder) => ({
    
    // ==================== ROLE MANAGEMENT ENDPOINTS ====================
    
    // Get paginated roles with filters
    getRoles: builder.query<PaginatedResponse<Role>, RoleQueryFilters>({
      query: (filters) => ({
        url: 'roles',
        params: filters,
      }),
      providesTags: ['Role'],
    }),

    // Get role by ID with permissions
    getRoleById: builder.query<ApiResponse<Role>, string>({
      query: (id) => `roles/${id}`,
      providesTags: (result, error, id) => [{ type: 'Role', id }],
    }),

    // Get role permissions
    getRolePermissions: builder.query<ApiResponse<Permission[]>, string>({
      query: (roleId) => `roles/${roleId}/permissions`,
      providesTags: (result, error, roleId) => [{ type: 'RolePermissions', id: roleId }],
    }),

    // Get roles for a specific workspace (commonly used)
    getWorkspaceRoles: builder.query<ApiResponse<Role[]>, string>({
      query: (workspaceId) => `roles/workspace/${workspaceId}`,
      providesTags: (result, error, workspaceId) => [
        { type: 'Role', id: `workspace-${workspaceId}` }
      ],
    }),

    // Get system roles (reusable across workspaces)
    getSystemRoles: builder.query<ApiResponse<Role[]>, void>({
      query: () => 'roles/system',
      providesTags: [{ type: 'Role', id: 'system' }],
    }),

    // Create new role
    createRole: builder.mutation<ApiResponse<Role>, CreateRoleRequest>({
      query: (roleData) => ({
        url: 'roles',
        method: 'POST',
        body: roleData,
      }),
      invalidatesTags: (result, error, { workspace_id }) => [
        'Role',
        { type: 'Role', id: `workspace-${workspace_id}` }
      ],
    }),

    // Update role
    updateRole: builder.mutation<ApiResponse<Role>, UpdateRoleRequest>({
      query: ({ id, ...patch }) => ({
        url: `roles/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Role', id },
        { type: 'RolePermissions', id },
        'Role'
      ],
    }),

    // Clone role to another workspace
    cloneRole: builder.mutation<ApiResponse<Role>, {
      roleId: string;
      targetWorkspaceId: string;
      name?: string;
    }>({
      query: ({ roleId, targetWorkspaceId, name }) => ({
        url: `roles/${roleId}/clone`,
        method: 'POST',
        body: { target_workspace_id: targetWorkspaceId, name },
      }),
      invalidatesTags: (result, error, { targetWorkspaceId }) => [
        'Role',
        { type: 'Role', id: `workspace-${targetWorkspaceId}` }
      ],
    }),

    // Delete role (only custom roles, not system roles)
    deleteRole: builder.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Role', id },
        { type: 'RolePermissions', id },
        'Role',
        'RoleAssignment' // Also invalidate assignments since role is deleted
      ],
    }),

    // Get role usage statistics
    getRoleUsage: builder.query<ApiResponse<{
      role_id: string;
      user_count: number;
      active_assignments: number;
      last_assigned: string | null;
    }>, string>({
      query: (roleId) => `roles/${roleId}/usage`,
    }),

    // Search roles (for autocomplete/selection)
    searchRoles: builder.query<ApiResponse<Role[]>, {
      query: string;
      workspaceId?: string;
      includeSystem?: boolean;
      limit?: number;
    }>({
      query: ({ query, workspaceId, includeSystem = false, limit = 10 }) => ({
        url: 'roles/search',
        params: { 
          q: query, 
          workspace_id: workspaceId,
          include_system: includeSystem,
          limit 
        },
      }),
    }),

    // Get recommended roles for a user (based on similar users/patterns)
    getRecommendedRoles: builder.query<ApiResponse<{
      role: Role;
      score: number;
      reason: string;
    }[]>, {
      userId: string;
      workspaceId: string;
    }>({
      query: ({ userId, workspaceId }) => ({
        url: 'roles/recommendations',
        params: { user_id: userId, workspace_id: workspaceId },
      }),
    }),

    // ==================== ROLE ASSIGNMENT ENDPOINTS ====================

    // Get paginated role assignments with filters
    getRoleAssignments: builder.query<PaginatedResponse<UserRoleAssignment>, RoleAssignmentQueryFilters>({
      query: (filters) => ({
        url: 'role-assignments',
        params: filters,
      }),
      providesTags: ['RoleAssignment'],
    }),

    // Get role assignment by ID
    getRoleAssignmentById: builder.query<ApiResponse<UserRoleAssignment>, string>({
      query: (id) => `role-assignments/${id}`,
      providesTags: (result, error, id) => [{ type: 'RoleAssignment', id }],
    }),

    // Get all role assignments for a user in a workspace
    getUserRoleAssignments: builder.query<ApiResponse<UserRoleAssignment[]>, {
      userId: string;
      workspaceId: string;
      includeExpired?: boolean;
    }>({
      query: ({ userId, workspaceId, includeExpired = false }) => ({
        url: `role-assignments/user/${userId}`,
        params: { workspace_id: workspaceId, include_expired: includeExpired },
      }),
      providesTags: (result, error, { userId, workspaceId }) => [
        { type: 'UserRoles', id: `${userId}-${workspaceId}` }
      ],
    }),

    // Get all users assigned to a specific role
    getRoleUsers: builder.query<ApiResponse<UserRoleAssignment[]>, {
      roleId: string;
      workspaceId: string;
      includeInactive?: boolean;
    }>({
      query: ({ roleId, workspaceId, includeInactive = false }) => ({
        url: `role-assignments/role/${roleId}`,
        params: { workspace_id: workspaceId, include_inactive: includeInactive },
      }),
      providesTags: (result, error, { roleId, workspaceId }) => [
        { type: 'RoleUsers', id: `${roleId}-${workspaceId}` }
      ],
    }),

    // Get assignments expiring soon (for admin alerts)
    getExpiringAssignments: builder.query<ApiResponse<UserRoleAssignment[]>, {
      workspaceId: string;
      daysAhead?: number;
    }>({
      query: ({ workspaceId, daysAhead = 7 }) => ({
        url: 'role-assignments/expiring',
        params: { workspace_id: workspaceId, days_ahead: daysAhead },
      }),
      providesTags: (result, error, { workspaceId }) => [
        { type: 'RoleAssignment', id: `expiring-${workspaceId}` }
      ],
    }),

    // Assign role to user
    assignRoleToUser: builder.mutation<ApiResponse<UserRoleAssignment>, AssignRoleToUserRequest>({
      query: (assignmentData) => ({
        url: 'role-assignments',
        method: 'POST',
        body: assignmentData,
      }),
      invalidatesTags: (result, error, { user_id, workspace_id, role_id }) => [
        'RoleAssignment',
        { type: 'UserRoles', id: `${user_id}-${workspace_id}` },
        { type: 'RoleUsers', id: `${role_id}-${workspace_id}` },
      ],
    }),

    // Bulk assign roles to multiple users
    bulkAssignRoles: builder.mutation<ApiResponse<UserRoleAssignment[]>, {
      assignments: AssignRoleToUserRequest[];
    }>({
      query: ({ assignments }) => ({
        url: 'role-assignments/bulk',
        method: 'POST',
        body: { assignments },
      }),
      invalidatesTags: ['RoleAssignment', 'UserRoles', 'RoleUsers'],
    }),

    // Update role assignment (extend expiry, change status, etc.)
    updateRoleAssignment: builder.mutation<ApiResponse<UserRoleAssignment>, UpdateRoleAssignmentRequest>({
      query: ({ id, ...patch }) => ({
        url: `role-assignments/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'RoleAssignment', id },
        'RoleAssignment',
        'UserRoles',
        'RoleUsers'
      ],
    }),

    // Remove role assignment (revoke role from user)
    removeRoleAssignment: builder.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (id) => ({
        url: `role-assignments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'RoleAssignment', id },
        'RoleAssignment',
        'UserRoles',
        'RoleUsers'
      ],
    }),

    // Bulk remove role assignments
    bulkRemoveRoleAssignments: builder.mutation<ApiResponse<{ removed_count: number }>, {
      assignment_ids: string[];
    }>({
      query: ({ assignment_ids }) => ({
        url: 'role-assignments/bulk-remove',
        method: 'DELETE',
        body: { assignment_ids },
      }),
      invalidatesTags: ['RoleAssignment', 'UserRoles', 'RoleUsers'],
    }),

    // Copy user's roles to another user (within same workspace)
    copyUserRoles: builder.mutation<ApiResponse<UserRoleAssignment[]>, {
      sourceUserId: string;
      targetUserId: string;
      workspaceId: string;
      includeExpiring?: boolean;
    }>({
      query: ({ sourceUserId, targetUserId, workspaceId, includeExpiring = false }) => ({
        url: 'role-assignments/copy-roles',
        method: 'POST',
        body: {
          source_user_id: sourceUserId,
          target_user_id: targetUserId,
          workspace_id: workspaceId,
          include_expiring: includeExpiring,
        },
      }),
      invalidatesTags: (result, error, { targetUserId, workspaceId }) => [
        'RoleAssignment',
        { type: 'UserRoles', id: `${targetUserId}-${workspaceId}` },
        'RoleUsers'
      ],
    }),

    // Transfer all role assignments from one user to another (when user leaves)
    transferUserRoles: builder.mutation<ApiResponse<UserRoleAssignment[]>, {
      fromUserId: string;
      toUserId: string;
      workspaceId: string;
    }>({
      query: ({ fromUserId, toUserId, workspaceId }) => ({
        url: 'role-assignments/transfer-roles',
        method: 'POST',
        body: {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          workspace_id: workspaceId,
        },
      }),
      invalidatesTags: (result, error, { fromUserId, toUserId, workspaceId }) => [
        'RoleAssignment',
        { type: 'UserRoles', id: `${fromUserId}-${workspaceId}` },
        { type: 'UserRoles', id: `${toUserId}-${workspaceId}` },
        'RoleUsers'
      ],
    }),

    // Get role assignment history for audit purposes
    getAssignmentHistory: builder.query<ApiResponse<{
      assignment_id: string;
      action: 'assigned' | 'updated' | 'removed' | 'expired';
      changed_by: string;
      changed_by_name: string;
      changed_at: string;
      details: Record<string, any>;
    }[]>, {
      userId?: string;
      roleId?: string;
      workspaceId: string;
      limit?: number;
    }>({
      query: ({ userId, roleId, workspaceId, limit = 50 }) => ({
        url: 'role-assignments/history',
        params: { user_id: userId, role_id: roleId, workspace_id: workspaceId, limit },
      }),
    }),

    // Get assignment statistics for dashboard
    getAssignmentStats: builder.query<ApiResponse<{
      total_assignments: number;
      active_assignments: number;
      expired_assignments: number;
      assignments_by_role: { role_name: string; count: number }[];
      recent_activity: number;
      users_with_roles: number;
    }>, string>({
      query: (workspaceId) => `role-assignments/stats/${workspaceId}`,
      providesTags: (result, error, workspaceId) => [
        { type: 'RoleAssignment', id: `stats-${workspaceId}` }
      ],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Role Management hooks
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useGetRolePermissionsQuery,
  useGetWorkspaceRolesQuery,
  useGetSystemRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useCloneRoleMutation,
  useDeleteRoleMutation,
  useGetRoleUsageQuery,
  useSearchRolesQuery,
  useLazySearchRolesQuery,
  useGetRecommendedRolesQuery,

  // Role Assignment hooks
  useGetRoleAssignmentsQuery,
  useGetRoleAssignmentByIdQuery,
  useGetUserRoleAssignmentsQuery,
  useGetRoleUsersQuery,
  useGetExpiringAssignmentsQuery,
  useAssignRoleToUserMutation,
  useBulkAssignRolesMutation,
  useUpdateRoleAssignmentMutation,
  useRemoveRoleAssignmentMutation,
  useBulkRemoveRoleAssignmentsMutation,
  useCopyUserRolesMutation,
  useTransferUserRolesMutation,
  useGetAssignmentHistoryQuery,
  useGetAssignmentStatsQuery,
} = roleApi;