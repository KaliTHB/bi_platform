// web-application/src/types/auth.types.ts - UNIFIED AUTH TYPE SYSTEM

// ============================================================================
// CORE USER & WORKSPACE TYPES
// ============================================================================

export interface User {
  id: string;
  user_id: string; // Backend uses user_id as primary identifier
  email: string;
  username?: string;
  first_name: string;
  last_name: string;
  role?: string;
  avatar_url?: string;
  display_name?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  workspace_ids?: string[];
  
  // Additional user properties
  phone?: string;
  department?: string;
  region?: string;
  level?: string;
  location?: string;
  team?: string;
  cost_center?: string;
  manager_id?: string;
  profile_data?: Record<string, any>;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  settings?: WorkspaceSettings;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  user_roles?: string[];
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

// ============================================================================
// AUTHENTICATION REQUEST/RESPONSE TYPES
// ============================================================================

// Login Types
export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  workspace_slug?: string;
}

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

// Backend login response format (matches AuthController exactly)
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      user_id: string;
      username?: string;
      email: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
      display_name?: string;
    };
    workspace?: {
      id: string;
      name: string;
      slug: string;
      display_name?: string;
    };
    permissions?: string[];
  };
  error?: string;
}

// RTK Query mutation result type
export interface LoginMutationResult {
  data?: LoginResponse;
  error?: {
    status: number;
    data: AuthErrorResponse;
    message?: string;
  };
}

// Registration Types
export interface RegisterRequest {
  email: string;
  username?: string;
  password: string;
  first_name: string;
  last_name: string;
  invitation_token?: string;
  workspace_slug?: string;
}

export interface RegisterResponse {
  success: boolean;
  user: User;
  message: string;
  requires_verification?: boolean;
}

// Token Verification Types
export interface VerifyTokenResponse {
  success: boolean;
  data?: {
    valid: boolean;
    user?: User;
    workspace?: Workspace;
    permissions?: string[];
    expires_in?: number;
  };
  message?: string;
  error?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  message?: string;
  error?: string;
}

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

export interface GetCurrentUserResponse {
  success: boolean;
  data: {
    user: User;
    permissions?: string[];
    workspaces?: Workspace[];
  };
  message?: string;
  error?: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  phone?: string;
  department?: string;
  profile_data?: Record<string, any>;
}

export interface UpdateProfileResponse {
  success: boolean;
  data: {
    user: User;
  };
  message: string;
}

// ============================================================================
// PASSWORD MANAGEMENT TYPES
// ============================================================================

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface ForgotPasswordRequest {
  email?: string;
  username?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  reset_token_expires?: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// PERMISSION & ROLE TYPES
// ============================================================================

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
  display_name: string;
  description?: string;
  permissions: string[];
  is_system_role: boolean;
  level: number;
  assigned_at: string;
  expires_at?: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  workspace_id?: string;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
}

// Backend permissions response (matches backend exactly)
export interface UserPermissionsResponse {
  success: boolean;
  permissions: string[];
  roles?: string[];
  is_admin?: boolean;
  role_level?: number;
  user_info?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
  workspace_used?: string;
  warning?: string;
  message?: string;
}

export interface GetUserRolesResponse {
  success: boolean;
  data: {
    roles: Role[];
  };
  message?: string;
  error?: string;
}

export interface CheckPermissionsRequest {
  permissions: string[];
  workspaceId?: string;
}

export interface CheckPermissionsResponse {
  success: boolean;
  data: {
    results: Array<{
      permission: string;
      granted: boolean;
      reason?: string;
    }>;
    allGranted: boolean;
  };
  message?: string;
  error?: string;
}

export interface RefreshPermissionsRequest {
  workspaceId?: string;
}

// ============================================================================
// WORKSPACE SWITCHING TYPES
// ============================================================================

export interface SwitchWorkspaceRequest {
  workspace_id: string; // Backend expects workspace_id, not slug
}

// web-application/src/types/auth.types.ts

// ============================================================================
// WORKSPACE SWITCHING TYPES - UPDATED TO MATCH LOGIN RESPONSE
// ============================================================================

export interface SwitchWorkspaceRequest {
  workspace_id: string;
}

// ✅ UPDATED: Match login response structure exactly
export interface SwitchWorkspaceResponse {
  success: boolean;
  message: string;
  data: {
    token: string;              // New workspace-scoped token
    user: {                     // Updated user context for workspace
      user_id: string;
      username?: string;
      email: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
      display_name?: string;
    };
    workspace: {                // New current workspace
      id: string;
      name: string;
      slug: string;
      display_name?: string;
    };
    permissions: string[];      // Workspace-specific permissions
  };
  error?: string;
}

// RTK Query mutation result type
export interface SwitchWorkspaceMutationResult {
  data?: SwitchWorkspaceResponse;
  error?: {
    status: number;
    data: AuthErrorResponse;
    message?: string;
  };
}
// ============================================================================
// SESSION MANAGEMENT TYPES
// ============================================================================

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
  is_current: boolean;
}

