// src/store/index.ts - Updated Store Configuration (Fixed Permission Slice Missing)
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
import permissionReducer from "./slices/permissionSlice"; // ✅ ADD THIS IMPORT

// Import RBAC RTK Query APIs
import { userApi } from "./api/userApi";
import { roleApi } from "./api/roleApi";
import { permissionApi } from "./api/permissionApi";
import { workspaceApi } from "./api/workspaceApi";

// Import other existing APIs
import { baseApi } from "./api/baseApi";
import { authApi } from "./api/authApi";
import { dashboardApi } from "./api/dashboardApi";
import { categoryApi } from "./api/categoryApi";
import { datasetApi } from "./api/datasetApi";

// Root persist configuration - Exclude all RTK Query APIs from persistence
const rootPersistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["auth", "workspace", "permission"], // ✅ ADD "permission" to whitelist
  blacklist: [
    // Exclude ALL RTK Query APIs from persistence
    baseApi.reducerPath,
    authApi.reducerPath,
    userApi.reducerPath,
    roleApi.reducerPath,
    datasetApi.reducerPath,
    permissionApi.reducerPath,
    workspaceApi.reducerPath,
  ],
};

// Combine all reducers including permission slice
const rootReducer = combineReducers({
  // Your existing slices
  auth: authReducer,
  workspace: workspaceReducer,
  dashboard: dashboardReducer,
  ui: uiReducer,
  permission: permissionReducer, // ✅ ADD THIS LINE

  // RTK Query API slices
  [baseApi.reducerPath]: baseApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [workspaceApi.reducerPath]: workspaceApi.reducer,
  
  // Separate RBAC API slices
  [userApi.reducerPath]: userApi.reducer,
  [roleApi.reducerPath]: roleApi.reducer,
  [permissionApi.reducerPath]: permissionApi.reducer,
  [datasetApi.reducerPath]: datasetApi.reducer,
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
          baseApi.reducerPath,
          authApi.reducerPath,
          userApi.reducerPath,
          roleApi.reducerPath,
          workspaceApi.reducerPath,
          permissionApi.reducerPath,
          datasetApi.reducerPath,
        ],
      },
    })
    // Add RTK Query middleware
    .concat(baseApi.middleware)
    .concat(authApi.middleware)
    .concat(workspaceApi.middleware)
    .concat(userApi.middleware)
    .concat(roleApi.middleware)
    .concat(datasetApi.middleware)
    .concat(permissionApi.middleware),

  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;