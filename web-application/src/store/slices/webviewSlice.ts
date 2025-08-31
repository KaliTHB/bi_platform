// File: web-application/src/store/slices/webviewSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
      state.expandedCategories = action.payload;
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
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearNavigation: (state) => {
      state.expandedCategories = [];
      state.selectedDashboard = undefined;
      state.searchQuery = '';
    },
  },
});

export const {
  setExpandedCategories,
  toggleCategory,
  selectDashboard: selectDashboardAction,
  setSearchQuery,
  clearNavigation,
} = webviewSlice.actions;

export default webviewSlice.reducer;