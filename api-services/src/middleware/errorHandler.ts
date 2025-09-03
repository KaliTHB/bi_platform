// File: api-services/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Interface for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: {
    user_id?: string;
    id?: string;
    workspace_id?: string;
    roles?: string[];
    email?: string;
  };
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  path?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors: ApiError[];
  request_id?: string;
  timestamp: string;
  path: string;
  method: string;
}

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public field?: string;

  constructor(message: string, field?: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.field = field;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * Async handler wrapper to catch async errors in route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'client_secret', 'refresh_token', 'access_token', 'api_key'
  ];

  const sanitized = { ...body };

  function sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return sanitizeObject(sanitized);
}

/**
 * Global error handling middleware
 * Must be placed after all routes and other middleware
 */
export function globalErrorHandler(
  error: any,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Generate request ID if not present
  const requestId = req.headers['x-request-id'] as string || 
                   generateRequestId();

  // Log the error with context
  const errorContext = {
    request_id: requestId,
    user_id: req.user?.user_id || req.user?.id,
    method: req.method,
    path: req.path,
    query: req.query,
    body: sanitizeBody(req.body),
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    workspace_id: req.headers['x-workspace-id']
  };

  // Different logging levels based on error type
  if (error instanceof AppError && error.isOperational) {
    if (error.statusCode >= 500) {
      logger.error('💥 Operational error occurred', {
        ...errorContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          stack: error.stack
        }
      });
    } else {
      logger.warn('⚠️  Client error occurred', {
        ...errorContext,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode
        }
      });
    }
  } else {
    // Programming errors or unexpected errors
    logger.error('💀 Unexpected error occurred', {
      ...errorContext,
      error: {
        name: error.name || 'UnknownError',
        message: error.message || 'An unexpected error occurred',
        stack: error.stack
      }
    });
  }

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Prepare error response
  let errorResponse: ErrorResponse;

  if (error instanceof AppError && error.isOperational) {
    // Known operational errors
    errorResponse = {
      success: false,
      message: error.message,
      errors: [{
        code: error.code,
        message: error.message,
        details: isDevelopment ? error.details : undefined,
        field: error instanceof ValidationError ? error.field : undefined
      }],
      request_id: requestId,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };

    res.status(error.statusCode).json(errorResponse);
  } else {
    // Unknown errors - don't leak information
    errorResponse = {
      success: false,
      message: isDevelopment ? error.message : 'Internal server error',
      errors: [{
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'An internal error occurred',
        details: isDevelopment ? error.stack : undefined
      }],
      request_id: requestId,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };

    res.status(500).json(errorResponse);
  }
}

/**
 * Handle 404 errors for routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  logger.warn('🔍 Route not found', {
    request_id: requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    user_agent: req.get('User-Agent')
  });

  const errorResponse: ErrorResponse = {
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    errors: [{
      code: 'ROUTE_NOT_FOUND',
      message: `The requested route ${req.method} ${req.path} does not exist`
    }],
    request_id: requestId,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  res.status(404).json(errorResponse);
}

// Additional error handling utilities
export function createValidationErrors(errors: Array<{ field: string; message: string; code?: string }>): ValidationError[] {
  return errors.map(error => new ValidationError(error.message, error.field));
}

export function handleDatabaseError(error: any): AppError {
  // Handle common database errors
  if (error.code === '23505') { // Unique constraint violation
    return new ConflictError('Resource already exists');
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    return new ValidationError('Invalid reference to related resource');
  }
  
  if (error.code === '23502') { // Not null constraint violation
    return new ValidationError('Required field is missing');
  }

  // Generic database error
  return new AppError('Database error occurred', 500, 'DATABASE_ERROR');
}

export default {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  createValidationErrors,
  handleDatabaseError
};