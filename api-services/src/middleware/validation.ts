// api-services/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';
import { DatabaseService } from '../config/database';

// Enhanced validation schemas
const schemas = {
  // Authentication schemas with username support
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    workspace_slug: Joi.string().optional()
  }),

  loginWithUsername: Joi.object({
    identifier: Joi.alternatives().try(
      Joi.string().email(),
      Joi.string().alphanum().min(3).max(30)
    ).required().label('Email or Username'),
    password: Joi.string().min(6).required(),
    workspace_slug: Joi.string().optional()
  }),

  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must only contain alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
      }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.max': 'Email cannot exceed 255 characters',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
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
      }),
    invitation_token: Joi.string().uuid().optional()
  }),

  // User management schemas
  createUser: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must only contain alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
      }),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.max': 'Email cannot exceed 255 characters',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
        'any.required': 'Password is required'
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
    role_ids: Joi.array().items(Joi.string().uuid()).optional(),
    is_active: Joi.boolean().default(true),
    send_invitation: Joi.boolean().default(false)
  }),

  updateUser: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255)
      .optional()
      .messages({
        'string.email': 'Please enter a valid email address',
        'string.max': 'Email cannot exceed 255 characters'
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .optional()
      .allow('')
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
      }),
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
    role_ids: Joi.array().items(Joi.string().uuid()).optional(),
    is_active: Joi.boolean().optional(),
    avatar_url: Joi.string().uri().optional().allow('', null)
  }),

  // Password-specific schemas
  changePassword: Joi.object({
    current_password: Joi.string().required().messages({
      'any.required': 'Current password is required'
    }),
    new_password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
        'any.required': 'New password is required'
      }),
    confirm_password: Joi.string()
      .valid(Joi.ref('new_password'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password',
        'any.required': 'Password confirmation is required'
      })
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      })
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required'
    }),
    new_password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
        'any.required': 'Password is required'
      }),
    confirm_password: Joi.string()
      .valid(Joi.ref('new_password'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match',
        'any.required': 'Password confirmation is required'
      })
  }),

  // Workspace schemas
  createWorkspace: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(3).max(50).required(),
    description: Joi.string().max(1000).optional().allow(''),
    settings: Joi.object().optional()
  }),

  updateWorkspace: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    settings: Joi.object().optional()
  }),

  // Dataset schemas
  createDataset: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    datasource_id: Joi.string().uuid().required(),
    query: Joi.string().min(1).required(),
    category_id: Joi.string().uuid().optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional().default([]),
    transformation_config: Joi.object().optional(),
    refresh_schedule: Joi.object({
      enabled: Joi.boolean().default(false),
      cron_expression: Joi.string().optional(),
      timezone: Joi.string().optional()
    }).optional(),
    cache_ttl: Joi.number().integer().min(0).max(86400).optional().default(3600)
  }),

  updateDataset: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    query: Joi.string().min(1).optional(),
    category_id: Joi.string().uuid().optional().allow(null),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    transformation_config: Joi.object().optional(),
    refresh_schedule: Joi.object({
      enabled: Joi.boolean(),
      cron_expression: Joi.string().optional(),
      timezone: Joi.string().optional()
    }).optional(),
    cache_ttl: Joi.number().integer().min(0).max(86400).optional()
  }),

  // Dashboard schemas
  createDashboard: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    category_id: Joi.string().uuid().optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional().default([]),
    layout_config: Joi.object().optional().default({}),
    theme_config: Joi.object().optional().default({}),
    global_filters: Joi.array().optional().default([]),
    is_public: Joi.boolean().default(false)
  }),

  updateDashboard: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    category_id: Joi.string().uuid().optional().allow(null),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    layout_config: Joi.object().optional(),
    theme_config: Joi.object().optional(),
    global_filters: Joi.array().optional(),
    is_public: Joi.boolean().optional(),
    sort_order: Joi.number().integer().min(0).optional()
  }),

  // Category schemas
  createCategory: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    icon: Joi.string().max(50).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    parent_id: Joi.string().uuid().optional().allow(null),
    sort_order: Joi.number().integer().min(0).optional()
  }),

  updateCategory: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    icon: Joi.string().max(50).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    parent_id: Joi.string().uuid().optional().allow(null),
    sort_order: Joi.number().integer().min(0).optional()
  }),

  // Webview schemas
  createWebview: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    slug: Joi.string().min(1).max(255).pattern(/^[a-z0-9-]+$/).required(),
    description: Joi.string().max(1000).optional().allow(''),
    theme_config: Joi.object().default({
      primary_color: '#1976d2',
      secondary_color: '#dc004e'
    }),
    navigation_config: Joi.object().default({
      show_categories: true,
      show_search: true
    }),
    access_config: Joi.object().default({
      public: false,
      allowed_domains: []
    })
  }),

  updateWebview: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    theme_config: Joi.object().optional(),
    navigation_config: Joi.object().optional(),
    access_config: Joi.object().optional()
  }),

  // Generic pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(255).optional(),
    sort_by: Joi.string().max(50).optional(),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Enhanced validation with database uniqueness checks
 */
