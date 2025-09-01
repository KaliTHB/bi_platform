// File: api-services/src/plugins/datasources/cloud_databases/cosmosdb.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { CosmosClient, Database, Container } from '@azure/cosmos';

export const cosmosdbPlugin: DataSourcePlugin = {
  name: 'cosmosdb',
  displayName: 'Azure Cosmos DB',
  category: 'cloud_databases',
  version: '1.0.0',
  description: 'Connect to Azure Cosmos DB',
  
  configSchema: {
    type: 'object',
    properties: {
      endpoint: { type: 'string', title: 'Cosmos DB Endpoint' },
      key: { type: 'string', title: 'Primary Key', format: 'password' },
      database: { type: 'string', title: 'Database' },
      container: { type: 'string', title: 'Container (Optional)' },
      consistencyLevel: { 
        type: 'string', 
        title: 'Consistency Level',
        enum: ['Strong', 'Eventual', 'Session', 'BoundedStaleness', 'ConsistentPrefix'],
        default: 'Session'
      }
    },
    required: ['endpoint', 'key', 'database'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: true,
    maxConcurrentConnections: 50
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const client = new CosmosClient({
      endpoint: config.endpoint as string,
      key: config.key as string,
      consistencyLevel: config.consistencyLevel as any || 'Session'
    });

    const database = client.database(config.database as string);

    return {
      id: `cosmosdb-${Date.now()}`,
      config,
      client: { cosmos: client, database },
      isConnected: true,
      lastActivity: Date.now()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.database.read();
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Parse Cosmos DB query
      const querySpec = {
        query,
        parameters: params?.map((value, index) => ({
          name: `@param${index}`,
          value
        })) || []
      };
      
      // If container is specified in config, use it; otherwise, try to extract from query
      let container: Container;
      if (connection.config.container) {
        container = connection.client.database.container(connection.config.container as string);
      } else {
        throw new Error('Container must be specified in configuration or query');
      }
      
      const { resources } = await container.items.query(querySpec).fetchAll();
      const executionTimeMs = Date.now() - startTime;
      
      // Infer columns from first item
      const columns: any[] = [];
      if (resources.length > 0) {
        Object.keys(resources[0]).forEach(key => {
          columns.push({
            name: key,
            type: typeof resources[0][key],
            nullable: true,
            defaultValue: null
          });
        });
      }

      connection.lastActivity = Date.now();
      
      return {
        rows: resources,
        columns,
        rowCount: resources.length,
        executionTimeMs,
        queryId: `cosmosdb-${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Cosmos DB query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const { resources: containers } = await connection.client.database.containers.readAll().fetchAll();
    
    const tables = containers.map(container => ({
      name: container.id,
      schema: connection.config.database as string,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    connection.isConnected = false;
  }
};