export interface GetSessionsResponse {
  success: boolean;
  data: {
    sessions: UserSession[];
  };
  message?: string;
  error?: string;
}

export interface RevokeSessionRequest {
  session_id: string;
}

export interface CreateSessionRequest {
  device_name?: string;
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface AuthAuditLog {
  id: string;
  action: string;
  success: boolean;
  ip_address: string;
  user_agent: string;
  workspace_id?: string;
  details?: any;
  created_at: string;
}

export interface GetAuditLogRequest {
  page?: number;
  limit?: number;
  action?: string;
  workspace_id?: string;
}

export interface GetAuditLogResponse {
  success: boolean;
  data: {
    logs: AuthAuditLog[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
  error?: string;
}

// ============================================================================
// GENERIC API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthSuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

export interface AuthErrorResponse extends ApiResponse {
  success: false;
  message: string;
  error: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// ============================================================================
// JWT & AUTH STATE TYPES
// ============================================================================

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

// ============================================================================
// VALIDATION & UTILITY TYPES
// ============================================================================

export interface CredentialValidation {
  isValid: boolean;
  type: 'email' | 'username' | 'unknown';
  errors: string[];
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: any;
  field?: string;
  path?: string;
}

// ============================================================================
// ERROR CODES ENUM
// ============================================================================

export enum AuthErrorCode {
  // Authentication Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_INACTIVE = 'USER_INACTIVE',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  
  // Token Errors
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  MISSING_TOKEN = 'MISSING_TOKEN',
  TOKEN_VERIFICATION_FAILED = 'TOKEN_VERIFICATION_FAILED',
  
  // Workspace Errors
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  WORKSPACE_ACCESS_DENIED = 'WORKSPACE_ACCESS_DENIED',
  
  // Permission Errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation Errors
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_USERNAME_FORMAT = 'INVALID_USERNAME_FORMAT',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  
  // Password Reset Errors
  INVALID_RESET_TOKEN = 'INVALID_RESET_TOKEN',
  RESET_TOKEN_EXPIRED = 'RESET_TOKEN_EXPIRED',
  
  // System Errors
  OAUTH_ERROR = 'OAUTH_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email?.trim() || '');
};

export const validateUsername = (username: string): boolean => {
  // Username should be 3-50 characters, alphanumeric + underscore/hyphen
  // Cannot start or end with underscore or hyphen
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,48}[a-zA-Z0-9]$/;
  return usernameRegex.test(username?.trim() || '');
};

export const getCredentialType = (input: string): 'email' | 'username' | 'unknown' => {
  const trimmedInput = input?.trim() || '';
  
  if (validateEmail(trimmedInput)) return 'email';
  if (validateUsername(trimmedInput)) return 'username';
  return 'unknown';
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateLoginCredentials = (credentials: LoginCredentials): CredentialValidation => {
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
  } else if (credentials.password.length < 1) {
    errors.push('Password cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    type,
    errors
  };
};

// ============================================================================
// UTILITY HELPER FUNCTIONS
// ============================================================================

export const getUserDisplayName = (user: User | null): string => {
  if (!user) return '';
  
  if (user.display_name) return user.display_name;
  
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  
  if (user.first_name) return user.first_name;
  if (user.username) return user.username;
  if (user.email) return user.email.split('@')[0];
  
  return 'User';
};

export const isUserAdmin = (user: User | null, permissions: string[] = []): boolean => {
  if (!user) return false;
  
  // Check if user has admin permission
  return permissions.some(permission => 
    permission === 'admin' || 
    permission === 'super_admin' || 
    permission.includes('admin')
  );
};

export const getWorkspaceDisplayName = (workspace: Workspace | null): string => {
  if (!workspace) return '';
  return workspace.display_name || workspace.name || workspace.slug;
};

export const formatLoginCredentials = (input: {
  emailOrUsername: string;
  password: string;
  workspace_slug?: string;
}): LoginCredentials => {
  const credentialType = getCredentialType(input.emailOrUsername);
  
  if (credentialType === 'email') {
    return {
      email: input.emailOrUsername.trim(),
      password: input.password,
      workspace_slug: input.workspace_slug?.trim() || undefined
    };
  } else {
    return {
      username: input.emailOrUsername.trim(),
      password: input.password,
      workspace_slug: input.workspace_slug?.trim() || undefined
    };
  }
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isLoginResponse(response: any): response is LoginResponse {
  return response && 
         typeof response === 'object' && 
         'success' in response && 
         typeof response.success === 'boolean';
}

export function isAuthErrorResponse(response: any): response is AuthErrorResponse {
  return response && 
         typeof response === 'object' && 
         response.success === false &&
         'error' in response;
}

export function isAuthSuccessResponse<T>(response: any): response is AuthSuccessResponse<T> {
  return response && 
         typeof response === 'object' && 
         response.success === true &&
         'data' in response;
}

// ============================================================================
// REACT CONTEXT TYPES (if using Context API)
// ============================================================================

export interface AuthContextType {
  // State
  isAuthenticated: boolean;
  user: User | null;
  workspace: Workspace | null;
  permissions: string[];
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
}