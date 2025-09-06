// Fixed api-services/src/utils/database.ts
// Comprehensive fix for database connection issues with enhanced debugging

import { Pool, PoolConfig, QueryResult } from 'pg';
import { databaseConfig } from '../config/database';
import { logger } from './logger';

console.log('🔧 Initializing database connection...');

// Debug environment variables loading
console.log('🔍 Environment Variables Check:', {
  DB_HOST: process.env.DB_HOST || 'NOT SET',
  DB_PORT: process.env.DB_PORT || 'NOT SET',
  DB_NAME: process.env.DB_NAME || 'NOT SET',  
  DB_USER: process.env.DB_USER || 'NOT SET',
  DB_PASSWORD: process.env.DB_PASSWORD ? '***MASKED***' : 'NOT SET',
  NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  PWD: process.cwd()
});

// Validate that we have a proper config
if (!databaseConfig || typeof databaseConfig !== 'object') {
  throw new Error('Invalid database configuration');
}

console.log('✅ Database config validated');
console.log('📋 Config details:', {
  host: databaseConfig.host,
  port: databaseConfig.port,
  database: databaseConfig.database,
  user: databaseConfig.user,
  max: databaseConfig.max,
  connectionTimeoutMillis: databaseConfig.connectionTimeoutMillis
});

// Create Pool instance with proper error handling
let db: Pool;

try {
  db = new Pool(databaseConfig as PoolConfig);
  console.log('✅ Pool instance created');
  console.log('🔧 Pool details:', {
    type: typeof db,
    constructor: db.constructor.name,
    hasQuery: typeof db.query === 'function'
  });
} catch (error: any) {
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
    code: err.code,
    stack: err.stack
  });
});

db.on('acquire', () => {
  logger.debug('📥 Database client acquired');
});

db.on('release', () => {
  logger.debug('📤 Database client released');
});

// Enhanced query method with logging and error handling
export const queryWithLogging = async (
  text: string, 
  params?: any[]
): Promise<QueryResult<any>> => {
  const start = Date.now();
  const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  try {
    logger.debug('🔍 Executing query', {
      queryId,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      paramCount: params?.length || 0
    });

    const result = await db.query(text, params);
    const duration = Date.now() - start;

    logger.debug('✅ Query completed', {
      queryId,
      duration,
      rowCount: result.rowCount
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error('❌ Query failed', {
      queryId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error.code,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      paramCount: params?.length || 0
    });
    throw error;
  }
};

// Connection test function with enhanced debugging
export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Testing database connection...');
    logger.info('Testing database connection');
    
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ Connection test successful');
    console.log('📊 Connection details:', {
      currentTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version.split(' ')[0]
    });
    
    logger.info('Database connection test successful', {
      service: 'bi-platform-api',
      currentTime: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(' ')[0]
    });
    
    return true;
  } catch (error: any) {
    console.error('❌ Connection test failed:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
    });
    
    logger.error('Database connection test failed:', {
      service: 'bi-platform-api',
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port
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
    isHealthy: db.totalCount >= 0,
    hasQuery: typeof db.query === 'function'
  };
};

// Get connection info for debugging
export const getConnectionInfo = () => {
  return {
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.user,
    ssl: databaseConfig.ssl,
    max: databaseConfig.max,
    connectionTimeoutMillis: databaseConfig.connectionTimeoutMillis,
    poolHealth: getPoolHealth(),
    envLoaded: !!process.env.DB_HOST
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
  } catch (error: any) {
    console.error('❌ Error closing database pool:', error);
    logger.error('Error closing database pool:', error);
  }
};

// Register shutdown handlers
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', gracefulShutdown);

// Initial connection test with retry logic
const performInitialConnectionTest = async () => {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🔍 Initial connection test attempt ${retryCount + 1}/${maxRetries}...`);
      const isConnected = await testConnection();
      
      if (isConnected) {
        console.log('✅ Initial database connection successful');
        return;
      }
    } catch (error) {
      console.error(`❌ Connection attempt ${retryCount + 1} failed:`, error);
    }
    
    retryCount++;
    if (retryCount < maxRetries) {
      console.log(`⏳ Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.error('⚠️ All initial database connection attempts failed');
  console.error('🔧 Please check:');
  console.error('   1. PostgreSQL is running on', databaseConfig.host + ':' + databaseConfig.port);
  console.error('   2. Database', databaseConfig.database, 'exists');
  console.error('   3. User', databaseConfig.user, 'has access');
  console.error('   4. Environment variables are loaded correctly');
  console.error('   5. .env file is in the correct location (api-services/.env)');
};

// Run initial connection test after a short delay
setTimeout(performInitialConnectionTest, 100);

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
console.log('📤 Export validation:', {
  dbType: typeof db,
  hasQuery: typeof db.query === 'function',
  isPool: db instanceof Pool
});