// Fixed api-services/src/utils/database.ts
// Ensure proper Pool instance creation and export

import { Pool } from 'pg';
import { databaseConfig, queryTimeouts } from '../config/database';
import { logger } from './logger';

console.log('🔍 Database utility initialization...');
console.log('Database config type:', typeof databaseConfig);
console.log('Database config keys:', Object.keys(databaseConfig));

// Create the database connection pool - ensure it's a proper Pool instance
export const db: Pool = new Pool(databaseConfig);

// Verify the Pool instance
console.log('🔍 Pool instance created');
console.log('Pool type:', typeof db);
console.log('Pool constructor:', db.constructor.name);
console.log('Pool has query method:', typeof db.query === 'function');

// Enhanced query method with timeout support
export const queryWithTimeout = async (
  text: string, 
  params?: any[], 
  timeoutMs: number = queryTimeouts.default
): Promise<any> => {
  const client = await db.connect();
  
  try {
    // Set statement timeout for this connection
    await client.query(`SET statement_timeout = ${timeoutMs}`);
    
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Test the connection on startup
db.on('connect', (client) => {
  logger.info('✅ Database client connected', {
    service: 'bi-platform-api'
  });
});

db.on('error', (err) => {
  logger.error('❌ Database connection error:', {
    service: 'bi-platform-api',
    error: err.message,
    stack: err.stack
  });
});

// Connection test function
export const testConnection = async (): Promise<boolean> => {
  try {
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    logger.info('Database connection test successful', {
      service: 'bi-platform-api',
      currentTime: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(' ')[0] // Just get PostgreSQL version number
    });
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', {
      service: 'bi-platform-api',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
};

// Run connection test after a short delay
setTimeout(async () => {
  const isConnected = await testConnection();
  if (!isConnected) {
    logger.error('⚠️ Database connection test failed - check your configuration');
  }
}, 1000);

// Graceful shutdown handlers
const gracefulShutdown = async () => {
  logger.info('🔄 Closing database pool...');
  try {
    await db.end();
    logger.info('✅ Database pool closed successfully');
  } catch (error) {
    logger.error('❌ Error closing database pool:', error);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Export the Pool instance as default
export default db;

// Export pool info for debugging
export const getPoolInfo = () => ({
  totalCount: db.totalCount,
  idleCount: db.idleCount,
  waitingCount: db.waitingCount
});