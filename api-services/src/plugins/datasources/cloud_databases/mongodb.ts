// File: api-services/src/plugins/datasources/cloud_databases/mongodb.ts
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo } from '../interfaces/DataSourcePlugin';
import { MongoClient, Db } from 'mongodb';

export const mongodbPlugin: DataSourcePlugin = {
  name: 'mongodb',
  displayName: 'MongoDB',
  category: 'cloud_databases',
  version: '1.0.0',
  description: 'Connect to MongoDB databases',
  
  configSchema: {
    type: 'object',
    properties: {
      uri: { type: 'string', title: 'Connection URI' },
      host: { type: 'string', title: 'Host', default: 'localhost' },
      port: { type: 'number', title: 'Port', default: 27017 },
      database: { type: 'string', title: 'Database' },
      username: { type: 'string', title: 'Username' },
      password: { type: 'string', title: 'Password', format: 'password' },
      authSource: { type: 'string', title: 'Auth Source', default: 'admin' },
      ssl: { type: 'boolean', title: 'Use SSL', default: false }
    },
    required: ['database'],
    additionalProperties: false
  },

  capabilities: {
    supportsBulkInsert: true,
    supportsTransactions: true,
    supportsStoredProcedures: false,
    maxConcurrentConnections: 100
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const uri = config.uri || this.buildConnectionUri(config);
    const client = new MongoClient(uri);
    
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

  async executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Parse MongoDB query (simplified - in practice you'd need a more robust parser)
      const queryObj = JSON.parse(query);
      const collection = connection.client.db.collection(queryObj.collection);
      
      let result;
      switch (queryObj.operation) {
        case 'find':
          result = await collection.find(queryObj.filter || {}).limit(queryObj.limit || 1000).toArray();
          break;
        case 'aggregate':
          result = await collection.aggregate(queryObj.pipeline || []).toArray();
          break;
        case 'count':
          result = [{ count: await collection.countDocuments(queryObj.filter || {}) }];
          break;
        default:
          throw new Error(`Unsupported operation: ${queryObj.operation}`);
      }
      
      const executionTimeMs = Date.now() - startTime;
      
      // Infer columns from first document
      const columns = result.length > 0 ? 
        Object.keys(result[0]).map(key => ({
          name: key,
          type: typeof result[0][key],
          nullable: true,
          defaultValue: null
        })) : [];

      connection.lastActivity = new Date();
      
      return {
        rows: result,
        columns,
        rowCount: result.length,
        executionTimeMs,
        queryId: `mongodb-${Date.now()}`
      };
    } catch (error) {
      throw new Error(`MongoDB query error: ${error}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    const collections = await connection.client.db.listCollections().toArray();
    
    const tables = collections.map(col => ({
      name: col.name,
      schema: connection.config.database as string,
      columns: []
    }));

    return { tables, views: [] };
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client?.mongoClient) {
      await connection.client.mongoClient.close();
    }
    connection.isConnected = false;
  },

  private buildConnectionUri(config: ConnectionConfig): string {
    const auth = config.username && config.password ? 
      `${config.username}:${config.password}@` : '';
    const options = [];
    
    if (config.authSource) options.push(`authSource=${config.authSource}`);
    if (config.ssl) options.push('ssl=true');
    
    const optionsString = options.length > 0 ? `?${options.join('&')}` : '';
    
    return `mongodb://${auth}${config.host}:${config.port}/${config.database}${optionsString}`;
  }
};