// File: ./src/components/admin/SystemHealth.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  Storage,
  Speed,
  Memory,
  CloudQueue,
  DataUsage,
  ExpandMore
} from '@mui/icons-material';
import { useSystemHealth } from '../../hooks/useSystemHealth';

interface SystemHealthProps {
  workspaceId: string;
}

interface HealthMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  unit: string;
  threshold: number;
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  lastCheck: string;
  errorMessage?: string;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ workspaceId }) => {
  const {
    healthData,
    loading,
    error,
    loadHealthData,
    lastUpdated,
    overallStatus,
    serviceSummary,
    activeAlertsCount,
    getMetricStatus
  } = useSystemHealth(workspaceId);

  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initial load
  useEffect(() => {
    loadHealthData();
  }, [workspaceId, loadHealthData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, loadHealthData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'running':
        return <CheckCircle />;
      case 'warning':
        return <Warning />;
      case 'critical':
      case 'error':
        return <Error />;
      default:
        return <Info />;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getMetricColor = (metricName: string, value: number) => {
    const status = getMetricStatus(metricName as any, value);
    switch (status) {
      case 'critical':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      default:
        return 'success.main';
    }
  };

  const getProgressColor = (metricName: string, value: number) => {
    const status = getMetricStatus(metricName as any, value);
    switch (status) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'success';
    }
  };

  if (loading && !healthData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={loadHealthData}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">System Health Monitor</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="textSecondary">
            Last updated: {lastUpdated ? 
              new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </Typography>
          <Tooltip title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}>
            <Chip
              label={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              color={autoRefresh ? "success" : "default"}
              size="small"
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant="outlined"
            />
          </Tooltip>
          <IconButton onClick={loadHealthData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Overall Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            {getStatusIcon(overallStatus)}
            <Typography variant="h6">
              System Status: {overallStatus.toUpperCase()}
            </Typography>
            {activeAlertsCount > 0 && (
              <Chip 
                label={`${activeAlertsCount} Alert${activeAlertsCount === 1 ? '' : 's'}`}
                color="error" 
                size="small" 
              />
            )}
          </Box>
          
          <Box display="flex" gap={2} mb={2}>
            <Chip 
              label={`${serviceSummary.running} Services Running`}
              color="success" 
              size="small" 
              variant="outlined"
            />
            {serviceSummary.error > 0 && (
              <Chip 
                label={`${serviceSummary.error} Service Errors`}
                color="error" 
                size="small" 
                variant="outlined"
              />
            )}
            {serviceSummary.stopped > 0 && (
              <Chip 
                label={`${serviceSummary.stopped} Services Stopped`}
                color="warning" 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
          
          {healthData?.alerts && healthData.alerts.length > 0 && (
            <Box>
              {healthData.alerts
                .filter(alert => !alert.resolved)
                .slice(0, 3) // Show only first 3 alerts
                .map((alert, index) => (
                <Alert key={index} severity={alert.severity} sx={{ mb: 1 }}>
                  {alert.message}
                </Alert>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* System Metrics */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">System Metrics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* CPU Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Speed color="primary" />
                    <Typography variant="subtitle1">CPU Usage</Typography>
                  </Box>
                  <Typography variant="h4" color={
                    getMetricColor('cpu_usage', healthData?.metrics?.cpu_usage || 0)
                  }>
                    {healthData?.metrics?.cpu_usage || 0}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={healthData?.metrics?.cpu_usage || 0}
                    color={getProgressColor('cpu_usage', healthData?.metrics?.cpu_usage || 0)}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Memory Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Memory color="primary" />
                    <Typography variant="subtitle1">Memory Usage</Typography>
                  </Box>
                  <Typography variant="h4" color={
                    getMetricColor('memory_usage', healthData?.metrics?.memory_usage || 0)
                  }>
                    {healthData?.metrics?.memory_usage || 0}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={healthData?.metrics?.memory_usage || 0}
                    color={getProgressColor('memory_usage', healthData?.metrics?.memory_usage || 0)}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    {formatBytes(healthData?.metrics?.memory_used || 0)} / {formatBytes(healthData?.metrics?.memory_total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Disk Usage */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Storage color="primary" />
                    <Typography variant="subtitle1">Disk Usage</Typography>
                  </Box>
                  <Typography variant="h4" color={
                    getMetricColor('disk_usage', healthData?.metrics?.disk_usage || 0)
                  }>
                    {healthData?.metrics?.disk_usage || 0}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={healthData?.metrics?.disk_usage || 0}
                    color={getProgressColor('disk_usage', healthData?.metrics?.disk_usage || 0)}
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    {formatBytes(healthData?.metrics?.disk_used || 0)} / {formatBytes(healthData?.metrics?.disk_total || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Active Connections */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <DataUsage color="primary" />
                    <Typography variant="subtitle1">DB Connections</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {healthData?.metrics?.active_connections || 0}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Max: {healthData?.metrics?.max_connections || 0}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={((healthData?.metrics?.active_connections || 0) / (healthData?.metrics?.max_connections || 1)) * 100}
                    color="primary"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Additional Metrics Row */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {/* Response Time */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CloudQueue color="primary" />
                    <Typography variant="subtitle1">Response Time</Typography>
                  </Box>
                  <Typography variant="h4" color={
                    getMetricColor('response_time', healthData?.metrics?.response_time || 0)
                  }>
                    {healthData?.metrics?.response_time || 0}ms
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Cache Hit Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Speed color="primary" />
                    <Typography variant="subtitle1">Cache Hit Rate</Typography>
                  </Box>
                  <Typography variant="h4" color={
                    getMetricColor('cache_hit_rate', healthData?.metrics?.cache_hit_rate || 0)
                  }>
                    {healthData?.metrics?.cache_hit_rate || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Requests per Second */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <DataUsage color="primary" />
                    <Typography variant="subtitle1">Requests/sec</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {healthData?.metrics?.requests_per_second || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Queue Size */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CloudQueue color="primary" />
                    <Typography variant="subtitle1">Queue Size</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {healthData?.metrics?.queue_size || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Service Status */}
      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Service Status</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Uptime</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Last Check</TableCell>
                  <TableCell>Port</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {healthData?.services?.map((service, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(service.status)}
                        <Typography variant="body2" fontWeight="medium">
                          {service.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={service.status.toUpperCase()} 
                        color={getStatusColor(service.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.uptime}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {service.version || 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {new Date(service.last_check).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {service.port || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Database Health */}
      {healthData?.database && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Database Health</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Connection Pool</Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Active Connections:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {healthData.database.connection_count} / {healthData.database.max_connections}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(healthData.database.connection_count / healthData.database.max_connections) * 100}
                      color="primary"
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>Query Performance</Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Active Queries:</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {healthData.database.active_queries}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">Slow Queries:</Typography>
                      <Typography variant="body2" fontWeight="medium" color={
                        healthData.database.slow_queries > 0 ? 'error.main' : 'success.main'
                      }>
                        {healthData.database.slow_queries}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Cache Health */}
      {healthData?.cache && (
        <Accordion sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6">Cache Health</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Hit Rate</Typography>
                    <Typography variant="h5" color={
                      healthData.cache.hit_rate > 90 ? 'success.main' : 
                      healthData.cache.hit_rate > 80 ? 'warning.main' : 'error.main'
                    }>
                      {healthData.cache.hit_rate}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Memory Usage</Typography>
                    <Typography variant="h5" color="primary">
                      {healthData.cache.memory_usage}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Connected Clients</Typography>
                    <Typography variant="h5" color="primary">
                      {healthData.cache.connected_clients}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Operations/sec</Typography>
                    <Typography variant="h5" color="primary">
                      {healthData.cache.operations_per_second}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

    </Box>
  );
};

export default SystemHealth;