export const validateRequest = (schemaName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = schemas[schemaName as keyof typeof schemas];
      
      if (!schema) {
        return res.status(500).json({
          error: {
            message: 'Invalid validation schema',
            code: 'INVALID_SCHEMA'
          }
        });
      }

      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));

        return res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: validationErrors
          }
        });
      }

      // Perform database uniqueness checks for user-related operations
      if (['register', 'createUser'].includes(schemaName)) {
        const uniquenessErrors = await checkUniquenessConstraints(value, schemaName);
        if (uniquenessErrors.length > 0) {
          return res.status(409).json({
            error: {
              message: 'Uniqueness constraint violation',
              code: 'UNIQUENESS_ERROR',
              details: uniquenessErrors
            }
          });
        }
      }

      if (schemaName === 'updateUser' && req.params.userId) {
        const uniquenessErrors = await checkUniquenessConstraints(value, schemaName, req.params.userId);
        if (uniquenessErrors.length > 0) {
          return res.status(409).json({
            error: {
              message: 'Uniqueness constraint violation',
              code: 'UNIQUENESS_ERROR',
              details: uniquenessErrors
            }
          });
        }
      }

      // Replace body with validated and sanitized data
      req.body = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check database uniqueness constraints
 */
async function checkUniquenessConstraints(
  data: any, 
  operation: string, 
  excludeUserId?: string
): Promise<Array<{ field: string; message: string; type: string }>> {
  const errors: Array<{ field: string; message: string; type: string }> = [];
  const db = new DatabaseService();

  try {
    // Check email uniqueness
    if (data.email) {
      let emailQuery = 'SELECT id FROM users WHERE LOWER(email) = LOWER($1)';
      let emailParams = [data.email];

      if (excludeUserId) {
        emailQuery += ' AND id != $2';
        emailParams.push(excludeUserId);
      }

      const emailResult = await db.query(emailQuery, emailParams);
      if (emailResult.rows.length > 0) {
        errors.push({
          field: 'email',
          message: 'This email address is already registered',
          type: 'unique.violation'
        });
      }
    }

    // Check username uniqueness
    if (data.username) {
      let usernameQuery = 'SELECT id FROM users WHERE LOWER(username) = LOWER($1)';
      let usernameParams = [data.username];

      if (excludeUserId) {
        usernameQuery += ' AND id != $2';
        usernameParams.push(excludeUserId);
      }

      const usernameResult = await db.query(usernameQuery, usernameParams);
      if (usernameResult.rows.length > 0) {
        errors.push({
          field: 'username',
          message: 'This username is already taken',
          type: 'unique.violation'
        });
      }
    }

    // Check workspace slug uniqueness for workspace operations
    if (data.slug && ['createWorkspace'].includes(operation)) {
      const slugResult = await db.query(
        'SELECT id FROM workspaces WHERE LOWER(slug) = LOWER($1)',
        [data.slug]
      );
      if (slugResult.rows.length > 0) {
        errors.push({
          field: 'slug',
          message: 'This workspace slug is already taken',
          type: 'unique.violation'
        });
      }
    }

  } catch (error) {
    console.error('Error checking uniqueness constraints:', error);
    // Don't fail validation due to database errors, but log them
  }

  return errors;
}

/**
 * Validate query parameters
 */
export const validateQuery = (schemaName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = schemas[schemaName as keyof typeof schemas];
    
    if (!schema) {
      return res.status(500).json({
        error: {
          message: 'Invalid validation schema',
          code: 'INVALID_SCHEMA'
        }
      });
    }

    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        error: {
          message: 'Query validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        }
      });
    }

    // Replace query with validated data
    req.query = value;
    next();
  };
};

/**
 * Validate UUID parameters
 */
export const validateUuid = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    const uuidSchema = Joi.string().uuid().required();
    
    const { error } = uuidSchema.validate(value);
    
    if (error) {
      return res.status(400).json({
        error: {
          message: `Invalid ${paramName} format`,
          code: 'INVALID_UUID',
          details: [{
            field: paramName,
            message: `${paramName} must be a valid UUID`,
            type: 'string.uuid'
          }]
        }
      });
    }

    next();
  };
};

/**
 * Sanitize HTML content
 */
export const sanitizeHtml = (field: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body[field]) {
      // Basic HTML sanitization
      req.body[field] = req.body[field]
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');
    }
    next();
  };
};

export default {
  validateRequest,
  validateQuery,
  validateUuid,
  sanitizeHtml,
  schemas
};