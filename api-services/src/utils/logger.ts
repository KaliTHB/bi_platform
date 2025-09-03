// File: api-services/src/utils/logger.ts
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

// Create logger instance - console only
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaString}`;
    })
  ),
  defaultMeta: { service: 'bi-platform-api' },
  transports: [
    // Only console transport - no file logging
    new winston.transports.Console()
  ],
});

// Audit logging function
export const logAudit = (action: string, resourceType: string, resourceId: string, userId: string, details?: any) => {
  logger.info('AUDIT_LOG', {
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    user_id: userId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Performance logging function
export const logPerformance = (operation: string, duration: number, details?: any) => {
  logger.info('PERFORMANCE_LOG', {
    operation,
    duration,
    details,
    timestamp: new Date().toISOString()
  });
};

// Security event logging
export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
  logger.warn('SECURITY_EVENT', {
    event,
    severity,
    details,
    timestamp: new Date().toISOString()
  });
};

// Error logging with context
export const logError = (error: Error | string, context?: any) => {
  if (error instanceof Error) {
    logger.error(error.message, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  } else {
    logger.error(error, {
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// API request logging middleware
export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP_REQUEST', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      user_agent: req.get('User-Agent'),
      ip: req.ip,
      user_id: req.user?.id
    });
  });
  
  next();
};

export { logger };
export default logger;