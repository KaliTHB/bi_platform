// File: src/types/user.types.ts

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  roles: Role[];
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

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
  level?: number;
  workspace_id?: string;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  resource_type?: string;
  is_system: boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_ids?: string[];
  is_active?: boolean;
  
  // RLS-related fields for user creation
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  profile_data?: Record<string, any>;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role_ids?: string[];
  is_active?: boolean;
  password?: string;
  
  // RLS-related fields for user updates
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  profile_data?: Record<string, any>;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  workspace_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}