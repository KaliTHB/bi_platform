// File: api-services/src/types/auth.types.ts
export interface User {
  id: string;
  username: string;
  email: string;
  workspace_id: string;
  workspace_slug: string;
  role_id: string;
  role_name: string;
  permissions: string[];
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
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
  password?: string;
}

// api-services/src/types/auth.types.ts
export interface JWTPayload {
  user_id: string;
  email: string;
  username?: string;
  workspace_id?: string;
  workspace_slug?: string;
  workspace_role?: string;
  is_admin?: boolean;
  role_level?: number;
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
}

export interface AuthUserData {
  user_id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  workspace_id?: string;
  workspace_slug?: string;
  workspace_role?: string;
  is_admin?: boolean;
  role_level?: number;
  last_login?: Date;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUserData;
  workspace?: WorkspaceData;
  permissions?: string[];
  error?: string;
  message?: string;
}

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  user_role?: string;
  role_display_name?: string;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthenticationError {
  code: string;
  message: string;
  details?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: AuthenticationError;
}

// Enum for authentication error codes
export enum AuthErrorCodes {
  MISSING_TOKEN = 'MISSING_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  ACCESS_DENIED = 'ACCESS_DENIED',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  ADMIN_ACCESS_REQUIRED = 'ADMIN_ACCESS_REQUIRED',
  WORKSPACE_REQUIRED = 'WORKSPACE_REQUIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Permission-related types
export interface UserPermissions {
  permissions: string[];
  roles: string[];
  is_admin: boolean;
  role_level: number;
}

export interface PermissionCheck {
  permission: string;
  granted: boolean;
  reason?: string;
}

// Session-related types
export interface UserSession {
  user_id: string;
  workspace_id?: string;
  created_at: Date;
  last_activity: Date;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
}

export interface SessionOptions {
  remember_me?: boolean;
  device_name?: string;
}

// OAuth/SSO related types
export interface OAuthProvider {
  name: string;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
}

export interface OAuthCallback {
  code: string;
  state: string;
  provider: string;
}

export interface SSOUser {
  provider_id: string;
  provider: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Audit log types
export interface AuthAuditLog {
  id: string;
  user_id?: string;
  email?: string;
  action: string;
  success: boolean;
  ip_address: string;
  user_agent: string;
  workspace_id?: string;
  details?: any;
  created_at: Date;
}

export enum AuthAuditActions {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_CONFIRM = 'password_reset_confirm',
  WORKSPACE_SWITCH = 'workspace_switch',
  PERMISSION_CHECK = 'permission_check',
  ADMIN_ACCESS = 'admin_access'
}