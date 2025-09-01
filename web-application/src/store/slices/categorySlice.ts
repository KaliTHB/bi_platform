// src/store/slices/categorySlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
    
    clearError: (state) => {
      state.error = null;
    },
    
    setCategories: (state, action: PayloadAction<DashboardCategory[]>) => {
      state.categories = castDraft(action.payload);
    },
    
    setCategoriesWithDashboards: (state, action: PayloadAction<CategoryWithDashboards[]>) => {
      state.categoriesWithDashboards = castDraft(action.payload);
    },
    
    setCurrentCategory: (state, action: PayloadAction<DashboardCategory | null>) => {
      state.currentCategory = action.payload ? castDraft(action.payload) : null;
    },
    
    addCategory: (state, action: PayloadAction<DashboardCategory>) => {
      state.categories.push(castDraft(action.payload));
    },
    
    updateCategory: (state, action: PayloadAction<DashboardCategory>) => {
      const index = state.categories.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categories[index] = castDraft(action.payload);
      }
      
      // Update current category if it's the same one
      if (state.currentCategory?.id === action.payload.id) {
        state.currentCategory = castDraft(action.payload);
      }
    },
    
    removeCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(c => c.id !== action.payload);
      state.categoriesWithDashboards = state.categoriesWithDashboards.filter(c => c.id !== action.payload);
      
      // Clear current category if it's the deleted one
      if (state.currentCategory?.id === action.payload) {
        state.currentCategory = null;
      }
    },
    
    clearCategories: (state) => {
      state.categories = [];
      state.categoriesWithDashboards = [];
      state.currentCategory = null;
    },
    
    // Additional category operations for categories with dashboards
    updateCategoryWithDashboards: (state, action: PayloadAction<CategoryWithDashboards>) => {
      const index = state.categoriesWithDashboards.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.categoriesWithDashboards[index] = castDraft(action.payload);
      }
    },
    
    addCategoryWithDashboards: (state, action: PayloadAction<CategoryWithDashboards>) => {
      state.categoriesWithDashboards.push(castDraft(action.payload));
    },
    
    removeCategoryWithDashboards: (state, action: PayloadAction<string>) => {
      state.categoriesWithDashboards = state.categoriesWithDashboards.filter(c => c.id !== action.payload);
    },
    
    // Update dashboard count for a specific category
    updateCategoryDashboardCount: (state, action: PayloadAction<{ categoryId: string; count: number }>) => {
      const category = state.categoriesWithDashboards.find(c => c.id === action.payload.categoryId);
      if (category) {
        category.dashboard_count = action.payload.count;
      }
    },
    
    // Bulk operations
    updateMultipleCategories: (state, action: PayloadAction<DashboardCategory[]>) => {
      action.payload.forEach(updatedCategory => {
        const index = state.categories.findIndex(c => c.id === updatedCategory.id);
        if (index !== -1) {
          state.categories[index] = castDraft(updatedCategory);
        }
      });
    },
    
    // Add multiple categories
    addMultipleCategories: (state, action: PayloadAction<DashboardCategory[]>) => {
      const newCategories = action.payload.filter(
        newCat => !state.categories.some(existingCat => existingCat.id === newCat.id)
      );
      state.categories.push(...castDraft(newCategories));
    },
    
    // Reorder categories
    reorderCategories: (state, action: PayloadAction<{ categoryId: string; newSortOrder: number }[]>) => {
      action.payload.forEach(({ categoryId, newSortOrder }) => {
        const category = state.categories.find(c => c.id === categoryId);
        if (category) {
          category.sort_order = newSortOrder;
        }
        
        const categoryWithDashboards = state.categoriesWithDashboards.find(c => c.id === categoryId);
        if (categoryWithDashboards) {
          categoryWithDashboards.sort_order = newSortOrder;
        }
      });
      
      // Sort categories by their new order
      state.categories.sort((a, b) => a.sort_order - b.sort_order);
      state.categoriesWithDashboards.sort((a, b) => a.sort_order - b.sort_order);
    },
    
    // Toggle category active status
    toggleCategoryStatus: (state, action: PayloadAction<string>) => {
      const category = state.categories.find(c => c.id === action.payload);
      if (category) {
        category.is_active = !category.is_active;
      }
      
      const categoryWithDashboards = state.categoriesWithDashboards.find(c => c.id === action.payload);
      if (categoryWithDashboards) {
        categoryWithDashboards.is_active = !categoryWithDashboards.is_active;
      }
    },
    
    resetCategoryState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setCategories,
  setCategoriesWithDashboards,
  setCurrentCategory,
  addCategory,
  updateCategory,
  removeCategory,
  clearCategories,
  updateCategoryWithDashboards,
  addCategoryWithDashboards,
  removeCategoryWithDashboards,
  updateCategoryDashboardCount,
  updateMultipleCategories,
  addMultipleCategories,
  reorderCategories,
  toggleCategoryStatus,
  resetCategoryState,
} = categorySlice.actions;

export default categorySlice.reducer;