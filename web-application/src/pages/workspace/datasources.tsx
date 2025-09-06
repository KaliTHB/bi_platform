// web-application/src/pages/workspace/datasources.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Dns as DatabaseIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Schema as SchemaIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Update as UpdateIcon,
  Backup as BackupIcon,
  Cached as CacheIcon
} from '@mui/icons-material';

// Import common components
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../components/shared/PermissionGate';

// Import hooks and services
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

// Types
interface DataSourceData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  plugin_name: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlite' | 'bigquery' | 'snowflake' | 'redshift' | 'oracle' | 'mssql';
  status: 'connected' | 'disconnected' | 'error' | 'testing' | 'configuring';
  host?: string;
  port?: number;
  database_name?: string;
  schema_name?: string;
  connection_pool_size?: number;
  ssl_enabled: boolean;
  is_read_only: boolean;
  auto_refresh_enabled: boolean;
  refresh_schedule?: string;
  last_connection_test?: string;
  test_result?: 'success' | 'failed' | 'timeout';
  test_error_message?: string;
  error_message?: string;
  tables_count?: number;
  total_size_bytes?: number;
  version?: string;
  created_at: string;
  updated_at: string;
  last_tested?: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  connection_config?: {
    timeout?: number;
    retry_attempts?: number;
    pool_settings?: Record<string, any>;
  };
  usage_stats?: {
    chart_count: number;
    dashboard_count: number;
    dataset_count: number;
    query_count: number;
    last_used?: string;
    daily_queries?: number;
    weekly_queries?: number;
  };
  security_config?: {
    encryption_enabled?: boolean;
    audit_logging?: boolean;
    ip_whitelist?: string[];
  };
  backup_config?: {
    enabled: boolean;
    frequency?: string;
    retention_days?: number;
    last_backup?: string;
  };
}

