// api-services/src/services/DatasetService.ts
import { DatabaseConfig } from '../config/database';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';
import { PluginManager } from './PluginManager';

interface DatasetSchema {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    description?: string;
  }>;
  row_count?: number;
  sample_data?: any[];
}

interface QueryTestResult {
  preview: any[];
  columns: Array<{
    name: string;
    type: string;
  }>;
  execution_time: number;
}

export class DatasetService {
  
  /**
   * Get dataset schema with column information
   */
  static async getDatasetSchema(datasetId: string): Promise<DatasetSchema> {
    const cacheKey = `dataset_schema:${datasetId}`;
    
    // Try to get from cache first
    const cached = await CacheService.get<DatasetSchema>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get dataset information
    const datasetResult = await DatabaseConfig.query(
      `SELECT d.*, ds.type as data_source_type, ds.connection_config
       FROM datasets d
       LEFT JOIN data_sources ds ON d.data_source_id = ds.id
       WHERE d.id = $1 AND d.is_active = true`,
      [datasetId]
    );

    if (datasetResult.rows.length === 0) {
      throw new Error('Dataset not found');
    }

    const dataset = datasetResult.rows[0];
    let schema: DatasetSchema;

    try {
      if (dataset.type === 'SOURCE') {
        // Get schema from data source
        schema = await this.getSourceDatasetSchema(dataset);
      } else {
        // Get schema from transformation
        schema = await this.getTransformationDatasetSchema(dataset);
      }

      // Cache schema for 30 minutes
      await CacheService.set(cacheKey, schema, 1800);
      
      return schema;
    } catch (error) {
      logger.error('Failed to get dataset schema', { datasetId, error });
      throw error;
    }
  }

  /**
   * Test dataset query and return preview
   */
  static async testDatasetQuery(datasetId: string): Promise<QueryTestResult> {
    const datasetResult = await DatabaseConfig.query(
      `SELECT d.*, ds.type as data_source_type, ds.connection_config
       FROM datasets d
       LEFT JOIN data_sources ds ON d.data_source_id = ds.id
       WHERE d.id = $1 AND d.is_active = true`,
      [datasetId]
    );

    if (datasetResult.rows.length === 0) {
      throw new Error('Dataset not found');
    }

    const dataset = datasetResult.rows[0];
    const startTime = Date.now();

    try {
      let result: QueryTestResult;

      if (dataset.type === 'SOURCE') {
        result = await this.testSourceDataset(dataset);
      } else {
        result = await this.testTransformationDataset(dataset);
      }

      result.execution_time = Date.now() - startTime;
      return result;
    } catch (error) {
      logger.error('Dataset query test failed', { datasetId, error });
      throw new Error(`Query test failed: ${error.message}`);
    }
  }

