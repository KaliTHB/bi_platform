export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings?: WorkspaceSettings;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
}

export interface WorkspaceSettings {
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  date_format: string;
  number_format: string;
  language: string;
  max_query_timeout: number;
  max_export_rows: number;
  features: {
    sql_editor: boolean;
    dashboard_builder: boolean;
    data_exports: boolean;
    api_access: boolean;
    webhooks: boolean;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
  workspace_slug?: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    workspace: Workspace;
    permissions: string[];
    expires_in: number;
  };
  message?: string;
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role_ids: string[];
  send_invitation: boolean;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active?: boolean;
  password?: string; // Added password field for user updates
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
}