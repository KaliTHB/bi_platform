// ===============================================

// web-application/src/store/slices/categorySlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  dashboard_count: number;
  workspace_id: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryState {
  categories: Category[];
  current: Category | null;
  webviewCategories: { [webviewId: string]: Category[] };
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  current: null,
  webviewCategories: {},
  isLoading: false,
  error: null,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },
    setCurrentCategory: (state, action: PayloadAction<Category | null>) => {
      state.current = action.payload;
    },
    setWebviewCategories: (state, action: PayloadAction<{ webviewId: string; categories: Category[] }>) => {
      state.webviewCategories[action.payload.webviewId] = action.payload.categories;
    },
    addCategory: (state, action: PayloadAction<Category>) => {
      state.categories.push(action.payload);
    },
    updateCategory: (state, action: PayloadAction<Category>) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
      if (state.current?.id === action.payload.id) {
        state.current = action.payload;
      }
      // Update in webview categories
      Object.keys(state.webviewCategories).forEach(webviewId => {
        const webviewIndex = state.webviewCategories[webviewId].findIndex(
          c => c.id === action.payload.id
        );
        if (webviewIndex !== -1) {
          state.webviewCategories[webviewId][webviewIndex] = action.payload;
        }
      });
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
      if (state.current?.id === action.payload) {
        state.current = null;
      }
      // Remove from webview categories
      Object.keys(state.webviewCategories).forEach(webviewId => {
        state.webviewCategories[webviewId] = state.webviewCategories[webviewId].filter(
          c => c.id !== action.payload
        );
      });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearCategories: (state) => {
      state.categories = [];
      state.current = null;
      state.webviewCategories = {};
      state.error = null;
    },
  },
});

export const {
  setCategories,
  setCurrentCategory,
  setWebviewCategories,
  addCategory,
  updateCategory,
  removeCategory,
  setLoading,
  setError,
  clearCategories,
} = categorySlice.actions;

export default categorySlice.reducer;