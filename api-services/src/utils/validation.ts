// api-services/src/utils/validation.ts - FIXED VERSION

import Joi from 'joi';

// FIXED: Enhanced login validation that properly supports both email and username
export const additionalSchemas = {
  // FIXED: More flexible login validation
  login: Joi.object({
    // Accept either email OR username (not both required)
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .optional()
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.max': 'Email cannot exceed 255 characters'
      }),
    
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .optional()
      .messages({
        'string.alphanum': 'Username can only contain letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
      }),
    
    password: Joi.string()
      .min(6)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 100 characters',
        'any.required': 'Password is required'
      }),
    
    workspace_slug: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .optional()
      .messages({
        'string.alphanum': 'Workspace slug can only contain letters and numbers',
        'string.min': 'Workspace slug must be at least 3 characters',
        'string.max': 'Workspace slug cannot exceed 50 characters'
      })
  })
  // FIXED: Require either email OR username, but not both
  .or('email', 'username')
  .messages({
    'object.missing': 'Either email or username is required'
  }),

  // Enhanced registration validation
  register: Joi.object({
    username: Joi.string()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .required()
      .custom(validateEmailDomain)
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.max': 'Email cannot exceed 255 characters',
        'any.required': 'Email is required'
      }),

    password: Joi.string()
      .min(8)
      .max(100)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 100 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),

    first_name: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name is required',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
      }),

    last_name: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name is required',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
      })
  })
};

// FIXED: Enhanced email validation function
export const validateEmailDomain = (email: string, helpers: any, allowedDomains?: string[]): string | typeof helpers => {
  if (!email || !email.includes('@')) {
    return helpers.error('string.email');
  }

  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return helpers.error('string.email');
  }
  
  // Check for common disposable email domains
  const disposableDomains = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
    'tempmail.org', 'temp-mail.org', 'throwaway.email',
    'yopmail.com', 'maildrop.cc', 'sharklasers.com',
    'getnada.com', 'temp-mail.com', 'throwaway.email'
  ];

  if (disposableDomains.includes(domain)) {
    return helpers.error('custom.disposableEmail');
  }

  // Check against allowed domains if specified
  if (allowedDomains && allowedDomains.length > 0) {
    if (!allowedDomains.includes(domain)) {
      return helpers.error('custom.domainNotAllowed', { allowedDomains: allowedDomains.join(', ') });
    }
  }

  return email;
};

// FIXED: Enhanced username validation function
export const validateUsernameFormat = (username: string): { valid: boolean; message?: string } => {
  if (!username) {
    return { valid: false, message: 'Username is required' };
  }

  // Check length
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters long' };
  }

  if (username.length > 30) {
    return { valid: false, message: 'Username cannot exceed 30 characters' };
  }

  // FIXED: More permissive pattern - allow letters, numbers, underscores, hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  // Check that it doesn't start or end with special characters
  if (/^[-_]|[-_]$/.test(username)) {
    return { valid: false, message: 'Username cannot start or end with special characters' };
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'system', 'api', 'www',
    'mail', 'email', 'support', 'help', 'info', 'contact',
    'user', 'username', 'test', 'demo', 'guest', 'anonymous',
    'null', 'undefined', 'true', 'false', 'admin123', 'password'
  ];

  if (reservedUsernames.includes(username.toLowerCase())) {
    return { valid: false, message: 'This username is reserved and cannot be used' };
  }

  return { valid: true };
};

// FIXED: Flexible authentication input validator
export const validateAuthenticationInput = (input: string): { 
  isEmail: boolean; 
  isUsername: boolean; 
  valid: boolean; 
  type: 'email' | 'username' | 'invalid';
  message?: string 
} => {
  if (!input || !input.trim()) {
    return {
      isEmail: false,
      isUsername: false,
      valid: false,
      type: 'invalid',
      message: 'Email or username is required'
    };
  }

  const trimmedInput = input.trim();
  
  // Check if it looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = emailRegex.test(trimmedInput);
  
  if (isEmail) {
    const emailValidation = validateEmailDomain(trimmedInput, { error: () => null });
    return {
      isEmail: true,
      isUsername: false,
      valid: typeof emailValidation === 'string',
      type: 'email',
      message: typeof emailValidation === 'string' ? undefined : 'Invalid email format'
    };
  }

  // Check if it's a valid username format
  const usernameValidation = validateUsernameFormat(trimmedInput);
  
  return {
    isEmail: false,
    isUsername: usernameValidation.valid,
    valid: usernameValidation.valid,
    type: usernameValidation.valid ? 'username' : 'invalid',
    message: usernameValidation.message
  };
};

// Password strength validation (unchanged but improved)
export const validatePasswordStrength = (password: string): { 
  valid: boolean; 
  strength: 'weak' | 'fair' | 'good' | 'strong';
  message?: string;
  suggestions: string[];
} => {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else suggestions.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;
  
  if (/[a-z]/.test(password)) score += 1;
  else suggestions.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else suggestions.push('Include uppercase letters');

  if (/\d/.test(password)) score += 1;
  else suggestions.push('Include numbers');

  if (/[@$!%*?&]/.test(password)) score += 1;
  else suggestions.push('Include special characters (@$!%*?&)');

  if (!/(.)\1{2,}/.test(password)) score += 1;
  else suggestions.push('Avoid repeating characters');

  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 3) strength = 'weak';
  else if (score <= 4) strength = 'fair';
  else if (score <= 5) strength = 'good';
  else strength = 'strong';

  const valid = score >= 4;

  return {
    valid,
    strength,
    message: valid ? undefined : 'Password does not meet security requirements',
    suggestions
  };
};

export default additionalSchemas ;