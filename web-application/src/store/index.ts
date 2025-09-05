// web-application/src/store/index.ts - COMPLETE STORE SETUP
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

// RTK Query APIs (if available)
// import { authApi } from "./api/authApi";
// import { userApi } from "./api/userApi";
// import { workspaceApi } from "./api/workspaceApi";
// import { dashboardApi } from "./api/dashboardApi";
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

// Root persist configuration
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
    // RTK Query API slices (if available)
    // authApi.reducerPath,
    // userApi.reducerPath,
    // workspaceApi.reducerPath,
    // dashboardApi.reducerPath,
    // datasetApi.reducerPath,
    // categoryApi.reducerPath,
    // webviewApi.reducerPath,
  ],
};

// Combine all reducers
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

  // RTK Query slices (if available)
  // [authApi.reducerPath]: authApi.reducer,
  // [userApi.reducerPath]: userApi.reducer,
  // [workspaceApi.reducerPath]: workspaceApi.reducer,
  // [dashboardApi.reducerPath]: dashboardApi.reducer,
  // [datasetApi.reducerPath]: datasetApi.reducer,
  // [categoryApi.reducerPath]: categoryApi.reducer,
  // [webviewApi.reducerPath]: webviewApi.reducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
    // Add RTK Query middleware (if available)
    // .concat(authApi.middleware)
    // .concat(userApi.middleware)
    // .concat(workspaceApi.middleware)
    // .concat(dashboardApi.middleware)
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