// api-services/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

// Validation schemas
const schemas = {
  // Authentication schemas - Fixed to handle .local domains in development
  login: Joi.object({
    email: process.env.NODE_ENV === 'development' 
      ? Joi.string().email({ tlds: { allow: false } }).required() // Allow any TLD in dev
      : Joi.string().email().required(), // Strict validation in production
    password: Joi.string().min(6).required(),
    workspace_slug: Joi.string().optional()
  }),

  register: Joi.object({
    email: process.env.NODE_ENV === 'development'
      ? Joi.string().email({ tlds: { allow: false } }).required() // Allow any TLD in dev
      : Joi.string().email().required(), // Strict validation in production
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one digit'
      }),
    first_name: Joi.string().min(1).max(50).required(),
    last_name: Joi.string().min(1).max(50).required(),
    invitation_token: Joi.string().optional()
  }),

  forgotPassword: Joi.object({
    email: process.env.NODE_ENV === 'development'
      ? Joi.string().email({ tlds: { allow: false } }).required()
      : Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    new_password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one digit'
      })
  }),

  // Workspace schemas
  createWorkspace: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    slug: Joi.string().min(1).max(100).pattern(/^[a-z0-9-]+$/).required()
      .messages({
        'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens'
      }),
    description: Joi.string().max(1000).optional().allow(''),
    settings: Joi.object().optional()
  }),

  updateWorkspace: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    logo_url: Joi.string().uri().optional().allow(''),
    settings: Joi.object().optional()
  }),

  // User schemas
  createUser: Joi.object({
    email: process.env.NODE_ENV === 'development'
      ? Joi.string().email({ tlds: { allow: false } }).required()
      : Joi.string().email().required(),
    first_name: Joi.string().min(1).max(50).required(),
    last_name: Joi.string().min(1).max(50).required(),
    role_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
    send_invitation: Joi.boolean().default(true)
  }),

  updateUser: Joi.object({
    first_name: Joi.string().min(1).max(50).optional(),
    last_name: Joi.string().min(1).max(50).optional(),
    avatar_url: Joi.string().uri().optional().allow(''),
    is_active: Joi.boolean().optional()
  }),

  assignRole: Joi.object({
    user_id: Joi.string().uuid().required(),
    role_ids: Joi.array().items(Joi.string().uuid()).min(1).required()
  }),

  // Role schemas
  createRole: Joi.object({
    name: Joi.string().min(1).max(100).pattern(/^[a-z0-9_]+$/).required()
      .messages({
        'string.pattern.base': 'Role name must contain only lowercase letters, numbers, and underscores'
      }),
    display_name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    level: Joi.number().integer().min(1).max(99).required(),
    permission_ids: Joi.array().items(Joi.string().uuid()).min(1).required()
  }),

  updateRole: Joi.object({
    display_name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    level: Joi.number().integer().min(1).max(99).optional(),
    permission_ids: Joi.array().items(Joi.string().uuid()).min(1).optional()
  }),

  // Dataset schemas
  createDataset: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    datasource_id: Joi.string().uuid().required(),
    query: Joi.string().min(1).required(),
    parameters: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('string', 'number', 'date', 'boolean').required(),
      default_value: Joi.any().optional(),
      required: Joi.boolean().default(false)
    })).optional(),
    refresh_schedule: Joi.object({
      enabled: Joi.boolean().default(false),
      interval: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').optional(),
      cron_expression: Joi.string().optional()
    }).optional()
  }),

  updateDataset: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    query: Joi.string().min(1).optional(),
    parameters: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('string', 'number', 'date', 'boolean').required(),
      default_value: Joi.any().optional(),
      required: Joi.boolean().default(false)
    })).optional(),
    refresh_schedule: Joi.object({
      enabled: Joi.boolean().default(false),
      interval: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').optional(),
      cron_expression: Joi.string().optional()
    }).optional()
  }),

  // Dashboard schemas
  createDashboard: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    category_id: Joi.string().uuid().optional(),
    layout: Joi.object().required(),
    settings: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').default('light'),
      refresh_interval: Joi.number().integer().min(0).optional(),
      filters: Joi.array().optional()
    }).optional(),
    is_public: Joi.boolean().default(false)
  }),

  updateDashboard: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    category_id: Joi.string().uuid().optional().allow(null),
    layout: Joi.object().optional(),
    settings: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').optional(),
      refresh_interval: Joi.number().integer().min(0).optional(),
      filters: Joi.array().optional()
    }).optional(),
    is_public: Joi.boolean().optional()
  }),

  // Chart schemas
  createChart: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    dataset_id: Joi.string().uuid().required(),
    chart_type: Joi.string().valid(
      'bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 
      'bubble', 'radar', 'polar', 'table', 'metric', 'gauge'
    ).required(),
    configuration: Joi.object().required(),
    filters: Joi.array().items(Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid('=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'like', 'not_like').required(),
      value: Joi.any().required()
    })).optional()
  }),

  updateChart: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    chart_type: Joi.string().valid(
      'bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 
      'bubble', 'radar', 'polar', 'table', 'metric', 'gauge'
    ).optional(),
    configuration: Joi.object().optional(),
    filters: Joi.array().items(Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid('=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'like', 'not_like').required(),
      value: Joi.any().required()
    })).optional()
  }),

  // Category schemas
  createCategory: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    icon: Joi.string().max(50).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
      .messages({
        'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF0000)'
      }),
    parent_id: Joi.string().uuid().optional()
  }),

  updateCategory: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    icon: Joi.string().max(50).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
      .messages({
        'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF0000)'
      }),
    parent_id: Joi.string().uuid().optional().allow(null)
  }),

  // Webview schemas
  createWebview: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    slug: Joi.string().min(1).max(100).pattern(/^[a-z0-9-]+$/).required()
      .messages({
        'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens'
      }),
    branding: Joi.object({
      logo_url: Joi.string().uri().optional(),
      primary_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
      secondary_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
      custom_css: Joi.string().optional()
    }).optional(),
    settings: Joi.object({
      allow_public_access: Joi.boolean().default(false),
      require_authentication: Joi.boolean().default(true),
      show_navigation: Joi.boolean().default(true),
      show_search: Joi.boolean().default(true)
    }).optional()
  }),

  updateWebview: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    branding: Joi.object({
      logo_url: Joi.string().uri().optional().allow(''),
      primary_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
      secondary_color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
      custom_css: Joi.string().optional().allow('')
    }).optional(),
    settings: Joi.object({
      allow_public_access: Joi.boolean().optional(),
      require_authentication: Joi.boolean().optional(),
      show_navigation: Joi.boolean().optional(),
      show_search: Joi.boolean().optional()
    }).optional()
  }),

  // Data source schemas
  testConnection: Joi.object({
    type: Joi.string().required(),
    connection_config: Joi.object().required()
  }),

  createDatasource: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    type: Joi.string().required(),
    connection_config: Joi.object().required(),
    description: Joi.string().max(1000).optional().allow('')
  }),

  updateDatasource: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    connection_config: Joi.object().optional(),
    description: Joi.string().max(1000).optional().allow('')
  }),

  // Common schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(255).optional(),
    sort_by: Joi.string().max(100).optional(),
    sort_order: Joi.string().valid('asc', 'desc').default('asc')
  }),

  idParam: Joi.object({
    id: Joi.string().uuid().required()
  }),

  queryExecution: Joi.object({
    query: Joi.string().min(1).required(),
    parameters: Joi.object().optional(),
    limit: Joi.number().integer().min(1).max(10000).optional()
  })
};

