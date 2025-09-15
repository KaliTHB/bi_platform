// File: ./src/types/workspace.ts

export interface WorkspaceSettings {
  timezone?: string;
  date_format?: string;
  currency?: string;
  theme?: 'light' | 'dark' | 'auto';
}

// Update this interface in your types file (likely in api-services/src/types/workspace.types.ts)
export interface WorkspaceStats {
  member_count: number;
  dashboard_count: number;
  dataset_count: number;
  chart_count: number;
  data_source_count: number;
  webview_count: number;  // ✅ ADDED: Include webviews in stats
}
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  user_count?: number;      // For WorkspaceSwitcher component
  dashboard_count?: number; // For WorkspaceSwitcher component
  dataset_count?: number;   // For statistics
  is_default?: boolean;     // If this is user's default workspace
  role?: string;
// Timestamps
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  
  // Workspace configuration
  settings?: WorkspaceSettings;
  is_active?: boolean;
}


export interface WorkspaceSettings {
  theme?: 'light' | 'dark' | 'auto';
  timezone?: string;
  date_format?: string;
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

export interface WorkspaceRole {
  role_id: string;
  role_name: string;
  level: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  settings?: Partial<WorkspaceSettings>;
  is_active?: boolean;
}