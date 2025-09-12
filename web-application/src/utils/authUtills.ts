// web-application/src/utils/authUtils.ts - Helper utilities for authentication

import type { LoginCredentials, CredentialValidation } from '../types/auth.types';

/**
 * Validates email format using RFC 5322 compliant regex
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email?.trim() || '');
};

/**
 * Validates username format
 * - 3-50 characters long
 * - Alphanumeric characters, underscores, and hyphens only
 * - Cannot start or end with underscore or hyphen
 */
export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,48}[a-zA-Z0-9]$/;
  return usernameRegex.test(username?.trim() || '');
};

/**
 * Determines if input string is an email or username
 */
export const getCredentialType = (input: string): 'email' | 'username' | 'unknown' => {
  const trimmedInput = input?.trim() || '';
  
  if (isValidEmail(trimmedInput)) return 'email';
  if (isValidUsername(trimmedInput)) return 'username';
  return 'unknown';
};

/**
 * Validates password strength
 */
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

/**
 * Comprehensive validation for login credentials
 */
export const validateLoginCredentials = (input: {
  emailOrUsername?: string;
  password?: string;
  workspace_slug?: string;
}): CredentialValidation => {
  const errors: string[] = [];
  let type: 'email' | 'username' | 'unknown' = 'unknown';
  
  // Validate email or username
  if (!input.emailOrUsername?.trim()) {
    errors.push('Email or username is required');
  } else {
    const credentialType = getCredentialType(input.emailOrUsername);
    
    if (credentialType === 'unknown') {
      errors.push('Please enter a valid email address or username');
    } else {
      type = credentialType;
      
      // Additional validation based on type
      if (credentialType === 'email' && !isValidEmail(input.emailOrUsername)) {
        errors.push('Please enter a valid email address');
      } else if (credentialType === 'username' && !isValidUsername(input.emailOrUsername)) {
        errors.push('Username must be 3-50 characters and contain only letters, numbers, underscores, or hyphens');
      }
    }
  }
  
  // Validate password
  if (!input.password) {
    errors.push('Password is required');
  } else if (input.password.length < 1) {
    errors.push('Password cannot be empty');
  }
  
  // Validate workspace slug if provided
  if (input.workspace_slug && !/^[a-z0-9-]+$/.test(input.workspace_slug)) {
    errors.push('Invalid workspace identifier');
  }
  
  return {
    isValid: errors.length === 0,
    type,
    errors
  };
};

/**
 * Converts user input to LoginCredentials format
 */
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

/**
 * Gets user display name from User object
 */
export const getUserDisplayName = (user: {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  username?: string;
  email?: string;
} | null): string => {
  if (!user) return 'Unknown User';
  
  if (user.display_name) return user.display_name;
  
  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  
  if (user.first_name) return user.first_name;
  if (user.last_name) return user.last_name;
  if (user.username) return user.username;
  if (user.email) return user.email;
  
  return 'Unknown User';
};

/**
 * Gets user initials for avatar display
 */
export const getUserInitials = (user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
} | null): string => {
  if (!user) return 'U';
  
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]?.toUpperCase() || ''}${user.last_name[0]?.toUpperCase() || ''}`;
  }
  
  if (user.first_name) {
    return user.first_name[0]?.toUpperCase() || 'U';
  }
  
  if (user.username) {
    return user.username[0]?.toUpperCase() || 'U';
  }
  
  if (user.email) {
    return user.email[0]?.toUpperCase() || 'U';
  }
  
  return 'U';
};

/**
 * Sanitizes user input for security
 */
export const sanitizeAuthInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 255); // Limit length
};

/**
 * Formats error messages for display
 */
export const formatAuthError = (error: any): string => {
  if (typeof error === 'string') return error;
  
  if (error?.data?.message) return error.data.message;
  if (error?.message) return error.message;
  if (error?.data?.errors && Array.isArray(error.data.errors)) {
    return error.data.errors.map((e: any) => e.message).join(', ');
  }
  
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Checks if error is related to invalid credentials
 */
export const isCredentialError = (error: any): boolean => {
  const message = formatAuthError(error).toLowerCase();
  const credentialErrorTerms = [
    'invalid credentials',
    'incorrect password',
    'user not found',
    'authentication failed',
    'login failed',
    'unauthorized'
  ];
  
  return credentialErrorTerms.some(term => message.includes(term));
};

/**
 * Checks if error is related to network/server issues
 */
export const isNetworkError = (error: any): boolean => {
  const message = formatAuthError(error).toLowerCase();
  const networkErrorTerms = [
    'network error',
    'connection failed',
    'server error',
    'timeout',
    'unavailable'
  ];
  
  return networkErrorTerms.some(term => message.includes(term));
};

/**
 * Generate a secure random string for CSRF tokens, etc.
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Debounced validation function for real-time form validation
 */
export const createDebouncedValidator = (
  validatorFn: (value: any) => CredentialValidation,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;
  
  return (value: any, callback: (result: CredentialValidation) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validatorFn(value);
      callback(result);
    }, delay);
  };
};