/ File: web-application/src/types/permission.types.ts

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource_type: string;
  action: string;
}

export interface Role {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  is_system_role: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  workspace_id: string;
  role_id: string;
  assigned_by: string;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface PermissionState {
  permissions: Permission[];
  roles: Role[];
  userRoles: UserRoleAssignment[];
  loading: boolean;
  error: string | null;
}