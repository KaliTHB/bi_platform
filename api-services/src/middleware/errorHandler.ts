// api-services/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements ApiError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements ApiError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';

  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT_ERROR';

  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends Error implements ApiError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.details = details;
  }
}

export class ExternalServiceError extends Error implements ApiError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  service: string;

  constructor(message: string, service: string) {
    super(message);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

export const errorHandler = (error: ApiError, req: Request, res: Response, next: NextFunction) => {
  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
    workspaceId: (req as any).workspace?.id,
    details: error.details
  };

  if (error.statusCode && error.statusCode >= 500) {
    logger.error('Server Error', errorDetails);
  } else if (error.statusCode && error.statusCode >= 400) {
    logger.warn('Client Error', errorDetails);
  } else {
    logger.error('Unhandled Error', errorDetails);
  }

  // Determine status code
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';

  // Prepare response
  const response: any = {
    error: {
      message: error.message,
      code,
      timestamp: new Date().toISOString()
    }
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
    if (error.details) {
      response.error.details = error.details;
    }
  }

  // Handle specific database errors
  if (error.name === 'QueryFailedError' || error.message?.includes('duplicate key')) {
    response.error.message = 'Database constraint violation';
    response.error.code = 'CONSTRAINT_VIOLATION';
    return res.status(409).json(response);
  }

  if (error.message?.includes('violates foreign key constraint')) {
    response.error.message = 'Referenced resource not found';
    response.error.code = 'FOREIGN_KEY_VIOLATION';
    return res.status(400).json(response);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    response.error.message = 'Invalid token';
    response.error.code = 'INVALID_TOKEN';
    return res.status(401).json(response);
  }

  if (error.name === 'TokenExpiredError') {
    response.error.message = 'Token expired';
    response.error.code = 'TOKEN_EXPIRED';
    return res.status(401).json(response);
  }

  // Handle validation errors
  if (error.name === 'ValidationError' && error.details) {
    response.error.validation = error.details;
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString()
    }
  });
};