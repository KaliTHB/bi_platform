import { Pool } from 'pg';
import { databaseConfig } from '../config/database';
import { logger } from './logger';

// Create the database connection pool
export const db = new Pool(databaseConfig);

// Test the connection on startup
db.on('connect', () => {
  logger.info('✅ Database client connected');
});

db.on('error', (err) => {
  logger.error('❌ Database connection error:', err);
});

// Export for use in services
export default db;