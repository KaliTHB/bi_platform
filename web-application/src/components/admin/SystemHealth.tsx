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
    lastUpdated
  } = useSystemHealth(workspaceId);

  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [workspaceId, autoRefresh]);

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
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
          </Typography>
          <IconButton onClick={loadHealthData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Overall Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            {getStatusIcon(healthData?.overall_status || 'unknown')}
            <Typography variant="h6">
              System Status: {healthData?.overall_status?.toUpperCase() || 'Unknown'}
            </Typography>
          </Box>
          
          {healthData?.alerts && healthData.alerts.length > 0 && (
            <Box>
              {healthData.alerts.map((alert, index) => (
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
                    (healthData?.metrics?.cpu_usage || 0) > 80 ? 'error.main' : 
                    (healthData?.metrics?.cpu_usage || 0) > 60 ? 'warning.main' : 'success.main'
                  }>
                    {healthData?.metrics?.cpu_usage || 0}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={healthData?.metrics?.cpu_usage || 0}
                    color={
                      (healthData?.metrics?.cpu_usage || 0) > 80 ? 'error' : 
                      (healthData?.metrics?.cpu_usage || 0) > 60 ? 'warning' : 'success'
                    }
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
                    (healthData?.metrics?.memory_usage || 0) > 80 ? 'error.main' : 
                    (healthData?.metrics?.memory_usage || 0) > 60 ? 'warning.main' : 'success.main'
                  }>
                    {healthData?.metrics?.memory_usage || 0}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={healthData?.metrics?.memory_usage || 0}
                    color={
                      (healthData?.metrics?.memory_usage || 0) > 80 ? 'error' : 
                      (healthData?.metrics?.memory_usage || 0) > 60 ? 'warning' : 'success'
                    }
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
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
                    (healthData?.metrics?.disk_usage || 0) > 90 ? 'error.main' : 
                    (healthData?.metrics?.disk_usage || 0) > 75 ? 'warning.main' : 'success.main'
                  }>
                    {healthData?.metrics?.disk_usage || 0}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={healthData?.metrics?.disk_usage || 0}
                    color={
                      (healthData?.metrics?.disk_usage || 0) > 90 ? 'error' : 
                      (healthData?.metrics?.disk_usage || 0) > 75 ? 'warning' : 'success'
                    }
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
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
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    Max: {healthData?.metrics?.max_connections || 0}
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
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Uptime</TableCell>
                  <TableCell>Last Check</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {healthData?.services?.map((service: ServiceStatus) => (
                  <TableRow key={service.name}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {service.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(service.status)}
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
                      <Typography variant="body2">
                        {new Date(service.lastCheck).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {service.errorMessage && (
                        <Tooltip title={service.errorMessage}>
                          <IconButton size="small" color="error">
                            <Error />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Performance Metrics */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">Performance Metrics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Average Response Time
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {healthData?.performance?.avg_response_time || 0}ms
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Last 24 hours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Requests per Minute
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {healthData?.performance?.requests_per_minute || 0}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Current rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Cache Hit Rate
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {healthData?.performance?.cache_hit_rate || 0}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Redis cache performance
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Error Rate
                  </Typography>
                  <Typography variant="h4" color={
                    (healthData?.performance?.error_rate || 0) > 5 ? 'error.main' : 'success.main'
                  }>
                    {healthData?.performance?.error_rate || 0}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Last hour
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
