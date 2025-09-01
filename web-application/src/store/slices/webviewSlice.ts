// src/store/slices/webviewSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { castDraft } from "immer";

export interface WebviewNavigationState {
  expandedCategories: string[];
  selectedDashboard?: string;
  searchQuery: string;
}

const initialState: WebviewNavigationState = {
  expandedCategories: [],
  selectedDashboard: undefined,
  searchQuery: '',
};

const webviewSlice = createSlice({
  name: 'webview',
  initialState,
  reducers: {
    setExpandedCategories: (state, action: PayloadAction<string[]>) => {
      state.expandedCategories = castDraft(action.payload);
    },
    
    toggleCategory: (state, action: PayloadAction<string>) => {
      const categoryId = action.payload;
      const index = state.expandedCategories.indexOf(categoryId);
      
      if (index >= 0) {
        state.expandedCategories.splice(index, 1);
      } else {
        state.expandedCategories.push(categoryId);
      }
    },
    
    selectDashboard: (state, action: PayloadAction<string>) => {
      state.selectedDashboard = action.payload;
    },
    
    clearSelectedDashboard: (state) => {
      state.selectedDashboard = undefined;
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    clearSearchQuery: (state) => {
      state.searchQuery = '';
    },
    
    clearNavigation: (state) => {
      state.expandedCategories = [];
      state.selectedDashboard = undefined;
      state.searchQuery = '';
    },
    
    // Additional operations for bulk updates
    addExpandedCategory: (state, action: PayloadAction<string>) => {
      if (!state.expandedCategories.includes(action.payload)) {
        state.expandedCategories.push(action.payload);
      }
    },
    
    removeExpandedCategory: (state, action: PayloadAction<string>) => {
      state.expandedCategories = state.expandedCategories.filter(id => id !== action.payload);
    },
    
    // Expand multiple categories at once
    expandCategories: (state, action: PayloadAction<string[]>) => {
      const newCategories = action.payload.filter(id => !state.expandedCategories.includes(id));
      state.expandedCategories.push(...newCategories);
    },
    
    // Collapse multiple categories at once  
    collapseCategories: (state, action: PayloadAction<string[]>) => {
      const categoriesToCollapse = new Set(action.payload);
      state.expandedCategories = state.expandedCategories.filter(id => !categoriesToCollapse.has(id));
    },
    
    // Expand all categories
    expandAllCategories: (state, action: PayloadAction<string[]>) => {
      state.expandedCategories = castDraft([...new Set([...state.expandedCategories, ...action.payload])]);
    },
    
    // Collapse all categories
    collapseAllCategories: (state) => {
      state.expandedCategories = [];
    },
    
    // Bulk state updates
    setNavigationState: (state, action: PayloadAction<Partial<WebviewNavigationState>>) => {
      if (action.payload.expandedCategories !== undefined) {
        state.expandedCategories = castDraft(action.payload.expandedCategories);
      }
      if (action.payload.selectedDashboard !== undefined) {
        state.selectedDashboard = action.payload.selectedDashboard;
      }
      if (action.payload.searchQuery !== undefined) {
        state.searchQuery = action.payload.searchQuery;
      }
    },
    
    // Navigate to dashboard with category expansion
    navigateToDashboard: (state, action: PayloadAction<{ dashboardId: string; categoryId?: string }>) => {
      state.selectedDashboard = action.payload.dashboardId;
      
      // Auto-expand category if provided
      if (action.payload.categoryId && !state.expandedCategories.includes(action.payload.categoryId)) {
        state.expandedCategories.push(action.payload.categoryId);
      }
      
      // Clear search when navigating directly
      state.searchQuery = '';
    },
    
    resetWebviewState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setExpandedCategories,
  toggleCategory,
  selectDashboard: selectDashboardAction,
  clearSelectedDashboard,
  setSearchQuery,
  clearSearchQuery,
  clearNavigation,
  addExpandedCategory,
  removeExpandedCategory,
  expandCategories,
  collapseCategories,
  expandAllCategories,
  collapseAllCategories,
  setNavigationState,
  navigateToDashboard,
  resetWebviewState,
} = webviewSlice.actions;

export default webviewSlice.reducer;