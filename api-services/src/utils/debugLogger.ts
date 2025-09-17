// File: api-services/src/utils/debugLogger.ts
import { logger } from './logger';

class DebugLogger {
  private static instance: DebugLogger;
  private debugEnabled: boolean;

  private constructor() {
    this.debugEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG_LOGS === 'true';
  }

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  // 🎮 Controller Actions - Track what users are doing
  logControllerStart(controller: string, action: string, req: any) {
    if (!this.debugEnabled) return;
    
    logger.debug('🎮 Controller Start', {
      type: 'CONTROLLER_ACTION',
      controller,
      action,
      user_id: req.user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      request_id: req.requestId,
      ip: req.ip,
      params: this.sanitizeParams(req.params),
      query: this.sanitizeParams(req.query),
      body: req.method !== 'GET' ? this.sanitizeParams(req.body) : undefined,
      timestamp: new Date().toISOString()
    });
  }

  logControllerEnd(controller: string, action: string, req: any, result?: any, error?: Error) {
    if (!this.debugEnabled) return;
    
    const level = error ? 'error' : 'debug';
    logger[level]('🎮 Controller End', {
      type: 'CONTROLLER_RESULT',
      controller,
      action,
      user_id: req.user?.user_id,
      workspace_id: req.headers['X-Workspace-ID'],
      request_id: req.requestId,
      success: !error,
      result_type: result ? typeof result : 'void',
      result_size: this.getDataSize(result),
      error: error ? {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        code: (error as any).code
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 🗃️ Database Operations - Track all DB queries and performance
  logDatabaseQuery(operation: string, table: string, query?: string, params?: any[], duration?: number) {
    if (!this.debugEnabled && duration! < 500) return; // Only log slow queries in production
    
    const level = duration && duration > 1000 ? 'warn' : 'debug';
    logger[level]('🗃️ Database Query', {
      type: 'DATABASE_OPERATION',
      operation,
      table,
      query: query ? this.sanitizeQuery(query) : undefined,
      params: params ? this.sanitizeParams(params) : undefined,
      duration_ms: duration,
      slow: duration && duration > 500,
      timestamp: new Date().toISOString()
    });
  }

  logDatabaseError(operation: string, error: Error, query?: string, params?: any[]) {
    logger.error('🗃️ Database Error', {
      type: 'DATABASE_ERROR',
      operation,
      error: {
        message: error.message,
        code: (error as any).code,
        detail: (error as any).detail
      },
      query: query ? this.sanitizeQuery(query) : undefined,
      params: params ? this.sanitizeParams(params) : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // ⚡ Cache Operations - Track Redis performance
  logCacheOperation(operation: 'GET' | 'SET' | 'DEL' | 'CLEAR', key: string, hit?: boolean, ttl?: number, duration?: number) {
    if (!this.debugEnabled) return;
    
    logger.debug('⚡ Cache Operation', {
      type: 'CACHE_OPERATION',
      operation,
      key: this.sanitizeCacheKey(key),
      hit,
      ttl,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
  }

  // 🔧 Service Methods - Track business logic execution
  logServiceStart(service: string, method: string, params?: any) {
    if (!this.debugEnabled) return;
    
    logger.debug('🔧 Service Start', {
      type: 'SERVICE_START',
      service,
      method,
      params: this.sanitizeParams(params),
      timestamp: new Date().toISOString()
    });
  }

  logServiceEnd(service: string, method: string, result?: any, duration?: number, error?: Error) {
    if (!this.debugEnabled && !error) return;
    
    const level = error ? 'error' : 'debug';
    logger[level]('🔧 Service End', {
      type: 'SERVICE_END',
      service,
      method,
      success: !error,
      result_type: result ? typeof result : 'void',
      result_size: this.getDataSize(result),
      duration_ms: duration,
      error: error ? {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 🔐 Authentication & Authorization
  logAuth(event: string, userId?: string, success: boolean = true, details?: any) {
    const level = success ? 'info' : 'warn';
    logger[level]('🔐 Auth Event', {
      type: 'AUTH_EVENT',
      event,
      user_id: userId,
      success,
      details: this.sanitizeParams(details),
      timestamp: new Date().toISOString()
    });
  }

  // 📊 Business Events - Track important business operations
  logBusinessEvent(event: string, entityType: string, entityId: string, userId?: string, details?: any) {
    logger.info('📊 Business Event', {
      type: 'BUSINESS_EVENT',
      event,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      details: this.sanitizeParams(details),
      timestamp: new Date().toISOString()
    });
  }

  // 🔌 Plugin Operations
  logPlugin(plugin: string, operation: string, success: boolean, details?: any, error?: Error) {
    const level = error ? 'error' : success ? 'info' : 'warn';
    logger[level]('🔌 Plugin Operation', {
      type: 'PLUGIN_OPERATION',
      plugin,
      operation,
      success,
      details,
      error: error ? {
        message: error.message,
        code: (error as any).code
      } : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 🌐 External API Calls
  logExternalAPI(url: string, method: string, status?: number, duration?: number, error?: Error) {
    const level = error || (status && status >= 400) ? 'error' : 'info';
    logger[level]('🌐 External API', {
      type: 'EXTERNAL_API',
      url: this.sanitizeUrl(url),
      method,
      status,
      duration_ms: duration,
      error: error ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 📁 File Operations
  logFileOperation(operation: string, filename: string, size?: number, userId?: string, error?: Error) {
    const level = error ? 'error' : 'info';
    logger[level]('📁 File Operation', {
      type: 'FILE_OPERATION',
      operation,
      filename: this.sanitizeFilename(filename),
      size_bytes: size,
      user_id: userId,
      error: error ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 🚨 Security Events
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) {
    logger.warn('🚨 Security Event', {
      type: 'SECURITY_EVENT',
      event,
      severity,
      details: this.sanitizeParams(details),
      timestamp: new Date().toISOString()
    });
  }

  // ⚙️ Background Jobs
  logJob(jobType: string, jobId: string, status: 'START' | 'PROGRESS' | 'COMPLETE' | 'FAILED', details?: any) {
    const level = status === 'FAILED' ? 'error' : 'info';
    logger[level]('⚙️ Background Job', {
      type: 'BACKGROUND_JOB',
      job_type: jobType,
      job_id: jobId,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // 📈 Performance Metrics
  logPerformance(operation: string, duration: number, details?: any) {
    const level = duration > 2000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    if (!this.debugEnabled && level === 'debug') return;
    
    logger[level]('📈 Performance', {
      type: 'PERFORMANCE_METRIC',
      operation,
      duration_ms: duration,
      slow: duration > 1000,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // ✅ Validation Results
  logValidation(type: string, success: boolean, errors?: string[], data?: any) {
    if (!this.debugEnabled && success) return;
    
    const level = success ? 'debug' : 'warn';
    logger[level]('✅ Validation', {
      type: 'VALIDATION',
      validation_type: type,
      success,
      error_count: errors?.length || 0,
      errors: errors?.slice(0, 3), // Only first 3 errors
      data_keys: data ? Object.keys(data).slice(0, 10) : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // Helper method to wrap async functions with logging
  async logAsyncOperation<T>(
    operation: string,
    service: string,
    fn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    const startTime = Date.now();
    this.logServiceStart(service, operation, params);
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.logServiceEnd(service, operation, result, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logServiceEnd(service, operation, undefined, duration, error as Error);
      throw error;
    }
  }

  // Helper method to wrap sync functions with logging
  logSyncOperation<T>(
    operation: string,
    service: string,
    fn: () => T,
    params?: any
  ): T {
    const startTime = Date.now();
    this.logServiceStart(service, operation, params);
    
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      this.logServiceEnd(service, operation, result, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logServiceEnd(service, operation, undefined, duration, error as Error);
      throw error;
    }
  }

  // Private helper methods
  private sanitizeParams(params: any): any {
    if (!params) return undefined;
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'authorization'];
    
    if (Array.isArray(params)) {
      return params.map(item => this.sanitizeParams(item));
    }
    
    if (typeof params === 'object') {
      const sanitized = { ...params };
      for (const key in sanitized) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeParams(sanitized[key]);
        }
      }
      return sanitized;
    }
    
    return params;
  }

  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from SQL queries
    return query
      .replace(/'[^']*'/g, "'***'")
      .replace(/"[^"]*"/g, '"***"')
      .substring(0, 500);
  }

  private sanitizeCacheKey(key: string): string {
    return key.length > 100 ? key.substring(0, 100) + '...' : key;
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ['token', 'key', 'secret', 'auth', 'password'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      return urlObj.toString();
    } catch {
      return url.replace(/([?&])(token|key|secret|auth|password)=[^&]*/gi, '$1$2=[REDACTED]');
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.split('/').pop() || filename;
  }

  private getDataSize(data: any): number | string {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object') return Object.keys(data).length;
    if (typeof data === 'string') return data.length;
    return 'unknown';
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

// Decorator for automatic controller logging
export function LogController(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  const controllerName = target.constructor.name;

  descriptor.value = async function (...args: any[]) {
    const [req] = args;
    const startTime = Date.now();

    debugLogger.logControllerStart(controllerName, propertyName, req);

    try {
      const result = await method.apply(this, args);
      const duration = Date.now() - startTime;
      debugLogger.logControllerEnd(controllerName, propertyName, req, result);
      debugLogger.logPerformance(`${controllerName}.${propertyName}`, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      debugLogger.logControllerEnd(controllerName, propertyName, req, undefined, error as Error);
      debugLogger.logPerformance(`${controllerName}.${propertyName}`, duration, { error: true });
      throw error;
    }
  };

  return descriptor;
}

// Enhanced request logging middleware
export function enhancedRequestLogger(req: any, res: any, next: any) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || require('uuid').v4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  logger.info('📥 Request Start', {
    request_id: requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.method !== 'GET' ? debugLogger.sanitizeParams(req.body) : undefined,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    content_type: req.get('Content-Type'),
    workspace_id: req.get('X-Workspace-ID'),
    timestamp: new Date().toISOString()
  });

  // Override response end to log completion
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('📤 Request End', {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status_code: statusCode,
      duration_ms: duration,
      user_id: req.user?.user_id,
      workspace_id: req.get('X-Workspace-ID'),
      response_size: res.get('Content-Length'),
      timestamp: new Date().toISOString()
    });

    // Log slow requests
    if (duration > 1000) {
      debugLogger.logPerformance('slow_request', duration, {
        method: req.method,
        path: req.path,
        status_code: statusCode
      });
    }

    originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}