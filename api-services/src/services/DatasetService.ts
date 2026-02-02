// api-services/src/services/DatasetService.ts - UPDATED WITH ALL MISSING METHODS
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { cacheService } from './CacheService';  // ✅ FIXED: Correct import

// Interfaces (existing and new)
interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'sql' | 'file' | 'transformation' | 'api';
  datasource_id?: string;
  connection_config?: any;
  query?: string;
  file_path?: string;
  transformation_config?: any;
  parent_dataset_ids?: string[];
  is_public: boolean;
  cache_ttl_minutes: number;
  tags: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_refreshed_at?: Date;
  status: 'active' | 'inactive' | 'error' | 'refreshing';
  schema?: DatasetColumn[];
}

interface DatasetColumn {
  name: string;
  display_name: string;
  data_type: string;
  is_nullable: boolean;
  is_dimension: boolean;
  is_measure: boolean;
  aggregation_type?: 'sum' | 'count' | 'avg' | 'min' | 'max';
  format_hint?: string;
  description?: string;
}

interface DatasetCreateData {
  workspace_id: string;
  name: string;
  display_name?: string;
  description?: string;
  type: 'sql' | 'file' | 'transformation' | 'api';
  datasource_id?: string;
  connection_config?: any;
  query?: string;
  file_path?: string;
  transformation_config?: any;
  parent_dataset_ids?: string[];
  is_public?: boolean;
  cache_ttl_minutes?: number;
  tags?: string[];
  created_by: string;
}

interface DatasetUpdateData {
  name?: string;
  display_name?: string;
  description?: string;
  query?: string;
  transformation_config?: any;
  is_public?: boolean;
  cache_ttl_minutes?: number;
  tags?: string[];
}

interface GetDatasetsOptions {
  page: number;
  limit: number;
  filters: {
    type?: string;
    datasource_id?: string;
    created_by?: string;
    search?: string;
  };
  include_schema?: boolean;
}

interface DatasetPreview {
  columns: DatasetColumn[];
  rows: any[];
  total_rows: number;
  sample_size: number;
  query_execution_time_ms: number;
}

interface RefreshResult {
  refresh_id: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  started_at: Date;
  estimated_completion_time?: Date;
}

// New interfaces for missing methods
interface DatasetDataResponse {
  data: any[];
  columns: DatasetColumn[];
  metadata: {
    row_count: number;
    total_rows: number;
    execution_time_ms: number;
    cache_hit: boolean;
    query_hash: string;
    generated_sql?: string;
  };
  cached: boolean;
}

interface ValidationResult {
  is_valid: boolean;
  errors?: Array<{
    type: 'syntax' | 'semantic' | 'permission' | 'performance';
    message: string;
    line?: number;
    column?: number;
  }>;
  warnings?: Array<{
    type: 'performance' | 'deprecated' | 'best_practice';
    message: string;
    suggestion?: string;
  }>;
  estimated_execution_time?: number;
  estimated_row_count?: number;
}

interface DatasetStats {
  row_count: number;
  column_count: number;
  size_bytes: number;
  size_formatted: string;
  last_updated: string;
  last_accessed?: string;
  access_count: number;
  cache_info: {
    is_cached: boolean;
    cached_at?: string;
    expires_at?: string;
    cache_size_bytes?: number;
    cache_hit_rate?: number;
  };
  performance_metrics: {
    avg_query_time_ms: number;
    slowest_query_time_ms?: number;
    fastest_query_time_ms?: number;
    total_queries_executed: number;
  };
  data_quality: {
    null_percentage: number;
    duplicate_rows: number;
    data_types_detected: Record<string, number>;
  };
}

interface CacheStatus {
  is_cached: boolean;
  cached_at?: string;
  expires_at?: string;
  cache_size_bytes?: number;
  cache_hit_rate?: number;
}

interface ClearCacheResult {
  cache_cleared: boolean;
  cache_size_cleared_bytes?: number;
  affected_queries: number;
}

export class DatasetService {
  private datasets: Map<string, Dataset> = new Map();
  private refreshJobs: Map<string, RefreshResult> = new Map();
  private datasetCache: Map<string, any> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const sampleDataset: Dataset = {
      id: uuidv4(),
      workspace_id: 'sample-workspace',
      name: 'sales_data',
      display_name: 'Sales Data',
      description: 'Sales transaction data from our CRM',
      type: 'sql',
      datasource_id: 'sample-datasource',
      query: 'SELECT * FROM sales WHERE date >= CURRENT_DATE - INTERVAL 30 DAY',
      schema: [
        {
          name: 'id',
          display_name: 'Transaction ID',
          data_type: 'integer',
          is_nullable: false,
          is_dimension: true,
          is_measure: false
        },
        {
          name: 'amount',
          display_name: 'Sale Amount',
          data_type: 'decimal',
          is_nullable: false,
          is_dimension: false,
          is_measure: true,
          aggregation_type: 'sum'
        }
      ],
      is_public: false,
      cache_ttl_minutes: 60,
      tags: ['sales', 'crm'],
      created_by: 'sample-user',
      created_at: new Date(),
      updated_at: new Date(),
      status: 'active'
    };

