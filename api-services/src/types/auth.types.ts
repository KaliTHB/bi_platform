# api-services/src/types/auth.types.ts
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  workspace_ids?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings: WorkspaceSettings;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  user_roles?: WorkspaceRole[];
  highest_role_level?: number;
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

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  level: number;
  is_system: boolean;
  workspace_id?: string;
  permissions: Permission[];
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  resource_type?: string;
  is_system: boolean;
  created_at: Date;
}

export interface WorkspaceRole {
  role_id: string;
  role_name: string;
  level: number;
  assigned_at?: Date;
  assigned_by?: string;
}

export interface UserWorkspace {
  user_id: string;
  workspace_id: string;
  roles: WorkspaceRole[];
  joined_at: Date;
  invited_by?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

export interface LoginRequest {
  email: string;
  password: string;
  workspace_slug?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_in: number;
  workspaces: Workspace[];
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  workspace_id: string;
  role_ids: string[];
  invited_by: string;
  token: string;
  expires_at: Date;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  created_at: Date;
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

export interface AssignRoleRequest {
  user_id: string;
  role_ids: string[];
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  level: number;
  permission_ids: string[];
}

export interface UpdateRoleRequest {
  display_name?: string;
  description?: string;
  level?: number;
  permission_ids?: string[];
}