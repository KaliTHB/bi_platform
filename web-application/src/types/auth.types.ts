// web-application/src/types/auth.types.ts - Updated with Username/Email Support

export interface User {
  id: string;
  email: string;
  username?: string; // Added username support
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

// Updated LoginRequest to support both email and username
export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

// Alternative explicit types for different login methods
export interface EmailLoginRequest {
  email: string;
  password: string;
  workspace_slug?: string;
}

export interface UsernameLoginRequest {
  username: string;
  password: string;
  workspace_slug?: string;
}

// Union type for login credentials
export type LoginCredentials = EmailLoginRequest | UsernameLoginRequest;

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  expires_in: number;
  workspaces: Workspace[];
  workspace?: Workspace; // Current workspace if specified
  permissions?: string[];
  message?: string;
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

// Updated RegisterRequest to include username option
export interface RegisterRequest {
  email: string;
  username?: string; // Optional username during registration
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

// Updated to support both email and username for password reset
export interface ForgotPasswordRequest {
  email?: string;
  username?: string;
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
  username?: string; // Allow username updates
  email?: string;
  avatar_url?: string;
  phone?: string;
  department?: string;
  profile_data?: Record<string, any>;
}

export interface UpdateProfileResponse {
  user: User;
  message: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  user_role?: string;
  role_level?: number;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

// ✅ FIXED: Backend response structure
export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
    workspace?: Workspace;
    permissions?: string[];
  };
  error?: string;
}

// Error response structure
export interface LoginErrorResponse {
  success: boolean;
  message: string;
  error: string;
}

// RTK Query mutation result
export interface LoginMutationResult {
  data?: LoginResponse;
  error?: {
    status: number;
    data: LoginErrorResponse;
    message?: string;
  };
}

// Token verification response
export interface VerifyTokenResponse {
  success: boolean;
  valid: boolean;
  user?: User;
  workspace?: Workspace;
  permissions?: string[];
  message?: string;
  error?: string;
}

// Auth state interface
export interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastLoginAt: string | null;
  isInitialized: boolean;
}

// Permission-related types
export interface UserPermissions {
  permissions: string[];
  roles: string[];
  is_admin: boolean;
  role_level: number;
}

// API Error interface
export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

// JWT payload interface
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
}

// Auth context type
export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  workspace: Workspace | null;
  permissions: string[];
  loading: boolean;
  isInitialized: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
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

// Utility types for validation
export interface CredentialValidation {
  isValid: boolean;
  type: 'email' | 'username' | 'unknown';
  errors: string[];
}

// Helper functions for credential validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  // Username should be 3-50 characters, alphanumeric + underscore/hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
};

export const getCredentialType = (input: string): 'email' | 'username' | 'unknown' => {
  if (validateEmail(input)) return 'email';
  if (validateUsername(input)) return 'username';
  return 'unknown';
};

export const validateLoginCredentials = (credentials: LoginRequest): CredentialValidation => {
  const errors: string[] = [];
  let type: 'email' | 'username' | 'unknown' = 'unknown';

  // Check that either email or username is provided
  if (!credentials.email && !credentials.username) {
    errors.push('Either email or username is required');
  }

  // Validate email if provided
  if (credentials.email) {
    if (!validateEmail(credentials.email)) {
      errors.push('Invalid email format');
    } else {
      type = 'email';
    }
  }

  // Validate username if provided
  if (credentials.username) {
    if (!validateUsername(credentials.username)) {
      errors.push('Username must be 3-50 characters and contain only letters, numbers, underscore, or hyphen');
    } else {
      type = 'username';
    }
  }

  // Validate password
  if (!credentials.password) {
    errors.push('Password is required');
  } else if (credentials.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  return {
    isValid: errors.length === 0,
    type,
    errors
  };
};

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
  username?: string; // Added username support
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
  username?: string; // Added username tracking
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
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS', // Added username conflict
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_RESET_TOKEN = 'INVALID_RESET_TOKEN',
  OAUTH_ERROR = 'OAUTH_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_USERNAME_FORMAT = 'INVALID_USERNAME_FORMAT',
}

export interface PermissionResponse {
  success: boolean;
  permissions: string[];
  user_id: string;
  workspace_id?: string;
  role_breakdown?: Record<string, string[]>;
  total_permissions: number;
  message?: string;
}

export interface RefreshPermissionsResponse {
  success: boolean;
  message: string;
  user_id: string;
  timestamp: string;
}

export interface PermissionCheck {
  permission: string;
  hasPermission: boolean;
  source?: 'role' | 'direct' | 'inherited';
}

export interface UserPermissions {
  userId: string;
  workspaceId?: string;
  permissions: string[];
  rolePermissions: Record<string, string[]>;
  directPermissions: string[];
  effectivePermissions: string[];
  lastUpdated: string;
}