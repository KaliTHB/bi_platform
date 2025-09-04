// api-services/src/utils/database.ts
import { DatabaseService } from '../services/DatabaseService';
import { QueryResult } from 'pg';

// Export Database class that wraps DatabaseService for backward compatibility
export class Database {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.databaseService.query<T>(text, params);
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    return this.databaseService.transaction(callback);
  }

  async healthCheck(): Promise<boolean> {
    return this.databaseService.healthCheck();
  }

  async close(): Promise<void> {
    return this.databaseService.close();
  }

  getPool() {
    return this.databaseService.getPool();
  }
}

// Export default instance
export default new Database();