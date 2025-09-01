// File: web-application/src/hooks/useWebview.ts
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux'; // Fixed import path
import { RootState } from '../store';
import { webviewApi } from '../store/api/webviewApi';
import { 
  setExpandedCategories, 
  selectDashboardAction,
  setSearchQuery 
} from '../store/slices/webviewSlice';

export interface NavigationState {
  expandedCategories: Set<string>;
  selectedDashboard?: string;
  searchQuery: string;
}

export const useWebview = (webviewName: string) => {
  const dispatch = useAppDispatch();
  const webviewState = useAppSelector((state: RootState) => state.webview);
  
  // Get workspace from Redux state (it's stored in auth slice)
  const workspace = useAppSelector((state: RootState) => state.auth.workspace);
  const workspaceId = workspace?.id || '';

  // RTK Query hooks with correct names and parameters
  const {
    data: webviewData,
    isLoading: webviewLoading,
    error: webviewError
  } = webviewApi.useGetWebviewByNameQuery({
    workspaceId,
    webviewName
  }, {
    skip: !workspaceId || !webviewName
  });

  // Get navigation data (includes categories, favorites, recent dashboards)
  const {
    data: navigationData,
    isLoading: navigationLoading,
    error: navigationError
  } = webviewApi.useGetWebviewNavigationQuery({
    webviewId: webviewData?.data?.id || '',
    workspaceId
  }, {
    skip: !webviewData?.data?.id || !workspaceId
  });

  // Correct hook name for tracking events
  const [trackWebviewEvent] = webviewApi.useTrackWebviewEventMutation();

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(webviewState.expandedCategories);
    const isExpanding = !newExpanded.has(categoryId);
    
    if (isExpanding) {
      newExpanded.add(categoryId);
    } else {
      newExpanded.delete(categoryId);
    }
    
    dispatch(setExpandedCategories(Array.from(newExpanded)));

    // Track analytics with correct parameter structure
    if (webviewData?.data?.id) {
      trackWebviewEvent({
        webview_id: webviewData.data.id,
        event_type: isExpanding ? 'category_expand' : 'category_collapse',
        category_id: categoryId,
        metadata: {
          session_id: sessionStorage.getItem('sessionId') || '',
          device_info: {
            type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            browser: navigator.userAgent
          },
          timestamp: Date.now().toISOString()
        }
      });
    }
  };

  const selectDashboard = (dashboardId: string) => {
    dispatch(selectDashboardAction(dashboardId));
    
    // Track analytics
    if (webviewData?.data?.id) {
      trackWebviewEvent({
        webview_id: webviewData.data.id,
        event_type: 'dashboard_select',
        dashboard_id: dashboardId,
        metadata: {
          session_id: sessionStorage.getItem('sessionId') || '',
          device_info: {
            type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            browser: navigator.userAgent
          },
          timestamp: Date.now().toISOString()
        }
      });
    }
  };

  const handleSearchChange = (query: string) => {
    dispatch(setSearchQuery(query));
    
    // Track search analytics if query is not empty
    if (query.trim() && webviewData?.data?.id) {
      trackWebviewEvent({
        webview_id: webviewData.data.id,
        event_type: 'search',
        search_query: query,
        metadata: {
          session_id: sessionStorage.getItem('sessionId') || '',
          device_info: {
            type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            browser: navigator.userAgent
          },
          timestamp: Date.now().toISOString()
        }
      });
    }
  };

  const loading = webviewLoading || navigationLoading;
  const error = webviewError || navigationError;
  
  // Format error message
  const errorMessage = error 
    ? 'Failed to load webview configuration' 
    : null;

  return {
    webviewConfig: webviewData?.data || navigationData?.webview_config,
    categories: navigationData?.categories || [],
    userFavorites: navigationData?.user_favorites || [],
    recentDashboards: navigationData?.recent_dashboards || [],
    navigationState: {
      expandedCategories: new Set(webviewState.expandedCategories),
      selectedDashboard: webviewState.selectedDashboard,
      searchQuery: webviewState.searchQuery
    },
    toggleCategory,
    selectDashboard,
    handleSearchChange,
    loading,
    error: errorMessage
  };
};