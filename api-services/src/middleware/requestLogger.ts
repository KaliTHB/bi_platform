// File: api-services/src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
}

/**
 * Request logging middleware
 * Logs all incoming requests and their responses
 */
export function requestLogger(req: LoggedRequest, res: Response, next: NextFunction): void {
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Set request ID in headers
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  logger.info('📥 Incoming request', {
    request_id: requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    content_type: req.get('Content-Type'),
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - (req.startTime || Date.now());
    const statusCode = res.statusCode;

    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : 
                    statusCode >= 400 ? 'warn' : 
                    'info';

    // Log response
    logger[logLevel]('📤 Outgoing response', {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status_code: statusCode,
      duration_ms: duration,
      content_length: res.get('Content-Length'),
      user_id: (req as any).user?.user_id || (req as any).user?.id,
      workspace_id: req.headers['x-workspace-id'],
      timestamp: new Date().toISOString()
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'client_secret', 'refresh_token', 'access_token', 'api_key'
  ];

  const sanitized = { ...body };

  // Recursively sanitize object
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

export default requestLogger;