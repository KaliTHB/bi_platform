// Complete fixed version of your categorySlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ✅ Add castDraft import
import { DashboardCategory, CategoryWithDashboards } from '../../types';
import { castDraft } from "immer";

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
      state.categories = castDraft(action.payload); // ✅ FIXED
    },
    setCategoriesWithDashboards: (state, action: PayloadAction<CategoryWithDashboards[]>) => {
  state.categoriesWithDashboards = castDraft(action.payload);
},
    setCurrentCategory: (state, action: PayloadAction<DashboardCategory | null>) => {
      state.currentCategory = action.payload ? castDraft(action.payload) : null; // ✅ FIXED
    },
    addCategory: (state, action: PayloadAction<DashboardCategory>) => {
      state.categories.push(castDraft(action.payload)); // ✅ FIXED
    },
    updateCategory: (state, action: PayloadAction<DashboardCategory>) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = castDraft(action.payload); // ✅ FIXED
      }
    },
    removeCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
      state.categoriesWithDashboards = state.categoriesWithDashboards.filter(c => c.id !== action.payload);
      // ✅ Filter operations work fine as they create new arrays
    },
    clearCategories: (state) => {
      state.categories = [];
      state.categoriesWithDashboards = [];
      state.currentCategory = null;
      // ✅ Direct assignment of primitives and empty arrays works fine
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