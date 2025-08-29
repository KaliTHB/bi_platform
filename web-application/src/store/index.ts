// File: web-application/src/store/index.ts

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import all slices
import authSlice from './slices/authSlice';
import workspaceSlice from './slices/workspaceSlice';
import permissionSlice from './slices/permissionSlice';
import datasetSlice from './slices/datasetSlice';
import dashboardSlice from './slices/dashboardSlice';
import chartSlice from './slices/chartSlice';
import webviewSlice from './slices/webviewSlice';
import categorySlice from './slices/categorySlice';
import uiSlice from './slices/uiSlice';

// Import API slices
import { baseApi } from './api/baseApi';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'workspace', 'ui'], // Only persist these slices
  blacklist: ['api'] // Don't persist API data
};

const rootReducer = combineReducers({
  auth: authSlice,
  workspace: workspaceSlice,
  permission: permissionSlice,
  dataset: datasetSlice,
  dashboard: dashboardSlice,
  chart: chartSlice,
  webview: webviewSlice,
  category: categorySlice,
  ui: uiSlice,
  [baseApi.reducerPath]: baseApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(baseApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;