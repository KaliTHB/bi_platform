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

    // 🔧 FIXED: Handle datasource_ids as UUID array
    // Option 1: Get first datasource from the array
    const query = `
      SELECT 
        d.*,
        u.username as owner_name,
        u.email as owner_email,
        ds.id as datasource_id,
        ds.name as datasource_name,
        ds.type as datasource_type,
        ds.connection_config
      FROM datasets d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN datasources ds ON ds.id = ANY(d.datasource_ids)
      WHERE d.id = $1 AND d.is_active = true
      LIMIT 1
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

    // 🔥 ENHANCED SCHEMA POPULATION with datasource context
    if (include_schema === 'true') {
      logger.info(`🔍 Schema requested for dataset ${id} (${dataset.name})`);
      
      if (this.shouldPopulateSchema(schemaJson)) {
        logger.info(`📋 Populating schema on-demand for dataset ${id}...`);
        
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

          // Determine the best approach for schema population
          const populatedSchema = await this.populateSchemaWithDatasourceContext(dataset);
          
          if (populatedSchema && populatedSchema.columns.length > 0) {
            // Update the database with populated schema
            const updateQuery = `
              UPDATE datasets 
              SET schema_json = $1, updated_at = NOW()
              WHERE id = $2
            `;
            
            await db.query(updateQuery, [JSON.stringify(populatedSchema), id]);
            schemaJson = populatedSchema;
            
            logger.info(`✅ Schema populated successfully for dataset ${id}`, {
              columns: populatedSchema.columns.length,
              method: populatedSchema.table_info?.population_method,
              datasourceType: dataset.datasource_type
            });
          } else {
            // No schema could be populated - return error
            return res.status(422).json({
              success: false,
              message: 'Cannot populate schema - no data found',
              errors: [{ 
                code: 'NO_SCHEMA_DATA', 
                message: `Table '${dataset.name}' does not exist or has no columns` 
              }]
            });
          }
        } catch (error) {
          logger.error(`❌ Error populating schema for dataset ${id}:`, error);
          
          // Return specific error based on the type of failure
          return this.handleSchemaPopulationError(error, dataset.name);
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
        datasource_ids: dataset.datasource_ids, // Array of UUIDs
        datasource_info: dataset.datasource_id ? {
          id: dataset.datasource_id,
          name: dataset.datasource_name,
          type: dataset.datasource_type
        } : null,
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
 * 🔥 ALTERNATIVE: Get dataset with ALL datasources (if you need multiple)
 */
async getDatasetWithAllDatasources(datasetId: string): Promise<any> {
  const query = `
    SELECT 
      d.*,
      u.username as owner_name,
      u.email as owner_email,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ds.id,
            'name', ds.name,
            'plugin_name', ds.type,
            'connection_config', ds.connection_config
          )
        ) FILTER (WHERE ds.id IS NOT NULL),
        '[]'::json
      ) as datasources
    FROM datasets d
    LEFT JOIN users u ON d.created_by = u.id
    LEFT JOIN datasources ds ON ds.id = ANY(d.datasource_ids)
    WHERE d.id = $1 AND d.is_active = true
    GROUP BY d.id, u.username, u.email
  `;

  const result = await db.query(query, [datasetId]);
  return result.rows[0] || null;
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

  // Check if dataset has datasource_ids array
  if (!dataset.datasource_ids || !Array.isArray(dataset.datasource_ids) || dataset.datasource_ids.length === 0) {
    errors.push({
      code: 'MISSING_DATASOURCES',
      message: 'Dataset must be connected to at least one datasource to populate schema'
    });
  }

  // Check if we found a valid datasource in the join
  if (!dataset.datasource_id) {
    errors.push({
      code: 'DATASOURCE_NOT_FOUND',
      message: 'None of the connected datasources were found or are active'
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
 * 🔥 POPULATE SCHEMA WITH DATASOURCE CONTEXT
 */
private async populateSchemaWithDatasourceContext(dataset: any): Promise<any | null> {
  const datasourceType = dataset.datasource_type?.toLowerCase() || 'unknown';
  const tableName = dataset.name;
  const connectionConfig = dataset.connection_config || {};

  logger.info(`🔍 Populating schema for ${tableName} using ${datasourceType} datasource`);

  // For now, we'll use the current database connection
  // In the future, you could use the connection_config to connect to external datasources
  if (this.isRelationalDatabase(datasourceType)) {
    return await this.populateRelationalSchemaFromCurrentDB(tableName, datasourceType);
  }

  // For non-relational databases, return error for now
  throw new Error(`Schema population for ${datasourceType} databases is not yet implemented. Only relational databases are currently supported.`);
}

/**
 * 🔥 POPULATE RELATIONAL SCHEMA FROM CURRENT DATABASE
 */
private async populateRelationalSchemaFromCurrentDB(tableName: string, datasourceType: string): Promise<any | null> {
  logger.info(`📋 Populating relational schema for ${tableName} (${datasourceType})`);

  // Strategy 1: Try information_schema
  try {
    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `;
    
    const schemaResult = await db.query(schemaQuery, [tableName]);
    
    if (schemaResult.rows && schemaResult.rows.length > 0) {
      logger.info(`📋 Found ${schemaResult.rows.length} columns from information_schema`);
      
      const columns = schemaResult.rows.map((col, index) => ({
        name: col.column_name,
        display_name: this.formatDisplayName(col.column_name),
        data_type: this.mapDataType(col.data_type, datasourceType),
        is_nullable: col.is_nullable === 'YES',
        description: null,
        format_string: this.getFormatString(col.data_type),
        is_calculated: false,
        calculation_expression: null,
        sort_order: col.ordinal_position || (index + 1),
        is_visible: true,
        column_width: this.getColumnWidth(col.data_type),
        aggregation_type: this.getAggregationType(col.data_type),
        max_length: col.character_maximum_length,
        precision: col.numeric_precision,
        scale: col.numeric_scale
      }));

      // Get primary keys
      const primaryKeys = await this.getPrimaryKeysFromCurrentDB(tableName);

      return {
        columns,
        primary_keys: primaryKeys,
        indexes: [],
        relationships: [],
        table_info: {
          name: tableName,
          type: 'table',
          column_count: columns.length,
          datasource_type: datasourceType,
          populated_at: new Date().toISOString(),
          population_method: 'information_schema'
        }
      };
    }
  } catch (error) {
    logger.warn(`⚠️ information_schema query failed for ${tableName}:`, error);
  }

  // Strategy 2: Try direct table query as fallback
  try {
    logger.info(`🔍 Trying direct query for table: ${tableName}`);
    
    const tableQuery = `SELECT * FROM ${tableName} LIMIT 0`;
    const result = await db.query(tableQuery);
    
    if (result.fields && result.fields.length > 0) {
      logger.info(`📋 Found ${result.fields.length} fields from direct query`);
      
      const columns = result.fields.map((field, index) => ({
        name: field.name,
        display_name: this.formatDisplayName(field.name),
        data_type: this.mapDataTypeFromOID(field.dataTypeID, datasourceType),
        is_nullable: true,
        description: null,
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
        primary_keys: [],
        indexes: [],
        relationships: [],
        table_info: {
          name: tableName,
          type: 'table',
          column_count: columns.length,
          datasource_type: datasourceType,
          populated_at: new Date().toISOString(),
          population_method: 'direct_query'
        }
      };
    }
  } catch (error) {
    logger.error(`❌ Direct query failed for ${tableName}:`, error);
    throw error;
  }

  return null;
}

/**
 * 🔥 GET PRIMARY KEYS FROM CURRENT DATABASE
 */
private async getPrimaryKeysFromCurrentDB(tableName: string): Promise<string[]> {
  try {
    const pkQuery = `
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
    
    const result = await db.query(pkQuery, [tableName]);
    return result.rows.map(row => row.column_name);
  } catch (error) {
    logger.warn(`⚠️ Could not get primary keys for ${tableName}:`, error);
    return [];
  }
}

/**
 * 🔥 HANDLE SCHEMA POPULATION ERRORS
 */
private handleSchemaPopulationError(error: any, tableName: string): any {
  if (error.message.includes('does not exist') || error.message.includes('relation')) {
    return {
      status: 404,
      response: {
        success: false,
        message: 'Table not found in datasource',
        errors: [{ 
          code: 'TABLE_NOT_FOUND', 
          message: `Table '${tableName}' does not exist in the connected datasource` 
        }]
      }
    };
  }
  
  if (error.message.includes('permission') || error.message.includes('access')) {
    return {
      status: 403,
      response: {
        success: false,
        message: 'Access denied to datasource',
        errors: [{ 
          code: 'ACCESS_DENIED', 
          message: `No permission to access table '${tableName}' in the datasource` 
        }]
      }
    };
  }
  
  if (error.message.includes('connection') || error.message.includes('timeout')) {
    return {
      status: 503,
      response: {
        success: false,
        message: 'Datasource connection failed',
        errors: [{ 
          code: 'CONNECTION_FAILED', 
          message: 'Could not connect to the datasource to retrieve schema' 
        }]
      }
    };
  }
  
  // Generic error
  return {
    status: 500,
    response: {
      success: false,
      message: 'Failed to populate schema from datasource',
      errors: [{ 
        code: 'SCHEMA_POPULATION_FAILED', 
        message: error.message 
      }]
    }
  };
}

// 🔥 HELPER METHODS
private isRelationalDatabase(datasourceType: string): boolean {
  const relationalTypes = [
    'postgres', 'postgresql', 'mysql', 'mariadb', 'mssql', 'sqlserver', 
    'oracle', 'sqlite', 'db2', 'sybase', 'firebird'
  ];
  return relationalTypes.includes(datasourceType);
}

private isSupportedDatasourceType(datasourceType: string): boolean {
  return this.isRelationalDatabase(datasourceType);
}

/**
 * Format display name from column name
 */
private formatDisplayName(columnName: string): string {
  return columnName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

/**
 * Map database data type to standardized data type
 */
/**
 * Map database data type to standardized data type - ENHANCED VERSION
 */
private mapDataType(dbDataType: string, datasourceType: string): string {
  if (!dbDataType) return 'string';
  
  const lowerType = dbDataType.toLowerCase().trim();
  
  console.log(`🔍 Mapping data type: "${dbDataType}" (${lowerType}) for datasource: ${datasourceType}`);
  
  // PostgreSQL mappings
  if (datasourceType === 'postgres' || datasourceType === 'postgresql') {
    if (['integer', 'int', 'int4', 'smallint', 'int2', 'bigint', 'int8', 'serial', 'bigserial', 'smallserial'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> integer`);
      return 'integer';
    }
    if (['numeric', 'decimal', 'real', 'double precision', 'float4', 'float8', 'float', 'double'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> number`);
      return 'number';
    }
    if (['boolean', 'bool'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> boolean`);
      return 'boolean';
    }
    if (['date', 'timestamp', 'timestamptz', 'time', 'timetz', 'datetime'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> datetime`);
      return 'datetime';
    }
    if (['text', 'varchar', 'character', 'char', 'uuid', 'character varying'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> string`);
      return 'string';
    }
    if (['json', 'jsonb'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> json`);
      return 'json';
    }
  }
  
  // MySQL/MariaDB mappings
  if (datasourceType === 'mysql' || datasourceType === 'mariadb') {
    if (['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> integer`);
      return 'integer';
    }
    if (['decimal', 'numeric', 'float', 'double', 'real'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> number`);
      return 'number';
    }
    if (['bit', 'boolean', 'bool'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> boolean`);
      return 'boolean';
    }
    if (['date', 'datetime', 'timestamp', 'time', 'year'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> datetime`);
      return 'datetime';
    }
    if (['char', 'varchar', 'text', 'tinytext', 'mediumtext', 'longtext'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> string`);
      return 'string';
    }
    if (['json'].includes(lowerType)) {
      console.log(`✅ Mapped ${dbDataType} -> json`);
      return 'json';
    }
  }
  
  // Enhanced fallback patterns (this is key for catching edge cases)
  if (lowerType.includes('int') || lowerType.includes('serial')) {
    console.log(`✅ Fallback mapped ${dbDataType} -> integer (contains 'int')`);
    return 'integer';
  }
  if (lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType.includes('real')) {
    console.log(`✅ Fallback mapped ${dbDataType} -> number (contains numeric keywords)`);
    return 'number';
  }
  if (lowerType.includes('bool')) {
    console.log(`✅ Fallback mapped ${dbDataType} -> boolean (contains 'bool')`);
    return 'boolean';
  }
  if (lowerType.includes('date') || lowerType.includes('time') || lowerType.includes('timestamp')) {
    console.log(`✅ Fallback mapped ${dbDataType} -> datetime (contains date/time keywords)`);
    return 'datetime';
  }
  if (lowerType.includes('json')) {
    console.log(`✅ Fallback mapped ${dbDataType} -> json (contains 'json')`);
    return 'json';
  }
  
  // Default to string for unknown types
  console.log(`⚠️ Unknown type ${dbDataType} -> defaulting to string`);
  return 'string';
}


