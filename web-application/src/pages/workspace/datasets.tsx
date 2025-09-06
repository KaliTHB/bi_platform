// web-application/src/pages/workspace/datasets.tsx
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
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Dataset as DatasetIcon,
  TableChart as TableIcon,
  Transform as TransformIcon,
  QueryBuilder as QueryIcon,
  ViewModule as ViewIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  PlayArrow as ExecuteIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Share as ShareIcon,
  FileCopy as DuplicateIcon,
  Schedule as ScheduleIcon,
  CloudSync as SyncIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Pause as PauseIcon,
  Update as UpdateIcon
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
interface DatasetData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'table' | 'query' | 'transformation' | 'view';
  status: 'active' | 'inactive' | 'draft' | 'error' | 'refreshing' | 'pending';
  refresh_status: 'pending' | 'running' | 'completed' | 'failed';
  datasource_ids: string[];
  datasource_names?: string[];
  parent_dataset_ids?: string[];
  parent_dataset_names?: string[];
  base_query?: string;
  transformation_stages?: any[];
  schema_json?: {
    columns: Array<{
      name: string;
      data_type: string;
      is_nullable: boolean;
      description?: string;
    }>;
  };
  row_count?: number;
  row_count_estimate?: number;
  size_bytes?: number;
  cache_ttl: number;
  refresh_schedule?: {
    enabled: boolean;
    cron_expression?: string;
    next_run?: string;
  };
  last_refreshed?: string;
  last_query_time?: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  metadata_json?: {
    tags?: string[];
    documentation?: string;
    quality_score?: number;
  };
  usage_stats?: {
    chart_count: number;
    dashboard_count: number;
    query_count: number;
    last_used?: string;
    daily_queries?: number;
    weekly_queries?: number;
  };
  data_quality?: {
    completeness_score: number;
    accuracy_score: number;
    consistency_score: number;
    last_checked?: string;
  };
}

interface DatasetFormData {
  name: string;
  display_name: string;
  description: string;
  type: 'table' | 'query' | 'transformation' | 'view';
  datasource_ids: string[];
  parent_dataset_ids: string[];
  base_query: string;
  cache_ttl: number;
  is_active: boolean;
}

