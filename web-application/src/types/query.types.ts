export interface QueryFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in';
  value: any;
  logical_operator?: 'and' | 'or';
}

export interface QueryResult {
  data: any[];
  columns: ColumnInfo[];
  total_rows: number;
  execution_time_ms: number;
  cached: boolean;
  query_id?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  format?: string;
}