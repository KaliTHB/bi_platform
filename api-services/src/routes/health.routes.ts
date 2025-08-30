// api-services/src/routes/health.routes.ts
import express from 'express';
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { PluginManager } from '../services/PluginManager';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import os from 'os';
import fs from 'fs';
import path from 'path';

const router = express.Router();

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    plugins: ServiceHealth;
    filesystem: ServiceHealth;
  };
  system: {
    memory: {
      used: number;
      free: number;
      total: number;
      percentage: number;
    };
    cpu: {
      load: number[];
      cores: number;
    };
    disk: {
      used: number;
      free: number;
      total: number;
      percentage: number;
    };
  };
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time?: number;
  error?: string;
  details?: any;
}

// Basic health check - lightweight for load balancers
router.get('/', asyncHandler(async (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'bi-platform-api'
  });
}));

// Detailed health check with all services
router.get('/detailed', asyncHandler(async (req: express.Request, res: express.Response) => {
  const startTime = Date.now();
  
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: await checkDatabase(),
      cache: await checkCache(),
      plugins: await checkPlugins(),
      filesystem: await checkFilesystem()
    },
    system: {
      memory: getMemoryInfo(),
      cpu: getCpuInfo(),
      disk: await getDiskInfo()
    }
  };

  // Determine overall status
  const serviceStatuses = Object.values(healthCheck.services).map(s => s.status);
  if (serviceStatuses.includes('unhealthy')) {
    healthCheck.status = 'unhealthy';
  } else if (serviceStatuses.includes('degraded')) {
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                    healthCheck.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthCheck);
}));

// Readiness check - for Kubernetes readiness probe
router.get('/ready', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    // Check critical services
    const dbHealth = await checkDatabase();
    const cacheHealth = await checkCache();
    
    if (dbHealth.status === 'unhealthy' || cacheHealth.status === 'unhealthy') {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth,
          cache: cacheHealth
        }
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}));

// Liveness check - for Kubernetes liveness probe
router.get('/live', asyncHandler(async (req: express.Request, res: express.Response) => {
  // Simple check to ensure process is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
}));

// System metrics endpoint
router.get('/metrics', asyncHandler(async (req: express.Request, res: express.Response) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      version: os.version(),
      hostname: os.hostname(),
      loadavg: os.loadavg(),
      freemem: os.freemem(),
      totalmem: os.totalmem(),
      cpus: os.cpus().length
    },
    node: {
      version: process.version,
      versions: process.versions
    }
  };

  res.json(metrics);
}));

// Database health check
async function checkDatabase(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const result = await DatabaseConfig.query('SELECT NOW() as current_time, version() as db_version');
    const responseTime = Date.now() - startTime;

    if (responseTime > 5000) {
      return {
        status: 'degraded',
        response_time: responseTime,
        details: {
          message: 'Database response time is high',
          db_version: result.rows[0]?.db_version?.split(' ')[0]
        }
      };
    }

    return {
      status: 'healthy',
      response_time: responseTime,
      details: {
        db_version: result.rows[0]?.db_version?.split(' ')[0],
        current_time: result.rows[0]?.current_time
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

// Cache health check
async function checkCache(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const testKey = `health_check_${Date.now()}`;
    const testValue = 'test';

    // Test write
    await CacheService.set(testKey, testValue, 10);
    
    // Test read
    const retrievedValue = await CacheService.get(testKey);
    
    // Test delete
    await CacheService.del(testKey);

    const responseTime = Date.now() - startTime;

    if (retrievedValue !== testValue) {
      return {
        status: 'unhealthy',
        response_time: responseTime,
        error: 'Cache read/write test failed'
      };
    }

    if (responseTime > 1000) {
      return {
        status: 'degraded',
        response_time: responseTime,
        details: {
          message: 'Cache response time is high'
        }
      };
    }

    return {
      status: 'healthy',
      response_time: responseTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time: Date.now() - startTime,
      error: error.message
    };
  }
}

// Plugin system health check
async function checkPlugins(): Promise<ServiceHealth> {
  try {
    const pluginStats = PluginManager.getPluginStats();
    
    if (pluginStats.dataSourcePlugins === 0 && pluginStats.chartPlugins === 0) {
      return {
        status: 'degraded',
        details: {
          message: 'No plugins loaded',
          stats: pluginStats
        }
      };
    }

    return {
      status: 'healthy',
      details: {
        data_source_plugins: pluginStats.dataSourcePlugins,
        chart_plugins: pluginStats.chartPlugins,
        categories: pluginStats.categories
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

// Filesystem health check
async function checkFilesystem(): Promise<ServiceHealth> {
  try {
    const tempDir = path.join(os.tmpdir(), 'bi-platform-health');
    const testFile = path.join(tempDir, `test_${Date.now()}.tmp`);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Test write
    fs.writeFileSync(testFile, 'health check test');
    
    // Test read
    const content = fs.readFileSync(testFile, 'utf8');
    
    // Test delete
    fs.unlinkSync(testFile);

    if (content !== 'health check test') {
      return {
        status: 'unhealthy',
        error: 'Filesystem read/write test failed'
      };
    }

    return {
      status: 'healthy',
      details: {
        temp_dir: tempDir,
        writable: true
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

// Get memory information
function getMemoryInfo() {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    used: Math.round(usedMemory / 1024 / 1024), // MB
    free: Math.round(freeMemory / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percentage: Math.round((usedMemory / totalMemory) * 100)
  };
}

// Get CPU information
function getCpuInfo() {
  return {
    load: os.loadavg(),
    cores: os.cpus().length
  };
}

// Get disk information
async function getDiskInfo() {
  try {
    const stats = fs.statSync(process.cwd());
    // Note: This is a simplified disk check
    // In production, you might want to use a library like 'node-disk-info'
    return {
      used: 0,
      free: 0,
      total: 0,
      percentage: 0
    };
  } catch (error) {
    return {
      used: 0,
      free: 0,
      total: 0,
      percentage: 0
    };
  }
}

export default router;