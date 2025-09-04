// api-services/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'boolean' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

interface ValidationSchema {
  [key: string]: ValidationRule[];
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation schemas
const validationSchemas: ValidationSchema = {
  login: [
    {
      field: 'email',
      required: true,
      type: 'email',
      maxLength: 255
    },
    {
      field: 'password',
      required: true,
      type: 'string',
      minLength: 1
    },
    {
      field: 'workspace_slug',
      required: false,
      type: 'string',
      maxLength: 100
    }
  ],
  register: [
    {
      field: 'username',
      required: true,
      type: 'string',
      minLength: 3,
      maxLength: 50
    },
    {
      field: 'email',
      required: true,
      type: 'email',
      maxLength: 255
    },
    {
      field: 'password',
      required: true,
      type: 'string',
      minLength: 8
    },
    {
      field: 'first_name',
      required: true,
      type: 'string',
      maxLength: 50
    },
    {
      field: 'last_name',
      required: true,
      type: 'string',
      maxLength: 50
    }
  ]
};

// Validation function
const validateField = (value: any, rule: ValidationRule): string | null => {
  const { field, required, type, minLength, maxLength, pattern, custom } = rule;

  // Check if field is required
  if (required && (value === undefined || value === null || value === '')) {
    return `${field} is required`;
  }

  // If value is empty and not required, skip other validations
  if (!required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  if (type) {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${field} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number' && (!isNaN(Number(value)))) {
          return `${field} must be a number`;
        }
        break;
      case 'email':
        if (typeof value !== 'string' || !emailRegex.test(value)) {
          return `${field} must be a valid email address`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${field} must be a boolean`;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return `${field} must be an array`;
        }
        break;
    }
  }

  // String length validations
  if (typeof value === 'string') {
    if (minLength && value.length < minLength) {
      return `${field} must be at least ${minLength} characters long`;
    }
    if (maxLength && value.length > maxLength) {
      return `${field} must be at most ${maxLength} characters long`;
    }
  }

  // Pattern validation
  if (pattern && typeof value === 'string' && !pattern.test(value)) {
    return `${field} format is invalid`;
  }

  // Custom validation
  if (custom) {
    const result = custom(value);
    if (result !== true) {
      return typeof result === 'string' ? result : `${field} validation failed`;
    }
  }

  return null;
};

// Main validation middleware function
function validateRequest(schemaName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const schema = validationSchemas[schemaName];
    
    if (!schema) {
      logger.error(`Validation schema '${schemaName}' not found`);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [{
          code: 'VALIDATION_SCHEMA_NOT_FOUND',
          message: 'Validation configuration error'
        }]
      });
      return;
    }

    const errors: Array<{ field: string; message: string }> = [];
    const data = req.body;

    // Validate each field according to the schema
    schema.forEach(rule => {
      const value = data[rule.field];
      const error = validateField(value, rule);
      
      if (error) {
        errors.push({
          field: rule.field,
          message: error
        });
      }
    });

    // If there are validation errors, return them
    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors,
        body: req.body
      });

      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.map(err => ({
          code: 'VALIDATION_ERROR',
          field: err.field,
          message: err.message
        }))
      });
      return;
    }

    // Validation passed, continue to next middleware
    next();
  };
}

// Helper function to add custom validation schemas
const addValidationSchema = (name: string, rules: ValidationRule[]): void => {
  validationSchemas[name] = rules;
};

// Named exports
export { validateRequest, addValidationSchema };

// Default export
export default validateRequest;