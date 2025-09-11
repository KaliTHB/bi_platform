// src/store/index.ts - Updated Store Configuration with Merged RBAC APIs
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

// Import your existing slices
import authReducer from "./slices/authSlice";
import workspaceReducer from "./slices/workspaceSlice";
import dashboardReducer from "./slices/dashboardSlice";
import uiReducer from "./slices/uiSlice";
// ... other slice imports

// Import RBAC RTK Query APIs (now merged)
import { userApi } from "./api/userApi";
import { roleApi } from "./api/roleApi"; // Now contains both roles and role assignments
import { permissionApi } from "./api/permissionApi"; // Now contains both permissions and permission assignments

// Import other existing APIs
import { baseApi } from "./api/baseApi";
import { authApi } from "./api/authApi";
import { dashboardApi } from "./api/dashboardApi";

// Root persist configuration - Exclude all RTK Query APIs from persistence
const rootPersistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["auth", "workspace"], // Only persist these slices
  blacklist: [
    // Exclude ALL RTK Query APIs from persistence
    baseApi.reducerPath,
    authApi.reducerPath,
    dashboardApi.reducerPath,
    userApi.reducerPath,
    roleApi.reducerPath, // Merged API
    permissionApi.reducerPath, // Merged API
  ],
};

// Combine all reducers including merged RBAC APIs
const rootReducer = combineReducers({
  // Your existing slices
  auth: authReducer,
  workspace: workspaceReducer,
  dashboard: dashboardReducer,
  ui: uiReducer,
  // ... other slices

  // All RTK Query API slices
  [baseApi.reducerPath]: baseApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  
  // Merged RBAC API slices
  [userApi.reducerPath]: userApi.reducer,
  [roleApi.reducerPath]: roleApi.reducer, // Contains roles + role assignments
  [permissionApi.reducerPath]: permissionApi.reducer, // Contains permissions + permission assignments
});

// Create persisted reducer
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// Configure store with merged RTK Query middleware
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: [
          'register',
          // All RTK Query paths that may contain functions
          baseApi.reducerPath,
          authApi.reducerPath,
          dashboardApi.reducerPath,
          userApi.reducerPath,
          roleApi.reducerPath, // Merged API
          permissionApi.reducerPath, // Merged API
        ],
      },
    })
    // Add merged RTK Query middleware - Reduced from 7 to 5 APIs
    .concat(baseApi.middleware)
    .concat(authApi.middleware)
    .concat(dashboardApi.middleware)
    .concat(userApi.middleware)
    .concat(roleApi.middleware) // Handles both roles and role assignments
    .concat(permissionApi.middleware), // Handles both permissions and permission assignments

  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;

// Export all merged API hooks for easy importing
export {
  // Users API hooks (unchanged)
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetCurrentUserQuery,
  useGetUserWorkspacesQuery,
  useGetUserPermissionsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useDeleteUserMutation,
  useAddUserToWorkspaceMutation,
  useRemoveUserFromWorkspaceMutation,
  useSearchUsersQuery,
  useLazySearchUsersQuery,
} from './api/userApi';

export {
  // Merged Roles API hooks (roles + role assignments)
  
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
} from './api/roleApi';

export {
  // Merged Permissions API hooks (permissions + permission assignments)
  
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
} from './api/permissionApi';