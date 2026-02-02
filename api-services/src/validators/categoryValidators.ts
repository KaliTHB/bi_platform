// File: api-services/src/validators/categoryValidators.ts

import Joi from 'joi';

// Category validation schema
const categorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name must not exceed 100 characters',
      'any.required': 'Category name is required'
    }),

  description: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),

  workspace_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Workspace ID must be a valid UUID',
      'any.required': 'Workspace ID is required'
    }),

  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF5733)'
    }),

  icon: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Icon name must not exceed 50 characters'
    }),

  is_active: Joi.boolean()
    .optional()
    .default(true),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order must be 0 or greater'
    })
});

// Category update schema (all fields optional except workspace_id)
const categoryUpdateSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Category name cannot be empty',
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name must not exceed 100 characters'
    }),

  description: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),

  workspace_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Workspace ID must be a valid UUID',
      'any.required': 'Workspace ID is required'
    }),

  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF5733)'
    }),

  icon: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Icon name must not exceed 50 characters'
    }),

  is_active: Joi.boolean()
    .optional(),

  sort_order: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order must be 0 or greater'
    })
});

/**
 * Validates category request data
 * @param data - The category data to validate
 * @param isUpdate - Whether this is an update operation (makes most fields optional)
 * @returns Joi validation result
 */
export const validateCategoryRequest = (data: any, isUpdate: boolean = false) => {
  const schema = isUpdate ? categoryUpdateSchema : categorySchema;
  
  return schema.validate(data, {
    abortEarly: false, // Return all validation errors, not just the first one
    stripUnknown: true // Remove unknown fields
  });
};

/**
 * Validates category query parameters
 * @param query - The query parameters to validate
 * @returns Joi validation result
 */
export const validateCategoryQuery = (query: any) => {
  const querySchema = Joi.object({
    workspace_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'Workspace ID must be a valid UUID'
      }),

    include_dashboards: Joi.string()
      .valid('true', 'false')
      .optional()
      .messages({
        'any.only': 'include_dashboards must be either "true" or "false"'
      }),

    user_accessible_only: Joi.string()
      .valid('true', 'false')
      .optional()
      .messages({
        'any.only': 'user_accessible_only must be either "true" or "false"'
      }),

    webview_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'Webview ID must be a valid UUID'
      }),

    is_active: Joi.string()
      .valid('true', 'false')
      .optional()
      .messages({
        'any.only': 'is_active must be either "true" or "false"'
      }),

    sort: Joi.string()
      .valid('name', 'created_at', 'updated_at', 'sort_order')
      .optional()
      .messages({
        'any.only': 'sort must be one of: name, created_at, updated_at, sort_order'
      }),

    order: Joi.string()
      .valid('asc', 'desc')
      .optional()
      .default('asc')
      .messages({
        'any.only': 'order must be either "asc" or "desc"'
      }),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .messages({
        'number.base': 'limit must be a number',
        'number.integer': 'limit must be an integer',
        'number.min': 'limit must be at least 1',
        'number.max': 'limit must not exceed 100'
      }),

    offset: Joi.number()
      .integer()
      .min(0)
      .optional()
      .default(0)
      .messages({
        'number.base': 'offset must be a number',
        'number.integer': 'offset must be an integer',
        'number.min': 'offset must be 0 or greater'
      })
  });

  return querySchema.validate(query, {
    abortEarly: false,
    stripUnknown: true
  });
};