# api-services/src/services/QueryExecutionService.ts
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';
import { PluginManager } from './PluginManager';
import crypto from 'crypto';

interface QueryOptions {
  filters?: Array<{
    column: string;
    operator: string;
    value: any;
  }>;
  limit?: number;
  offset?: number;
  columns?: string[];
  user_id: string;
  use_cache?: boolean;
}

interface QueryResult {
  data: any[];
  columns: Array<{
    name: string;
    type: string;
  }>;
  total_rows: number;
  execution_time: number;
  cached: boolean;
  query_hash?: string;
}

export class QueryExecutionService {
  
  /**
   * Execute query against a dataset with caching and security
   */
  static async executeDatasetQuery(datasetId: string, options: QueryOptions): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Get dataset information
      const dataset = await this.getDatasetInfo(datasetId);
      
      // Check user permissions
      await this.checkQueryPermissions(datasetId, options.user_id);
      
      // Generate query hash for caching
      const queryHash = this.generateQueryHash(datasetId, options);
      
      // Try to get from cache first
      if (options.use_cache !== false) {
        const cached = await this.getCachedResult(queryHash, dataset.cache_ttl);
        if (cached) {
          return {
            ...cached,
            execution_time: Date.now() - startTime,
            cached: true,
            query_hash: queryHash
          };
        }
      }
      
      // Execute query
      const result = await this.executeQuery(dataset, options);
      
      // Cache result
      if (options.use_cache !== false && dataset.cache_ttl > 0) {
        await this.cacheResult(queryHash, result, dataset.cache_ttl);
      }
      
      // Log query execution
      await this.logQueryExecution(datasetId, options.user_id, {
        execution_time: Date.now() - startTime,
        row_count: result.data.length,
        cached: false
      });
      
