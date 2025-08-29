// File: web-application/src/store/slices/categorySlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DashboardCategory, CategoryWithDashboards } from '../../types';

interface CategoryState {
  categories: DashboardCategory[];
  categoriesWithDashboards: CategoryWithDashboards[];
  currentCategory: DashboardCategory | null;
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  categoriesWithDashboards: [],
  currentCategory: null,
  loading: false,
  error: null,
};

const categorySlice = createSlice({
  name: 'category',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCategories: (state, action: PayloadAction<DashboardCategory[]>) => {
      state.categories = action.payload;
    },
    setCategoriesWithDashboards: (state, action: PayloadAction<CategoryWithDashboards[]>) => {
      state.categoriesWithDashboards = action.payload;
    },
    setCurrentCategory: (state, action: PayloadAction<DashboardCategory | null>) => {
      state.currentCategory = action.payload;
    },
    addCategory: (state, action: PayloadAction<DashboardCategory>) => {
      state.categories.push(action.payload);
    },
    updateCategory: (state, action: PayloadAction<DashboardCategory>) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = action.payload;
      }
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
      state.categoriesWithDashboards = state.categoriesWithDashboards.filter(c => c.id !== action.payload);
    },
    clearCategories: (state) => {
      state.categories = [];
      state.categoriesWithDashboards = [];
      state.currentCategory = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setCategories,
  setCategoriesWithDashboards,
  setCurrentCategory,
  addCategory,
  updateCategory,
  removeCategory,
  clearCategories,
} = categorySlice.actions;

export default categorySlice.reducer;