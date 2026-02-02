// File: ./src/types/system.ts

export interface SystemHealthData {
  overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  metrics: SystemMetrics;
  services: ServiceStatus[];
  database: DatabaseHealth;
  cache: CacheHealth;
  alerts: HealthAlert[];
  last_updated: string;
  uptime: number;
  version: string;
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  memory_used: number;
  memory_total: number;
  disk_usage: number;
  disk_used: number;
  disk_total: number;
  active_connections: number;
  max_connections: number;
  response_time: number;
  requests_per_second: number;
  cache_hit_rate: number;
  queue_size: number;
}

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  uptime: string;
  uptime_seconds: number;
  last_check: string;
  version?: string;
  error_message?: string;
  port?: number;
  health_endpoint?: string;
}

export interface HealthAlert {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved?: boolean;
}

export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  connection_count: number;
  max_connections: number;
  active_queries: number;
  slow_queries: number;
  last_backup: string;
  database_size: number;
}

export interface CacheHealth {
  status: 'healthy' | 'warning' | 'critical';
  hit_rate: number;
  memory_usage: number;
  connected_clients: number;
  operations_per_second: number;
  expired_keys: number;
}

// Audit log types
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  workspace_id: string;
  created_at: string;
}

// Export/Import types
export interface ExportRequest {
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'png' | 'svg';
  dashboard_id?: string;
  chart_id?: string;
  dataset_id?: string;
  filters?: Record<string, any>;
  options?: ExportOptions;
}

export interface ExportOptions {
  title?: string;
  description?: string;
  include_header?: boolean;
  include_footer?: boolean;
  page_size?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  quality?: 'low' | 'medium' | 'high';
  compression?: boolean;
}

export interface ExportJob {
  id: string;
  type: 'dashboard' | 'chart' | 'dataset';
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  file_url?: string;
  file_size?: number;
  error_message?: string;
  created_by: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
}

// System configuration
export interface SystemConfiguration {
  max_users_per_workspace: number;
  max_dashboards_per_workspace: number;
  max_datasets_per_workspace: number;
  max_query_timeout: number;
  max_export_rows: number;
  max_file_upload_size: number;
  allowed_file_types: string[];
  cache_ttl_default: number;
  backup_retention_days: number;
  audit_log_retention_days: number;
}

// Performance monitoring
export interface PerformanceMetric {
  timestamp: string;
  metric_name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

export interface QueryPerformance {
  query_id: string;
  query: string;
  dataset_id: string;
  execution_time_ms: number;
  rows_returned: number;
  cache_hit: boolean;
  user_id: string;
  workspace_id: string;
  executed_at: string;
}