// Fixed api-services/src/config/database.ts
// Remove invalid PoolConfig properties that don't exist in pg library

import { config } from 'dotenv';
import { PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// Load environment variables FIRST from current directory
config({ path: '.env' });

// Corrected database configuration - only valid PoolConfig properties
export const databaseConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bi_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // Pool settings - Only valid PoolConfig properties
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
  
  // Valid PoolConfig properties for connection handling
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // Application name for connection identification
  application_name: process.env.APP_NAME || 'bi-platform-api'
};

// Separate timeout configurations (not part of PoolConfig)
export const queryTimeouts = {
  default: 30000, // 30 seconds
  longRunning: 300000, // 5 minutes for complex queries
  statement: 30000
};

// Log database configuration (without sensitive data)
logger.info('🏗️ Creating database connection pool with config:', {
  service: 'bi-platform-api',
  host: databaseConfig.host,
  port: databaseConfig.port,
  database: databaseConfig.database,
  user: databaseConfig.user,
  max: databaseConfig.max,
  connectionTimeoutMillis: databaseConfig.connectionTimeoutMillis,
  env_loaded: !!process.env.DB_HOST // This will show if env vars were loaded
});

export default databaseConfig;