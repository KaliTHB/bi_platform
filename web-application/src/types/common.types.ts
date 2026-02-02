// File: ./src/types/common.ts

// Generic utility types
export type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

export type Theme = 'light' | 'dark' | 'auto';

export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD.MM.YYYY';

export type TimeFormat = '12h' | '24h';

export type TimeZone = string; // e.g., 'America/New_York', 'Europe/London'

export type Locale = 'en-US' | 'en-GB' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP' | 'zh-CN' | 'pt-BR' | 'ru-RU' | 'ar-SA';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'CAD' | 'AUD' | 'CHF' | 'SEK' | 'NOK' | 'DKK';

// Available themes configuration
export const AVAILABLE_THEMES = [
  { value: 'light', label: 'Light Theme' },
  { value: 'dark', label: 'Dark Theme' },
  { value: 'corporate', label: 'Corporate Theme' },
  { value: 'webview', label: 'Webview Theme' },
  { value: 'custom', label: 'Custom Theme' }
];

export interface BaseWorkspaceSettings {
  theme?: 'light' | 'dark' | 'auto';
  timezone?: string;
  date_format?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  number_format?: string;
  language?: string;
  currency?: string;
  max_query_timeout?: number;
  max_export_rows?: number;
  features?: {
    sql_editor?: boolean;
    dashboard_builder?: boolean;
    data_exports?: boolean;
    api_access?: boolean;
    webhooks?: boolean;
  };
}

// Base entity interface
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

// Audit fields
export interface AuditFields {
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string;
  deleted_by?: string;
}

// Soft delete
export interface SoftDeleteEntity extends BaseEntity {
  is_active: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

// Workspace scoped entity
export interface WorkspaceScopedEntity extends BaseEntity {
  workspace_id: string;
}

// User attributed entity
export interface UserAttributedEntity extends BaseEntity {
  created_by: string;
  updated_by?: string;
}

// Sortable entity
export interface SortableEntity {
  sort_order: number;
}

// Hierarchical entity
export interface HierarchicalEntity {
  parent_id?: string;
  level?: number;
  path?: string;
}

// Named entity
export interface NamedEntity {
  name: string;
  display_name?: string;
  description?: string;
}

// Configurable entity
export interface ConfigurableEntity {
  configuration: Record<string, any>;
}

// File reference
export interface FileReference {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  metadata?: Record<string, any>;
  uploaded_by: string;
  uploaded_at: string;
}

// Color definition
export interface Color {
  hex: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
  hsl: {
    h: number;
    s: number;
    l: number;
  };
  name?: string;
}

// Coordinate/Position
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rectangle extends Position, Size {}

// Event types
export interface CustomEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
  user_id?: string;
  workspace_id?: string;
  metadata?: Record<string, any>;
}

// Preference types
export interface UserPreferences {
  theme: Theme;
  language: Locale;
  timezone: TimeZone;
  date_format: DateFormat;
  time_format: TimeFormat;
  currency: Currency;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
  data: DataPreferences;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  dashboard_shared: boolean;
  data_export_completed: boolean;
  system_maintenance: boolean;
  security_alerts: boolean;
  digest_frequency: 'never' | 'daily' | 'weekly' | 'monthly';
}

export interface DashboardPreferences {
  default_refresh_interval: number;
  auto_save_enabled: boolean;
  grid_snap_enabled: boolean;
  show_tooltips: boolean;
  animation_enabled: boolean;
}

export interface DataPreferences {
  default_rows_per_page: number;
  decimal_places: number;
  thousand_separator: ',' | '.' | ' ';
  decimal_separator: ',' | '.';
  show_null_values: boolean;
  null_value_display: string;
}

// Validation types
export interface ValidationRule {
  type: 'required' | 'email' | 'url' | 'pattern' | 'min' | 'max' | 'minLength' | 'maxLength' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Search and filter types
export interface SearchQuery {
  query: string;
  fields?: string[];
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  took: number;
  query: SearchQuery;
}

// Version information
export interface Version {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

// Feature flag
export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions?: Record<string, any>;
  created_at: string;
  updated_at: string;
}