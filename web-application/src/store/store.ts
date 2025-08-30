# web-application/src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slices
import authSlice from './slices/authSlice';
import workspaceSlice from './slices/workspaceSlice';
import dashboardSlice from './slices/dashboardSlice';
import datasetSlice from './slices/datasetSlice';
import uiSlice from './slices/uiSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'workspace'], // Only persist auth and workspace state
  blacklist: ['ui'] // Don't persist UI state
};

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'isAuthenticated']
};

const workspacePersistConfig = {
  key: 'workspace',
  storage,
  whitelist: ['currentWorkspace', 'workspaces']
};

// Root reducer
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authSlice),
  workspace: persistReducer(workspacePersistConfig, workspaceSlice),
  dashboard: dashboardSlice,
  dataset: datasetSlice,
  ui: uiSlice,
});

// Configure store
export const store = configureStore({
  reducer: rootReducer,
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
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;