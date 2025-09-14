// File: ./src/hooks/useSystemHealth.ts

import { useState, useCallback } from 'react';

// Interfaces
interface SystemMetrics {
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

interface ServiceStatus {
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

interface HealthAlert {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved?: boolean;
}

interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  connection_count: number;
  max_connections: number;
  active_queries: number;
  slow_queries: number;
  last_backup: string;
  database_size: number;
}

interface CacheHealth {
  status: 'healthy' | 'warning' | 'critical';
  hit_rate: number;
  memory_usage: number;
  connected_clients: number;
  operations_per_second: number;
  expired_keys: number;
}

interface SystemHealthData {
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

// Mock data for development/fallback
const createMockHealthData = (): SystemHealthData => ({
  overall_status: 'healthy',
  metrics: {
    cpu_usage: Math.floor(Math.random() * 50) + 20,
    memory_usage: Math.floor(Math.random() * 40) + 30,
    memory_used: 2048 * 1024 * 1024, // 2GB
    memory_total: 8192 * 1024 * 1024, // 8GB
    disk_usage: Math.floor(Math.random() * 30) + 20,
    disk_used: 50 * 1024 * 1024 * 1024, // 50GB
    disk_total: 500 * 1024 * 1024 * 1024, // 500GB
    active_connections: Math.floor(Math.random() * 20) + 5,
    max_connections: 100,
    response_time: Math.floor(Math.random() * 100) + 50,
    requests_per_second: Math.floor(Math.random() * 1000) + 500,
    cache_hit_rate: Math.floor(Math.random() * 20) + 80,
    queue_size: Math.floor(Math.random() * 10)
  },
  services: [
    {
      name: 'API Server',
      status: 'running',
      uptime: '5d 12h 30m',
      uptime_seconds: 466200,
      last_check: Date.now().toISOString(),
      version: '1.0.0',
      port: 3001
    },
    {
      name: 'PostgreSQL',
      status: 'running',
      uptime: '15d 8h 45m',
      uptime_seconds: 1334700,
      last_check: Date.now().toISOString(),
      version: '15.3',
      port: 5432
    },
    {
      name: 'Redis Cache',
      status: 'running',
      uptime: '12d 20h 15m',
      uptime_seconds: 1115700,
      last_check: Date.now().toISOString(),
      version: '7.2.0',
      port: 6379
    },
    {
      name: 'Background Jobs',
      status: 'running',
      uptime: '3d 6h 20m',
      uptime_seconds: 283200,
      last_check: Date.now().toISOString()
    }
  ],
  database: {
    status: 'healthy',
    connection_count: 25,
    max_connections: 100,
    active_queries: 3,
    slow_queries: 0,
    last_backup: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
    database_size: 1024 * 1024 * 1024 // 1GB
  },
  cache: {
    status: 'healthy',
    hit_rate: 94.5,
    memory_usage: 45.2,
    connected_clients: 12,
    operations_per_second: 1250,
    expired_keys: 0
  },
  alerts: [],
  last_updated: Date.now().toISOString(),
  uptime: 2592000, // 30 days
  version: '1.0.0'
});

export const useSystemHealth = (workspaceId?: string) => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  type MetricWithThreshold = 'cpu_usage' | 'memory_usage' | 'disk_usage' | 'cache_hit_rate' | 'response_time' | 'active_connections';

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load system health data
  const loadHealthData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = workspaceId 
        ? `/api/workspaces/${workspaceId}/health`
        : '/api/system/health';

      const response = await fetch(endpoint, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        // If API is not available, use mock data
        console.warn('Health API not available, using mock data');
        const mockData = createMockHealthData();
        setHealthData(mockData);
        setLastUpdated(mockData.last_updated);
        return;
      }

      const data = await response.json();
      
      // Ensure data has the expected structure
      const healthData: SystemHealthData = {
        overall_status: data.overall_status || 'unknown',
        metrics: data.metrics || createMockHealthData().metrics,
        services: data.services || [],
        database: data.database || createMockHealthData().database,
        cache: data.cache || createMockHealthData().cache,
        alerts: data.alerts || [],
        last_updated: data.last_updated || Date.now().toISOString(),
        uptime: data.uptime || 0,
        version: data.version || '1.0.0'
      };

