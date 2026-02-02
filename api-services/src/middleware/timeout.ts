// File: api-services/src/middleware/timeout.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Request timeout middleware
 * Automatically times out requests that take too long
 */
export function timeoutHandler(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('⏰ Request timeout', {
          method: req.method,
          path: req.path,
          timeout_ms: timeout,
          ip: req.ip,
          user_agent: req.get('User-Agent'),
          request_id: req.headers['x-request-id'],
          timestamp: new Date().toISOString()
        });

        res.status(408).json({
          success: false,
          error: 'Request Timeout',
          message: `Request timed out after ${timeout}ms`,
          code: 'REQUEST_TIMEOUT',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        });
      }
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    // Clear timeout when response is closed (client disconnected)
    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    next();
  };
}

/**
 * Custom timeout handler for specific routes
 * Usage: router.get('/slow-endpoint', customTimeout(60000), handler)
 */
export function customTimeout(timeout: number) {
  return timeoutHandler(timeout);
}

export default timeoutHandler;