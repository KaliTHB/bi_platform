// File: web-application/src/hooks/useWebview.ts
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { RootState } from '../store';
import { webviewApi } from '../store/api/webviewApi';
import { setExpandedCategories, selectDashboard as selectDashboardAction } from '../store/slices/webviewSlice';

export interface NavigationState {
  expandedCategories: Set<string>;
  selectedDashboard?: string;
  searchQuery: string;
}

export const useWebview = (webviewName: string) => {
  const dispatch = useAppDispatch();
  const navigationState = useAppSelector((state: RootState) => state.webview);

  // RTK Query hooks
  const {
    data: webviewData,
    isLoading: loading,
    error
  } = webviewApi.useGetWebviewConfigQuery(webviewName);

  const {
    data: categoriesData,
    isLoading: categoriesLoading
  } = webviewApi.useGetWebviewCategoriesQuery(webviewName);

  const [trackAnalytics] = webviewApi.useTrackWebviewAnalyticsMutation();

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(navigationState.expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
      trackAnalytics({
        webviewName,
        event: {
          event_type: 'category_collapse',
          category_id: categoryId,
          navigation_path: [],
          session_id: sessionStorage.getItem('sessionId') || '',
          device_info: {
            type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            browser: navigator.userAgent
          },
          timestamp: new Date()
        }
      });
    } else {
      newExpanded.add(categoryId);
      trackAnalytics({
        webviewName,
        event: {
          event_type: 'category_expand',
          category_id: categoryId,
          navigation_path: [],
          session_id: sessionStorage.getItem('sessionId') || '',
          device_info: {
            type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            browser: navigator.userAgent
          },
          timestamp: new Date()
        }
      });
    }
    
    dispatch(setExpandedCategories(Array.from(newExpanded)));
  };

  const selectDashboard = (dashboardId: string) => {
    dispatch(selectDashboardAction(dashboardId));
    
    trackAnalytics({
      webviewName,
      event: {
        event_type: 'dashboard_select',
        dashboard_id: dashboardId,
        navigation_path: [],
        session_id: sessionStorage.getItem('sessionId') || '',
        device_info: {
          type: window.innerWidth < 768 ? 'mobile' : 'desktop',
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          browser: navigator.userAgent
        },
        timestamp: new Date()
      }
    });
  };

  return {
    webviewConfig: webviewData?.webview_config,
    categories: categoriesData || [],
    navigationState: {
      expandedCategories: new Set(navigationState.expandedCategories),
      selectedDashboard: navigationState.selectedDashboard,
      searchQuery: navigationState.searchQuery
    },
    toggleCategory,
    selectDashboard,
    loading: loading || categoriesLoading,
    error: error ? 'Failed to load webview configuration' : null
  };
};