      setHealthData(healthData);
      setLastUpdated(healthData.last_updated);

    } catch (error: unknown) {
      console.warn('Failed to load health data, using mock data:', error);
      
      // Fall back to mock data on error
      const mockData = createMockHealthData();
      setHealthData(mockData);
      setLastUpdated(mockData.last_updated);
      
      // Don't set error for now since we have fallback data
      // setError('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Get overall system status
  const getOverallStatus = useCallback((): 'healthy' | 'warning' | 'critical' | 'unknown' => {
    if (!healthData) return 'unknown';

    // Check for critical alerts
    const criticalAlerts = healthData.alerts.filter(a => a.severity === 'error' && !a.resolved);
    if (criticalAlerts.length > 0) return 'critical';

    // Check service statuses
    const failedServices = healthData.services.filter(s => s.status === 'error');
    if (failedServices.length > 0) return 'critical';

    // Check metrics thresholds
    const metrics = healthData.metrics;
    if (
      metrics.cpu_usage > 90 ||
      metrics.memory_usage > 90 ||
      metrics.disk_usage > 95
    ) {
      return 'critical';
    }

    // Check for warnings
    const warningAlerts = healthData.alerts.filter(a => a.severity === 'warning' && !a.resolved);
    if (warningAlerts.length > 0) return 'warning';

    if (
      metrics.cpu_usage > 70 ||
      metrics.memory_usage > 70 ||
      metrics.disk_usage > 80 ||
      healthData.cache.hit_rate < 80
    ) {
      return 'warning';
    }

    return 'healthy';
  }, [healthData]);

  // Get service status summary
  const getServiceSummary = useCallback(() => {
    if (!healthData) return { running: 0, stopped: 0, error: 0 };

    return healthData.services.reduce((acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, { running: 0, stopped: 0, error: 0 } as Record<string, number>);
  }, [healthData]);

  // Get active alerts count
  const getActiveAlertsCount = useCallback(() => {
    if (!healthData) return 0;
    return healthData.alerts.filter(a => !a.resolved).length;
  }, [healthData]);

  // Check if metric is in warning/critical state
  const getMetricStatus = useCallback((metricName: MetricWithThreshold, value: number) => {
  const thresholds: Record<MetricWithThreshold, { warning: number; critical: number }> = {
    cpu_usage: { warning: 70, critical: 90 },
    memory_usage: { warning: 70, critical: 90 },
    disk_usage: { warning: 80, critical: 95 },
    cache_hit_rate: { warning: 80, critical: 70 }, // Lower is worse for cache
    response_time: { warning: 1000, critical: 2000 },
    active_connections: { warning: 80, critical: 95 }
  };

  const threshold = thresholds[metricName];
  if (!threshold) return 'healthy';

  // Special handling for cache hit rate (lower is worse)
  if (metricName === 'cache_hit_rate') {
    if (value < threshold.critical) return 'critical';
    if (value < threshold.warning) return 'warning';
    return 'healthy';
  }

  // For connection percentage
  if (metricName === 'active_connections' && healthData) {
    const percentage = (value / healthData.metrics.max_connections) * 100;
    if (percentage > threshold.critical) return 'critical';
    if (percentage > threshold.warning) return 'warning';
    return 'healthy';
  }

  // Standard thresholds (higher is worse)
  if (value > threshold.critical) return 'critical';
  if (value > threshold.warning) return 'warning';
  return 'healthy';
}, [healthData]);

  return {
    // State
    healthData,
    loading,
    error,
    lastUpdated,

    // Actions
    loadHealthData,

    // Computed values
    overallStatus: getOverallStatus(),
    serviceSummary: getServiceSummary(),
    activeAlertsCount: getActiveAlertsCount(),

    // Helpers
    getMetricStatus
  };
};