// api-services/src/services/DatabaseService.ts
import { Pool, PoolClient, QueryResult } from 'pg';
import { databaseConfig } from '../config/database';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;
  private static instance: DatabaseService;

  constructor(customConfig?: any) {
    // Use custom config if provided, otherwise use default config
    const config = customConfig || databaseConfig;
    this.pool = new Pool(config);
    this.setupEventHandlers();
  }

  // Singleton pattern for shared instance
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private setupEventHandlers(): void {
    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', (client) => {
      logger.debug('Database client connected');
    });

    this.pool.on('remove', (client) => {
      logger.debug('Database client removed');
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query error', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params?.length ? '[' + params.length + ' params]' : undefined,
        duration,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
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
      const result = await this.query('SELECT 1 as health');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }
}

// Create and export a default instance for convenience
export const db = DatabaseService.getInstance();
export default db;