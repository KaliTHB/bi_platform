// web-application/src/types/auth.types.ts

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  workspace_ids: string[];
  
  // Additional user properties
  display_name?: string;
  phone?: string;
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
  permissions?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings?: WorkspaceSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_roles: string[];
  
  // Additional workspace properties
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
}

export interface WorkspaceSettings {
  timezone?: string;
  date_format?: string;
  currency?: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  [key: string]: any;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  invitation_token?: string;
  workspace_slug?: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
  requires_verification?: boolean;
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

export interface VerifyTokenResponse {
  valid: boolean;
  user?: User;
  workspace?: Workspace;
  permissions?: string[];
  expires_in?: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token_expires?: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
  success: boolean;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  department?: string;
  profile_data?: Record<string, any>;
}

export interface UpdateProfileResponse {
  user: User;
  message: string;
}

// Auth state for Redux/Context
export interface AuthState {
  user: User | null;
  token: string | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastActivity?: number;
}

// Permission-related types
export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  scope?: 'global' | 'workspace' | 'own';
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  is_system_role: boolean;
  level: number;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  workspace_id?: string;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
}

// API Error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

export interface AuthApiError {
  success: false;
  message: string;
  errors?: AuthError[];
  error_code?: string;
}

// Session-related types
export interface UserSession {
  id: string;
  user_id: string;
  workspace_id?: string;
  device_name?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
}

export interface CreateSessionRequest {
  device_name?: string;
  remember_me?: boolean;
}

// OAuth/SSO types
export interface OAuthProvider {
  name: string;
  display_name: string;
  client_id: string;
  authorization_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  enabled: boolean;
}

export interface OAuthLoginRequest {
  provider: string;
  code: string;
  state: string;
  redirect_uri: string;
}

export interface SSOUser {
  provider_id: string;
  provider: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  verified: boolean;
}

// JWT payload types
export interface JWTPayload {
  user_id: string;
  email: string;
  workspace_id?: string;
  workspace_slug?: string;
  role?: string;
  permissions?: string[];
  iat: number;
  exp: number;
  iss: string;
  sub: string;
}

// API Response wrappers
export interface AuthApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: AuthError[];
  meta?: {
    timestamp: string;
    request_id: string;
    version: string;
  };
}

export interface PaginatedAuthResponse<T = any> extends AuthApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Audit and logging types
export interface AuthAuditLog {
  id: string;
  user_id?: string;
  email?: string;
  action: AuthAuditAction;
  success: boolean;
  ip_address: string;
  user_agent: string;
  workspace_id?: string;
  details?: any;
  created_at: string;
}

export enum AuthAuditAction {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_CONFIRM = 'password_reset_confirm',
  WORKSPACE_SWITCH = 'workspace_switch',
  PROFILE_UPDATE = 'profile_update',
  PERMISSION_CHECK = 'permission_check',
  SESSION_CREATE = 'session_create',
  SESSION_DESTROY = 'session_destroy',
  OAUTH_LOGIN = 'oauth_login',
}

// Error codes enum
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  WORKSPACE_ACCESS_DENIED = 'WORKSPACE_ACCESS_DENIED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_RESET_TOKEN = 'INVALID_RESET_TOKEN',
  OAUTH_ERROR = 'OAUTH_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}