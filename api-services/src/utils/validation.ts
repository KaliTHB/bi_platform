const additionalSchemas = {
  // Bulk user operations
  bulkInviteUsers: Joi.object({
    users: Joi.array().items(
      Joi.object({
        email: Joi.string()
          .email({ tlds: { allow: false } })
          .max(255)
          .required()
          .messages({
            'string.email': 'Please enter a valid email address',
            'string.max': 'Email cannot exceed 255 characters',
            'any.required': 'Email is required'
          }),
        first_name: Joi.string()
          .trim()
          .min(1)
          .max(50)
          .required()
          .messages({
            'string.min': 'First name is required',
            'string.max': 'First name cannot exceed 50 characters'
          }),
        last_name: Joi.string()
          .trim()
          .min(1)
          .max(50)
          .required()
          .messages({
            'string.min': 'Last name is required',
            'string.max': 'Last name cannot exceed 50 characters'
          }),
        role_ids: Joi.array().items(Joi.string().uuid()).optional()
      })
    ).min(1).max(50).required().messages({
      'array.min': 'At least one user is required',
      'array.max': 'Cannot invite more than 50 users at once'
    }),
    send_invitation: Joi.boolean().default(true),
    custom_message: Joi.string().max(500).optional().allow('')
  }),

  bulkUpdateStatus: Joi.object({
    user_ids: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one user ID is required',
        'array.max': 'Cannot update more than 100 users at once'
      }),
    is_active: Joi.boolean().required(),
    reason: Joi.string().max(255).optional().allow('')
  }),

  // Profile update (self-service)
  updateProfile: Joi.object({
    first_name: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name cannot be empty',
        'string.max': 'First name cannot exceed 50 characters'
      }),
    last_name: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name cannot be empty',
        'string.max': 'Last name cannot exceed 50 characters'
      }),
    avatar_url: Joi.string()
      .uri()
      .optional()
      .allow('', null)
      .messages({
        'string.uri': 'Avatar URL must be a valid URL'
      }),
    timezone: Joi.string()
      .max(50)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Timezone cannot exceed 50 characters'
      }),
    language: Joi.string()
      .valid('en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko')
      .optional()
      .messages({
        'any.only': 'Language must be one of the supported languages'
      }),
    date_format: Joi.string()
      .valid('YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YYYY')
      .optional()
      .messages({
        'any.only': 'Date format must be one of the supported formats'
      }),
    number_format: Joi.string()
      .valid('en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'zh-CN', 'ja-JP')
      .optional()
      .messages({
        'any.only': 'Number format must be one of the supported locales'
      })
  }),

  // Workspace invitation
  inviteToWorkspace: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.max': 'Email cannot exceed 255 characters',
        'any.required': 'Email is required'
      }),
    role_ids: Joi.array().items(Joi.string().uuid()).optional(),
    custom_message: Joi.string().max(500).optional().allow(''),
    expires_at: Joi.date().greater('now').optional().messages({
      'date.greater': 'Expiration date must be in the future'
    })
  }),

  // Role assignment
  assignUserRole: Joi.object({
    role_ids: Joi.array()
      .items(Joi.string().uuid())
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one role is required'
      }),
    replace_existing: Joi.boolean().default(false)
  }),

  // User search and filtering
  userSearch: Joi.object({
    q: Joi.string().max(255).optional().allow(''),
    role: Joi.string().uuid().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    created_after: Joi.date().optional(),
    created_before: Joi.date().optional(),
    last_login_after: Joi.date().optional(),
    last_login_before: Joi.date().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().valid('first_name', 'last_name', 'email', 'username', 'created_at', 'last_login_at').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Email verification
  verifyEmail: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Verification token is required'
    })
  }),

  resendVerification: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      })
  }),

  // Two-factor authentication (if implemented)
  enable2FA: Joi.object({
    password: Joi.string().required().messages({
      'any.required': 'Password is required to enable 2FA'
    })
  }),

  verify2FA: Joi.object({
    code: Joi.string()
      .length(6)
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.length': '2FA code must be 6 digits',
        'string.pattern.base': '2FA code must contain only digits',
        'any.required': '2FA code is required'
      }),
    backup_code: Joi.string()
      .length(8)
      .pattern(/^[A-Z0-9]{8}$/)
      .optional()
      .messages({
        'string.length': 'Backup code must be 8 characters',
        'string.pattern.base': 'Invalid backup code format'
      })
  }).or('code', 'backup_code'),

  // API key management (if implemented)
  createAPIKey: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'API key name is required',
        'string.max': 'API key name cannot exceed 100 characters'
      }),
    description: Joi.string().max(500).optional().allow(''),
    expires_at: Joi.date().greater('now').optional().messages({
      'date.greater': 'Expiration date must be in the future'
    }),
    scopes: Joi.array()
      .items(Joi.string().valid('read', 'write', 'admin'))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one scope is required'
      })
  }),

  // Session management
  revokeSession: Joi.object({
    session_id: Joi.string().uuid().optional(),
    all_sessions: Joi.boolean().default(false)
  }).or('session_id', 'all_sessions'),

  // User preferences
  updateUserPreferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto').optional(),
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      browser: Joi.boolean().optional(),
      dashboard_shared: Joi.boolean().optional(),
      dataset_updated: Joi.boolean().optional(),
      system_alerts: Joi.boolean().optional()
    }).optional(),
    dashboard_defaults: Joi.object({
      auto_refresh: Joi.boolean().optional(),
      refresh_interval: Joi.number().integer().min(30).max(3600).optional(),
      show_grid: Joi.boolean().optional(),
      chart_animations: Joi.boolean().optional()
    }).optional()
  })
};

// Enhanced email validation function
export const validateEmailDomain = (email: string, allowedDomains?: string[]): { valid: boolean; message?: string } => {
  if (!email || !email.includes('@')) {
    return { valid: false, message: 'Invalid email format' };
  }

  const domain = email.split('@')[1].toLowerCase();
  
  // Check for common disposable email domains
  const disposableDomains = [
    '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
    'tempmail.org', 'temp-mail.org', 'throwaway.email',
    'yopmail.com', 'maildrop.cc', 'sharklasers.com'
  ];

  if (disposableDomains.includes(domain)) {
    return { valid: false, message: 'Disposable email addresses are not allowed' };
  }

  // Check against allowed domains if specified
  if (allowedDomains && allowedDomains.length > 0) {
    if (!allowedDomains.includes(domain)) {
      return { valid: false, message: `Email domain must be one of: ${allowedDomains.join(', ')}` };
    }
  }

  return { valid: true };
};

// Enhanced username validation function
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

  // Check for valid characters (alphanumeric, underscore, hyphen)
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

// Password strength validation
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

  const valid = score >= 4; // Require at least 'fair' strength

  return {
    valid,
    strength,
    message: valid ? undefined : 'Password does not meet security requirements',
    suggestions
  };
};

export { additionalSchemas };