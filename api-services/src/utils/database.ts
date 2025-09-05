// Fixed api-services/src/utils/database.ts
// Comprehensive fix for database connection issues

import { Pool, PoolConfig } from 'pg';
import { databaseConfig } from '../config/database';
import { logger } from './logger';

console.log('🔧 Initializing database connection...');

// Validate that we have a proper config
if (!databaseConfig || typeof databaseConfig !== 'object') {
  throw new Error('Invalid database configuration');
}

console.log('✅ Database config validated');
console.log('Config keys:', Object.keys(databaseConfig));

// Create Pool instance with proper error handling
let db: Pool;

try {
  db = new Pool(databaseConfig as PoolConfig);
  console.log('✅ Pool instance created');
  console.log('Pool type:', typeof db);
  console.log('Pool constructor:', db.constructor.name);
  console.log('Pool has query method:', typeof db.query === 'function');
} catch (error) {
  console.error('❌ Failed to create Pool instance:', error);
  throw new Error(`Failed to create database pool: ${error.message}`);
}

// Verify the Pool has required methods
if (!db || typeof db.query !== 'function') {
  throw new Error('Database pool does not have required query method');
}

// Set up event handlers
db.on('connect', (client) => {
  logger.info('✅ Database client connected', {
    service: 'bi-platform-api',
    totalCount: db.totalCount,
    idleCount: db.idleCount,
    waitingCount: db.waitingCount
  });
});

db.on('error', (err) => {
  logger.error('❌ Database pool error:', {
    service: 'bi-platform-api',
    error: err.message,
    stack: err.stack
  });
});

db.on('acquire', () => {
  logger.debug('Database client acquired');
});

db.on('release', () => {
  logger.debug('Database client released');
});

// Enhanced query method with logging and error handling
export const queryWithLogging = async (
  text: string, 
  params?: any[]
): Promise<any> => {
  const start = Date.now();
  const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    logger.debug('Executing query', {
      queryId,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      paramCount: params?.length || 0
    });

    const result = await db.query(text, params);
    const duration = Date.now() - start;

    logger.debug('Query completed', {
      queryId,
      duration,
      rowCount: result.rowCount
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Query failed', {
      queryId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      paramCount: params?.length || 0
    });
    throw error;
  }
};

// Connection test function
export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing database connection...');
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Connection test successful');
    logger.info('Database connection test successful', {
      service: 'bi-platform-api',
      currentTime: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(' ')[0]
    });
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    logger.error('Database connection test failed:', {
      service: 'bi-platform-api',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

// Pool health check
export const getPoolHealth = () => {
  return {
    totalCount: db.totalCount,
    idleCount: db.idleCount,
    waitingCount: db.waitingCount,
    isHealthy: db.totalCount > 0,
    hasQuery: typeof db.query === 'function'
  };
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🔄 Shutting down database pool...');
  logger.info('Shutting down database pool');
  
  try {
    await db.end();
    console.log('✅ Database pool closed successfully');
    logger.info('Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    logger.error('Error closing database pool:', error);
  }
};

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', gracefulShutdown);

// Initial connection test
setTimeout(async () => {
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('⚠️ Initial database connection test failed');
    logger.error('Initial database connection test failed - check your configuration');
  }
}, 100);

// Export the Pool instance - CRITICAL: Make sure this is the actual Pool
export { db };
export default db;

// Additional validation export for debugging
export const validateDbExport = () => {
  return {
    isPool: db instanceof Pool,
    hasQuery: typeof db.query === 'function',
    constructor: db.constructor.name,
    methods: Object.getOwnPropertyNames(Object.getPrototypeOf(db))
  };
};

console.log('✅ Database utils initialized successfully');
console.log('Exported db type:', typeof db);
console.log('Exported db has query:', typeof db.query === 'function');