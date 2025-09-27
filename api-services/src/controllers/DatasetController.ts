// api-services/src/controllers/DatasetController.ts
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../utils/database';
import { asyncHandler } from '../middleware/errorHandler';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    email: string;
    workspace_id: string;
  };
}

interface Dataset {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'source' | 'virtual' | 'sql' | 'transformation';
  schema_json?: any;
  workspace_id: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  row_count?: number;
  is_active: boolean;
}

export class DatasetController {
  constructor() {
    logger.info('🔧 DatasetController: Starting initialization...');
    
    // ✅ Validate database connection
    if (!db) {
      const error = new Error('DatasetController: Database connection is required but was null/undefined');
      logger.error('❌ DatasetController constructor error:', error.message);
      throw error;
    }
    
    if (typeof db.query !== 'function') {
      const error = new Error(`DatasetController: Invalid database connection - query method is ${typeof db.query}, expected function`);
      logger.error('❌ DatasetController constructor error:', {
        message: error.message,
        databaseType: typeof db,
        hasQuery: typeof db.query,
        constructorName: db.constructor?.name
      });
      throw error;
    }

    logger.info('✅ DatasetController: Database connection validated');
    logger.info('✅ DatasetController: Initialization complete');
  }

  /**
   * GET /api/datasets
   * Get all datasets with filtering and pagination
   */
  async getDatasets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('📊 DatasetController: Getting datasets', {
        user_id: req.user?.user_id,
        workspace_id: req.headers['x-workspace-id'],
        query: req.query
      });

      const {
        workspace_id,
        page = 1,
        limit = 10,
        search,
        type,
        sort_by = 'updated_at',
        sort_direction = 'desc',
        include_schema = false,
        created_by,
        datasource_id
      } = req.query;

      // Validate workspace_id
      if (!workspace_id) {
        return res.status(400).json({
          success: false,
          message: 'workspace_id is required',
          errors: [{ code: 'MISSING_WORKSPACE_ID', message: 'workspace_id parameter is required' }]
        });
      }

      // Build query
      let query = `
        SELECT 
          d.id,
          d.name,
          d.display_name,
          d.description,
          d.type,
          d.workspace_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.is_active,
          u.username as owner_name,
          u.email as owner_email
          ${include_schema === 'true' ? ', d.schema_json' : ''}
        FROM datasets d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.workspace_id = $1 AND d.is_active = true
      `;

      const queryParams: any[] = [workspace_id];
      let paramCount = 1;

