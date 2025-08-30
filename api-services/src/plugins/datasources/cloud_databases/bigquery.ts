// File: api-services/src/plugins/datasources/cloud_databases/bigquery.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { BigQuery } from '@google-cloud/bigquery';

export const bigqueryPlugin: DataSourcePlugin = {
  name: 'bigquery',
  displayName: 'Google BigQuery',
  category: 'cloud_databases',
  version: '1.0.0',
  description: 'Connect to Google BigQuery',
  
  configSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', title: 'Project ID' },
      keyFile: { type: 'string', title: 'Service Account Key File Path' },
      credentials: { type: 'string', title: 'Service Account JSON (Alternative to Key File)' },
      location: { type: 'string', title: 'Location', default: 'US' }
    },
    required: ['projectId'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: false,
    supportsStoredProcedures: true,
    maxConcurrentConnections: 50
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const options: any = { projectId: config.projectId };
    
    if (config.keyFile) {
      options.keyFilename = config.keyFile;
    } else if (config.credentials) {
      options.credentials = JSON.parse(config.credentials as string);
    }

    const bigquery = new BigQuery(options);

    return {
      id: `bigquery-${Date.now()}`,
      config,
      client: bigquery,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.getDatasets();
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    const options = { query, location: connection.config.location || 'US' };
    
    const [job] = await connection.client.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    const executionTimeMs = Date.now() - startTime;
    
    // Get column info from BigQuery metadata
    const columns = job.metadata?.configuration?.query?.destinationTable ? 
      await this.getTableColumns(connection, job.metadata.configuration.query.destinationTable) : 
      this.inferColumnsFromRows(rows);

    connection.lastActivity = new Date();
    
    return {
      rows: rows.map(row => this.normalizeRow(row)),
      columns,
      rowCount: rows.length,
      executionTimeMs,
      queryId: job.id
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const [datasets] = await connection.client.getDatasets();
    const tables = [];
    
    for (const dataset of datasets) {
      const [datasetTables] = await dataset.getTables();
      for (const table of datasetTables) {
        const [metadata] = await table.getMetadata();
        tables.push({
          name: table.id!,
          schema: dataset.id!,
          columns: metadata.schema?.fields?.map((field: any) => ({
            name: field.name,
            type: field.type,
            nullable: field.mode !== 'REQUIRED',
            defaultValue: null
          })) || []
        });
      }
    }

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    // BigQuery client doesn't require explicit disconnection
    connection.isConnected = false;
  },

  private async getTableColumns(connection: Connection, tableRef: any): Promise<any[]> {
    try {
      const table = connection.client.dataset(tableRef.datasetId).table(tableRef.tableId);
      const [metadata] = await table.getMetadata();
      
      return metadata.schema?.fields?.map((field: any) => ({
        name: field.name,
        type: field.type,
        nullable: field.mode !== 'REQUIRED',
        defaultValue: null
      })) || [];
    } catch (error) {
      return [];
    }
  },

  private inferColumnsFromRows(rows: any[]): any[] {
    if (rows.length === 0) return [];
    
    return Object.keys(rows[0]).map(key => ({
      name: key,
      type: typeof rows[0][key],
      nullable: true,
      defaultValue: null
    }));
  },

  private normalizeRow(row: any): Record<string, any> {
    const normalized: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = this.convertBigQueryValue(value);
    }
    return normalized;
  },

  private convertBigQueryValue(value: any): any {
    if (value && typeof value === 'object' && value.value !== undefined) {
      return value.value;
    }
    return value;
  }
};