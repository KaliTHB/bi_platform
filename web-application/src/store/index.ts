import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import workspaceSlice from './slices/workspaceSlice';
import permissionSlice from './slices/permissionSlice';
import { baseApi } from './api/baseApi';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'workspace'], // Only persist auth and workspace
};

const rootReducer = combineReducers({
  auth: authSlice,
  workspace: workspaceSlice,
  permission: permissionSlice,
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
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;