      // Add filters
      if (search) {
        paramCount++;
        query += ` AND (d.name ILIKE $${paramCount} OR d.display_name ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      if (type) {
        paramCount++;
        query += ` AND d.type = $${paramCount}`;
        queryParams.push(type);
      }

      if (created_by) {
        paramCount++;
        query += ` AND d.created_by = $${paramCount}`;
        queryParams.push(created_by);
      }

      if (datasource_id) {
        paramCount++;
        query += ` AND d.id IN (
          SELECT dataset_id FROM dataset_datasources 
          WHERE datasource_id = $${paramCount}
        )`;
        queryParams.push(datasource_id);
      }

      // Add sorting
      const validSortColumns = ['name', 'display_name', 'type', 'created_at', 'updated_at', 'row_count'];
      const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'updated_at';
      const sortDir = sort_direction === 'asc' ? 'ASC' : 'DESC';
      query += ` ORDER BY d.${sortColumn} ${sortDir}`;

      // Add pagination
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
      const offset = (pageNum - 1) * limitNum;

      paramCount++;
      query += ` LIMIT $${paramCount}`;
      queryParams.push(limitNum);

      paramCount++;
      query += ` OFFSET $${paramCount}`;
      queryParams.push(offset);

      // Execute query
      const result = await db.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM datasets d
        WHERE d.workspace_id = $1 AND d.is_active = true
        ${search ? `AND (d.name ILIKE '%${search}%' OR d.display_name ILIKE '%${search}%' OR d.description ILIKE '%${search}%')` : ''}
        ${type ? `AND d.type = '${type}'` : ''}
        ${created_by ? `AND d.created_by = '${created_by}'` : ''}
      `;
      const countResult = await db.query(countQuery, [workspace_id]);
      const totalCount = parseInt(countResult.rows[0].total);

      // Format response
      const datasets = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        description: row.description,
        type: row.type,
        workspace_id: row.workspace_id,
        owner: {
          id: row.created_by,
          name: row.owner_name,
          email: row.owner_email
        },
        created_at: row.created_at,
        updated_at: row.updated_at,
        row_count: row.row_count,
        is_active: row.is_active,
        schema_json: include_schema === 'true' ? row.schema_json : undefined
      }));

      res.json({
        success: true,
        data: {
          datasets,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            total_pages: Math.ceil(totalCount / limitNum),
            has_next: pageNum < Math.ceil(totalCount / limitNum),
            has_previous: pageNum > 1
          }
        }
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error getting datasets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get datasets',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * 🔥 LIVE DATA ONLY SCHEMA POPULATION - No mock data
   * GET /api/datasets/:id?include_schema=true
   */
  async getDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { include_schema = false } = req.query;

      logger.info(`📊 Getting dataset ${id}, include_schema: ${include_schema}`);

      // Get dataset with datasource information
      const query = `
        SELECT 
          d.*,
          u.username as owner_name,
          u.email as owner_email,
          ds.id as datasource_id,
          ds.name as datasource_name,
          ds.plugin_name as datasource_type,
          ds.connection_config
        FROM datasets d
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN datasources ds ON d.datasource_id = ds.id
        WHERE d.id = $1 AND d.is_active = true
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
      }

      const dataset = result.rows[0];
      let schemaJson = dataset.schema_json;

      // 🔥 LIVE DATA SCHEMA POPULATION - Only if schema is missing
      if (include_schema === 'true') {
        logger.info(`🔍 Schema requested for dataset ${id} (${dataset.name})`);
        
        if (this.shouldPopulateSchema(schemaJson)) {
          logger.info(`📋 Attempting to populate schema from live data for dataset ${id}...`);
          
          try {
            // Validate dataset has required information
            const validationResult = this.validateDatasetForSchemaPopulation(dataset);
            if (!validationResult.valid) {
              return res.status(400).json({
                success: false,
                message: 'Cannot populate schema - dataset configuration invalid',
                errors: validationResult.errors
              });
            }

            const populatedSchema = await this.populateLiveSchema(dataset);
            
            if (populatedSchema && populatedSchema.columns.length > 0) {
              // Update the database with populated schema
              const updateQuery = `
                UPDATE datasets 
                SET schema_json = $1, updated_at = NOW()
                WHERE id = $2
              `;
              
              await db.query(updateQuery, [JSON.stringify(populatedSchema), id]);
              schemaJson = populatedSchema;
              
              logger.info(`✅ Schema populated successfully from live data for dataset ${id}`, {
                columns: populatedSchema.columns.length,
                method: populatedSchema.table_info?.population_method,
                datasourceType: dataset.datasource_type
              });
            } else {
              // No schema could be populated - return error
              return res.status(422).json({
                success: false,
                message: 'Cannot populate schema - no live data found',
                errors: [{ 
                  code: 'NO_SCHEMA_DATA', 
                  message: `Table '${dataset.name}' does not exist or has no columns in the connected datasource` 
                }]
              });
            }
          } catch (error) {
            logger.error(`❌ Error populating schema for dataset ${id}:`, error);
            
            // Return specific error based on the type of failure
            if (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('table')) {
              return res.status(404).json({
                success: false,
                message: 'Table or view not found in datasource',
                errors: [{ 
                  code: 'TABLE_NOT_FOUND', 
                  message: `Table '${dataset.name}' does not exist in the connected datasource` 
                }]
              });
            }
            
            if (error.message.includes('permission') || error.message.includes('access')) {
              return res.status(403).json({
                success: false,
                message: 'Access denied to datasource',
                errors: [{ 
                  code: 'ACCESS_DENIED', 
                  message: `No permission to access table '${dataset.name}' in the datasource` 
                }]
              });
            }
            
            if (error.message.includes('connection') || error.message.includes('timeout')) {
              return res.status(503).json({
                success: false,
                message: 'Datasource connection failed',
                errors: [{ 
                  code: 'CONNECTION_FAILED', 
                  message: 'Could not connect to the datasource to retrieve schema' 
                }]
              });
            }
            
            // Generic error
            return res.status(500).json({
              success: false,
              message: 'Failed to populate schema from datasource',
              errors: [{ 
                code: 'SCHEMA_POPULATION_FAILED', 
                message: error.message 
              }]
            });
          }
        } else {
          logger.info(`📋 Schema already exists for dataset ${id}, using cached version`);
        }
      }

      // Return successful response
      res.json({
        success: true,
        data: {
          id: dataset.id,
          name: dataset.name,
          display_name: dataset.display_name,
          description: dataset.description,
          type: dataset.type,
          workspace_id: dataset.workspace_id,
          datasource_id: dataset.datasource_id,
          owner: {
            id: dataset.created_by,
            name: dataset.owner_name,
            email: dataset.owner_email
          },
          created_at: dataset.created_at,
          updated_at: dataset.updated_at,
          row_count: dataset.row_count,
          is_active: dataset.is_active,
          schema_json: include_schema === 'true' ? schemaJson : undefined
        }
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error getting dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * 🔥 VALIDATE DATASET FOR SCHEMA POPULATION
   */
  private validateDatasetForSchemaPopulation(dataset: any): { valid: boolean; errors: any[] } {
    const errors = [];

    // Check if dataset has a name/table
    if (!dataset.name || dataset.name.trim() === '') {
      errors.push({
        code: 'MISSING_TABLE_NAME',
        message: 'Dataset must have a table name to populate schema'
      });
    }

    // Check if dataset has datasource connection
    if (!dataset.datasource_id) {
      errors.push({
        code: 'MISSING_DATASOURCE',
        message: 'Dataset must be connected to a datasource to populate schema'
      });
    }

    // Check if datasource type is supported
    if (dataset.datasource_type && !this.isSupportedDatasourceType(dataset.datasource_type)) {
      errors.push({
        code: 'UNSUPPORTED_DATASOURCE',
        message: `Datasource type '${dataset.datasource_type}' is not supported for automatic schema population`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 🔥 LIVE SCHEMA POPULATION - Only from real data sources
   */
  private async populateLiveSchema(dataset: any): Promise<any | null> {
    const datasourceType = dataset.datasource_type?.toLowerCase() || 'unknown';
    const tableName = dataset.name;

    logger.info(`🔍 Populating live schema for ${tableName} on ${datasourceType} datasource`);

    // Only support relational databases for now - they have reliable schema introspection
    if (this.isRelationalDatabase(datasourceType)) {
      return await this.populateLiveRelationalSchema(tableName, datasourceType);
    }

    // For non-relational databases, throw error - no mock data
    throw new Error(`Schema population for ${datasourceType} databases is not yet supported. Only relational databases (PostgreSQL, MySQL, etc.) are currently supported.`);
  }

  /**
   * 🔥 LIVE RELATIONAL DATABASE SCHEMA POPULATION - Real data only
   */
  private async populateLiveRelationalSchema(tableName: string, datasourceType: string): Promise<any | null> {
    logger.info(`📋 Populating live relational schema for ${tableName} (${datasourceType})`);

    // Strategy 1: Try information_schema (most reliable)
    try {
      const schema = await this.getSchemaFromInformationSchema(tableName, datasourceType);
      if (schema) {
        logger.info(`✅ Successfully got schema from information_schema for ${tableName}`);
        return schema;
      }
    } catch (error) {
      logger.warn(`⚠️ information_schema query failed for ${tableName}:`, error);
    }

    // Strategy 2: Try direct table query (fallback)
    try {
      const schema = await this.getSchemaFromDirectQuery(tableName, datasourceType);
      if (schema) {
        logger.info(`✅ Successfully got schema from direct query for ${tableName}`);
        return schema;
      }
    } catch (error) {
      logger.warn(`⚠️ Direct query failed for ${tableName}:`, error);
      // Re-throw the error since this is our last attempt
      throw error;
    }

    // If we reach here, no live data was found
    throw new Error(`Table '${tableName}' does not exist or is not accessible in the datasource`);
  }

  /**
   * 🔥 GET SCHEMA FROM INFORMATION_SCHEMA - Live data only
   */
  private async getSchemaFromInformationSchema(tableName: string, datasourceType: string): Promise<any | null> {
    logger.info(`🔍 Querying information_schema for table: ${tableName}`);
    
    const schemaQuery = this.getInformationSchemaQuery(datasourceType);
    const schemaResult = await db.query(schemaQuery, [tableName]);
    
    if (!schemaResult.rows || schemaResult.rows.length === 0) {
      logger.info(`📋 No columns found in information_schema for table: ${tableName}`);
      return null;
    }

    logger.info(`📋 Found ${schemaResult.rows.length} columns in information_schema for ${tableName}`);

    const columns = schemaResult.rows.map((col, index) => ({
      name: col.column_name,
      display_name: this.formatDisplayName(col.column_name),
      data_type: this.mapDataType(col.data_type, datasourceType),
      is_nullable: col.is_nullable === 'YES' || col.is_nullable === 1,
      description: null, // No mock descriptions
      format_string: this.getFormatString(col.data_type),
      is_calculated: false,
      calculation_expression: null,
      sort_order: col.ordinal_position || (index + 1),
      is_visible: true,
      column_width: this.getColumnWidth(col.data_type),
      aggregation_type: this.getAggregationType(col.data_type)
    }));

    // Get primary keys from live data
    const primaryKeys = await this.getLivePrimaryKeys(tableName, datasourceType);

    return {
      columns,
      primary_keys: primaryKeys,
      indexes: [], // Could be populated from live data if needed
      relationships: [], // Could be populated from live data if needed
      table_info: {
        name: tableName,
        type: 'table',
        column_count: columns.length,
        datasource_type: datasourceType,
        populated_at: new Date().toISOString(),
        population_method: 'information_schema_live'
      }
    };
  }

  /**
   * 🔥 GET SCHEMA FROM DIRECT QUERY - Live data only
   */
  private async getSchemaFromDirectQuery(tableName: string, datasourceType: string): Promise<any | null> {
    logger.info(`🔍 Attempting direct query for table: ${tableName}`);
    
    const limitQuery = this.getLimitQuery(datasourceType);
    const tableQuery = `SELECT * FROM ${tableName} ${limitQuery}`;
    
    const result = await db.query(tableQuery);
    
    if (!result.fields || result.fields.length === 0) {
      logger.info(`📋 No fields found from direct query of table: ${tableName}`);
      return null;
    }

    logger.info(`📋 Found ${result.fields.length} fields from direct query of ${tableName}`);

    const columns = result.fields.map((field, index) => ({
      name: field.name,
      display_name: this.formatDisplayName(field.name),
      data_type: this.mapDataTypeFromOID(field.dataTypeID, datasourceType),
      is_nullable: true, // Unknown from direct query
      description: null, // No mock descriptions
      format_string: this.getFormatStringFromOID(field.dataTypeID),
      is_calculated: false,
      calculation_expression: null,
      sort_order: index + 1,
      is_visible: true,
      column_width: this.getColumnWidthFromOID(field.dataTypeID),
      aggregation_type: this.getAggregationTypeFromOID(field.dataTypeID)
    }));

    return {
      columns,
      primary_keys: [], // Unknown from direct query
      indexes: [],
      relationships: [],
      table_info: {
        name: tableName,
        type: 'table',
        column_count: columns.length,
        datasource_type: datasourceType,
        populated_at: new Date().toISOString(),
        population_method: 'direct_query_live'
      }
    };
  }

  /**
   * 🔥 GET LIVE PRIMARY KEYS - Real data only
   */
  private async getLivePrimaryKeys(tableName: string, datasourceType: string): Promise<string[]> {
    try {
      const pkQuery = this.getPrimaryKeyQuery(datasourceType);
      const result = await db.query(pkQuery, [tableName]);
      return result.rows.map(row => row.column_name);
    } catch (error) {
      logger.warn(`⚠️ Could not get primary keys for ${tableName}:`, error);
      return []; // Return empty array instead of mock data
    }
  }

  // 🔥 DATABASE TYPE DETECTION
  private isRelationalDatabase(datasourceType: string): boolean {
    const relationalTypes = [
      'postgres', 'postgresql', 'mysql', 'mariadb', 'mssql', 'sqlserver', 
      'oracle', 'sqlite', 'db2', 'sybase', 'firebird'
    ];
    return relationalTypes.includes(datasourceType);
  }

  private isSupportedDatasourceType(datasourceType: string): boolean {
    // Currently only support relational databases for live schema population
    return this.isRelationalDatabase(datasourceType);
  }

  // 🔥 DATABASE-SPECIFIC QUERIES
  private getInformationSchemaQuery(datasourceType: string): string {
    switch (datasourceType) {
      case 'postgres':
      case 'postgresql':
        return `
          SELECT column_name, data_type, is_nullable, column_default, ordinal_position
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = CURRENT_SCHEMA()
          ORDER BY ordinal_position
        `;
      
      case 'mysql':
      case 'mariadb':
        return `
          SELECT column_name, data_type, is_nullable, column_default, ordinal_position
          FROM information_schema.columns 
          WHERE table_name = ? AND table_schema = DATABASE()
          ORDER BY ordinal_position
        `;
      
      case 'mssql':
      case 'sqlserver':
        return `
          SELECT column_name, data_type, is_nullable, column_default, ordinal_position
          FROM information_schema.columns 
          WHERE table_name = @tableName AND table_schema = SCHEMA_NAME()
          ORDER BY ordinal_position
        `;
      
      case 'oracle':
        return `
          SELECT column_name, data_type, 
                 CASE WHEN nullable = 'Y' THEN 'YES' ELSE 'NO' END as is_nullable,
                 data_default as column_default, 
                 column_id as ordinal_position
          FROM all_tab_columns 
          WHERE table_name = UPPER(:1) AND owner = USER
          ORDER BY column_id
        `;
      
      case 'sqlite':
        return `PRAGMA table_info(${tableName})`; // Note: SQLite uses different syntax
      
      default:
        return `
          SELECT column_name, data_type, is_nullable, column_default, ordinal_position
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `;
    }
  }

  private getLimitQuery(datasourceType: string): string {
    switch (datasourceType) {
      case 'mssql':
      case 'sqlserver':
        return ''; // SQL Server uses TOP in SELECT clause
      case 'oracle':
        return 'WHERE ROWNUM = 0';
      default:
        return 'LIMIT 0';
    }
  }

  private getPrimaryKeyQuery(datasourceType: string): string {
    switch (datasourceType) {
      case 'postgres':
      case 'postgresql':
        return `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = $1 
            AND tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = CURRENT_SCHEMA()
          ORDER BY kcu.ordinal_position
        `;
      
      case 'mysql':
      case 'mariadb':
        return `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = ? 
            AND tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = DATABASE()
          ORDER BY kcu.ordinal_position
        `;
      
      case 'mssql':
      case 'sqlserver':
        return `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = @tableName 
            AND tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = SCHEMA_NAME()
          ORDER BY kcu.ordinal_position
        `;
      
      case 'oracle':
        return `
          SELECT cols.column_name
          FROM all_constraints cons, all_cons_columns cols
          WHERE cons.constraint_type = 'P'
            AND cons.constraint_name = cols.constraint_name
            AND cons.owner = cols.owner
            AND cols.table_name = UPPER(:1)
            AND cons.owner = USER
          ORDER BY cols.position
        `;
      
      default:
        return `
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
          ORDER BY kcu.ordinal_position
        `;
    }
  }

  // 🔥 UTILITY METHODS - No mock data
  private shouldPopulateSchema(schemaJson: any): boolean {
    if (!schemaJson) return true;
    if (typeof schemaJson === 'object' && Object.keys(schemaJson).length === 0) return true;
    if (!schemaJson.columns || !Array.isArray(schemaJson.columns) || schemaJson.columns.length === 0) return true;
    return false;
  }

  private formatDisplayName(columnName: string): string {
    return columnName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private mapDataType(sqlDataType: string, datasourceType: string): string {
    const normalizedType = sqlDataType.toLowerCase();
    
    if (/int|integer|bigint|smallint|tinyint|serial|bigserial|number/.test(normalizedType)) return 'integer';
    if (/decimal|numeric|money|float|real|double|currency/.test(normalizedType)) return 'decimal';
    if (/varchar|char|text|string|nvarchar|nchar|clob|longtext/.test(normalizedType)) return 'string';
    if (/^date$/.test(normalizedType)) return 'date';
    if (/time|timestamp|datetime/.test(normalizedType)) return 'datetime';
    if (/bool|boolean|bit/.test(normalizedType)) return 'boolean';
    if (/json|jsonb|object|document/.test(normalizedType)) return 'object';
    if (/array|\[\]/.test(normalizedType)) return 'array';
    
    return 'string';
  }

  private mapDataTypeFromOID(oid: number, datasourceType: string): string {
    const oidMap: Record<number, string> = {
      20: 'integer', 21: 'integer', 23: 'integer', 25: 'string', 1043: 'string',
      1082: 'date', 1184: 'datetime', 1700: 'decimal', 16: 'boolean', 700: 'float', 701: 'float'
    };
    return oidMap[oid] || 'string';
  }

  private getFormatString(dataType: string): string | null {
    const normalizedType = dataType.toLowerCase();
    if (/decimal|numeric|money|float|real|double/.test(normalizedType)) return '#,##0.00';
    if (/^date$/.test(normalizedType)) return 'YYYY-MM-DD';
    if (/timestamp|datetime/.test(normalizedType)) return 'YYYY-MM-DD HH:mm:ss';
    return null;
  }

  private getFormatStringFromOID(oid: number): string | null {
    const formatMap: Record<number, string> = {
      1700: '#,##0.00', 700: '#,##0.00', 701: '#,##0.00',
      1082: 'YYYY-MM-DD', 1184: 'YYYY-MM-DD HH:mm:ss'
    };
    return formatMap[oid] || null;
  }

  private getColumnWidth(dataType: string): number {
    const normalizedType = dataType.toLowerCase();
    if (/int|integer|smallint|tinyint/.test(normalizedType)) return 80;
    if (/bigint|bigserial/.test(normalizedType)) return 100;
    if (/decimal|numeric|money|float|real|double/.test(normalizedType)) return 120;
    if (/bool|boolean|bit/.test(normalizedType)) return 60;
    if (/^date$/.test(normalizedType)) return 100;
    if (/timestamp|datetime/.test(normalizedType)) return 150;
    if (/text|clob|longtext/.test(normalizedType)) return 200;
    return 150;
  }

  private getColumnWidthFromOID(oid: number): number {
    const widthMap: Record<number, number> = {
      20: 100, 21: 80, 23: 80, 25: 200, 1043: 150, 1082: 100, 
      1184: 150, 1700: 120, 16: 60, 700: 120, 701: 120
    };
    return widthMap[oid] || 150;
  }

  private getAggregationType(dataType: string): string {
    const normalizedType = dataType.toLowerCase();
    const numericTypes = /int|integer|decimal|numeric|money|float|real|double|bigint|smallint|tinyint|serial|bigserial|number/;
    return numericTypes.test(normalizedType) ? 'sum' : 'none';
  }

  private getAggregationTypeFromOID(oid: number): string {
    const numericOIDs = [20, 21, 23, 1700, 700, 701];
    return numericOIDs.includes(oid) ? 'sum' : 'none';
  }

  /**
   * POST /api/datasets
   * Create a new dataset
   */
  async createDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        display_name,
        description,
        type = 'source',
        workspace_id,
        schema_json
      } = req.body;

      const user_id = req.user?.user_id;

      // Validate required fields
      if (!name || !display_name || !workspace_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          errors: [{ code: 'VALIDATION_ERROR', message: 'name, display_name, and workspace_id are required' }]
        });
      }

      const query = `
        INSERT INTO datasets (
          name, 
          display_name, 
          description, 
          type, 
          workspace_id, 
          created_by, 
          schema_json,
          created_at,
          updated_at,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), true)
        RETURNING *
      `;

      const result = await db.query(query, [
        name,
        display_name,
        description,
        type,
        workspace_id,
        user_id,
        schema_json || null
      ]);

      const dataset = result.rows[0];

      res.status(201).json({
        success: true,
        message: 'Dataset created successfully',
        data: dataset
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error creating dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * PUT /api/datasets/:id
   * Update an existing dataset
   */
  async updateDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        display_name,
        description,
        type,
        schema_json,
        is_active
      } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (name !== undefined) {
        paramCount++;
        updates.push(`name = $${paramCount}`);
        values.push(name);
      }

      if (display_name !== undefined) {
        paramCount++;
        updates.push(`display_name = $${paramCount}`);
        values.push(display_name);
      }

      if (description !== undefined) {
        paramCount++;
        updates.push(`description = $${paramCount}`);
        values.push(description);
      }

      if (type !== undefined) {
        paramCount++;
        updates.push(`type = $${paramCount}`);
        values.push(type);
      }

      if (schema_json !== undefined) {
        paramCount++;
        updates.push(`schema_json = $${paramCount}`);
        values.push(schema_json);
      }

      if (is_active !== undefined) {
        paramCount++;
        updates.push(`is_active = $${paramCount}`);
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update',
          errors: [{ code: 'VALIDATION_ERROR', message: 'At least one field must be provided for update' }]
        });
      }

      paramCount++;
      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE datasets 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
      }

      res.json({
        success: true,
        message: 'Dataset updated successfully',
        data: result.rows[0]
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error updating dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }

  /**
   * DELETE /api/datasets/:id
   * Delete a dataset (soft delete)
   */
  async deleteDataset(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const query = `
        UPDATE datasets 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING id, name
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Dataset not found',
          errors: [{ code: 'DATASET_NOT_FOUND', message: `Dataset with ID ${id} not found` }]
        });
      }

      res.json({
        success: true,
        message: 'Dataset deleted successfully',
        data: { id: result.rows[0].id, name: result.rows[0].name }
      });

    } catch (error: any) {
      logger.error('❌ DatasetController: Error deleting dataset:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete dataset',
        errors: [{ code: 'INTERNAL_ERROR', message: error.message }]
      });
    }
  }
}