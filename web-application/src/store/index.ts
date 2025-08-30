// File: ./src/store/index.ts

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { userApi } from './api/userApi';

// Import other API slices as they're created
// import { dashboardApi } from './api/dashboardApi';
// import { datasetApi } from './api/datasetApi';
// import { workspaceApi } from './api/workspaceApi';

// Import regular reducers
// import authReducer from './slices/authSlice';
// import workspaceReducer from './slices/workspaceSlice';
// import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    // API reducers
    [userApi.reducerPath]: userApi.reducer,
    // [dashboardApi.reducerPath]: dashboardApi.reducer,
    // [datasetApi.reducerPath]: datasetApi.reducer,
    // [workspaceApi.reducerPath]: workspaceApi.reducer,
    
    // Regular reducers
    // auth: authReducer,
    // workspace: workspaceReducer,
    // ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore these action types
          'persist/FLUSH',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PERSIST',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }).concat(
      // Add API middleware
      userApi.middleware,
      // dashboardApi.middleware,
      // datasetApi.middleware,
      // workspaceApi.middleware,
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup RTK Query listeners
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;