/**
 * Validate request body against a schema
 */
export const validateRequest = (schemaName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = schemas[schemaName as keyof typeof schemas];
    
    if (!schema) {
      throw new ValidationError(`Validation schema '${schemaName}' not found`);
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

      throw new ValidationError('Validation failed', validationErrors);
    }

    // Replace request body with validated data
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters against a schema
 */
export const validateQuery = (schemaName: string = 'pagination') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = schemas[schemaName as keyof typeof schemas];
    
    if (!schema) {
      throw new ValidationError(`Query validation schema '${schemaName}' not found`);
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

      throw new ValidationError('Query validation failed', validationErrors);
    }

    // Replace query with validated data
    req.query = value;
    next();
  };
};

/**
 * Validate both body and query parameters
 */
export const validateBoth = (bodySchema: string, querySchema: string = 'pagination') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Validate body
    if (bodySchema) {
      const bodyValidation = schemas[bodySchema as keyof typeof schemas];
      if (bodyValidation) {
        const { error: bodyError, value: bodyValue } = bodyValidation.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (bodyError) {
          const validationErrors = bodyError.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }));

          throw new ValidationError('Body validation failed', validationErrors);
        }

        req.body = bodyValue;
      }
    }

    // Validate query
    if (querySchema) {
      const queryValidation = schemas[querySchema as keyof typeof schemas];
      if (queryValidation) {
        const { error: queryError, value: queryValue } = queryValidation.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (queryError) {
          const validationErrors = queryError.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }));

          throw new ValidationError('Query validation failed', validationErrors);
        }

        req.query = queryValue;
      }
    }

    next();
  };
};

/**
 * Validate URL parameters (like :id)
 */
export const validateParams = (schemaName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = schemas[schemaName as keyof typeof schemas];
    
    if (!schema) {
      throw new ValidationError(`Param validation schema '${schemaName}' not found`);
    }

    const { error, value } = schema.validate(req.params, {
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

      throw new ValidationError('Parameter validation failed', validationErrors);
    }

    req.params = value;
    next();
  };
};

/**
 * Custom validator for UUID parameters
 */
export const validateUuid = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    const uuidSchema = Joi.string().uuid().required();
    
    const { error } = uuidSchema.validate(value);
    
    if (error) {
      throw new ValidationError(`Invalid ${paramName} format`, [{
        field: paramName,
        message: `${paramName} must be a valid UUID`,
        type: 'string.uuid'
      }]);
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
      // Basic HTML sanitization (in production, use a proper HTML sanitization library)
      req.body[field] = req.body[field]
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');
    }
    next();
  };
};

/**
 * Validate file upload
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
} = {}) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = false } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as any;
    
    if (!files || Object.keys(files).length === 0) {
      if (required) {
        throw new ValidationError('File upload is required');
      }
      return next();
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (file.size > maxSize) {
      throw new ValidationError(`File size must not exceed ${maxSize / (1024 * 1024)}MB`);
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      throw new ValidationError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    next();
  };
};

export default {
  validateRequest,
  validateQuery,
  validateBoth,
  validateParams,
  validateUuid,
  sanitizeHtml,
  validateFileUpload,
  schemas
};