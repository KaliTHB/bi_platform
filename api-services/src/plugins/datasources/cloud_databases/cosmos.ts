// File: api-services/src/plugins/datasources/cloud_databases/cosmosdb.ts
import { CosmosClient } from '@azure/cosmos';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const cosmosdbPlugin: DataSourcePlugin = {
  name: 'cosmosdb',
  displayName: 'Azure Cosmos DB',
  category: 'cloud_databases',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      endpoint: { type: 'string', title: 'Cosmos DB Endpoint' },
      key: { type: 'string', title: 'Primary Key' },
      databaseId: { type: 'string', title: 'Database ID' },
      containerId: { type: 'string', title: 'Container ID' }
    },
    required: ['endpoint', 'key', 'databaseId', 'containerId'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const client = new CosmosClient({
      endpoint: config.endpoint,
      key: config.key
    });

    return {
      id: `cosmosdb-${Date.now()}`,
      config,
      client,
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.database(config.databaseId).read();
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    const container = connection.client
      .database(connection.config.databaseId)
      .container(connection.config.containerId);

    const { resources: items } = await container.items.query(query).fetchAll();
    const executionTimeMs = Date.now() - startTime;

    const columns = items.length > 0 ? Object.keys(items[0]).map(key => ({
      name: key,
      type: 'mixed',
      nullable: true
    })) : [];

    return {
      rows: items,
      columns,
      rowCount: items.length,
      executionTimeMs
    };
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const database = connection.client.database(connection.config.databaseId);
    const { resources: containers } = await database.containers.readAll().fetchAll();
    
    const tables = containers.map(container => ({
      name: container.id,
      schema: connection.config.databaseId,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(): Promise<void> {
    // Cosmos DB client doesn't need explicit disconnection
  }
};
