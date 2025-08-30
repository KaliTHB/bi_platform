import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './api/baseApi';
import authSlice from './slices/authSlice';
import workspaceSlice from './slices/workspaceSlice';
import datasetSlice from './slices/datasetSlice';
import dashboardSlice from './slices/dashboardSlice';
import chartSlice from './slices/chartSlice';
import webviewSlice from './slices/webviewSlice';
import categorySlice from './slices/categorySlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authSlice,
    workspace: workspaceSlice,
    dataset: datasetSlice,
    dashboard: dashboardSlice,
    chart: chartSlice,
    webview: webviewSlice,
    category: categorySlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [baseApi.util.resetApiState.type],
      },
    }).concat(baseApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;