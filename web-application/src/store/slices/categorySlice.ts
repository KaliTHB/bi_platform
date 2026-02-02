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
  initialState: initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<any[]>) => {
      state.categories = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setCategories } = categorySlice.actions;
export default categorySlice.reducer;

