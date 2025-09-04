// web-application/src/store/index.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  createTransform,
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

// RTK Query APIs
import { authApi } from "./api/authApi";
import { userApi } from "./api/userApi";
import { workspaceApi } from "./api/workspaceApi";
import { dashboardApi } from "./api/dashboardApi";
import { datasetApi } from "./api/datasetApi";
import { categoryApi } from "./api/categoryApi";
import { webviewApi } from "./api/webviewApi";

/**
 * 🔄 Transform for auth slice
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

// 🔐 Persist configs
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

const rootPersistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["auth", "workspace"],
  transforms: [authTransform],
  blacklist: [
    "ui",
    "webview",
    "dashboard",
    "dataset",
    "category",
    authApi.reducerPath,
    userApi.reducerPath,
    workspaceApi.reducerPath,
    dashboardApi.reducerPath,
    datasetApi.reducerPath,
    categoryApi.reducerPath,
    webviewApi.reducerPath,
  ],
};

// 🧩 Combine reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  workspace: persistReducer(workspacePersistConfig, workspaceReducer),

  // Non-persisted slices
  dashboard: dashboardReducer,
  dataset: datasetReducer,
  category: categoryReducer,
  ui: uiReducer,
  webview: webviewReducer,

  // RTK Query slices
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [workspaceApi.reducerPath]: workspaceApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  [datasetApi.reducerPath]: datasetApi.reducer,
  [categoryApi.reducerPath]: categoryApi.reducer,
  [webviewApi.reducerPath]: webviewApi.reducer,
});

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

// 🏪 Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PAUSE",
          "persist/PURGE",
          "persist/REGISTER",
          "persist/FLUSH",
        ],
        ignoredPaths: ["_persist"],
      },
      immutableCheck: { warnAfter: 128 },
    }).concat([
      authApi.middleware,
      userApi.middleware,
      workspaceApi.middleware,
      dashboardApi.middleware,
      datasetApi.middleware,
      categoryApi.middleware,
      webviewApi.middleware,
    ]),
  devTools: process.env.NODE_ENV !== "production",
});

// 🔄 Persistor
export const persistor = persistStore(store, null, () => {
  console.log("Redux store rehydrated successfully");
});

// 🛠 Helpers
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const resetStore = () => {
  persistor.purge();
  store.dispatch({ type: "RESET_STORE" });
};

// 📌 Selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectWorkspace = (state: RootState) => state.workspace;
export const selectUI = (state: RootState) => state.ui;

export default store;
