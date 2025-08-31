// ./src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authReducer from './slices/authSlice';
import workspaceReducer from './slices/workspaceSlice';
import uiReducer from './slices/uiSlice';
import webviewReducer from './slices/webviewSlice';

// Import API slices
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { webviewApi } from './api/webviewApi';

// Simple persist config for root reducer
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'workspace'], // Only persist auth and workspace state
  blacklist: ['ui', 'webview', 'authApi', 'userApi', 'webviewApi'] // Don't persist UI state or API cache
};

// Root reducer
const rootReducer = combineReducers({
  auth: authReducer,
  workspace: workspaceReducer,
  ui: uiReducer,
  webview: webviewReducer, // Add webview reducer
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [webviewApi.reducerPath]: webviewApi.reducer,
});

// Apply persistence to the root reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }).concat(authApi.middleware, userApi.middleware, webviewApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create and export persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;