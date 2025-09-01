// web-application/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slice reducers (default exports)
import authReducer from './slices/authSlice';
import workspaceReducer from './slices/workspaceSlice';
import dashboardReducer from './slices/dashboardSlice';
import datasetReducer from './slices/datasetSlice';
import categoryReducer from './slices/categorySlice';
import uiReducer from './slices/uiSlice';
import webviewReducer from './slices/webviewSlice';

// Import RTK Query APIs
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { workspaceApi } from './api/workspaceApi';
import { dashboardApi } from './api/dashboardApi';
import { datasetApi } from './api/datasetApi';
import { categoryApi } from './api/categoryApi';
import { webviewApi } from './api/webviewApi';

// Persistence configuration
const persistConfig = {
  key: 'root',
  storage,
  version: 1,
  whitelist: ['auth', 'workspace'], // Only persist auth and workspace state
  blacklist: [
    'ui', 
    'webview', 
    'dashboard',
    'dataset',
    'category',
    // RTK Query API slices (these have their own caching)
    authApi.reducerPath,
    userApi.reducerPath,
    workspaceApi.reducerPath,
    dashboardApi.reducerPath,
    datasetApi.reducerPath,
    categoryApi.reducerPath,
    webviewApi.reducerPath
  ]
};

// Individual slice persistence configurations (more granular control)
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'isAuthenticated', 'workspace', 'permissions']
};

const workspacePersistConfig = {
  key: 'workspace', 
  storage,
  whitelist: ['currentWorkspace', 'workspaces', 'lastSwitched']
};

// Root reducer with all slices
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
  
  // RTK Query API slices
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [workspaceApi.reducerPath]: workspaceApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  [datasetApi.reducerPath]: datasetApi.reducer,
  [categoryApi.reducerPath]: categoryApi.reducer,
  [webviewApi.reducerPath]: webviewApi.reducer,
});

// Configure the Redux store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
        // Ignore paths that may contain non-serializable values
        ignoredPaths: [
          'persist',
          '_persist',
          'register',
          'rehydrate',
        ],
      },
      // Increase timeout for large state hydration
      immutableCheck: {
        warnAfter: 128,
      },
      serializableStateInvariantMiddleware: {
        warnAfter: 128,
      },
    }).concat([
      // Add RTK Query middleware
      authApi.middleware,
      userApi.middleware,
      workspaceApi.middleware,
      dashboardApi.middleware,
      datasetApi.middleware,
      categoryApi.middleware,
      webviewApi.middleware,
    ]),
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState: undefined, // Can be used for SSR hydration
});

// Create persistor for redux-persist
export const persistor = persistStore(store, {
  // Optional callback when rehydration is complete
  // callback: () => {
  //   console.log('Store rehydration complete');
  // }
});

// TypeScript types for the store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Store setup completion indicator
export const storeReady = new Promise<void>((resolve) => {
  const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    // Check if persistence has been restored
    if ((state as any)._persist?.rehydrated) {
      resolve();
      unsubscribe();
    }
  });
});

// Helper function to reset store (useful for logout)
export const resetStore = () => {
  persistor.purge();
  store.dispatch({ type: 'RESET_STORE' });
};

// Export selectors for common state access
export const selectAuth = (state: RootState) => state.auth;
export const selectWorkspace = (state: RootState) => state.workspace;
export const selectUI = (state: RootState) => state.ui;

export default store;