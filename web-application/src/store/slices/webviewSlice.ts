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


const initialWebviewState: WebviewState = {
  webviews: [],
  currentWebview: null,
  isLoading: false,
  error: null,
};

const webviewSlice = createSlice({
  name: 'webview',
  initialState: initialWebviewState,
  reducers: {
    setWebviews: (state, action: PayloadAction<any[]>) => {
      state.webviews = action.payload;
    },
    setCurrentWebview: (state, action: PayloadAction<any | null>) => {
      state.currentWebview = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setWebviews, setCurrentWebview } = webviewSlice.actions;
export default webviewSlice.reducer;