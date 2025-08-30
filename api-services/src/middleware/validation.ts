// api-services/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

// Validation schemas
const schemas = {
  // Authentication schemas
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    workspace_slug: Joi.string().optional()
  }),

  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one digit'
      }),
    first_name: Joi.string().min(1).max(50).required(),
    last_name: Joi.string().min(1).max(50).required(),
    invitation_token: Joi.string().optional()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    new_password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
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
    email: Joi.string().email().required(),
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
    type: Joi.string().valid('SOURCE', 'TRANSFORMATION').required(),
    data_source_id: Joi.string().uuid().when('type', {
      is: 'SOURCE',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    query_config: Joi.object().when('type', {
      is: 'SOURCE',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    transformation_config: Joi.object().when('type', {
      is: 'TRANSFORMATION',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    parent_dataset_id: Joi.string().uuid().when('type', {
      is: 'TRANSFORMATION',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    schema_config: Joi.object().optional(),
    row_level_security: Joi.object().optional(),
    cache_ttl: Joi.number().integer().min(0).max(86400).default(3600),
    role_permissions: Joi.array().items(
      Joi.object({
        role_id: Joi.string().uuid().required(),
        permission_type: Joi.string().valid('READ', 'WRITE', 'ADMIN').default('READ')
      })
    ).optional()
  }),

  updateDataset: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    query_config: Joi.object().optional(),
    transformation_config: Joi.object().optional(),
    schema_config: Joi.object().optional(),
    row_level_security: Joi.object().optional(),
    cache_ttl: Joi.number().integer().min(0).max(86400).optional()
  }),

  queryDataset: Joi.object({
    filters: Joi.array().items(
      Joi.object({
        column: Joi.string().required(),
        operator: Joi.string().valid(
          'equals', 'not_equals', 'contains', 'starts_with', 'ends_with',
          'greater_than', 'less_than', 'greater_equal', 'less_equal',
          'is_null', 'is_not_null', 'in', 'not_in'
        ).required(),
        value: Joi.any().when('operator', {
          is: Joi.valid('is_null', 'is_not_null'),
          then: Joi.optional(),
          otherwise: Joi.required()
        })
      })
    ).optional(),
    limit: Joi.number().integer().min(1).max(10000).default(100),
    offset: Joi.number().integer().min(0).default(0),
    columns: Joi.array().items(Joi.string()).optional()
  }),

  // Dashboard schemas
  createDashboard: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    slug: Joi.string().min(1).max(255).pattern(/^[a-z0-9-]+$/).required(),
    description: Joi.string().max(1000).optional().allow(''),
    category_id: Joi.string().uuid().optional(),
    layout_config: Joi.object().default({}),
    filter_config: Joi.array().default([]),
    is_public: Joi.boolean().default(false),
    is_featured: Joi.boolean().default(false)
  }),

  updateDashboard: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    slug: Joi.string().min(1).max(255).pattern(/^[a-z0-9-]+$/).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    category_id: Joi.string().uuid().optional(),
    layout_config: Joi.object().optional(),
    filter_config: Joi.array().optional(),
    is_public: Joi.boolean().optional(),
    is_featured: Joi.boolean().optional()
  }),

  duplicateDashboard: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    slug: Joi.string().min(1).max(255).pattern(/^[a-z0-9-]+$/).required()
  }),

  // Chart schemas
  createChart: Joi.object({
    dashboard_id: Joi.string().uuid().required(),
    dataset_id: Joi.string().uuid().required(),
    name: Joi.string().min(1).max(255).required(),
    type: Joi.string().min(1).max(50).required(),
    config: Joi.object().required(),
    position: Joi.object({
      x: Joi.number().integer().min(0).required(),
      y: Joi.number().integer().min(0).required(),
      width: Joi.number().integer().min(1).max(12).required(),
      height: Joi.number().integer().min(1).max(12).required()
    }).required()
  }),

  updateChart: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    type: Joi.string().min(1).max(50).optional(),
    config: Joi.object().optional(),
    position: Joi.object({
      x: Joi.number().integer().min(0).required(),
      y: Joi.number().integer().min(0).required(),
      width: Joi.number().integer().min(1).max(12).required(),
      height: Joi.number().integer().min(1).max(12).required()
    }).optional()
  }),

  // Data source schemas
  createDataSource: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    type: Joi.string().min(1).max(50).required(),
    connection_config: Joi.object().required()
  }),

  updateDataSource: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    connection_config: Joi.object().optional()
  }),

  testDataSource: Joi.object({
    type: Joi.string().min(1).max(50).required(),
    connection_config: Joi.object().required()
  }),

  // Category schemas
  createCategory: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional().allow(''),
    icon: Joi.string().max(100).optional(),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
    parent_id: Joi.string().uuid().optional(),
    sort_order: Joi.number().integer().min(0).default(0)
  }),

  updateCategory: Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional().allow(''),
    icon: Joi.string().max(100).optional(),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional(),
    parent_id: Joi.string().uuid().optional(),
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
 * Validate request based on schema name
 */
export const validateRequest = (schemaName: string) => {
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

    // Replace body with validated and sanitized data
    req.body = value;
    next();
  };
};

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