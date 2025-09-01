// File: ./src/types/workspace.ts

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings: WorkspaceSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_roles?: WorkspaceRole[];
  highest_role_level?: number;
}

export interface WorkspaceSettings {
  theme?: 'light' | 'dark' | 'auto';
  timezone?: string;
  date_format?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  number_format?: string;
  language?: string;
  max_query_timeout?: number;
  max_export_rows?: number;
  currency?: string;
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