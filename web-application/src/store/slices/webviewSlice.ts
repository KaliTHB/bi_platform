// File: web-application/src/store/slices/webviewSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WebviewConfig, CategoryWithDashboards, NavigationState } from '../../types';

interface WebviewState {
  currentWebview: WebviewConfig | null;
  categories: CategoryWithDashboards[];
  navigationState: NavigationState;
  loading: boolean;
  error: string | null;
}

const initialNavigationState: NavigationState = {
  expandedCategories: new Set<string>(),
  selectedDashboard: undefined,
  searchQuery: '',
  activeFilters: {
    categories: [],
    tags: [],
  },
  viewMode: 'list',
  sortOrder: 'name',
};

const initialState: WebviewState = {
  currentWebview: null,
  categories: [],
  navigationState: initialNavigationState,
  loading: false,
  error: null,
};

const webviewSlice = createSlice({
  name: 'webview',
  initialState,
  reducers: {
    setCurrentWebview: (state, action: PayloadAction<WebviewConfig>) => {
      state.currentWebview = action.payload;
    },
    setCategories: (state, action: PayloadAction<CategoryWithDashboards[]>) => {
      state.categories = action.payload;
    },
    updateNavigationState: (state, action: PayloadAction<Partial<NavigationState>>) => {
      state.navigationState = { ...state.navigationState, ...action.payload };
    },
    toggleCategory: (state, action: PayloadAction<string>) => {
      const categoryId = action.payload;
      const expanded = new Set(state.navigationState.expandedCategories);
      
      if (expanded.has(categoryId)) {
        expanded.delete(categoryId);
      } else {
        expanded.add(categoryId);
      }
      
      state.navigationState.expandedCategories = expanded;
    },
    setSelectedDashboard: (state, action: PayloadAction<string | undefined>) => {
      state.navigationState.selectedDashboard = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.navigationState.searchQuery = action.payload;
    },
    setActiveFilters: (state, action: PayloadAction<NavigationState['activeFilters']>) => {
      state.navigationState.activeFilters = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetWebviewState: (state) => {
      state.currentWebview = null;
      state.categories = [];
      state.navigationState = initialNavigationState;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setCurrentWebview,
  setCategories,
  updateNavigationState,
  toggleCategory,
  setSelectedDashboard,
  setSearchQuery,
  setActiveFilters,
  setLoading,
  setError,
  resetWebviewState,
} = webviewSlice.actions;

export default webviewSlice.reducer;