// File: api-services/src/plugins/interfaces/DataSourcePlugin.ts
export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  [key: string]: any;
}

export interface Connection {
  id: string;
  config: ConnectionConfig;
  client: any;
  isConnected: boolean;
  lastActivity: Date;
}

export interface QueryResult {
  rows: any[];
  fields?: Array<{
    name: string;
    type: string;
  }>;
  rowCount: number;
  executionTime?: number;
}

export interface TableInfo {
  name: string;
  schema: string;
  type: 'table' | 'view';
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
}

export interface SchemaInfo {
  tables: TableInfo[];
  views: TableInfo[];
}

export interface ConfigSchema {
  type: 'object';
  properties: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'password';
      required?: boolean;
      default?: any;
      title?: string;
      description?: string;
      minimum?: number;
      maximum?: number;
      pattern?: string;
    };
  };
  required?: string[];
}

export interface DataSourcePlugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud' | 'nosql' | 'files' | 'apis';
  version: string;
  description?: string;
  configSchema: ConfigSchema;
  
  connect(config: ConnectionConfig): Promise<Connection>;
  testConnection(config: ConnectionConfig): Promise<boolean>;
  executeQuery(connection: Connection, query: string, params?: any[]): Promise<QueryResult>;
  getSchema(connection: Connection): Promise<SchemaInfo>;
  getTables(connection: Connection, database?: string): Promise<TableInfo[]>;
  getColumns(connection: Connection, table: string): Promise<ColumnInfo[]>;
  disconnect(connection: Connection): Promise<void>;
}