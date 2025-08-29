import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Create rate limiter
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '3600') * 1000, // Default: 1 hour
  max: parseInt(process.env.RATE_LIMIT_MAX || '1000'), // Default: 1000 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errors: [
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
      },
    ],
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
  skip: (req: Request): boolean => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

// Stricter rate limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    errors: [
      {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Authentication rate limit exceeded',
      },
    ],
  },
  standardHeaders: true,
  legacyHeaders: false,
});