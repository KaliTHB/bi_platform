// File: api-services/src/plugins/datasources/cloud_databases/mongodb.ts
import { MongoClient, Db } from 'mongodb';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';

export const mongodbPlugin: DataSourcePlugin = {
  name: 'mongodb',
  displayName: 'MongoDB',
  category: 'cloud_databases',
  version: '1.0.0',
  
  configSchema: {
    type: 'object',
    properties: {
      uri: { type: 'string', title: 'Connection URI', description: 'MongoDB connection URI' },
      database: { type: 'string', title: 'Database Name' },
      maxPoolSize: { type: 'integer', title: 'Max Pool Size', default: 10 }
    },
    required: ['uri', 'database'],
    additionalProperties: false
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const client = new MongoClient(config.uri, {
      maxPoolSize: config.maxPoolSize || 10
    });
    
    await client.connect();
    const db = client.db(config.database);

    return {
      id: `mongodb-${Date.now()}`,
      config,
      client: { mongoClient: client, db },
      isConnected: true,
      lastActivity: new Date()
    };
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      const connection = await this.connect(config);
      await connection.client.db.admin().ping();
      await this.disconnect(connection);
      return true;
    } catch (error) {
      return false;
    }
  },

  async executeQuery(connection: Connection, query: string): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Parse JSON query
      const queryObj = JSON.parse(query);
      const { collection, operation, filter = {}, options = {} } = queryObj;
      
      const coll = connection.client.db.collection(collection);
      let rows = [];
      
      switch (operation) {
        case 'find':
          rows = await coll.find(filter, options).toArray();
          break;
        case 'aggregate':
          rows = await coll.aggregate(filter).toArray();
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const executionTimeMs = Date.now() - startTime;
      
      const columns = rows.length > 0 ? Object.keys(rows[0]).map(key => ({
        name: key,
        type: 'mixed',
        nullable: true
      })) : [];

      return {
        rows,
        columns,
        rowCount: rows.length,
        executionTimeMs
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const collections = await connection.client.db.listCollections().toArray();
    
    const tables = collections.map(col => ({
      name: col.name,
      schema: connection.config.database,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client?.mongoClient) {
      await connection.client.mongoClient.close();
      connection.isConnected = false;
    }
  }
};
