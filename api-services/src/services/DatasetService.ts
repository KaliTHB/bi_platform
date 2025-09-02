// api-services/src/services/DatasetService.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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
  schema?: DatasetColumn[];
  is_public: boolean;
  cache_ttl_minutes: number;
  tags: string[];
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  last_refreshed_at?: Date;
  row_count?: number;
  file_size_bytes?: number;
  status: 'active' | 'inactive' | 'error' | 'processing';
  error_message?: string;
}

interface DatasetColumn {
  name: string;
  display_name: string;
  data_type: string;
  is_nullable: boolean;
  default_value?: any;
  description?: string;
  tags?: string[];
  format_string?: string;
  is_dimension: boolean;
  is_measure: boolean;
  aggregation_type?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct_count';
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

interface DatasetUsageInfo {
  inUse: boolean;
  chartCount: number;
  dashboardCount: number;
  charts: Array<{ id: string; name: string }>;
  dashboards: Array<{ id: string; name: string }>;
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

export class DatasetService {
  private datasets: Map<string, Dataset> = new Map();
  private refreshJobs: Map<string, RefreshResult> = new Map();

  constructor() {
    // Initialize with some sample data for development
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // This would be replaced with actual database operations
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

  async getDatasets(workspaceId: string, options: GetDatasetsOptions): Promise<{
    datasets: Dataset[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      logger.info('Getting datasets', { workspaceId, options });

      // In a real implementation, this would query the database
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
      const datasets = allDatasets.slice(offset, offset + options.limit);

      // Remove schema if not requested to reduce payload size
      if (!options.include_schema) {
        datasets.forEach(dataset => {
          delete dataset.schema;
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

      // Validate name uniqueness within workspace
      const existingDataset = Array.from(this.datasets.values())
        .find(d => d.workspace_id === workspaceId && d.name === datasetData.name);

      if (existingDataset) {
        throw new Error(`Dataset with name '${datasetData.name}' already exists in this workspace`);
      }

      // Validate datasource exists (if provided)
      if (datasetData.datasource_id) {
        // In a real implementation, check if datasource exists
        // const datasource = await this.datasourceService.getDatasource(datasetData.datasource_id);
        // if (!datasource) throw new Error('Datasource not found');
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
          // Continue without schema, it can be set later
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

      // Validate name uniqueness if name is being updated
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

      // If query changed, try to update schema
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

      // In a real implementation, this would also clean up:
      // - Related cache entries
      // - Audit logs
      // - Any scheduled refresh jobs

      this.datasets.delete(id);
      
      // Clean up any refresh jobs for this dataset
      for (const [refreshId, job] of this.refreshJobs.entries()) {
        // In a real implementation, you'd have a way to link refresh jobs to datasets
        // For now, we'll just clean up old jobs
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

      // Validate schema
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

      // In a real implementation, this would execute the query/transformation
      // and return actual data. For now, we'll return mock data.
      const mockColumns = dataset.schema || [
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
          data_type: 'string',
          is_nullable: false,
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

      const mockRows = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        amount: Math.round((Math.random() * 1000 + 100) * 100) / 100
      }));

      return {
        columns: mockColumns,
        rows: mockRows,
        total_rows: 1000, // Mock total
        sample_size: mockRows.length,
        query_execution_time_ms: 150
      };
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
        estimated_completion_time: new Date(Date.now() + 60000) // 1 minute from now
      };

      this.refreshJobs.set(refreshId, refreshJob);

      // In a real implementation, this would:
      // 1. Queue the refresh job
      // 2. Update the dataset status to 'processing'
      // 3. Execute the query/transformation
      // 4. Update the schema if needed
      // 5. Update row count and last_refreshed_at
      // 6. Set status back to 'active' or 'error'

      // Simulate async processing
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

  async checkDatasetUsage(id: string): Promise<DatasetUsageInfo> {
    try {
      // In a real implementation, this would query the database for:
      // - Charts using this dataset
      // - Dashboards containing charts that use this dataset
      // - Other datasets that have this as a parent (transformation datasets)

      // Mock implementation
      const mockUsage: DatasetUsageInfo = {
        inUse: false,
        chartCount: 0,
        dashboardCount: 0,
        charts: [],
        dashboards: []
      };

      return mockUsage;
    } catch (error: any) {
      logger.error('Error checking dataset usage:', error);
      throw new Error(`Failed to check dataset usage: ${error.message}`);
    }
  }

  private async inferSchemaFromQuery(query: string, datasourceId?: string): Promise<DatasetColumn[]> {
    // In a real implementation, this would:
    // 1. Connect to the datasource
    // 2. Execute a LIMIT 0 version of the query to get column metadata
    // 3. Map database types to our internal types
    // 4. Determine if columns are dimensions or measures based on data type

    // Mock implementation
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
        data_type: 'string',
        is_nullable: true,
        is_dimension: true,
        is_measure: false
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

      if (typeof column.is_dimension !== 'boolean' || typeof column.is_measure !== 'boolean') {
        throw new Error('Each column must have boolean is_dimension and is_measure properties');
      }
    }

    // Check for duplicate column names
    const columnNames = schema.map(c => c.name);
    const uniqueNames = new Set(columnNames);
    if (columnNames.length !== uniqueNames.size) {
      throw new Error('Duplicate column names are not allowed');
    }
  }
}