    this.datasets.set(sampleDataset.id, sampleDataset);
  }

  // ✅ EXISTING METHODS (Already Implemented) - Keeping existing implementation

  async getDatasets(workspaceId: string, options: GetDatasetsOptions): Promise<{
    datasets: Dataset[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      logger.info('Getting datasets', { workspaceId, options });

      let allDatasets = Array.from(this.datasets.values())
        .filter(dataset => dataset.workspace_id === workspaceId);

      // Apply filters
      if (options.filters.type) {
        allDatasets = allDatasets.filter(d => d.type === options.filters.type);
      }
      if (options.filters.datasource_id) {
        allDatasets = allDatasets.filter(d => d.datasource_id === options.filters.datasource_id);
      }
      if (options.filters.created_by) {
        allDatasets = allDatasets.filter(d => d.created_by === options.filters.created_by);
      }
      if (options.filters.search) {
        const searchTerm = options.filters.search.toLowerCase();
        allDatasets = allDatasets.filter(d => 
          d.name.toLowerCase().includes(searchTerm) ||
          d.display_name.toLowerCase().includes(searchTerm) ||
          (d.description && d.description.toLowerCase().includes(searchTerm))
        );
      }

      const total = allDatasets.length;
      const pages = Math.ceil(total / options.limit);
      const offset = (options.page - 1) * options.limit;
      let datasets = allDatasets.slice(offset, offset + options.limit);

      if (!options.include_schema) {
        datasets = datasets.map(d => {
          const { schema, ...datasetWithoutSchema } = d;
          return datasetWithoutSchema as Dataset;
        });
      }

      return {
        datasets,
        total,
        page: options.page,
        limit: options.limit,
        pages
      };
    } catch (error: any) {
      logger.error('Error getting datasets:', error);
      throw new Error(`Failed to get datasets: ${error.message}`);
    }
  }

  async createDataset(workspaceId: string, datasetData: DatasetCreateData): Promise<Dataset> {
    try {
      logger.info('Creating dataset', { workspaceId, name: datasetData.name });

      const existingDataset = Array.from(this.datasets.values())
        .find(d => d.workspace_id === workspaceId && d.name === datasetData.name);

      if (existingDataset) {
        throw new Error(`Dataset with name '${datasetData.name}' already exists in this workspace`);
      }

      // Validate parent datasets (for transformation datasets)
      if (datasetData.type === 'transformation' && datasetData.parent_dataset_ids) {
        for (const parentId of datasetData.parent_dataset_ids) {
          const parent = this.datasets.get(parentId);
          if (!parent || parent.workspace_id !== workspaceId) {
            throw new Error(`Parent dataset '${parentId}' not found or not accessible`);
          }
        }
      }

      const dataset: Dataset = {
        id: uuidv4(),
        workspace_id: workspaceId,
        name: datasetData.name,
        display_name: datasetData.display_name || datasetData.name,
        description: datasetData.description,
        type: datasetData.type,
        datasource_id: datasetData.datasource_id,
        connection_config: datasetData.connection_config,
        query: datasetData.query,
        file_path: datasetData.file_path,
        transformation_config: datasetData.transformation_config,
        parent_dataset_ids: datasetData.parent_dataset_ids,
        is_public: datasetData.is_public || false,
        cache_ttl_minutes: datasetData.cache_ttl_minutes || 60,
        tags: datasetData.tags || [],
        created_by: datasetData.created_by,
        created_at: new Date(),
        updated_at: new Date(),
        status: 'active'
      };

      // For SQL datasets, try to infer schema
      if (dataset.type === 'sql' && dataset.query) {
        try {
          dataset.schema = await this.inferSchemaFromQuery(dataset.query, dataset.datasource_id);
        } catch (error) {
          logger.warn('Failed to infer schema from query:', error);
        }
      }

      this.datasets.set(dataset.id, dataset);

      logger.info('Dataset created successfully', { id: dataset.id, name: dataset.name });
      return dataset;
    } catch (error: any) {
      logger.error('Error creating dataset:', error);
      throw new Error(`Failed to create dataset: ${error.message}`);
    }
  }

  async getDatasetById(id: string, includeSchema: boolean = false): Promise<Dataset | null> {
    try {
      const dataset = this.datasets.get(id);
      if (!dataset) {
        return null;
      }

      const result = { ...dataset };
      if (!includeSchema) {
        delete result.schema;
      }

      return result;
    } catch (error: any) {
      logger.error('Error getting dataset by ID:', error);
      throw new Error(`Failed to get dataset: ${error.message}`);
    }
  }

  async updateDataset(id: string, updateData: DatasetUpdateData): Promise<Dataset> {
    try {
      logger.info('Updating dataset', { id, updateData });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      if (updateData.name && updateData.name !== dataset.name) {
        const existingDataset = Array.from(this.datasets.values())
          .find(d => d.workspace_id === dataset.workspace_id && d.name === updateData.name);
        
        if (existingDataset) {
          throw new Error(`Dataset with name '${updateData.name}' already exists in this workspace`);
        }
      }

      const updatedDataset: Dataset = {
        ...dataset,
        ...updateData,
        updated_at: new Date()
      };

      if (updateData.query && updateData.query !== dataset.query) {
        try {
          updatedDataset.schema = await this.inferSchemaFromQuery(updateData.query, dataset.datasource_id);
        } catch (error) {
          logger.warn('Failed to infer schema from updated query:', error);
        }
      }

      this.datasets.set(id, updatedDataset);

      logger.info('Dataset updated successfully', { id });
      return updatedDataset;
    } catch (error: any) {
      logger.error('Error updating dataset:', error);
      throw new Error(`Failed to update dataset: ${error.message}`);
    }
  }

  async deleteDataset(id: string): Promise<void> {
    try {
      logger.info('Deleting dataset', { id });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      this.datasets.delete(id);
      
      // Clean up cache entries for this dataset
      for (const [cacheKey, _] of this.datasetCache.entries()) {
        if (cacheKey.startsWith(`${id}:`)) {
          this.datasetCache.delete(cacheKey);
        }
      }

      for (const [refreshId, job] of this.refreshJobs.entries()) {
        // Clean up old jobs (in real implementation, would link jobs to datasets)
      }

      logger.info('Dataset deleted successfully', { id });
    } catch (error: any) {
      logger.error('Error deleting dataset:', error);
      throw new Error(`Failed to delete dataset: ${error.message}`);
    }
  }

  async getDatasetSchema(id: string): Promise<DatasetColumn[] | null> {
    try {
      const dataset = this.datasets.get(id);
      if (!dataset) {
        return null;
      }
      return dataset.schema || null;
    } catch (error: any) {
      logger.error('Error getting dataset schema:', error);
      throw new Error(`Failed to get dataset schema: ${error.message}`);
    }
  }

  async updateDatasetSchema(id: string, schema: DatasetColumn[]): Promise<DatasetColumn[]> {
    try {
      logger.info('Updating dataset schema', { id, columnCount: schema.length });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      this.validateSchema(schema);

      const updatedDataset: Dataset = {
        ...dataset,
        schema,
        updated_at: new Date()
      };

      this.datasets.set(id, updatedDataset);

      logger.info('Dataset schema updated successfully', { id });
      return schema;
    } catch (error: any) {
      logger.error('Error updating dataset schema:', error);
      throw new Error(`Failed to update dataset schema: ${error.message}`);
    }
  }

  async getDatasetPreview(id: string, limit: number = 100): Promise<DatasetPreview> {
    try {
      logger.info('Getting dataset preview', { id, limit });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Mock implementation - generate sample data based on schema
      const mockData = this.generateMockPreviewData(dataset, limit);

      const preview: DatasetPreview = {
        columns: dataset.schema || [],
        rows: mockData,
        total_rows: 1000 + Math.floor(Math.random() * 9000), // Mock total
        sample_size: Math.min(limit, mockData.length),
        query_execution_time_ms: 150 + Math.floor(Math.random() * 300)
      };

      logger.info('Dataset preview generated successfully', { id, sampleSize: preview.sample_size });
      return preview;
    } catch (error: any) {
      logger.error('Error getting dataset preview:', error);
      throw new Error(`Failed to get dataset preview: ${error.message}`);
    }
  }

  async refreshDataset(id: string): Promise<RefreshResult> {
    try {
      logger.info('Refreshing dataset', { id });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      const refreshId = uuidv4();
      const refreshJob: RefreshResult = {
        refresh_id: refreshId,
        status: 'initiated',
        started_at: new Date(),
        estimated_completion_time: new Date(Date.now() + 10000) // 10 seconds
      };

      this.refreshJobs.set(refreshId, refreshJob);

      // Simulate async refresh
      setTimeout(async () => {
        try {
          const job = this.refreshJobs.get(refreshId);
          if (job) {
            job.status = 'completed';
            this.refreshJobs.set(refreshId, job);
          }

          const datasetToUpdate = this.datasets.get(id);
          if (datasetToUpdate) {
            datasetToUpdate.last_refreshed_at = new Date();
            datasetToUpdate.status = 'active';
            this.datasets.set(id, datasetToUpdate);
          }

          // Clear cache entries for this dataset
          for (const [cacheKey, _] of this.datasetCache.entries()) {
            if (cacheKey.startsWith(`${id}:`)) {
              this.datasetCache.delete(cacheKey);
            }
          }
        } catch (error) {
          logger.error('Error in refresh job:', error);
          const job = this.refreshJobs.get(refreshId);
          if (job) {
            job.status = 'failed';
            this.refreshJobs.set(refreshId, job);
          }
        }
      }, 5000);

      return refreshJob;
    } catch (error: any) {
      logger.error('Error refreshing dataset:', error);
      throw new Error(`Failed to refresh dataset: ${error.message}`);
    }
  }

  // 🚀 NEW METHODS - MISSING CRITICAL CACHE & FILTER OPERATIONS

  async getDatasetData(id: string, params?: {
    refresh?: boolean;
    filters?: any[];
    limit?: number;
    offset?: number;
    columns?: string[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<DatasetDataResponse> {
    try {
      logger.info('Getting dataset data', { id, params });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Generate cache key
      const cacheKey = this.generateDataCacheKey(id, params);

      // Check cache unless refresh is requested
      if (!params?.refresh) {
        const cachedData = this.datasetCache.get(cacheKey);
        if (cachedData) {
          logger.info('Returning cached dataset data', { id, cacheKey });
          return { ...cachedData, cached: true };
        }
      }

      // Execute query (mock implementation)
      const startTime = Date.now();
      const mockData = this.generateMockData(dataset, params?.limit || 1000);
      const executionTime = Date.now() - startTime;

      // Apply filters if provided
      let filteredData = mockData;
      if (params?.filters && params.filters.length > 0) {
        filteredData = this.applyFilters(mockData, params.filters);
      }

      // Apply sorting
      if (params?.sortBy) {
        filteredData = this.applySorting(filteredData, params.sortBy, params.sortDirection || 'asc');
      }

      // Apply pagination
      const totalRows = filteredData.length;
      if (params?.offset || params?.limit) {
        const offset = params.offset || 0;
        const limit = params.limit || 1000;
        filteredData = filteredData.slice(offset, offset + limit);
      }

      const response: DatasetDataResponse = {
        data: filteredData,
        columns: dataset.schema || [],
        metadata: {
          row_count: filteredData.length,
          total_rows: totalRows,
          execution_time_ms: executionTime,
          cache_hit: false,
          query_hash: cacheKey,
          generated_sql: this.generateSQL(dataset, params)
        },
        cached: false
      };

      // Cache the result
      this.datasetCache.set(cacheKey, response);

      logger.info('Dataset data retrieved successfully', { id, rowCount: filteredData.length });
      return response;
    } catch (error: any) {
      logger.error('Error getting dataset data:', error);
      throw new Error(`Failed to get dataset data: ${error.message}`);
    }
  }

  async queryDataset(id: string, queryOptions: {
    limit?: number;
    offset?: number;
    filters?: any[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    columns?: string[];
  }): Promise<{
    data: any[];
    columns: DatasetColumn[];
    total_rows: number;
    execution_time: number;
    cached: boolean;
  }> {
    try {
      const result = await this.getDatasetData(id, queryOptions);
      
      return {
        data: result.data,
        columns: result.columns,
        total_rows: result.metadata.total_rows,
        execution_time: result.metadata.execution_time_ms,
        cached: result.cached
      };
    } catch (error: any) {
      logger.error('Error querying dataset:', error);
      throw new Error(`Failed to query dataset: ${error.message}`);
    }
  }

  async validateDatasetQuery(id: string, query?: string): Promise<ValidationResult> {
    try {
      logger.info('Validating dataset query', { id, hasQuery: !!query });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      const queryToValidate = query || dataset.query;
      if (!queryToValidate) {
        return {
          is_valid: false,
          errors: [{
            type: 'semantic',
            message: 'No query provided for validation'
          }]
        };
      }

      // Mock validation logic
      const mockValidation: ValidationResult = {
        is_valid: Math.random() > 0.1, // 90% success rate
        errors: Math.random() > 0.8 ? [{
          type: 'syntax',
          message: 'Invalid SQL syntax near line 5',
          line: 5,
          column: 12
        }] : undefined,
        warnings: Math.random() > 0.5 ? [{
          type: 'performance',
          message: 'Query may be slow without proper indexing',
          suggestion: 'Consider adding an index on the date column'
        }] : undefined,
        estimated_execution_time: 150 + Math.floor(Math.random() * 1000),
        estimated_row_count: 1000 + Math.floor(Math.random() * 10000)
      };

      logger.info('Query validation completed', { id, isValid: mockValidation.is_valid });
      return mockValidation;
    } catch (error: any) {
      logger.error('Error validating dataset query:', error);
      throw new Error(`Failed to validate query: ${error.message}`);
    }
  }

  async testDataset(id: string): Promise<{
    is_valid: boolean;
    preview?: any[];
    columns?: DatasetColumn[];
    execution_time?: number;
    error?: string;
  }> {
    try {
      logger.info('Testing dataset', { id });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Mock test implementation
      const isValid = Math.random() > 0.1; // 90% success rate
      
      if (!isValid) {
        return {
          is_valid: false,
          error: 'Connection failed: Unable to connect to datasource'
        };
      }

      const preview = await this.getDatasetPreview(id, 10);
      
      return {
        is_valid: true,
        preview: preview.rows,
        columns: preview.columns,
        execution_time: preview.query_execution_time_ms
      };
    } catch (error: any) {
      logger.error('Error testing dataset:', error);
      return {
        is_valid: false,
        error: error.message
      };
    }
  }

  async getDatasetStats(id: string): Promise<DatasetStats> {
    try {
      logger.info('Getting dataset statistics', { id });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Mock statistics
      const rowCount = 1000 + Math.floor(Math.random() * 50000);
      const sizeBytes = rowCount * (50 + Math.floor(Math.random() * 200)); // Mock size calculation

      const stats: DatasetStats = {
        row_count: rowCount,
        column_count: dataset.schema?.length || 0,
        size_bytes: sizeBytes,
        size_formatted: this.formatBytes(sizeBytes),
        last_updated: dataset.updated_at.toISOString(),
        last_accessed: dataset.last_refreshed_at?.toISOString(),
        access_count: 15 + Math.floor(Math.random() * 100),
        cache_info: {
          is_cached: Math.random() > 0.3,
          cached_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          expires_at: new Date(Date.now() + dataset.cache_ttl_minutes * 60000).toISOString(),
          cache_size_bytes: sizeBytes * 0.8,
          cache_hit_rate: 0.75 + Math.random() * 0.2
        },
        performance_metrics: {
          avg_query_time_ms: 200 + Math.floor(Math.random() * 500),
          slowest_query_time_ms: 800 + Math.floor(Math.random() * 2000),
          fastest_query_time_ms: 50 + Math.floor(Math.random() * 100),
          total_queries_executed: 50 + Math.floor(Math.random() * 500)
        },
        data_quality: {
          null_percentage: Math.random() * 0.15,
          duplicate_rows: Math.floor(Math.random() * 100),
          data_types_detected: {
            'text': Math.floor(Math.random() * 5) + 2,
            'number': Math.floor(Math.random() * 3) + 1,
            'date': Math.floor(Math.random() * 2) + 1,
            'boolean': Math.floor(Math.random() * 2)
          }
        }
      };

      logger.info('Dataset statistics retrieved', { id, rowCount: stats.row_count });
      return stats;
    } catch (error: any) {
      logger.error('Error getting dataset stats:', error);
      throw new Error(`Failed to get dataset statistics: ${error.message}`);
    }
  }

  async clearDatasetCache(id: string): Promise<ClearCacheResult> {
    try {
      logger.info('Clearing dataset cache', { id });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      let clearedEntries = 0;
      let totalSizeCleared = 0;

      // Clear cache entries for this dataset
      for (const [cacheKey, cacheValue] of this.datasetCache.entries()) {
        if (cacheKey.startsWith(`${id}:`)) {
          this.datasetCache.delete(cacheKey);
          clearedEntries++;
          // Mock size calculation
          totalSizeCleared += JSON.stringify(cacheValue).length;
        }
      }

      const result: ClearCacheResult = {
        cache_cleared: clearedEntries > 0,
        cache_size_cleared_bytes: totalSizeCleared,
        affected_queries: clearedEntries
      };

      logger.info('Dataset cache cleared', { id, entriesCleared: clearedEntries });
      return result;
    } catch (error: any) {
      logger.error('Error clearing dataset cache:', error);
      throw new Error(`Failed to clear dataset cache: ${error.message}`);
    }
  }

  async getDatasetCacheStatus(id: string): Promise<CacheStatus> {
    try {
      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Check if dataset has cached data
      const cacheKeys = Array.from(this.datasetCache.keys()).filter(key => key.startsWith(`${id}:`));
      const isCached = cacheKeys.length > 0;

      let totalCacheSize = 0;
      if (isCached) {
        for (const key of cacheKeys) {
          const value = this.datasetCache.get(key);
          totalCacheSize += JSON.stringify(value).length;
        }
      }

      const status: CacheStatus = {
        is_cached: isCached,
        cached_at: isCached ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined,
        expires_at: isCached ? new Date(Date.now() + dataset.cache_ttl_minutes * 60000).toISOString() : undefined,
        cache_size_bytes: totalCacheSize,
        cache_hit_rate: isCached ? 0.75 + Math.random() * 0.2 : 0
      };

      return status;
    } catch (error: any) {
      logger.error('Error getting cache status:', error);
      throw new Error(`Failed to get cache status: ${error.message}`);
    }
  }

  // 🔧 ADDITIONAL UTILITY METHODS

  async getDatasetUsage(id: string): Promise<{
    charts_using: Array<{ id: string; name: string; dashboard_id?: string }>;
    dashboards_using: Array<{ id: string; name: string }>;
    transformations_using: Array<{ id: string; name: string }>;
    total_dependencies: number;
    can_delete: boolean;
    deletion_blockers?: string[];
  }> {
    try {
      // Mock usage data
      const chartsUsing = Array.from({ length: Math.floor(Math.random() * 5) }, (_, i) => ({
        id: `chart-${i + 1}`,
        name: `Sales Chart ${i + 1}`,
        dashboard_id: `dashboard-${Math.floor(i / 2) + 1}`
      }));

      const dashboardsUsing = Array.from({ length: Math.floor(Math.random() * 3) }, (_, i) => ({
        id: `dashboard-${i + 1}`,
        name: `Sales Dashboard ${i + 1}`
      }));

      const transformationsUsing = Array.from({ length: Math.floor(Math.random() * 2) }, (_, i) => ({
        id: `transform-${i + 1}`,
        name: `Sales Transform ${i + 1}`
      }));

      const totalDependencies = chartsUsing.length + dashboardsUsing.length + transformationsUsing.length;
      const canDelete = totalDependencies === 0;

      return {
        charts_using: chartsUsing,
        dashboards_using: dashboardsUsing,
        transformations_using: transformationsUsing,
        total_dependencies: totalDependencies,
        can_delete: canDelete,
        deletion_blockers: canDelete ? undefined : [
          ...(chartsUsing.length > 0 ? [`${chartsUsing.length} charts`] : []),
          ...(dashboardsUsing.length > 0 ? [`${dashboardsUsing.length} dashboards`] : []),
          ...(transformationsUsing.length > 0 ? [`${transformationsUsing.length} transformations`] : [])
        ]
      };
    } catch (error: any) {
      logger.error('Error getting dataset usage:', error);
      throw new Error(`Failed to get dataset usage: ${error.message}`);
    }
  }

  async exportDataset(id: string, options: {
    format: 'csv' | 'xlsx' | 'json' | 'parquet';
    include_headers?: boolean;
    limit?: number;
    filters?: any[];
    columns?: string[];
  }): Promise<{
    export_id: string;
    format: string;
    file_path?: string;
    download_url?: string;
    file_size_bytes?: number;
    row_count: number;
    status: 'processing' | 'completed' | 'failed';
    created_at: Date;
  }> {
    try {
      logger.info('Exporting dataset', { id, options });

      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      const exportId = uuidv4();
      const mockRowCount = Math.min(options.limit || 10000, 10000);

      const exportResult = {
        export_id: exportId,
        format: options.format,
        file_path: `/exports/dataset_${id}_${exportId}.${options.format}`,
        download_url: `https://your-domain.com/api/exports/dataset_${id}_${exportId}.${options.format}`,
        file_size_bytes: mockRowCount * 100, // Mock size
        row_count: mockRowCount,
        status: 'processing' as const,
        created_at: new Date()
      };

      // Simulate async export processing
      setTimeout(() => {
        exportResult.status = 'completed';
      }, 3000);

      logger.info('Dataset export initiated', { id, exportId });
      return exportResult;
    } catch (error: any) {
      logger.error('Error exporting dataset:', error);
      throw new Error(`Failed to export dataset: ${error.message}`);
    }
  }

  async getDatasetHistory(id: string, params?: {
    limit?: number;
    offset?: number;
    action_type?: string;
  }): Promise<{
    history: Array<{
      id: string;
      action_type: 'created' | 'updated' | 'refreshed' | 'queried' | 'exported';
      user_id: string;
      user_name: string;
      timestamp: Date;
      details: any;
      execution_time_ms?: number;
    }>;
    total: number;
  }> {
    try {
      // Mock history data
      const allHistory = Array.from({ length: 20 }, (_, i) => ({
        id: `history-${i + 1}`,
        action_type: ['created', 'updated', 'refreshed', 'queried', 'exported'][Math.floor(Math.random() * 5)] as any,
        user_id: `user-${Math.floor(Math.random() * 5) + 1}`,
        user_name: `User ${Math.floor(Math.random() * 5) + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 2592000000), // Random within last 30 days
        details: { operation: 'mock operation' },
        execution_time_ms: Math.floor(Math.random() * 1000) + 100
      }));

      // Apply filters
      let filteredHistory = allHistory;
      if (params?.action_type) {
        filteredHistory = allHistory.filter(h => h.action_type === params.action_type);
      }

      // Apply pagination
      const total = filteredHistory.length;
      const offset = params?.offset || 0;
      const limit = params?.limit || 20;
      const paginatedHistory = filteredHistory.slice(offset, offset + limit);

      return {
        history: paginatedHistory,
        total
      };
    } catch (error: any) {
      logger.error('Error getting dataset history:', error);
      throw new Error(`Failed to get dataset history: ${error.message}`);
    }
  }

  async getDatasetPerformanceMetrics(id: string, params?: {
    start_date?: string;
    end_date?: string;
    granularity?: 'hour' | 'day' | 'week';
  }): Promise<{
    query_performance: Array<{
      timestamp: Date;
      avg_execution_time_ms: number;
      query_count: number;
      cache_hit_rate: number;
    }>;
    usage_patterns: {
      peak_usage_hours: number[];
      most_accessed_columns: string[];
      common_filter_patterns: any[];
    };
    resource_usage: {
      avg_memory_usage_mb: number;
      avg_cpu_usage_percent: number;
      total_data_transferred_mb: number;
    };
  }> {
    try {
      const dataset = this.datasets.get(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Mock performance metrics
      const granularity = params?.granularity || 'day';
      const dataPoints = granularity === 'hour' ? 24 : granularity === 'day' ? 7 : 4;

      const queryPerformance = Array.from({ length: dataPoints }, (_, i) => ({
        timestamp: new Date(Date.now() - (dataPoints - i - 1) * (granularity === 'hour' ? 3600000 : granularity === 'day' ? 86400000 : 604800000)),
        avg_execution_time_ms: 200 + Math.floor(Math.random() * 300),
        query_count: Math.floor(Math.random() * 50) + 10,
        cache_hit_rate: 0.6 + Math.random() * 0.3
      }));

      return {
        query_performance: queryPerformance,
        usage_patterns: {
          peak_usage_hours: [9, 10, 11, 14, 15, 16],
          most_accessed_columns: dataset.schema?.slice(0, 5).map(col => col.name) || [],
          common_filter_patterns: [
            { column: 'date', operator: 'between', frequency: 45 },
            { column: 'status', operator: 'equals', frequency: 32 }
          ]
        },
        resource_usage: {
          avg_memory_usage_mb: 150 + Math.floor(Math.random() * 100),
          avg_cpu_usage_percent: 15 + Math.floor(Math.random() * 20),
          total_data_transferred_mb: 500 + Math.floor(Math.random() * 1000)
        }
      };
    } catch (error: any) {
      logger.error('Error getting performance metrics:', error);
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  // 📊 PLACEHOLDER METHODS FOR ADVANCED FEATURES

  async executeCustomQuery(id: string, query: string, parameters?: any): Promise<{
    data: any[];
    columns: DatasetColumn[];
    execution_time: number;
  }> {
    // Mock implementation
    const dataset = this.datasets.get(id);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    return {
      data: this.generateMockData(dataset, 100),
      columns: dataset.schema || [],
      execution_time: 200 + Math.floor(Math.random() * 500)
    };
  }

  async createSnapshot(id: string, options: { name: string; description?: string; userId: string }): Promise<any> {
    return { id: uuidv4(), name: options.name, created_at: new Date() };
  }

  async getSnapshots(id: string): Promise<any[]> {
    return [{ id: uuidv4(), name: 'Snapshot 1', created_at: new Date() }];
  }

  async restoreFromSnapshot(id: string, snapshotId: string, userId: string): Promise<void> {
    // Mock implementation
  }

  async applyTransformation(id: string, transformation: any, userId: string): Promise<any> {
    return { id: uuidv4(), transformation_id: uuidv4() };
  }

  async getTransformationHistory(id: string): Promise<any[]> {
    return [];
  }

  async revertTransformation(id: string, transformationId: string, userId: string): Promise<void> {
    // Mock implementation
  }

  async getDataProfile(id: string): Promise<any> {
    return { profile_id: uuidv4(), statistics: {} };
  }

  async getColumnAnalysis(id: string, columnName: string): Promise<any> {
    return { column: columnName, analysis: {} };
  }

  async getDataQualityReport(id: string): Promise<any> {
    return { quality_score: 0.85, issues: [] };
  }

  async getDatasetAlerts(id: string): Promise<any[]> {
    return [];
  }

  async createDatasetAlert(id: string, alertData: any, userId: string): Promise<any> {
    return { id: uuidv4(), ...alertData };
  }

  async updateDatasetAlert(id: string, alertId: string, updateData: any): Promise<any> {
    return { id: alertId, ...updateData };
  }

  async deleteDatasetAlert(id: string, alertId: string): Promise<void> {
    // Mock implementation
  }

  // 🛠️ PRIVATE UTILITY METHODS

  private async inferSchemaFromQuery(query: string, datasourceId?: string): Promise<DatasetColumn[]> {
    // Mock schema inference
    return [
      {
        name: 'id',
        display_name: 'ID',
        data_type: 'integer',
        is_nullable: false,
        is_dimension: true,
        is_measure: false
      },
      {
        name: 'name',
        display_name: 'Name',
        data_type: 'varchar',
        is_nullable: true,
        is_dimension: true,
        is_measure: false
      },
      {
        name: 'amount',
        display_name: 'Amount',
        data_type: 'decimal',
        is_nullable: false,
        is_dimension: false,
        is_measure: true,
        aggregation_type: 'sum'
      }
    ];
  }

  private validateSchema(schema: DatasetColumn[]): void {
    if (!Array.isArray(schema) || schema.length === 0) {
      throw new Error('Schema must be a non-empty array');
    }

    for (const column of schema) {
      if (!column.name || typeof column.name !== 'string') {
        throw new Error('Each column must have a valid name');
      }
      if (!column.data_type || typeof column.data_type !== 'string') {
        throw new Error('Each column must have a valid data_type');
      }
    }
  }

  private generateMockPreviewData(dataset: Dataset, limit: number): any[] {
    const schema = dataset.schema || [];
    const data = [];
    
    for (let i = 0; i < Math.min(limit, 100); i++) {
      const row: any = {};
      for (const column of schema) {
        row[column.name] = this.generateMockValue(column);
      }
      data.push(row);
    }
    
    return data;
  }

  private generateMockData(dataset: Dataset, limit: number): any[] {
    return this.generateMockPreviewData(dataset, limit);
  }

  private generateMockValue(column: DatasetColumn): any {
    switch (column.data_type.toLowerCase()) {
      case 'integer':
      case 'int':
        return Math.floor(Math.random() * 1000) + 1;
      case 'decimal':
      case 'float':
      case 'numeric':
        return Math.round((Math.random() * 10000) * 100) / 100;
      case 'varchar':
      case 'text':
      case 'string':
        return `Sample ${column.name} ${Math.floor(Math.random() * 100)}`;
      case 'date':
      case 'datetime':
        return new Date(Date.now() - Math.random() * 31536000000).toISOString().split('T')[0];
      case 'boolean':
        return Math.random() > 0.5;
      default:
        return `Value ${Math.floor(Math.random() * 100)}`;
    }
  }

  private generateDataCacheKey(id: string, params?: any): string {
    const paramsString = params ? JSON.stringify(params) : '';
    return `${id}:data:${Buffer.from(paramsString).toString('base64')}`;
  }

  private applyFilters(data: any[], filters: any[]): any[] {
    let filteredData = data;
    
    for (const filter of filters) {
      filteredData = filteredData.filter(row => {
        const value = row[filter.column];
        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'not_equals':
            return value !== filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filter.value);
          case 'less_than':
            return Number(value) < Number(filter.value);
          default:
            return true;
        }
      });
    }
    
    return filteredData;
  }

  private applySorting(data: any[], sortBy: string, direction: 'asc' | 'desc'): any[] {
    return data.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private generateSQL(dataset: Dataset, params?: any): string {
    let sql = dataset.query || `SELECT * FROM ${dataset.name}`;
    
    if (params?.filters && params.filters.length > 0) {
      const whereClause = params.filters
        .map((f: any) => `${f.column} ${f.operator} '${f.value}'`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }
    
    if (params?.sortBy) {
      sql += ` ORDER BY ${params.sortBy} ${params.sortDirection || 'ASC'}`;
    }
    
    if (params?.limit) {
      sql += ` LIMIT ${params.limit}`;
    }
    
    return sql;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}