/**
 * Get format string based on data type
 */
private getFormatString(dataType: string): string | null {
  const lowerType = dataType.toLowerCase();
  
  if (lowerType.includes('date')) {
    return 'YYYY-MM-DD';
  }
  if (lowerType.includes('datetime') || lowerType.includes('timestamp')) {
    return 'YYYY-MM-DD HH:mm:ss';
  }
  if (lowerType.includes('time') && !lowerType.includes('datetime')) {
    return 'HH:mm:ss';
  }
  if (lowerType.includes('decimal') || lowerType.includes('numeric')) {
    return '#,##0.00';
  }
  if (lowerType.includes('float') || lowerType.includes('double') || lowerType.includes('real')) {
    return '#,##0.##';
  }
  if (lowerType.includes('int') || lowerType.includes('serial')) {
    return '#,##0';
  }
  if (lowerType.includes('percent')) {
    return '0.00%';
  }
  if (lowerType.includes('currency') || lowerType.includes('money')) {
    return '$#,##0.00';
  }
  
  return null;
}

/**
 * Get column width based on data type
 */
private getColumnWidth(dataType: string): number {
  const lowerType = dataType.toLowerCase();
  
  if (lowerType.includes('bool')) {
    return 80;
  }
  if (lowerType.includes('date') && !lowerType.includes('datetime')) {
    return 120;
  }
  if (lowerType.includes('datetime') || lowerType.includes('timestamp')) {
    return 180;
  }
  if (lowerType.includes('time') && !lowerType.includes('datetime')) {
    return 100;
  }
  if (lowerType.includes('int') || lowerType.includes('serial')) {
    return 100;
  }
  if (lowerType.includes('decimal') || lowerType.includes('numeric') || lowerType.includes('float') || lowerType.includes('double')) {
    return 120;
  }
  if (lowerType.includes('uuid')) {
    return 250;
  }
  if (lowerType.includes('text') || lowerType.includes('longtext')) {
    return 200;
  }
  if (lowerType.includes('json')) {
    return 180;
  }
  
  // Default width for strings and unknown types
  return 150;
}

/**
 * Get aggregation type based on data type
 */
private getAggregationType(dataType: string): string {
  const lowerType = dataType.toLowerCase();
  
  if (lowerType.includes('int') || lowerType.includes('serial') || 
      lowerType.includes('decimal') || lowerType.includes('numeric') || 
      lowerType.includes('float') || lowerType.includes('double') || 
      lowerType.includes('real') || lowerType.includes('money')) {
    return 'sum';
  }
  
  if (lowerType.includes('bool')) {
    return 'count';
  }
  
  if (lowerType.includes('date') || lowerType.includes('time')) {
    return 'none';
  }
  
  // Default for strings and other types
  return 'count';
}

private shouldPopulateSchema(schemaJson: any): boolean {
  if (!schemaJson) return true;
  if (typeof schemaJson === 'object' && Object.keys(schemaJson).length === 0) return true;
  if (!schemaJson.columns || !Array.isArray(schemaJson.columns) || schemaJson.columns.length === 0) return true;
  return false;
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