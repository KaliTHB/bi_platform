// File: api-services/src/plugins/datasources/cloud_databases/bigquery.ts
import { BigQuery } from '@google-cloud/bigquery';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const bigqueryPlugin: DataSourcePlugin = {
  name: 'bigquery',
  displayName: 'Google BigQuery',
  category: 'cloud_databases',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', title: 'Project ID', description: 'Google Cloud Project ID' },
      keyFilename: { type: 'string', title: 'Key File Path', description: 'Path to service account key file' },
      dataset: { type: 'string', title: 'Default Dataset' }
    },
    required: ['projectId'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const bigquery = new BigQuery({
      projectId: config.projectId,
      keyFilename: config.keyFilename
    });

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
      const result = await this.executeQuery(connection, 'SELECT 1 as test');
      await this.disconnect(connection);
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    const options = {
      query,
      location: 'US'
    };

    const [job] = await connection.client.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    const executionTimeMs = Date.now() - startTime;

    const columns = rows.length > 0 ? Object.keys(rows[0]).map(key => ({
      name: key,
      type: 'string',
      nullable: true
    })) : [];

    return {
      rows: rows.map(row => ({ ...row })),
      columns,
      rowCount: rows.length,
      executionTimeMs
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const datasets = await connection.client.getDatasets();
    const tables = [];

    for (const dataset of datasets[0]) {
      const [datasetTables] = await dataset.getTables();
      for (const table of datasetTables) {
        tables.push({
          name: table.id,
          schema: dataset.id,
          columns: []
        });
      }
    }

    return { tables, views: [] };
  },

  async disconnect(): Promise<void> {
    // BigQuery client doesn't need explicit disconnection
  }
};