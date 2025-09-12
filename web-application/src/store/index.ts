// src/store/index.ts - Updated Store Configuration (Fixed Duplicate Middleware Issue)
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

// Import RBAC RTK Query APIs
import { userApi } from "./api/userApi";
import { roleApi } from "./api/roleApi"; // Contains both roles and role assignments
import { permissionApi } from "./api/permissionApi"; // Contains both permissions and permission assignments

// Import other existing APIs
import { baseApi } from "./api/baseApi";
import { authApi } from "./api/authApi";
import { dashboardApi } from "./api/dashboardApi"; // This extends baseApi via injectEndpoints
import { categoryApi } from "./api/categoryApi"; // This also extends baseApi via injectEndpoints

// Root persist configuration - Exclude all RTK Query APIs from persistence
const rootPersistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["auth", "workspace"], // Only persist these slices
  blacklist: [
    // Exclude ALL RTK Query APIs from persistence
    baseApi.reducerPath, // This includes dashboardApi and categoryApi
    authApi.reducerPath,
    userApi.reducerPath,
    roleApi.reducerPath,
    permissionApi.reducerPath,
  ],
};

// Combine all reducers including RBAC APIs
const rootReducer = combineReducers({
  // Your existing slices
  auth: authReducer,
  workspace: workspaceReducer,
  dashboard: dashboardReducer,
  ui: uiReducer,
  // ... other slices

  // RTK Query API slices
  // Note: baseApi includes dashboardApi and categoryApi endpoints via injectEndpoints
  [baseApi.reducerPath]: baseApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  
  // Separate RBAC API slices (these use createApi, not injectEndpoints)
  [userApi.reducerPath]: userApi.reducer,
  [roleApi.reducerPath]: roleApi.reducer, // Contains roles + role assignments
  [permissionApi.reducerPath]: permissionApi.reducer, // Contains permissions + permission assignments
});

// Create persisted reducer
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// Configure store with RTK Query middleware
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
          baseApi.reducerPath, // This includes dashboardApi and categoryApi
          authApi.reducerPath,
          userApi.reducerPath,
          roleApi.reducerPath,
          permissionApi.reducerPath,
        ],
      },
    })
    // Add RTK Query middleware - Only for APIs created with createApi()
    .concat(baseApi.middleware) // This handles dashboardApi and categoryApi too
    .concat(authApi.middleware)
    // These APIs use createApi() so they need their own middleware:
    .concat(userApi.middleware)
    .concat(roleApi.middleware) 
    .concat(permissionApi.middleware),

  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;

// Export all API hooks for easy importing
export {
  // Users API hooks
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

// Export dashboard API hooks (these come from baseApi via injectEndpoints)
export {
  useGetDashboardsQuery,
  useGetDashboardQuery,
  useCreateDashboardMutation,
  useUpdateDashboardMutation,
  useDeleteDashboardMutation,
  useDuplicateDashboardMutation,
  useGetDashboardDataQuery,
  // Add other dashboard hooks as needed
} from './api/dashboardApi';


// ✅ Export chart API hooks (NEW)
export {
  // Chart CRUD hooks
  useGetChartsQuery,
  useGetChartQuery,
  useCreateChartMutation,
  useUpdateChartMutation,
  useDeleteChartMutation,
  useDuplicateChartMutation,
  
  // Chart data hooks
  useGetChartDataQuery,
  useLazyGetChartDataQuery,
  useRefreshChartMutation,
  useApplyChartFilterMutation,
  
  // Chart export hooks
  useExportChartMutation,
  useGetChartExportStatusQuery,
  
  // Chart utility hooks
  useGetChartQueryQuery,
  useCheckChartUsageQuery,
  useGetChartAnalyticsQuery,
  
  // Chart status hooks
  useToggleChartStatusMutation,
  
  // Bulk operation hooks
  useBulkUpdateChartsMutation,
  useBulkDeleteChartsMutation,
} from './api/chartApi';

// Export category API hooks (these also come from baseApi via injectEndpoints)
export {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from './api/categoryApi';