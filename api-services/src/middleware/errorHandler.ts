// api-services/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authentication';
import { logger } from '../utils/logger';

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
    user_id: req.user?.user_id,
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
      logger.error('Operational error occurred', {
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
      logger.warn('Client error occurred', {
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
    // Unexpected error
    logger.error('Unexpected error occurred', {
      ...errorContext,
      error: {
        name: error.name || 'UnknownError',
        message: error.message,
        stack: error.stack
      }
    });
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    message: getErrorMessage(error),
    errors: formatErrors(error),
    request_id: requestId,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Send error response
  const statusCode = getStatusCode(error);
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(
    `Route ${req.method} ${req.path} not found`,
    { 
      method: req.method,
      path: req.path,
      available_endpoints: 'Check /api/docs for available endpoints'
    }
  );
  
  next(error);
}

/**
 * Request timeout handler
 */
export function timeoutHandler(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set request timeout
    req.setTimeout(timeout, () => {
      const error = new AppError(
        'Request timeout',
        408,
        'REQUEST_TIMEOUT',
        { timeout_ms: timeout }
      );
      next(error);
    });

    // Set response timeout
    res.setTimeout(timeout, () => {
      if (!res.headersSent) {
        const error = new AppError(
          'Response timeout',
          504,
          'RESPONSE_TIMEOUT',
          { timeout_ms: timeout }
        );
        next(error);
      }
    });

    next();
  };
}

/**
 * Rate limiting error handler
 */
export function rateLimitErrorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new RateLimitError(
    'Too many requests from this IP, please try again later',
    {
      ip: req.ip,
      reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
  );
  
  next(error);
}

// Helper functions

function getErrorMessage(error: any): string {
  if (error instanceof AppError) {
    return error.message;
  }

  // Handle common error types
  if (error.name === 'ValidationError') {
    return 'Validation failed';
  }
  
  if (error.name === 'CastError') {
    return 'Invalid data format';
  }
  
  if (error.name === 'JsonWebTokenError') {
    return 'Invalid authentication token';
  }
  
  if (error.name === 'TokenExpiredError') {
    return 'Authentication token expired';
  }

  if (error.code === 'ECONNREFUSED') {
    return 'Database connection failed';
  }

  // Default message for unknown errors
  return process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : error.message || 'Unknown error occurred';
}

function getStatusCode(error: any): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Handle common error types
  if (error.name === 'ValidationError') {
    return 400;
  }
  
  if (error.name === 'CastError') {
    return 400;
  }
  
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return 401;
  }

  if (error.code === 'ECONNREFUSED') {
    return 503;
  }

  // Default to 500 for unknown errors
  return 500;
}

function formatErrors(error: any): ApiError[] {
  const errors: ApiError[] = [];

  if (error instanceof AppError) {
    errors.push({
      code: error.code,
      message: error.message,
      details: error.details,
      field: error instanceof ValidationError ? error.field : undefined
    });
  } else if (error.name === 'ValidationError' && error.errors) {
    // Handle mongoose validation errors
    Object.keys(error.errors).forEach(field => {
      const fieldError = error.errors[field];
      errors.push({
        code: 'VALIDATION_ERROR',
        message: fieldError.message,
        field: field,
        path: fieldError.path
      });
    });
  } else {
    // Generic error
    errors.push({
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  return errors;
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields from logging
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'auth_token',
    'access_token',
    'refresh_token'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Validation helper functions
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function validateEmail(email: string, fieldName: string = 'email'): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`${fieldName} must be a valid email address`, fieldName);
  }
}

export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value.length < min || value.length > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max} characters`,
      fieldName,
      { min, max, current_length: value.length }
    );
  }
}

export function validateUUID(value: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`, fieldName);
  }
}

export function validateEnum(
  value: string,
  allowedValues: string[],
  fieldName: string
): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName,
      { allowed_values: allowedValues }
    );
  }
}