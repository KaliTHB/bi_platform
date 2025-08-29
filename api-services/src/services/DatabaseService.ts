-- api-services/src/services/DatabaseService.ts
import { Pool, PoolClient } from 'pg';
import { getDatabase } from '../config/database';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = getDatabase();
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.ENABLE_QUERY_LOGGING === 'true') {
        logger.info('Database query executed', {
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration,
          rows: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query error', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        error: error.message,
        params: params ? JSON.stringify(params).substring(0, 200) : undefined
      });
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getConnectionInfo() {
    try {
      const result = await this.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          inet_server_addr() as server_addr,
          inet_server_port() as server_port,
          version() as version
      `);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get connection info:', error);
      return null;
    }
  }
}