/ File: web-application/src/types/dashboard.types.ts

export interface Dashboard {
  id: string;
  workspace_id: string;
  category_id?: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  config_json: DashboardConfig;
  tabs?: DashboardTab[];
  global_filters?: GlobalFilter[];
  filter_connections?: FilterConnection[];
  theme_config?: ThemeConfig;
  layout_config?: LayoutConfig;
  responsive_settings?: ResponsiveSettings;
  thumbnail_url?: string;
  owner_id: string;
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;
  is_featured: boolean;
  sort_order: number;
  tags?: string[];
  version: number;
  published_at?: string;
  view_count: number;
  last_viewed?: string;
  rls_policies_json?: RLSPolicy[];
  created_at: string;
  updated_at: string;
}

export interface DashboardConfig {
  layout_type: 'grid' | 'free' | 'tabs';
  grid_size: { columns: number; rows: number };
  spacing: number;
  background_color?: string;
  background_image?: string;
  auto_refresh?: number;
  allow_export: boolean;
  allow_sharing: boolean;
}

export interface DashboardTab {
  id: string;
  name: string;
  display_name: string;
  icon?: string;
  order_index: number;
  is_active: boolean;
  layout_config?: LayoutConfig;
}

export interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'date' | 'text' | 'number' | 'select' | 'multiselect';
  dataset_id: string;
  column_name: string;
  default_value?: any;
  options?: FilterOption[];
  is_required: boolean;
  order_index: number;
}

export interface FilterOption {
  label: string;
  value: any;
}

export interface FilterConnection {
  filter_id: string;
  chart_ids: string[];
  parameter_mapping: Record<string, string>;
}

export interface LayoutConfig {
  type: 'responsive' | 'fixed';
  breakpoints?: Record<string, number>;
  container_width?: number;
  margin?: [number, number];
  row_height?: number;
}

export interface ResponsiveSettings {
  mobile: { enabled: boolean; breakpoint: number };
  tablet: { enabled: boolean; breakpoint: number };
  desktop: { enabled: boolean; breakpoint: number };
}

export interface RLSPolicy {
  id: string;
  name: string;
  expression: string;
  context_variables: Record<string, any>;
  priority: number;
  is_active: boolean;
}