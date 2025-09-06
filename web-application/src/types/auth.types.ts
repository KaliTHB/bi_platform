// File: src/types/auth.types.ts

export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  roles?: string[];
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  
  // RLS-related fields for Row Level Security policies
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  
  // Generic profile data for extensibility
  profile_data?: Record<string, any>;
}

// Updated LoginRequest - removed workspace_slug
export interface LoginRequest {
  username: string;  // Can be username or email
  password: string;
}

// Updated LoginResponse to include workspaces array
export interface LoginResponse {
  user: User;
  token: string;
  workspace?: Workspace | null;  // Current/default workspace
  permissions: string[];
  workspaces: Workspace[];  // All accessible workspaces
}

export interface SwitchWorkspaceRequest {
  workspace_slug: string;
}

export interface SwitchWorkspaceResponse {
  user: User;
  token: string;
  workspace: Workspace;
  permissions: string[];
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  settings?: {
    timezone?: string;
    date_format?: string;
    currency?: string;
  };
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  settings?: {
    timezone?: string;
    date_format?: string;
    currency?: string;
    [key: string]: any;
  };
}

export interface ValidateTokenResponse {
  user: User;
  workspace?: Workspace | null;
  permissions: string[];
}

// Auth state interface for Redux
export interface AuthState {
  user: User | null;
  token: string | null;
  workspace: Workspace | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number;
}

// API Error Response
export interface AuthApiError {
  success: false;
  message: string;
  error_code?: string;
  details?: Record<string, any>;
}