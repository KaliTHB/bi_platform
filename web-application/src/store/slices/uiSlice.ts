// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { castDraft } from "immer";

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  modals: {
    [key: string]: {
      open: boolean;
      data?: any;
    };
  };
  loading: {
    [key: string]: boolean;
  };
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  autoHide?: boolean;
  duration?: number;
}

const initialState: UIState = {
  sidebarOpen: true,
  theme: 'light',
  notifications: [],
  modals: {},
  loading: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: Date.now(),
        read: false,
      };
      state.notifications.unshift(castDraft(notification));
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    openModal: (state, action: PayloadAction<{ key: string; data?: any }>) => {
      state.modals[action.payload.key] = castDraft({
        open: true,
        data: action.payload.data,
      });
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].open = false;
      }
    },
    
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
    
    // Bulk notification operations
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = castDraft(action.payload);
    },
    
    // Mark all notifications as read
    markAllNotificationsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.read = true;
      });
    },
    
    // Remove read notifications
    removeReadNotifications: (state) => {
      state.notifications = state.notifications.filter(n => !n.read);
    },
    
    // Bulk modal operations  
    setModals: (state, action: PayloadAction<UIState['modals']>) => {
      state.modals = castDraft(action.payload);
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(key => {
        state.modals[key].open = false;
      });
    },
    
    // Loading state helpers
    setMultipleLoading: (state, action: PayloadAction<Record<string, boolean>>) => {
      Object.entries(action.payload).forEach(([key, loading]) => {
        state.loading[key] = loading;
      });
    },
    
    clearAllLoading: (state) => {
      state.loading = {};
    },
    
    // Reset UI state
    resetUIState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  addNotification,
  markNotificationRead,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  setLoading,
  setNotifications,
  markAllNotificationsRead,
  removeReadNotifications,
  setModals,
  closeAllModals,
  setMultipleLoading,
  clearAllLoading,
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;