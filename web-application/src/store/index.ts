// web-application/src/store/index.ts - FIXED STORE SETUP WITH RTK QUERY
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  createTransform,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

// Slice reducers
import authReducer from "./slices/authSlice";
import workspaceReducer from "./slices/workspaceSlice";
import dashboardReducer from "./slices/dashboardSlice";
import datasetReducer from "./slices/datasetSlice";
import categoryReducer from "./slices/categorySlice";
import uiReducer from "./slices/uiSlice";
import webviewReducer from "./slices/webviewSlice";

// RTK Query APIs - NOW PROPERLY IMPORTED
import { baseApi } from "./api/baseApi";
import { authApi } from "./api/authApi";
import { dashboardApi } from "./api/dashboardApi";
// Uncomment these as you implement them
// import { workspaceApi } from "./api/workspaceApi";
// import { datasetApi } from "./api/datasetApi";
// import { categoryApi } from "./api/categoryApi";
// import { webviewApi } from "./api/webviewApi";

/**
 * Transform for auth slice
 * Adds lastActivity on persist, clears transient fields on rehydrate
 */
const authTransform = createTransform(
  (inboundState: any) => ({
    ...inboundState,
    lastActivity: inboundState.lastActivity || Date.now(),
  }),
  (outboundState: any) => ({
    ...outboundState,
    isLoading: false,
    error: null,
  }),
  { whitelist: ["auth"] }
);

// Persist configs for specific slices
const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: ["token", "user", "workspace", "permissions", "isAuthenticated"],
  blacklist: ["isLoading", "error"],
};

const workspacePersistConfig = {
  key: "workspace",
  storage,
  whitelist: ["currentWorkspace", "workspaces", "lastSwitched"],
  blacklist: ["isLoading", "error"],
};

// Root persist configuration - EXCLUDE RTK Query from persistence
const rootPersistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["auth", "workspace"], // Only persist these slices
  transforms: [authTransform],
  blacklist: [
    "ui",
    "webview", 
    "dashboard",
    "dataset",
    "category",
    // RTK Query API slices - DO NOT PERSIST
    baseApi.reducerPath,
    authApi.reducerPath,
    dashboardApi.reducerPath,
    // Add these when implemented
    // workspaceApi.reducerPath,
    // datasetApi.reducerPath,
    // categoryApi.reducerPath,
    // webviewApi.reducerPath,
  ],
};

// Combine all reducers - NOW INCLUDING RTK QUERY APIS
const rootReducer = combineReducers({
  // Persisted slices
  auth: persistReducer(authPersistConfig, authReducer),
  workspace: persistReducer(workspacePersistConfig, workspaceReducer),

  // Non-persisted slices
  dashboard: dashboardReducer,
  dataset: datasetReducer,
  category: categoryReducer,
  ui: uiReducer,
  webview: webviewReducer,

  // RTK Query API slices - NOW PROPERLY ADDED
  [baseApi.reducerPath]: baseApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  // Uncomment these as you implement them
  // [workspaceApi.reducerPath]: workspaceApi.reducer,
  // [datasetApi.reducerPath]: datasetApi.reducer,
  // [categoryApi.reducerPath]: categoryApi.reducer,
  // [webviewApi.reducerPath]: webviewApi.reducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// Configure store - NOW WITH RTK QUERY MIDDLEWARE
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Ignore RTK Query cache actions as they may contain non-serializable data
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: [
          'register', 
          // RTK Query paths that may contain functions
          `${baseApi.reducerPath}`,
          `${authApi.reducerPath}`,
          `${dashboardApi.reducerPath}`,
        ],
      },
    })
    // Add RTK Query middleware - NOW PROPERLY CONFIGURED
    .concat(baseApi.middleware) // This handles all injected endpoints including dashboardApi
    .concat(authApi.middleware) // This is a separate API with its own middleware
    // Note: dashboardApi uses baseApi.middleware (no separate middleware needed)
    // Uncomment these as you implement them as separate APIs
    // .concat(workspaceApi.middleware)
    // .concat(datasetApi.middleware)
    // .concat(categoryApi.middleware)
    // .concat(webviewApi.middleware)
  ,
  devTools: process.env.NODE_ENV !== "production",
});

// Create persistor
export const persistor = persistStore(store);

// Infer types from store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export default store for compatibility
export default store;