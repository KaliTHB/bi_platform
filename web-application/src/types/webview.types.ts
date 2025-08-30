// File: ./src/types/webview.ts

import { BaseEntity, WorkspaceScopedEntity, ConfigurableEntity } from './common';

export interface Webview extends BaseEntity, WorkspaceScopedEntity, ConfigurableEntity {
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  favicon_url?: string;
  theme_config: WebviewTheme;
  navigation_config: WebviewNavigation;
  is_public: boolean;
  is_active: boolean;
  custom_domain?: string;
  custom_css?: string;
  custom_js?: string;
  meta_tags?: Record<string, string>;
  analytics_config?: WebviewAnalytics;
  access_control: WebviewAccessControl;
}

export interface WebviewTheme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  font_family: string;
  font_size_base: number;
  border_radius: number;
  spacing_unit: number;
  dark_mode_enabled: boolean;
  custom_css?: string;
}

export interface WebviewNavigation {
  layout: 'sidebar' | 'top' | 'both';
  show_logo: boolean;
  show_search: boolean;
  show_breadcrumbs: boolean;
  categories: WebviewCategory[];
  featured_dashboards?: string[];
  footer_links?: WebviewLink[];
}

export interface WebviewCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  dashboard_ids: string[];
  sort_order: number;
  is_visible: boolean;
}

export interface WebviewLink {
  text: string;
  url: string;
  icon?: string;
  external?: boolean;
  new_tab?: boolean;
}

export interface WebviewAnalytics {
  enabled: boolean;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  custom_tracking_code?: string;
  track_page_views: boolean;
  track_dashboard_views: boolean;
  track_chart_interactions: boolean;
  track_exports: boolean;
}

export interface WebviewAccessControl {
  type: 'public' | 'private' | 'password' | 'whitelist';
  password?: string;
  allowed_domains?: string[];
  allowed_ips?: string[];
  require_authentication: boolean;
  allowed_roles?: string[];
  session_timeout?: number;
}

export interface WebviewDashboard {
  dashboard_id: string;
  category_id?: string;
  sort_order: number;
  is_featured: boolean;
  is_visible: boolean;
  custom_title?: string;
  custom_description?: string;
  custom_thumbnail?: string;
  access_level: 'public' | 'authenticated' | 'restricted';
  allowed_roles?: string[];
}

export interface WebviewSession {
  id: string;
  webview_id: string;
  session_token: string;
  user_id?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

export interface WebviewUsageStats {
  webview_id: string;
  period: 'hour' | 'day' | 'week' | 'month';
  unique_visitors: number;
  page_views: number;
  dashboard_views: number;
  avg_session_duration: number;
  bounce_rate: number;
  top_dashboards: Array<{
    dashboard_id: string;
    dashboard_name: string;
    views: number;
  }>;
  top_referrers: Array<{
    domain: string;
    visits: number;
  }>;
  created_at: string;
}

export interface CreateWebviewRequest {
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  theme_config?: Partial<WebviewTheme>;
  navigation_config?: Partial<WebviewNavigation>;
  is_public?: boolean;
  access_control?: Partial<WebviewAccessControl>;
}

export interface UpdateWebviewRequest {
  name?: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  favicon_url?: string;
  theme_config?: Partial<WebviewTheme>;
  navigation_config?: Partial<WebviewNavigation>;
  is_public?: boolean;
  is_active?: boolean;
  custom_domain?: string;
  custom_css?: string;
  custom_js?: string;
  meta_tags?: Record<string, string>;
  analytics_config?: Partial<WebviewAnalytics>;
  access_control?: Partial<WebviewAccessControl>;
}