// Main Page Component
const DataSourcesPage: NextPage = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [dataSources, setDataSources] = useState<DataSourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    host: '',
    port: 5432,
    database_name: '',
    ssl_enabled: true,
    is_read_only: false,
    auto_refresh_enabled: false
  });

  // Mock data (replace with actual API calls)
  useEffect(() => {
    loadDataSources();
  }, [workspace?.id]);

  const loadDataSources = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data - replace with actual API call
      const mockDataSources: DataSourceData[] = [
        {
          id: '1',
          name: 'production-postgres',
          display_name: 'Production PostgreSQL',
          description: 'Main production database containing customer and transaction data',
          plugin_name: 'PostgreSQL',
          type: 'postgresql',
          status: 'connected',
          host: 'prod-db.company.com',
          port: 5432,
          database_name: 'analytics',
          schema_name: 'public',
          ssl_enabled: true,
          is_read_only: false,
          auto_refresh_enabled: true,
          refresh_schedule: '0 2 * * *',
          last_connection_test: '2024-01-15T10:30:00Z',
          test_result: 'success',
          tables_count: 24,
          total_size_bytes: 2147483648, // 2GB
          version: '14.5',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          last_tested: '2024-01-15T10:30:00Z',
          owner_id: 'user1',
          owner: {
            id: 'user1',
            name: 'John Doe',
            email: 'john.doe@company.com'
          },
          usage_stats: {
            chart_count: 45,
            dashboard_count: 12,
            dataset_count: 8,
            query_count: 1250,
            last_used: '2024-01-15T09:15:00Z',
            daily_queries: 85,
            weekly_queries: 520
          },
          security_config: {
            encryption_enabled: true,
            audit_logging: true,
            ip_whitelist: ['10.0.0.0/8', '192.168.0.0/16']
          }
        },
        {
          id: '2',
          name: 'staging-mysql',
          display_name: 'Staging MySQL',
          description: 'Staging environment database for development and testing',
          plugin_name: 'MySQL',
          type: 'mysql',
          status: 'disconnected',
          host: 'staging-db.company.com',
          port: 3306,
          database_name: 'staging_analytics',
          ssl_enabled: true,
          is_read_only: true,
          auto_refresh_enabled: false,
          last_connection_test: '2024-01-14T14:20:00Z',
          test_result: 'failed',
          test_error_message: 'Connection timeout - host unreachable',
          error_message: 'Connection timeout - host unreachable',
          tables_count: 18,
          version: '8.0.32',
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-14T14:20:00Z',
          last_tested: '2024-01-14T14:20:00Z',
          owner_id: 'user2',
          owner: {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane.smith@company.com'
          },
          usage_stats: {
            chart_count: 12,
            dashboard_count: 3,
            dataset_count: 4,
            query_count: 340,
            last_used: '2024-01-14T16:45:00Z',
            daily_queries: 15,
            weekly_queries: 105
          },
          security_config: {
            encryption_enabled: false,
            audit_logging: false
          }
        },
        {
          id: '3',
          name: 'bigquery-analytics',
          display_name: 'BigQuery Analytics',
          description: 'Google BigQuery data warehouse for large-scale analytics',
          plugin_name: 'BigQuery',
          type: 'bigquery',
          status: 'connected',
          database_name: 'analytics-project',
          schema_name: 'public',
          ssl_enabled: true,
          is_read_only: false,
          auto_refresh_enabled: true,
          refresh_schedule: '0 */6 * * *',
          last_connection_test: '2024-01-15T08:45:00Z',
          test_result: 'success',
          tables_count: 156,
          total_size_bytes: 107374182400, // 100GB
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-15T08:45:00Z',
          last_tested: '2024-01-15T08:45:00Z',
          owner_id: 'user1',
          owner: {
            id: 'user1',
            name: 'John Doe',
            email: 'john.doe@company.com'
          },
          usage_stats: {
            chart_count: 89,
            dashboard_count: 28,
            dataset_count: 15,
            query_count: 2890,
            last_used: '2024-01-15T11:30:00Z',
            daily_queries: 156,
            weekly_queries: 980
          },
          security_config: {
            encryption_enabled: true,
            audit_logging: true
          },
          backup_config: {
            enabled: true,
            frequency: 'daily',
            retention_days: 30,
            last_backup: '2024-01-15T02:00:00Z'
          }
        }
      ];
      
      setDataSources(mockDataSources);
    } catch (error) {
      console.error('Failed to load data sources:', error);
      setError('Failed to load data sources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getTypeIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      postgresql: <DatabaseIcon fontSize="small" />,
      mysql: <DatabaseIcon fontSize="small" />,
      mongodb: <StorageIcon fontSize="small" />,
      sqlite: <DatabaseIcon fontSize="small" />,
      bigquery: <CloudIcon fontSize="small" />,
      snowflake: <CloudIcon fontSize="small" />,
      redshift: <CloudIcon fontSize="small" />,
      oracle: <DatabaseIcon fontSize="small" />,
      mssql: <DatabaseIcon fontSize="small" />
    };
    return iconMap[type] || <DatabaseIcon fontSize="small" />;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: 'success' | 'warning' | 'error' | 'default' } = {
      connected: 'success',
      disconnected: 'warning', 
      error: 'error',
      testing: 'default',
      configuring: 'default'
    };
    return colorMap[status] || 'default';
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Event handlers
  const handleCreateDataSource = () => {
    router.push(`/workspace/${workspace?.slug}/datasource-builder`);
  };

  const handleEditDataSource = (dataSource: DataSourceData) => {
    setSelectedDataSource(dataSource);
    setFormData({
      name: dataSource.name,
      display_name: dataSource.display_name,
      description: dataSource.description || '',
      host: dataSource.host || '',
      port: dataSource.port || 5432,
      database_name: dataSource.database_name || '',
      ssl_enabled: dataSource.ssl_enabled,
      is_read_only: dataSource.is_read_only,
      auto_refresh_enabled: dataSource.auto_refresh_enabled
    });
    setEditDialogOpen(true);
  };

  const handleDeleteDataSource = (dataSource: DataSourceData) => {
    setSelectedDataSource(dataSource);
    setDeleteDialogOpen(true);
  };

  const handleTestConnection = async (dataSource: DataSourceData) => {
    setTestingConnections(prev => new Set([...prev, dataSource.id]));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the datasource status
      setDataSources(prev => prev.map(ds => 
        ds.id === dataSource.id 
          ? { 
              ...ds, 
              status: 'connected',
              last_connection_test: new Date().toISOString(),
              test_result: 'success',
              error_message: undefined,
              test_error_message: undefined
            }
          : ds
      ));
    } catch (error) {
      setDataSources(prev => prev.map(ds => 
        ds.id === dataSource.id 
          ? { 
              ...ds, 
              status: 'error',
              last_connection_test: new Date().toISOString(),
              test_result: 'failed',
              test_error_message: 'Connection test failed'
            }
          : ds
      ));
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(dataSource.id);
        return newSet;
      });
    }
  };

  const handleDuplicateDataSource = (dataSource: DataSourceData) => {
    router.push(`/workspace/${workspace?.slug}/datasource-builder?duplicate=${dataSource.id}`);
  };

  const handleShareDataSource = (dataSource: DataSourceData) => {
    // Handle share functionality
    navigator.clipboard.writeText(
      `${window.location.origin}/workspace/${workspace?.slug}/datasources/${dataSource.id}`
    );
    // Show success message (you might want to add a snackbar here)
  };

  const handleToggleStatus = async (dataSource: DataSourceData) => {
    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDataSources(prev => prev.map(ds =>
        ds.id === dataSource.id
          ? { ...ds, status: ds.status === 'connected' ? 'disconnected' : 'connected' }
          : ds
      ));
    } catch (error) {
      setError('Failed to update data source status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDataSource) return;

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDataSources(prev => prev.filter(ds => ds.id !== selectedDataSource.id));
      setDeleteDialogOpen(false);
      setSelectedDataSource(null);
    } catch (error) {
      setError('Failed to delete data source');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDataSource = async () => {
    if (!selectedDataSource) return;

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDataSources(prev => prev.map(ds =>
        ds.id === selectedDataSource.id
          ? { 
              ...ds, 
              ...formData,
              updated_at: new Date().toISOString()
            }
          : ds
      ));
      setEditDialogOpen(false);
      setSelectedDataSource(null);
    } catch (error) {
      setError('Failed to update data source');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    loadDataSources();
  };

  // Visibility icon mapping
  const getVisibilityIcon = (visibility: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      public: <DatabaseIcon fontSize="small" />,
      private: <SecurityIcon fontSize="small" />,
      workspace: <DatabaseIcon fontSize="small" />
    };
    return iconMap[visibility] || <DatabaseIcon fontSize="small" />;
  };

  // Table columns configuration
  const columns: TableColumn<DataSourceData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Data Source',
      sortable: true,
      render: (dataSource: DataSourceData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 40, 
            height: 40, 
            borderRadius: 1, 
            bgcolor: dataSource.status === 'connected' ? 'success.light' : 'warning.light', 
            color: dataSource.status === 'connected' ? 'success.main' : 'warning.main' 
          }}>
            {getTypeIcon(dataSource.type)}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {dataSource.display_name}
              </Typography>
              {dataSource.is_read_only && (
                <Chip label="Read Only" size="small" color="default" variant="outlined" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {dataSource.name}
            </Typography>
            {dataSource.description && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                {dataSource.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'type',
      label: 'Type & Connection',
      sortable: true,
      render: (dataSource: DataSourceData) => (
        <Box>
          <Chip
            label={dataSource.plugin_name}
            size="small"
            variant="outlined"
            icon={getTypeIcon(dataSource.type)}
            sx={{ mb: 0.5 }}
          />
          {dataSource.host && (
            <Typography variant="caption" display="block" color="text.secondary">
              {dataSource.host}:{dataSource.port}
            </Typography>
          )}
          {dataSource.database_name && (
            <Typography variant="caption" display="block" color="text.secondary">
              DB: {dataSource.database_name}
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (dataSource: DataSourceData) => (
        <Box>
          <Chip
            label={dataSource.status.toUpperCase()}
            size="small"
            color={getStatusColor(dataSource.status)}
            variant="filled"
            icon={testingConnections.has(dataSource.id) ? <CircularProgress size={12} /> : undefined}
            sx={{ mb: 0.5 }}
          />
          {dataSource.test_error_message && (
            <Typography variant="caption" display="block" color="error.main">
              {dataSource.test_error_message}
            </Typography>
          )}
          {dataSource.last_tested && (
            <Typography variant="caption" display="block" color="text.secondary">
              Tested: {new Date(dataSource.last_tested).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'tables_info',
      label: 'Database Info',
      sortable: true,
      render: (dataSource: DataSourceData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {dataSource.tables_count || 0} tables
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(dataSource.total_size_bytes)}
          </Typography>
          {dataSource.version && (
            <Typography variant="caption" display="block" color="text.secondary">
              v{dataSource.version}
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'usage',
      label: 'Usage Stats',
      sortable: true,
      render: (dataSource: DataSourceData) => (
        <Box>
          <Typography variant="body2">
            {dataSource.usage_stats?.chart_count || 0} charts
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dataSource.usage_stats?.dashboard_count || 0} dashboards
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {dataSource.usage_stats?.query_count || 0} queries
          </Typography>
          {dataSource.usage_stats?.last_used && (
            <Typography variant="caption" display="block" color="text.secondary">
              Used: {new Date(dataSource.usage_stats.last_used).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (dataSource: DataSourceData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={dataSource.owner?.email} sx={{ width: 24, height: 24 }}>
            {dataSource.owner?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">
            {dataSource.owner?.name || 'Unknown'}
          </Typography>
        </Box>
      )
    }
  ], [testingConnections]);

  // Table actions configuration
  const actions: TableAction<DataSourceData>[] = useMemo(() => [
    {
      label: 'Test Connection',
      icon: <TestIcon fontSize="small" />,
      onClick: (dataSource) => handleTestConnection(dataSource),
      show: (dataSource) => hasPermission('datasource.test') && dataSource.status !== 'testing',
      color: 'info',
      disabled: (dataSource) => testingConnections.has(dataSource.id)
    },
    {
      label: 'View Schema',
      icon: <SchemaIcon fontSize="small" />,
      onClick: (dataSource) => {
        router.push(`/workspace/${workspace?.slug}/datasources/${dataSource.id}/schema`);
      },
      show: (dataSource) => hasPermission('datasource.read') && dataSource.status === 'connected',
      color: 'default'
    },
    {
      label: 'Edit Configuration',
      icon: <EditIcon fontSize="small" />,
      onClick: (dataSource) => handleEditDataSource(dataSource),
      show: (dataSource) => hasPermission('datasource.update') && 
        (dataSource.owner_id === user?.id || hasPermission('datasource.admin')),
      color: 'default'
    },
    {
      label: 'View Analytics',
      icon: <AnalyticsIcon fontSize="small" />,
      onClick: (dataSource) => {
        router.push(`/workspace/${workspace?.slug}/datasources/${dataSource.id}/analytics`);
      },
      show: (dataSource) => hasPermission('datasource.read') && dataSource.usage_stats,
      color: 'info'
    },
    {
      label: 'Duplicate Data Source',
      icon: <BackupIcon fontSize="small" />,
      onClick: (dataSource) => handleDuplicateDataSource(dataSource),
      show: () => hasPermission('datasource.create'),
      color: 'secondary'
    },
    {
      label: 'Refresh Schema',
      icon: <RefreshIcon fontSize="small" />,
      onClick: (dataSource) => {
        // Handle schema refresh
        console.log('Refreshing schema for:', dataSource.id);
      },
      show: (dataSource) => hasPermission('datasource.update') && dataSource.status === 'connected',
      color: 'primary'
    },
    {
      label: dataSource => dataSource.status === 'connected' ? 'Disconnect' : 'Connect',
      icon: (dataSource) => dataSource.status === 'connected' ? <ErrorIcon fontSize="small" /> : <CheckIcon fontSize="small" />,
      onClick: (dataSource) => handleToggleStatus(dataSource),
      show: () => hasPermission('datasource.update'),
      color: (dataSource) => dataSource.status === 'connected' ? 'warning' : 'success'
    },
    {
      label: 'Delete Data Source',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (dataSource) => handleDeleteDataSource(dataSource),
      show: (dataSource) => hasPermission('datasource.delete') && 
        (dataSource.owner_id === user?.id || hasPermission('datasource.admin')),
      color: 'error',
      disabled: (dataSource) => (dataSource.usage_stats?.chart_count || 0) > 0
    }
  ], [hasPermission, router, workspace?.slug, user?.id, testingConnections]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'connected', label: 'Connected' },
        { value: 'disconnected', label: 'Disconnected' },
        { value: 'error', label: 'Error' },
        { value: 'testing', label: 'Testing' }
      ]
    },
    {
      key: 'type',
      label: 'Database Type',
      options: [
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'mysql', label: 'MySQL' },
        { value: 'mongodb', label: 'MongoDB' },
        { value: 'bigquery', label: 'BigQuery' },
        { value: 'snowflake', label: 'Snowflake' },
        { value: 'redshift', label: 'Redshift' },
        { value: 'oracle', label: 'Oracle' },
        { value: 'mssql', label: 'SQL Server' }
      ]
    },
    {
      key: 'is_read_only',
      label: 'Access Mode',
      options: [
        { value: true, label: 'Read Only' },
        { value: false, label: 'Read/Write' }
      ]
    }
  ];

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Data Sources
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your database connections and monitor data source health
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Data Sources Table */}
        <CommonTableLayout
          data={dataSources}
          loading={loading}
          error={error}
          columns={columns}
          actions={actions}
          title="All Data Sources"
          subtitle={`${dataSources.length} data sources found`}
          searchable={true}
          searchPlaceholder="Search data sources by name, type, or description..."
          filters={filters}
          showCreateButton={true}
          createButtonLabel="Add Data Source"
          onCreateClick={handleCreateDataSource}
          onRefresh={handleRefresh}
          pagination={true}
          itemsPerPage={25}
        />

        {/* Edit Data Source Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Edit Data Source: {selectedDataSource?.display_name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Data Source Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Host"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Port"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 5432 })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Database Name"
                  value={formData.database_name}
                  onChange={(e) => setFormData({ ...formData, database_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.ssl_enabled}
                      onChange={(e) => setFormData({ ...formData, ssl_enabled: e.target.checked })}
                    />
                  }
                  label="SSL Enabled"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_read_only}
                      onChange={(e) => setFormData({ ...formData, is_read_only: e.target.checked })}
                    />
                  }
                  label="Read Only"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.auto_refresh_enabled}
                      onChange={(e) => setFormData({ ...formData, auto_refresh_enabled: e.target.checked })}
                    />
                  }
                  label="Auto Refresh"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateDataSource}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Data Source'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Data Source Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Data Source</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              Are you sure you want to delete "{selectedDataSource?.display_name || selectedDataSource?.name}"?
            </Typography>
            {selectedDataSource?.usage_stats && (selectedDataSource.usage_stats.chart_count > 0 || selectedDataSource.usage_stats.dashboard_count > 0) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This data source is currently being used by{' '}
                <strong>{selectedDataSource.usage_stats.chart_count}</strong> charts and{' '}
                <strong>{selectedDataSource.usage_stats.dashboard_count}</strong> dashboards.
                Deleting it will affect these resources.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone and may affect existing charts and dashboards.
              Consider archiving it instead of deleting.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete Data Source'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default DataSourcesPage;