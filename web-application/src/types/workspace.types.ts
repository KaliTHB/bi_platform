// File: web-application/src/types/workspace.types.ts

export interface Workspace {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  owner_id: string;
  branding_config?: BrandingConfig;
  settings_json?: Record<string, any>;
  plugin_config?: Record<string, any>;
  default_dashboard_id?: string;
  theme_config?: ThemeConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandingConfig {
  company_name?: string;
  company_logo?: string;
  primary_color?: string;
  secondary_color?: string;
  favicon_url?: string;
  custom_css?: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  sidebar_style: 'light' | 'dark';
  navbar_style: 'light' | 'dark';
  font_family?: string;
}