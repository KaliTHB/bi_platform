// File: api-services/src/plugins/datasources/nosql/mongodb.ts
import { MongoClient, Db } from 'mongodb';
import { DataSourcePlugin, ConnectionConfig, Connection, QueryResult, SchemaInfo, TableInfo, ColumnInfo } from '../interfaces/DataSourcePlugin';

class MongoDBConnection implements Connection {
  id: string;
  config: ConnectionConfig;
  client: MongoClient;
  db?: Db;
  isConnected: boolean;
  lastActivity: Date;

  constructor(config: ConnectionConfig) {
    this.id = `mongo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    
    const uri = config.connectionString || 
      `mongodb://${config.username}:${config.password}@${config.host}:${config.port || 27017}/${config.database}`;
    
    this.client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    this.isConnected = false;
    this.lastActivity = new Date();
  }
}

export const MongoDBPlugin: DataSourcePlugin = {
  name: 'mongodb',
  displayName: 'MongoDB',
  category: 'nosql',
  version: '1.0.0',
  description: 'MongoDB NoSQL database connector',
  
  configSchema: {
    type: 'object',
    properties: {
      connectionString: {
        type: 'string',
        title: 'Connection String',
        description: 'Complete MongoDB connection string (optional, overrides other fields)'
      },
      host: {
        type: 'string',
        title: 'Host',
        description: 'MongoDB server hostname or IP address',
        default: 'localhost'
      },
      port: {
        type: 'number',
        title: 'Port',
        description: 'MongoDB server port',
        default: 27017,
        minimum: 1,
        maximum: 65535
      },
      database: {
        type: 'string',
        required: true,
        title: 'Database Name',
        description: 'Name of the database to connect to'
      },
      username: {
        type: 'string',
        title: 'Username',
        description: 'Database username (optional)'
      },
      password: {
        type: 'password',
        title: 'Password',
        description: 'Database password (optional)'
      }
    },
    required: ['database']
  },

  async connect(config: ConnectionConfig): Promise<Connection> {
    const connection = new MongoDBConnection(config);
    
    try {
      await connection.client.connect();
      connection.db = connection.client.db(config.database);
      
      // Test the connection
      await connection.db.admin().ping();
      
      connection.isConnected = true;
      connection.lastActivity = new Date();
      
      return connection;
    } catch (error) {
      await connection.client.close();
      throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async testConnection(config: ConnectionConfig): Promise<boolean> {
    const testConnection = new MongoDBConnection(config);
    
    try {
      await testConnection.client.connect();
      const db = testConnection.client.db(config.database);
      await db.admin().ping();
      return true;
    } catch (error) {
      return false;
    } finally {
      await testConnection.client.close();
    }
  },

  async executeQuery(connection: Connection, query: string, params: any[] = []): Promise<QueryResult> {
    if (!connection.isConnected || !connection.db) {
      throw new Error('Connection is not established');
    }

    const startTime = Date.now();
    
    try {
      // Parse MongoDB query (this is simplified - in reality you'd want a proper parser)
      const parsedQuery = JSON.parse(query);
      const { collection, operation, filter, options } = parsedQuery;
      
      const coll = connection.db.collection(collection);
      let result: any;
      
      switch (operation) {
        case 'find':
          result = await coll.find(filter || {}, options || {}).toArray();
          break;
        case 'findOne':
          result = [await coll.findOne(filter || {}, options || {})];
          break;
        case 'aggregate':
          result = await coll.aggregate(filter || [], options || {}).toArray();
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      const executionTime = Date.now() - startTime;
      connection.lastActivity = new Date();
      
      return {
        rows: result || [],
        rowCount: result?.length || 0,
        executionTime
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getSchema(connection: Connection): Promise<SchemaInfo> {
    if (!connection.isConnected || !connection.db) {
      throw new Error('Connection is not established');
    }

    try {
      const collections = await connection.db.listCollections().toArray();
      
      const tables = collections.map(coll => ({
        name: coll.name,
        schema: connection.config.database as string,
        type: 'table' as const
      }));

      return { tables, views: [] };
    } catch (error) {
      throw new Error(`Failed to get schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async getTables(connection: Connection): Promise<TableInfo[]> {
    const schema = await this.getSchema(connection);
    return schema.tables;
  },

  async getColumns(connection: Connection, table: string): Promise<ColumnInfo[]> {
    if (!connection.isConnected || !connection.db) {
      throw new Error('Connection is not established');
    }

    try {
      // Sample documents to infer schema
      const collection = connection.db.collection(table);
      const sample = await collection.findOne();
      
      if (!sample) {
        return [];
      }

      // Simple schema inference from one document
      const columns: ColumnInfo[] = [];
      for (const [key, value] of Object.entries(sample)) {
        columns.push({
          name: key,
          type: typeof value,
          nullable: true,
          isPrimaryKey: key === '_id'
        });
      }

      return columns;
    } catch (error) {
      throw new Error(`Failed to get columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async disconnect(connection: Connection): Promise<void> {
    if (connection.client) {
      await connection.client.close();
      connection.isConnected = false;
    }
  }
};