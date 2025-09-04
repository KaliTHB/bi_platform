// api-services/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware to handle validation errors from express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { logger } from '../utils/logger';

/**
 * Middleware to handle validation errors from express-validator
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error: ValidationError) => ({
      field: 'field' in error ? error.field : error.param,
      code: 'VALIDATION_ERROR',
      message: error.msg,
      value: 'value' in error ? error.value : undefined,
    }));

    logger.warn('Validation failed', {
      method: req.method,
      url: req.originalUrl,
      errors: validationErrors,
      body: req.body,
      params: req.params,
      query: req.query,
    });

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors,
    });
    return;
  }
  
  next();
};