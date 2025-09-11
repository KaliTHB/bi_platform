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
  last_login?: string;
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
  is_system: boolean;
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

