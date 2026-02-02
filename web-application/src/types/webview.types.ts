// File: web-application/src/types/webview.types.ts

import { DateRange } from '@/types/index'; // Import the missing DateRange type

export interface WebviewConfig {
  id: string;
  workspace_id: string;
  webview_name: string;
  display_name: string;
  description?: string;
  theme_config: WebviewTheme;
  navigation_config: NavigationConfig;
  branding_config: BrandingConfig;
  default_category_id?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WebviewTheme {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  sidebar_style: 'light' | 'dark';
  navbar_style: 'light' | 'dark';
  font_family?: string;
  logo_url?: string;
}

export interface NavigationConfig {
  default_expanded_categories: string[];
  show_dashboard_thumbnails: boolean;
  show_view_counts: boolean;
  show_last_accessed: boolean;
  enable_search: boolean;
  enable_favorites: boolean;
  sidebar_width: number;
}

export interface BrandingConfig {
  company_name: string;
  company_logo: string;
  favicon_url: string;
  custom_css?: string;
  footer_text?: string;
  show_powered_by?: boolean;
}

export interface NavigationState {
  expandedCategories: Set<string>;
  selectedDashboard?: string;
  searchQuery: string;
  activeFilters: {
    categories: string[];
    tags: string[];
    lastAccessed?: DateRange; // Now properly imported
  };
  viewMode: 'list' | 'grid' | 'compact';
  sortOrder: 'name' | 'last_accessed' | 'view_count' | 'created_at';
}

export interface WebviewAnalyticsEvent {
  event_type: 'category_view' | 'category_expand' | 'category_collapse' | 
             'dashboard_select' | 'dashboard_view' | 'search' | 'filter';
  webview_id: string;
  category_id?: string;
  dashboard_id?: string;
  search_query?: string;
  filter_details?: Record<string, any>;
  navigation_path: string[];
  device_info: {
    type: 'desktop' | 'tablet' | 'mobile';
    screen_resolution: string;
    browser: string;
  };
  session_id: string;
  timestamp: Date;
  duration_ms?: number;
}