// Main Page Component
const DatasetsPage: NextPage = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [datasets, setDatasets] = useState<DatasetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingDatasets, setRefreshingDatasets] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<DatasetData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState<DatasetFormData>({
    name: '',
    display_name: '',
    description: '',
    type: 'table',
    datasource_ids: [],
    parent_dataset_ids: [],
    base_query: '',
    cache_ttl: 3600,
    is_active: true
  });

  // Mock data (replace with actual API calls)
  useEffect(() => {
    loadDatasets();
  }, [workspace?.id]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data - replace with actual API call
      const mockDatasets: DatasetData[] = [
        {
          id: '1',
          name: 'customer_analytics',
          display_name: 'Customer Analytics Dataset',
          description: 'Comprehensive customer data including demographics, behavior, and transaction history',
          type: 'table',
          status: 'active',
          refresh_status: 'completed',
          datasource_ids: ['ds1'],
          datasource_names: ['Production PostgreSQL'],
          base_query: 'SELECT * FROM customers JOIN transactions ON customers.id = transactions.customer_id',
          row_count: 125430,
          row_count_estimate: 125430,
          size_bytes: 52428800, // 50MB
          cache_ttl: 3600,
          refresh_schedule: {
            enabled: true,
            cron_expression: '0 2 * * *',
            next_run: '2024-01-16T02:00:00Z'
          },
          last_refreshed: '2024-01-15T02:00:00Z',
          is_active: true,
          version: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T02:00:00Z',
          created_by: 'user1',
          owner_id: 'user1',
          owner: {
            id: 'user1',
            name: 'John Doe',
            email: 'john.doe@company.com'
          },
          schema_json: {
            columns: [
              { name: 'customer_id', data_type: 'integer', is_nullable: false },
              { name: 'customer_name', data_type: 'varchar', is_nullable: false },
              { name: 'email', data_type: 'varchar', is_nullable: false },
              { name: 'registration_date', data_type: 'timestamp', is_nullable: false },
              { name: 'total_spent', data_type: 'decimal', is_nullable: true }
            ]
          },
          usage_stats: {
            chart_count: 24,
            dashboard_count: 8,
            query_count: 456,
            last_used: '2024-01-15T10:30:00Z',
            daily_queries: 45,
            weekly_queries: 278
          },
          data_quality: {
            completeness_score: 98.5,
            accuracy_score: 94.2,
            consistency_score: 96.8,
            last_checked: '2024-01-15T01:00:00Z'
          },
          metadata_json: {
            tags: ['customers', 'analytics', 'production'],
            documentation: 'Core customer dataset used for analytics and reporting',
            quality_score: 96.5
          }
        },
        {
          id: '2',
          name: 'sales_transformation',
          display_name: 'Sales Performance Metrics',
          description: 'Transformed sales data with calculated metrics and aggregations',
          type: 'transformation',
          status: 'active',
          refresh_status: 'running',
          datasource_ids: ['ds1', 'ds2'],
          datasource_names: ['Production PostgreSQL', 'BigQuery Analytics'],
          parent_dataset_ids: ['1'],
          parent_dataset_names: ['Customer Analytics Dataset'],
          transformation_stages: [
            { type: 'aggregate', config: { groupBy: ['sales_rep', 'region'], metrics: ['total_sales', 'commission'] } },
            { type: 'calculated_field', config: { name: 'conversion_rate', formula: 'deals_closed / leads_generated' } }
          ],
          row_count: 5240,
          size_bytes: 2097152, // 2MB
          cache_ttl: 1800,
          refresh_schedule: {
            enabled: true,
            cron_expression: '0 */4 * * *',
            next_run: '2024-01-15T16:00:00Z'
          },
          last_refreshed: '2024-01-15T12:00:00Z',
          is_active: true,
          version: 8,
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-15T12:30:00Z',
          created_by: 'user2',
          owner_id: 'user2',
          owner: {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane.smith@company.com'
          },
          usage_stats: {
            chart_count: 15,
            dashboard_count: 4,
            query_count: 182,
            last_used: '2024-01-15T11:45:00Z',
            daily_queries: 28,
            weekly_queries: 165
          },
          data_quality: {
            completeness_score: 92.1,
            accuracy_score: 89.7,
            consistency_score: 94.3,
            last_checked: '2024-01-15T11:00:00Z'
          },
          metadata_json: {
            tags: ['sales', 'transformation', 'metrics'],
            quality_score: 92.0
          }
        },
        {
          id: '3',
          name: 'inventory_query',
          display_name: 'Real-time Inventory Levels',
          description: 'Custom query dataset showing current inventory levels across all warehouses',
          type: 'query',
          status: 'active',
          refresh_status: 'failed',
          datasource_ids: ['ds3'],
          datasource_names: ['Warehouse MySQL'],
          base_query: `
            SELECT 
              p.product_id,
              p.product_name,
              w.warehouse_name,
              i.quantity_on_hand,
              i.reserved_quantity,
              i.available_quantity,
              i.last_updated
            FROM products p
            JOIN inventory i ON p.product_id = i.product_id
            JOIN warehouses w ON i.warehouse_id = w.warehouse_id
            WHERE i.quantity_on_hand >= 0
          `,
          row_count: 0,
          row_count_estimate: 15000,
          cache_ttl: 300, // 5 minutes for real-time data
          refresh_schedule: {
            enabled: true,
            cron_expression: '*/5 * * * *',
            next_run: '2024-01-15T12:35:00Z'
          },
          last_refreshed: '2024-01-15T12:25:00Z',
          is_active: false,
          version: 2,
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-15T12:25:00Z',
          created_by: 'user3',
          owner_id: 'user3',
          owner: {
            id: 'user3',
            name: 'Mike Chen',
            email: 'mike.chen@company.com'
          },
          usage_stats: {
            chart_count: 6,
            dashboard_count: 2,
            query_count: 89,
            last_used: '2024-01-14T16:20:00Z',
            daily_queries: 12,
            weekly_queries: 67
          },
          metadata_json: {
            tags: ['inventory', 'real-time', 'warehousing'],
            quality_score: 87.3
          }
        }
      ];
      
      setDatasets(mockDatasets);
    } catch (error) {
      console.error('Failed to load datasets:', error);
      setError('Failed to load datasets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getTypeIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      table: <TableIcon fontSize="small" />,
      query: <QueryIcon fontSize="small" />,
      transformation: <TransformIcon fontSize="small" />,
      view: <ViewIcon fontSize="small" />
    };
    return iconMap[type] || <DatasetIcon fontSize="small" />;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: 'success' | 'warning' | 'error' | 'default' } = {
      active: 'success',
      inactive: 'default',
      draft: 'warning',
      error: 'error',
      refreshing: 'info',
      pending: 'default'
    };
    return colorMap[status] || 'default';
  };

  const getRefreshStatusInfo = (refreshStatus: string) => {
    const statusMap: { [key: string]: { color: 'success' | 'warning' | 'error' | 'default', icon: React.ReactNode } } = {
      completed: { color: 'success', icon: <CheckIcon fontSize="small" /> },
      failed: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
      running: { color: 'default', icon: <CircularProgress size={12} /> },
      pending: { color: 'warning', icon: <ScheduleIcon fontSize="small" /> }
    };
    return statusMap[refreshStatus] || { color: 'default', icon: <ScheduleIcon fontSize="small" /> };
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  // Event handlers
  const handleCreateDataset = () => {
    router.push(`/workspace/${workspace?.slug}/dataset-builder`);
  };

  const handleEditDataset = (dataset: DatasetData) => {
    setSelectedDataset(dataset);
    setFormData({
      name: dataset.name,
      display_name: dataset.display_name,
      description: dataset.description || '',
      type: dataset.type,
      datasource_ids: dataset.datasource_ids,
      parent_dataset_ids: dataset.parent_dataset_ids || [],
      base_query: dataset.base_query || '',
      cache_ttl: dataset.cache_ttl,
      is_active: dataset.is_active
    });
    setEditDialogOpen(true);
  };

  const handleDeleteDataset = (dataset: DatasetData) => {
    setSelectedDataset(dataset);
    setDeleteDialogOpen(true);
  };

  const handleRefreshDataset = async (dataset: DatasetData) => {
    setRefreshingDatasets(prev => new Set([...prev, dataset.id]));
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update the dataset refresh status
      setDatasets(prev => prev.map(ds => 
        ds.id === dataset.id 
          ? { 
              ...ds, 
              refresh_status: 'completed',
              last_refreshed: new Date().toISOString(),
              status: 'active'
            }
          : ds
      ));
    } catch (error) {
      setDatasets(prev => prev.map(ds => 
        ds.id === dataset.id 
          ? { 
              ...ds, 
              refresh_status: 'failed',
              status: 'error'
            }
          : ds
      ));
    } finally {
      setRefreshingDatasets(prev => {
        const newSet = new Set(prev);
        newSet.delete(dataset.id);
        return newSet;
      });
    }
  };

  const handleDuplicateDataset = (dataset: DatasetData) => {
    router.push(`/workspace/${workspace?.slug}/dataset-builder?duplicate=${dataset.id}`);
  };

  const handleToggleDatasetStatus = async (dataset: DatasetData) => {
    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDatasets(prev => prev.map(ds =>
        ds.id === dataset.id
          ? { ...ds, is_active: !ds.is_active, status: !ds.is_active ? 'active' : 'inactive' }
          : ds
      ));
    } catch (error) {
      setError('Failed to update dataset status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDataset) return;

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDatasets(prev => prev.filter(ds => ds.id !== selectedDataset.id));
      setDeleteDialogOpen(false);
      setSelectedDataset(null);
    } catch (error) {
      setError('Failed to delete dataset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDataset = async () => {
    if (!selectedDataset) return;

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDatasets(prev => prev.map(ds =>
        ds.id === selectedDataset.id
          ? { 
              ...ds, 
              ...formData,
              updated_at: new Date().toISOString()
            }
          : ds
      ));
      setEditDialogOpen(false);
      setSelectedDataset(null);
    } catch (error) {
      setError('Failed to update dataset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    loadDatasets();
  };

  // Table columns configuration
  const columns: TableColumn<DatasetData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Dataset',
      sortable: true,
      render: (dataset: DatasetData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 40, 
            height: 40, 
            borderRadius: 1, 
            bgcolor: dataset.status === 'active' ? 'success.light' : 'warning.light', 
            color: dataset.status === 'active' ? 'success.main' : 'warning.main' 
          }}>
            {getTypeIcon(dataset.type)}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {dataset.display_name}
              </Typography>
              {!dataset.is_active && (
                <Chip label="Inactive" size="small" color="default" variant="outlined" />
              )}
              {dataset.metadata_json?.quality_score && dataset.metadata_json.quality_score < 90 && (
                <Chip label="Quality Alert" size="small" color="warning" variant="outlined" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {dataset.name}
            </Typography>
            {dataset.description && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                {dataset.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'type_and_status',
      label: 'Type & Status',
      sortable: true,
      render: (dataset: DatasetData) => (
        <Box>
          <Chip
            label={dataset.type.toUpperCase()}
            size="small"
            variant="outlined"
            icon={getTypeIcon(dataset.type)}
            sx={{ mb: 0.5 }}
          />
          <br />
          <Chip
            label={dataset.status.toUpperCase()}
            size="small"
            color={getStatusColor(dataset.status)}
            variant="filled"
          />
          <br />
          {dataset.refresh_status && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {getRefreshStatusInfo(dataset.refresh_status).icon}
              <Typography variant="caption" color="text.secondary">
                Refresh: {dataset.refresh_status}
              </Typography>
            </Box>
          )}
        </Box>
      )
    },
    {
      key: 'data_sources',
      label: 'Data Sources',
      render: (dataset: DatasetData) => (
        <Box>
          {dataset.datasource_names?.map((datasource, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <StorageIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {datasource}
              </Typography>
            </Box>
          ))}
          {dataset.parent_dataset_names && dataset.parent_dataset_names.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Dependencies:
              </Typography>
              {dataset.parent_dataset_names.map((parent, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <TransformIcon fontSize="small" color="secondary" />
                  <Typography variant="caption" color="text.secondary">
                    {parent}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )
    },
    {
      key: 'data_info',
      label: 'Data Size & Quality',
      sortable: true,
      render: (dataset: DatasetData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {dataset.row_count?.toLocaleString() || dataset.row_count_estimate?.toLocaleString() || 'Unknown'} rows
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatBytes(dataset.size_bytes)}
          </Typography>
          {dataset.data_quality && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Quality: {dataset.data_quality.completeness_score.toFixed(1)}%
              </Typography>
            </Box>
          )}
          <Typography variant="caption" display="block" color="text.secondary">
            Cache: {formatDuration(dataset.cache_ttl)}
          </Typography>
        </Box>
      )
    },
    {
      key: 'usage_stats',
      label: 'Usage',
      sortable: false,
      render: (dataset: DatasetData) => (
        dataset.usage_stats ? (
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {dataset.usage_stats.chart_count} charts
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dataset.usage_stats.dashboard_count} dashboards
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              {dataset.usage_stats.query_count} queries
            </Typography>
            {dataset.usage_stats.last_used && (
              <Typography variant="caption" display="block" color="text.secondary">
                Used: {new Date(dataset.usage_stats.last_used).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No usage
          </Typography>
        )
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (dataset: DatasetData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={dataset.owner?.email} sx={{ width: 24, height: 24 }}>
            {dataset.owner?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">
            {dataset.owner?.name || 'Unknown'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'last_refreshed',
      label: 'Last Updated',
      sortable: true,
      render: (dataset: DatasetData) => (
        <Box>
          {dataset.last_refreshed ? (
            <>
              <Typography variant="body2">
                {new Date(dataset.last_refreshed).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(dataset.last_refreshed).toLocaleTimeString()}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Never
            </Typography>
          )}
          {dataset.refresh_status === 'running' && (
            <LinearProgress size="small" sx={{ mt: 0.5 }} />
          )}
          {dataset.refresh_schedule?.enabled && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
              Auto-refresh enabled
            </Typography>
          )}
        </Box>
      )
    }
  ], []);

  // Table actions configuration
  const actions: TableAction<DatasetData>[] = useMemo(() => [
    {
      label: 'Preview Data',
      icon: <VisibilityIcon fontSize="small" />,
      onClick: (dataset) => {
        router.push(`/workspace/${workspace?.slug}/datasets/${dataset.id}/preview`);
      },
      show: (dataset) => hasPermission('dataset.read') && dataset.status === 'active',
      color: 'primary'
    },
    {
      label: 'Execute Query',
      icon: <ExecuteIcon fontSize="small" />,
      onClick: (dataset) => {
        router.push(`/workspace/${workspace?.slug}/sql-editor?dataset=${dataset.id}`);
      },
      show: (dataset) => hasPermission('dataset.read') && (dataset.type === 'query' || dataset.type === 'transformation'),
      color: 'info'
    },
    {
      label: 'Edit Dataset',
      icon: <EditIcon fontSize="small" />,
      onClick: (dataset) => handleEditDataset(dataset),
      show: (dataset) => hasPermission('dataset.update') && 
        (dataset.owner_id === user?.id || hasPermission('dataset.admin')),
      color: 'default'
    },
    {
      label: 'Refresh Dataset',
      icon: <RefreshIcon fontSize="small" />,
      onClick: (dataset) => handleRefreshDataset(dataset),
      show: (dataset) => hasPermission('dataset.update') && dataset.status !== 'refreshing',
      color: 'info',
      disabled: (dataset) => refreshingDatasets.has(dataset.id) || dataset.refresh_status === 'running'
    },
    {
      label: 'View Analytics',
      icon: <AnalyticsIcon fontSize="small" />,
      onClick: (dataset) => {
        router.push(`/workspace/${workspace?.slug}/datasets/${dataset.id}/analytics`);
      },
      show: (dataset) => hasPermission('dataset.read') && dataset.usage_stats,
      color: 'info'
    },
    {
      label: 'Duplicate Dataset',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: (dataset) => handleDuplicateDataset(dataset),
      show: () => hasPermission('dataset.create'),
      color: 'secondary'
    },
    {
      label: 'Dataset Settings',
      icon: <SettingsIcon fontSize="small" />,
      onClick: (dataset) => {
        router.push(`/workspace/${workspace?.slug}/datasets/${dataset.id}/settings`);
      },
      show: (dataset) => hasPermission('dataset.update') && 
        (dataset.owner_id === user?.id || hasPermission('dataset.admin')),
      color: 'default'
    },
    {
      label: dataset => dataset.is_active ? 'Deactivate' : 'Activate',
      icon: (dataset) => dataset.is_active ? <PauseIcon fontSize="small" /> : <CheckIcon fontSize="small" />,
      onClick: (dataset) => handleToggleDatasetStatus(dataset),
      show: () => hasPermission('dataset.update'),
      color: (dataset) => dataset.is_active ? 'warning' : 'success'
    },
    {
      label: 'Delete Dataset',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (dataset) => handleDeleteDataset(dataset),
      show: (dataset) => hasPermission('dataset.delete') && 
        (dataset.owner_id === user?.id || hasPermission('dataset.admin')),
      color: 'error',
      disabled: (dataset) => (dataset.usage_stats?.chart_count || 0) > 0
    }
  ], [hasPermission, router, workspace?.slug, user?.id, refreshingDatasets]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'draft', label: 'Draft' },
        { value: 'error', label: 'Error' },
        { value: 'refreshing', label: 'Refreshing' }
      ]
    },
    {
      key: 'type',
      label: 'Dataset Type',
      options: [
        { value: 'table', label: 'Table' },
        { value: 'query', label: 'Query' },
        { value: 'transformation', label: 'Transformation' },
        { value: 'view', label: 'View' }
      ]
    },
    {
      key: 'refresh_status',
      label: 'Refresh Status',
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'running', label: 'Running' },
        { value: 'pending', label: 'Pending' }
      ]
    }
  ];

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Datasets
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your data sources and create datasets for analysis and visualization
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Datasets Table */}
        <CommonTableLayout
          data={datasets}
          loading={loading}
          error={error}
          columns={columns}
          actions={actions}
          title="All Datasets"
          subtitle={`${datasets.length} datasets found`}
          searchable={true}
          searchPlaceholder="Search datasets by name, type, or description..."
          filters={filters}
          showCreateButton={true}
          createButtonLabel="Add Dataset"
          onCreateClick={handleCreateDataset}
          onRefresh={handleRefresh}
          pagination={true}
          itemsPerPage={25}
        />

        {/* Edit Dataset Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Edit Dataset: {selectedDataset?.display_name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dataset Name"
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
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Dataset Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    label="Dataset Type"
                  >
                    <MenuItem value="table">Table</MenuItem>
                    <MenuItem value="query">Query</MenuItem>
                    <MenuItem value="transformation">Transformation</MenuItem>
                    <MenuItem value="view">View</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cache TTL (seconds)"
                  value={formData.cache_ttl}
                  onChange={(e) => setFormData({ ...formData, cache_ttl: parseInt(e.target.value) || 3600 })}
                />
              </Grid>
              {(formData.type === 'query' || formData.type === 'transformation') && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Base Query"
                    value={formData.base_query}
                    onChange={(e) => setFormData({ ...formData, base_query: e.target.value })}
                    helperText="SQL query or transformation logic"
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Dataset Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateDataset}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Dataset'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dataset Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Dataset</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              Are you sure you want to delete "{selectedDataset?.display_name || selectedDataset?.name}"?
            </Typography>
            {selectedDataset?.usage_stats && (selectedDataset.usage_stats.chart_count > 0 || selectedDataset.usage_stats.dashboard_count > 0) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This dataset is currently being used by{' '}
                <strong>{selectedDataset.usage_stats.chart_count}</strong> charts and{' '}
                <strong>{selectedDataset.usage_stats.dashboard_count}</strong> dashboards.
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
              {submitting ? 'Deleting...' : 'Delete Dataset'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default DatasetsPage;