  /**
   * Get schema for source dataset
   */
  private static async getSourceDatasetSchema(dataset: any): Promise<DatasetSchema> {
    if (!dataset.data_source_id) {
      throw new Error('No data source configured for dataset');
    }

    const plugin = PluginManager.getDataSourcePlugin(dataset.data_source_type);
    if (!plugin) {
      throw new Error(`Unsupported data source type: ${dataset.data_source_type}`);
    }

    // Get connection
    const connection = await plugin.connect(dataset.connection_config);
    
    try {
      // Get schema information
      const query = dataset.query_config?.query;
      if (!query) {
        throw new Error('No query configured for dataset');
      }

      // Execute LIMIT 0 query to get column info
      const schemaQuery = `SELECT * FROM (${query}) AS subquery LIMIT 0`;
      const schemaResult = await plugin.executeQuery(connection, schemaQuery);
      
      // Get sample data with LIMIT 10
      const sampleQuery = `SELECT * FROM (${query}) AS subquery LIMIT 10`;
      const sampleResult = await plugin.executeQuery(connection, sampleQuery);

      return {
        columns: schemaResult.columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable !== false,
          description: col.description
        })),
        sample_data: sampleResult.rows
      };
    } finally {
      await plugin.disconnect(connection);
    }
  }

  /**
   * Get schema for transformation dataset
   */
  private static async getTransformationDatasetSchema(dataset: any): Promise<DatasetSchema> {
    if (!dataset.parent_dataset_id) {
      throw new Error('No parent dataset configured for transformation');
    }

    // Get parent dataset schema
    const parentSchema = await this.getDatasetSchema(dataset.parent_dataset_id);
    
    // Apply transformation logic to determine output schema
    const transformConfig = dataset.transformation_config;
    if (!transformConfig) {
      // If no transformation config, return parent schema
      return parentSchema;
    }

    // Process transformations
    let resultSchema = { ...parentSchema };
    
    if (transformConfig.select_columns) {
      // Filter columns based on selection
      resultSchema.columns = resultSchema.columns.filter(col => 
        transformConfig.select_columns.includes(col.name)
      );
    }

    if (transformConfig.computed_columns) {
      // Add computed columns
      for (const computed of transformConfig.computed_columns) {
        resultSchema.columns.push({
          name: computed.name,
          type: computed.type || 'string',
          nullable: computed.nullable !== false,
          description: computed.description
        });
      }
    }

    if (transformConfig.renamed_columns) {
      // Apply column renames
      for (const rename of transformConfig.renamed_columns) {
        const column = resultSchema.columns.find(col => col.name === rename.from);
        if (column) {
          column.name = rename.to;
        }
      }
    }

    return resultSchema;
  }

  /**
   * Test source dataset query
   */
  private static async testSourceDataset(dataset: any): Promise<QueryTestResult> {
    const plugin = PluginManager.getDataSourcePlugin(dataset.data_source_type);
    if (!plugin) {
      throw new Error(`Unsupported data source type: ${dataset.data_source_type}`);
    }

    const connection = await plugin.connect(dataset.connection_config);
    
    try {
      const query = dataset.query_config?.query;
      if (!query) {
        throw new Error('No query configured for dataset');
      }

      // Execute query with LIMIT
      const testQuery = `SELECT * FROM (${query}) AS subquery LIMIT 5`;
      const result = await plugin.executeQuery(connection, testQuery);

      return {
        preview: result.rows,
        columns: result.columns.map(col => ({
          name: col.name,
          type: col.type
        }))
      } as QueryTestResult;
    } finally {
      await plugin.disconnect(connection);
    }
  }

  /**
   * Test transformation dataset
   */
  private static async testTransformationDataset(dataset: any): Promise<QueryTestResult> {
    // For transformation datasets, we need to apply the transformation
    // to the parent dataset and return a preview
    
    if (!dataset.parent_dataset_id) {
      throw new Error('No parent dataset configured');
    }

    // Get parent dataset preview
    const parentPreview = await this.testDatasetQuery(dataset.parent_dataset_id);
    
    // Apply transformations
    const transformConfig = dataset.transformation_config;
    if (!transformConfig) {
      return parentPreview;
    }

    let resultData = [...parentPreview.preview];
    let resultColumns = [...parentPreview.columns];

    // Apply filters
    if (transformConfig.filters) {
      resultData = this.applyFilters(resultData, transformConfig.filters);
    }

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
        
        // Apply computation to each row
        resultData = resultData.map(row => ({
          ...row,
          [computed.name]: this.evaluateComputedColumn(row, computed.expression)
        }));
      }
    }

    // Apply column renames
    if (transformConfig.renamed_columns) {
      for (const rename of transformConfig.renamed_columns) {
        // Update column definition
        const colIndex = resultColumns.findIndex(col => col.name === rename.from);
        if (colIndex >= 0) {
          resultColumns[colIndex].name = rename.to;
        }
        
        // Update data
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

    return {
      preview: resultData.slice(0, 5), // Limit preview to 5 rows
      columns: resultColumns
    } as QueryTestResult;
  }

  /**
   * Apply filters to data
   */
  private static applyFilters(data: any[], filters: any[]): any[] {
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
   * Evaluate computed column expression
   */
  private static evaluateComputedColumn(row: any, expression: string): any {
    try {
      // Simple expression evaluation for basic operations
      // In a production system, you'd want to use a proper expression parser
      // and sandbox for security
      
      // Replace column references with actual values
      let evalExpression = expression;
      Object.keys(row).forEach(key => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        evalExpression = evalExpression.replace(regex, JSON.stringify(row[key]));
      });

      // Basic safety check - only allow basic math operations and functions
      if (!/^[\d\s+\-*/.(),'"'{}]+$/.test(evalExpression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, ''))) {
        throw new Error('Invalid expression');
      }

      // Use Function constructor for evaluation (safer than eval)
      const func = new Function(`return ${evalExpression}`);
      return func();
    } catch (error) {
      logger.error('Failed to evaluate computed column expression', { expression, error });
      return null;
    }
  }

  /**
   * Get dataset metadata including dependencies
   */
  static async getDatasetMetadata(datasetId: string): Promise<any> {
    const result = await DatabaseConfig.query(
      `WITH RECURSIVE dataset_deps AS (
         SELECT id, name, parent_dataset_id, 0 as level
         FROM datasets
         WHERE id = $1
         
         UNION ALL
         
         SELECT d.id, d.name, d.parent_dataset_id, dd.level + 1
         FROM datasets d
         JOIN dataset_deps dd ON d.id = dd.parent_dataset_id
         WHERE dd.level < 10
       )
       SELECT * FROM dataset_deps ORDER BY level`,
      [datasetId]
    );

    return {
      dependencies: result.rows,
      dependency_count: result.rows.length - 1 // Exclude self
    };
  }

  /**
   * Validate dataset configuration
   */
  static async validateDatasetConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate basic required fields
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Dataset name is required');
    }

    if (!config.type || !['SOURCE', 'TRANSFORMATION'].includes(config.type)) {
      errors.push('Invalid dataset type');
    }

    // Type-specific validations
    if (config.type === 'SOURCE') {
      if (!config.data_source_id) {
        errors.push('Data source is required for SOURCE datasets');
      }
      if (!config.query_config?.query) {
        errors.push('Query configuration is required for SOURCE datasets');
      }
    }

    if (config.type === 'TRANSFORMATION') {
      if (!config.parent_dataset_id) {
        errors.push('Parent dataset is required for TRANSFORMATION datasets');
      }
      if (!config.transformation_config) {
        errors.push('Transformation configuration is required for TRANSFORMATION datasets');
      }
    }

    // Validate cache TTL
    if (config.cache_ttl && (config.cache_ttl < 0 || config.cache_ttl > 86400)) {
      errors.push('Cache TTL must be between 0 and 86400 seconds');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}