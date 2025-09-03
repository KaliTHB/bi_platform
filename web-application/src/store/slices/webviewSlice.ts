// ===============================================

// web-application/src/store/slices/webviewSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Webview {
  id: string;
  name: string;
  webview_name: string;
  title: string;
  description?: string;
  workspace_id: string;
  theme: 'light' | 'dark' | 'auto';
  is_public: boolean;
  settings?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebviewState {
  webviews: Webview[];
  current: Webview | null;
  isLoading: boolean;
  error: string | null;
  publicWebview: Webview | null;
}

const initialState: WebviewState = {
  webviews: [],
  current: null,
  isLoading: false,
  error: null,
  publicWebview: null,
};

const webviewSlice = createSlice({
  name: 'webview',
  initialState,
  reducers: {
    setWebviews: (state, action: PayloadAction<Webview[]>) => {
      state.webviews = action.payload;
    },
    setCurrentWebview: (state, action: PayloadAction<Webview | null>) => {
      state.current = action.payload;
    },
    setPublicWebview: (state, action: PayloadAction<Webview | null>) => {
      state.publicWebview = action.payload;
    },
    addWebview: (state, action: PayloadAction<Webview>) => {
      state.webviews.push(action.payload);
    },
    updateWebview: (state, action: PayloadAction<Webview>) => {
      const index = state.webviews.findIndex(w => w.id === action.payload.id);
      if (index !== -1) {
        state.webviews[index] = action.payload;
      }
      if (state.current?.id === action.payload.id) {
        state.current = action.payload;
      }
      if (state.publicWebview?.id === action.payload.id) {
        state.publicWebview = action.payload;
      }
    },
    removeWebview: (state, action: PayloadAction<string>) => {
      state.webviews = state.webviews.filter(w => w.id !== action.payload);
      if (state.current?.id === action.payload) {
        state.current = null;
      }
      if (state.publicWebview?.id === action.payload) {
        state.publicWebview = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearWebviews: (state) => {
      state.webviews = [];
      state.current = null;
      state.publicWebview = null;
      state.error = null;
    },
  },
});

export const {
  setWebviews,
  setCurrentWebview,
  setPublicWebview,
  addWebview,
  updateWebview,
  removeWebview,
  setLoading,
  setError,
  clearWebviews,
} = webviewSlice.actions;

export default webviewSlice.reducer;