// File: web-application/src/types/auth.types.ts

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  profile_data?: Record<string, any>;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  workspace: Workspace;
  permissions: Permission[];
  expires_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  workspace_slug: string;
  remember_me?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  workspace: Workspace | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}