      return {
        ...result,
        execution_time: Date.now() - startTime,
        cached: false,
        query_hash: queryHash
      };
    } catch (error) {
      logger.error('Query execution failed', { datasetId, error, options });
      throw error;
    }
  }

  /**
   * Get dataset information
   */
  private static async getDatasetInfo(datasetId: string): Promise<any> {
    const result = await DatabaseConfig.query(
      `SELECT d.*, ds.type as data_source_type, ds.connection_config
       FROM datasets d
       LEFT JOIN data_sources ds ON d.data_source_id = ds.id
       WHERE d.id = $1 AND d.is_active = true`,
      [datasetId]
    );

    if (result.rows.length === 0) {
      throw new Error('Dataset not found or inactive');
    }

    return result.rows[0];
  }

  /**
   * Check user permissions for dataset query
   */
  private static async checkQueryPermissions(datasetId: string, userId: string): Promise<void> {
    // Check if user is super admin
    const userResult = await DatabaseConfig.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0]?.role === 'SUPER_ADMIN') {
      return; // Super admin has access to everything
    }

    // Check dataset permissions
    const permissionResult = await DatabaseConfig.query(
      `SELECT COUNT(*) as count
       FROM dataset_permissions dp
       JOIN user_workspace_roles uwr ON dp.role_id = uwr.role_id
       JOIN datasets d ON dp.dataset_id = d.id
       WHERE dp.dataset_id = $1 AND uwr.user_id = $2 AND d.is_active = true`,
      [datasetId, userId]
    );

    if (parseInt(permissionResult.rows[0].count) === 0) {
      throw new Error('Insufficient permissions to query this dataset');
    }
  }

  /**
   * Generate query hash for caching
   */
  private static generateQueryHash(datasetId: string, options: QueryOptions): string {
    const hashInput = JSON.stringify({
      dataset_id: datasetId,
      filters: options.filters || [],
      limit: options.limit || null,
      offset: options.offset || null,
      columns: options.columns || null
    });

    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 32);
  }

  /**
   * Get cached query result
   */
  private static async getCachedResult(queryHash: string, cacheTtl: number): Promise<any | null> {
    const cacheKey = `query_result:${queryHash}`;
    return await CacheService.get(cacheKey);
  }

  /**
   * Cache query result
   */
  private static async cacheResult(queryHash: string, result: any, cacheTtl: number): Promise<void> {
    const cacheKey = `query_result:${queryHash}`;
    await CacheService.set(cacheKey, {
      data: result.data,
      columns: result.columns,
      total_rows: result.total_rows
    }, cacheTtl);
  }

  /**
   * Execute query against dataset
   */
  private static async executeQuery(dataset: any, options: QueryOptions): Promise<Omit<QueryResult, 'execution_time' | 'cached'>> {
    if (dataset.type === 'SOURCE') {
      return await this.executeSourceQuery(dataset, options);
    } else {
      return await this.executeTransformationQuery(dataset, options);
    }
  }

  /**
   * Execute query against source dataset
   */
  private static async executeSourceQuery(dataset: any, options: QueryOptions): Promise<Omit<QueryResult, 'execution_time' | 'cached'>> {
    const plugin = PluginManager.getDataSourcePlugin(dataset.data_source_type);
    if (!plugin) {
      throw new Error(`Unsupported data source type: ${dataset.data_source_type}`);
    }

    const connection = await plugin.connect(dataset.connection_config);
    
    try {
      const baseQuery = dataset.query_config?.query;
      if (!baseQuery) {
        throw new Error('No query configured for dataset');
      }

      // Build query with filters and pagination
      let finalQuery = baseQuery;
      const queryParams: any[] = [];

      // Apply row-level security
      if (dataset.row_level_security && Object.keys(dataset.row_level_security).length > 0) {
        finalQuery = this.applyRowLevelSecurity(finalQuery, dataset.row_level_security, options.user_id);
      }

      // Apply filters
      if (options.filters && options.filters.length > 0) {
        const filterConditions = this.buildFilterConditions(options.filters, queryParams);
        finalQuery = `SELECT * FROM (${finalQuery}) AS base_query WHERE ${filterConditions}`;
      }

      // Apply column selection
      if (options.columns && options.columns.length > 0) {
        const columnList = options.columns.map(col => `"${col}"`).join(', ');
        finalQuery = `SELECT ${columnList} FROM (${finalQuery}) AS base_query`;
      }

      // Get total count (before pagination)
      const countQuery = `SELECT COUNT(*) as total FROM (${finalQuery}) AS count_query`;
      const countResult = await plugin.executeQuery(connection, countQuery, queryParams);
      const totalRows = parseInt(countResult.rows[0].total);

      // Apply pagination
      if (options.limit) {
        finalQuery += ` LIMIT ${options.limit}`;
      }
      if (options.offset) {
        finalQuery += ` OFFSET ${options.offset}`;
      }

      // Execute final query
      const result = await plugin.executeQuery(connection, finalQuery, queryParams);

      return {
        data: result.rows,
        columns: result.columns.map(col => ({
          name: col.name,
          type: col.type
        })),
        total_rows: totalRows
      };
    } finally {
      await plugin.disconnect(connection);
    }
  }

  /**
   * Execute query against transformation dataset
   */
  private static async executeTransformationQuery(dataset: any, options: QueryOptions): Promise<Omit<QueryResult, 'execution_time' | 'cached'>> {
    if (!dataset.parent_dataset_id) {
      throw new Error('No parent dataset configured for transformation');
    }

    // Get parent dataset data
    const parentResult = await this.executeDatasetQuery(dataset.parent_dataset_id, {
      user_id: options.user_id,
      use_cache: true // Always try to use cache for parent queries
    });

    // Apply transformations
    const transformConfig = dataset.transformation_config;
    if (!transformConfig) {
      return {
        data: parentResult.data,
        columns: parentResult.columns,
        total_rows: parentResult.total_rows
      };
    }

    let resultData = [...parentResult.data];
    let resultColumns = [...parentResult.columns];

    // Apply transformation filters first
    if (transformConfig.filters) {
      resultData = this.applyDataFilters(resultData, transformConfig.filters);
    }

    // Apply user query filters
    if (options.filters && options.filters.length > 0) {
      resultData = this.applyDataFilters(resultData, options.filters);
    }

    // Store total before pagination
    const totalRows = resultData.length;

    // Apply column selection
    if (transformConfig.select_columns) {
      const selectedCols = transformConfig.select_columns;
      resultColumns = resultColumns.filter(col => selectedCols.includes(col.name));
      resultData = resultData.map(row => {
        const filteredRow: any = {};
        selectedCols.forEach(col => {
          if (row.hasOwnProperty(col)) {
            filteredRow[col] = row[col];
          }
        });
        return filteredRow;
      });
    }

    // Apply computed columns
    if (transformConfig.computed_columns) {
      for (const computed of transformConfig.computed_columns) {
        resultColumns.push({
          name: computed.name,
          type: computed.type || 'string'
        });
        
        resultData = resultData.map(row => ({
          ...row,
          [computed.name]: this.evaluateExpression(row, computed.expression)
        }));
      }
    }

    // Apply column renames
    if (transformConfig.renamed_columns) {
      for (const rename of transformConfig.renamed_columns) {
        const colIndex = resultColumns.findIndex(col => col.name === rename.from);
        if (colIndex >= 0) {
          resultColumns[colIndex].name = rename.to;
        }
        
        resultData = resultData.map(row => {
          if (row.hasOwnProperty(rename.from)) {
            const newRow = { ...row };
            newRow[rename.to] = newRow[rename.from];
            delete newRow[rename.from];
            return newRow;
          }
          return row;
        });
      }
    }

    // Apply user column selection
    if (options.columns && options.columns.length > 0) {
      const selectedCols = options.columns;
      resultColumns = resultColumns.filter(col => selectedCols.includes(col.name));
      resultData = resultData.map(row => {
        const filteredRow: any = {};
        selectedCols.forEach(col => {
          if (row.hasOwnProperty(col)) {
            filteredRow[col] = row[col];
          }
        });
        return filteredRow;
      });
    }

    // Apply pagination
    if (options.offset) {
      resultData = resultData.slice(options.offset);
    }
    if (options.limit) {
      resultData = resultData.slice(0, options.limit);
    }

    return {
      data: resultData,
      columns: resultColumns,
      total_rows: totalRows
    };
  }

  /**
   * Apply row-level security rules
   */
  private static applyRowLevelSecurity(query: string, rlsConfig: any, userId: string): string {
    // Implement row-level security based on configuration
    // This is a simplified implementation
    let secureQuery = query;

    if (rlsConfig.user_column) {
      secureQuery = `SELECT * FROM (${query}) AS rls_query WHERE ${rlsConfig.user_column} = '${userId}'`;
    }

    if (rlsConfig.conditions) {
      const conditions = rlsConfig.conditions.map((cond: any) => {
        return `${cond.column} ${cond.operator} '${cond.value}'`;
      }).join(' AND ');
      
      secureQuery = `SELECT * FROM (${secureQuery}) AS rls_query WHERE ${conditions}`;
    }

    return secureQuery;
  }

  /**
   * Build SQL filter conditions
   */
  private static buildFilterConditions(filters: any[], params: any[]): string {
    return filters.map((filter, index) => {
      const paramIndex = params.length + 1;
      params.push(filter.value);
      
      switch (filter.operator) {
        case 'equals':
          return `"${filter.column}" = $${paramIndex}`;
        case 'not_equals':
          return `"${filter.column}" != $${paramIndex}`;
        case 'contains':
          return `"${filter.column}"::text ILIKE $${paramIndex}`;
        case 'starts_with':
          return `"${filter.column}"::text ILIKE $${paramIndex}`;
        case 'ends_with':
          return `"${filter.column}"::text ILIKE $${paramIndex}`;
        case 'greater_than':
          return `"${filter.column}" > $${paramIndex}`;
        case 'less_than':
          return `"${filter.column}" < $${paramIndex}`;
        case 'greater_equal':
          return `"${filter.column}" >= $${paramIndex}`;
        case 'less_equal':
          return `"${filter.column}" <= $${paramIndex}`;
        case 'is_null':
          params.pop(); // Remove the parameter since we don't need it
          return `"${filter.column}" IS NULL`;
        case 'is_not_null':
          params.pop(); // Remove the parameter since we don't need it
          return `"${filter.column}" IS NOT NULL`;
        default:
          params.pop(); // Remove unused parameter
          return 'TRUE'; // Default to no filter
      }
    }).join(' AND ');
  }

  /**
   * Apply filters to in-memory data
   */
  private static applyDataFilters(data: any[], filters: any[]): any[] {
    return data.filter(row => {
      return filters.every(filter => {
        const value = row[filter.column];
        
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'not_equals':
            return value !== filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
          case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filter.value);
          case 'less_than':
            return Number(value) < Number(filter.value);
          case 'greater_equal':
            return Number(value) >= Number(filter.value);
          case 'less_equal':
            return Number(value) <= Number(filter.value);
          case 'is_null':
            return value === null || value === undefined;
          case 'is_not_null':
            return value !== null && value !== undefined;
          default:
            return true;
        }
      });
    });
  }

  /**
   * Evaluate expression for computed columns
   */
  private static evaluateExpression(row: any, expression: string): any {
    try {
      // Replace column references with actual values
      let evalExpression = expression;
      Object.keys(row).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        evalExpression = evalExpression.replace(regex, JSON.stringify(row[key]));
      });

      // Basic safety check
      if (!/^[\d\s+\-*/.(),'"'{}]+$/.test(evalExpression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, ''))) {
        throw new Error('Invalid expression');
      }

      const func = new Function(`return ${evalExpression}`);
      return func();
    } catch (error) {
      logger.error('Failed to evaluate expression', { expression, error });
      return null;
    }
  }

  /**
   * Log query execution for audit and monitoring
   */
  private static async logQueryExecution(datasetId: string, userId: string, stats: any): Promise<void> {
    try {
      await DatabaseConfig.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'DATASET_QUERY', 'dataset', datasetId, JSON.stringify(stats)]
      );
    } catch (error) {
      logger.error('Failed to log query execution', { datasetId, userId, error });
    }
  }

  /**
   * Cancel running query
   */
  static async cancelQuery(queryHash: string, userId: string): Promise<void> {
    // Implementation would depend on the data source plugin capabilities
    // For now, just log the cancellation attempt
    logger.info('Query cancellation requested', { queryHash, userId });
    
    // Remove from cache to prevent serving stale results
    const cacheKey = `query_result:${queryHash}`;
    await CacheService.del(cacheKey);
  }

  /**
   * Get query execution statistics
   */
  static async getQueryStats(datasetId: string, timeframe: string = '24h'): Promise<any> {
    const timeCondition = timeframe === '24h' ? 
      'created_at >= NOW() - INTERVAL \'24 hours\'' :
      timeframe === '7d' ?
      'created_at >= NOW() - INTERVAL \'7 days\'' :
      'created_at >= NOW() - INTERVAL \'30 days\'';

    const result = await DatabaseConfig.query(
      `SELECT 
         COUNT(*) as total_queries,
         AVG((details->>'execution_time')::int) as avg_execution_time,
         SUM((details->>'row_count')::int) as total_rows_returned,
         COUNT(DISTINCT user_id) as unique_users
       FROM audit_logs
       WHERE resource_type = 'dataset' 
         AND resource_id = $1 
         AND action = 'DATASET_QUERY'
         AND ${timeCondition}`,
      [datasetId]
    );

    return result.rows[0];
  }
}