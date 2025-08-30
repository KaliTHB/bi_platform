// File: api-services/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '1'), // Use different db for rate limiting
});

export const rateLimitMiddleware = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix?: string;
}) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: { error: options.message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const workspace_id = req.user?.workspace_id || 'anonymous';
      const user_id = req.user?.id || 'anonymous';
      return `${options.keyPrefix || 'rl'}:${workspace_id}:${user_id}`;
    }
  });
};