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
  LinearProgress
} from '@mui/material';
import {
  Storage as DatasetIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  FileCopy as DuplicateIcon,
  Transform as TransformIcon,
  QueryStats as QueryIcon,
  TableChart as TableIcon,
  Schedule as ScheduleIcon,
  CloudSync as SyncIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  PlayArrow as ExecuteIcon,
  Settings as SettingsIcon
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

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') ;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Types
interface DatasetData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'table' | 'query' | 'transformation';
  datasource_ids: string[];
  datasource_names?: string[];
  parent_dataset_ids?: string[];
  parent_dataset_names?: string[];
  base_query?: string;
  row_count?: number;
  size_bytes?: number;
  cache_ttl: number;
  is_active: boolean;
  status: 'active' | 'inactive' | 'draft' | 'error' | 'refreshing';
  refresh_status: 'pending' | 'running' | 'completed' | 'failed';
  last_refreshed?: string;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  schema_json?: {
    columns: Array<{
      name: string;
      data_type: string;
      is_nullable: boolean;
    }>;
  };
  metadata_json?: Record<string, any>;
  usage_stats?: {
    chart_count: number;
    dashboard_count: number;
    query_count: number;
  };
}

interface DatasetFormData {
  name: string;
  display_name: string;
  description: string;
  type: 'table' | 'query' | 'transformation';
  datasource_ids: string[];
  parent_dataset_ids: string[];
  base_query: string;
  cache_ttl: number;
  is_active: boolean;
}

interface DataSource {
  id: string;
  name: string;
  display_name: string;
  type: string;
}

const DatasetsPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [datasets, setDatasets] = useState<DatasetData[]>([]);
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [availableDatasets, setAvailableDatasets] = useState<DatasetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<DatasetData | null>(null);
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
  const [submitting, setSubmitting] = useState(false);

  // Load datasets and supporting data
  useEffect(() => {
    if (workspace?.id) {
      loadDatasets();
      loadDatasources();
    }
  }, [workspace?.id]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API call to get all datasets in workspace
      const response = await fetch('/api/workspaces/${workspace.id}/datasets', {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view datasets.');
        } else if (response.status === 404) {
          throw new Error('Workspace not found.');
        } else {
          throw new Error(`Failed to load datasets (${response.status})`);
        }
      }

      const data = await response.json();
      
      if (data.success) {
        setDatasets(data.datasets || data.data || []);
        // Also set available datasets for parent selection (exclude transformation types to avoid circular references)
        setAvailableDatasets((data.datasets || data.data || []).filter((d: DatasetData) => d.type !== 'transformation'));
      } else {
        throw new Error(data.message || 'Failed to load datasets');
      }
    } catch (error: any) {
      console.error('Failed to load datasets:', error);
      setError(error.message || 'Failed to load datasets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDatasources = async () => {
    try {
      const response = await fetch('/api/v1/workspaces/${workspace.id}/datasources', {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDatasources(data.datasources || []);
        }
      }
    } catch (error) {
      console.error('Failed to load datasources:', error);
      // Set default datasources if API fails
      setDatasources([
        { id: 'ds-1', name: 'primary-db', display_name: 'Primary Database', type: 'postgresql' },
        { id: 'ds-2', name: 'analytics-db', display_name: 'Analytics Database', type: 'mysql' },
        { id: 'ds-3', name: 'warehouse-db', display_name: 'Data Warehouse', type: 'snowflake' }
      ]);
    }
  };

  // Dataset type icon mapping
  const getDatasetTypeIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      table: <TableIcon fontSize="small" />,
      query: <QueryIcon fontSize="small" />,
      transformation: <TransformIcon fontSize="small" />
    };
    return iconMap[type] || <DatasetIcon fontSize="small" />;
  };

  // Status color and icon mapping
  const getStatusInfo = (status: string, refreshStatus?: string) => {
    if (refreshStatus === 'running' || status === 'refreshing') {
      return { color: 'info' as const, icon: <SyncIcon fontSize="small" /> };
    }
    
    const statusMap: { [key: string]: { color: 'success' | 'warning' | 'error' | 'default', icon: React.ReactNode } } = {
      active: { color: 'success', icon: <CheckIcon fontSize="small" /> },
      inactive: { color: 'default', icon: <WarningIcon fontSize="small" /> },
      draft: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
      error: { color: 'error', icon: <ErrorIcon fontSize="small" /> }
    };
    return statusMap[status] || { color: 'default', icon: <DatasetIcon fontSize="small" /> };
  };

  // Table columns configuration
  const columns: TableColumn<DatasetData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Dataset',
      sortable: true,
      render: (dataset: DatasetData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 1, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            {getDatasetTypeIcon(dataset.type)}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {dataset.display_name}
            </Typography>
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
      key: 'type',
      label: 'Type & Status',
      sortable: true,
      render: (dataset: DatasetData) => {
        const statusInfo = getStatusInfo(dataset.status, dataset.refresh_status);
        return (
          <Box>
            <Chip
              label={dataset.type.toUpperCase()}
              size="small"
              variant="outlined"
              sx={{ mb: 0.5 }}
            />
            <br />
            <Chip
              label={dataset.status.toUpperCase()}
              size="small"
              color={statusInfo.color}
              variant="filled"
              icon={statusInfo.icon}
            />
          </Box>
        );
      }
    },
    {
      key: 'datasource_names',
      label: 'Data Sources',
      render: (dataset: DatasetData) => (
        <Box>
          {dataset.datasource_names?.map((datasource, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <DatasetIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {datasource}
              </Typography>
            </Box>
          ))}
        </Box>
      )
    },
    {
      key: 'parent_dataset_names',
      label: 'Dependencies',
      render: (dataset: DatasetData) => (
        dataset.parent_dataset_names && dataset.parent_dataset_names.length > 0 ? (
          <Box>
            {dataset.parent_dataset_names.map((parent, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <TransformIcon fontSize="small" color="secondary" />
                <Typography variant="body2">
                  {parent}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            None
          </Typography>
        )
      )
    },
    {
      key: 'row_count',
      label: 'Data Size',
      sortable: true,
      align: 'center',
      render: (dataset: DatasetData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {dataset.row_count?.toLocaleString() || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            rows
          </Typography>
          {dataset.size_bytes && (
            <Typography variant="caption" display="block" color="text.secondary">
              {(dataset.size_bytes / (1024 * 1024)).toFixed(1)} MB
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'usage_stats',
      label: 'Usage',
      sortable: false,
      align: 'center',
      render: (dataset: DatasetData) => (
        dataset.usage_stats ? (
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {dataset.usage_stats.chart_count || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              charts
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              {dataset.usage_stats.dashboard_count || 0} dashboards
            </Typography>
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
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {dataset.owner?.name || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dataset.owner?.email}
          </Typography>
        </Box>
      )
    },
    {
      key: 'last_refreshed',
      label: 'Last Refreshed',
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
        </Box>
      )
    }
  ], []);

  // Table actions
  const actions: TableAction<DatasetData>[] = useMemo(() => [
    {
      label: 'Preview Data',
      icon: <ViewIcon fontSize="small" />,
      onClick: (dataset) => {
        router.push(`/workspace/datasets/${dataset.id}/preview`);
      },
      color: 'primary'
    },
    {
      label: 'Edit Dataset (Form)',
      icon: <EditIcon fontSize="small" />,
      onClick: (dataset) => {
        handleEditDataset(dataset);
      },
      color: 'primary',
      show: () => hasPermission('dataset.update')
    },
    {
      label: 'Refresh Dataset',
      icon: <RefreshIcon fontSize="small" />,
      onClick: (dataset) => {
        handleRefreshDataset(dataset);
      },
      color: 'info',
      show: () => hasPermission('dataset.update'),
      disabled: (dataset) => dataset.refresh_status === 'running'
    },
    {
      label: 'Execute Query',
      icon: <ExecuteIcon fontSize="small" />,
      onClick: (dataset) => {
        router.push(`/workspace/sql-editor?dataset=${dataset.id}`);
      },
      color: 'secondary',
      show: (dataset) => dataset.type === 'query' && hasPermission('dataset.read')
    },
    {
      label: 'Duplicate Dataset',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: (dataset) => {
        handleDuplicateDataset(dataset);
      },
      color: 'secondary',
      show: () => hasPermission('dataset.create')
    },
    {
      label: 'Dataset Settings',
      icon: <SettingsIcon fontSize="small" />,
      onClick: (dataset) => {
        router.push(`/workspace/datasets/${dataset.id}/settings`);
      },
      color: 'default',
      show: () => hasPermission('dataset.update')
    },
    {
      label: 'Delete Dataset',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (dataset) => {
        handleDeleteDataset(dataset);
      },
      color: 'error',
      show: (dataset) => hasPermission('dataset.delete') && 
        (dataset.created_by === user?.id || hasPermission('dataset.admin')),
      disabled: (dataset) => (dataset.usage_stats?.chart_count || 0) > 0 || 
        (dataset.usage_stats?.dashboard_count || 0) > 0
    }
  ], [hasPermission, router, workspace?.slug, user?.id]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'table', label: 'Table' },
        { value: 'query', label: 'Query' },
        { value: 'transformation', label: 'Transformation' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'draft', label: 'Draft' },
        { value: 'error', label: 'Error' }
      ]
    },
    {
      key: 'refresh_status',
      label: 'Refresh Status',
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'running', label: 'Running' },
        { value: 'failed', label: 'Failed' },
        { value: 'pending', label: 'Pending' }
      ]
    }
  ];

  // Handle dataset actions
  const handleCreateDataset = () => {
    // Navigate to dataset form page
    router.push(`/workspace/datasets/create`);
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

  const handleRefreshDataset = async (dataset: DatasetData) => {
    try {
      setError(null);
      
      // API call to refresh dataset
      const response = await fetch(`/api/v1/workspaces/datasets/${dataset.id}/refresh`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to refresh this dataset.');
        } else {
          throw new Error(`Failed to refresh dataset (${response.status})`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to refresh dataset');
      }

      // Refresh datasets list
      await loadDatasets();
      
      console.log('Dataset refresh initiated successfully');
    } catch (error: any) {
      console.error('Failed to refresh dataset:', error);
      setError(error.message || 'Failed to refresh dataset. Please try again.');
    }
  };

  const handleDuplicateDataset = async (dataset: DatasetData) => {
    try {
      setError(null);
      
      // API call to duplicate dataset
      const response = await fetch(`/api/v1/workspaces/datasets/${dataset.id}/duplicate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          new_name: `${dataset.name}_copy`, 
          new_display_name: `${dataset.display_name} (Copy)`
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to duplicate datasets.');
        } else if (response.status === 409) {
          throw new Error('A dataset with that name already exists.');
        } else {
          throw new Error(`Failed to duplicate dataset (${response.status})`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to duplicate dataset');
      }

      // Refresh datasets list after duplication
      await loadDatasets();
      
      console.log('Dataset duplicated successfully');
    } catch (error: any) {
      console.error('Failed to duplicate dataset:', error);
      setError(error.message || 'Failed to duplicate dataset. Please try again.');
    }
  };

  const handleDeleteDataset = (dataset: DatasetData) => {
    setSelectedDataset(dataset);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!selectedDataset) return;

    try {
      setSubmitting(true);
      setError(null);
      
      // API call to update dataset
      const response = await fetch(`/api/v1/workspaces/datasets/${selectedDataset.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to edit this dataset.');
        } else if (response.status === 409) {
          throw new Error('A dataset with that name already exists.');
        } else {
          throw new Error(`Failed to update dataset (${response.status})`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update dataset');
      }
      
      // Close dialog and refresh
      setEditDialogOpen(false);
      await loadDatasets();
      
      console.log('Dataset updated successfully');
    } catch (error: any) {
      console.error('Failed to update dataset:', error);
      setError(error.message || 'Failed to update dataset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDataset) return;

    try {
      setSubmitting(true);
      setError(null);
      
      // API call to delete dataset
      const response = await fetch(`/api/v1/workspaces/datasets/${selectedDataset.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to delete this dataset.');
        } else if (response.status === 409) {
          throw new Error('Cannot delete dataset. It may be in use by charts or dashboards.');
        } else {
          throw new Error(`Failed to delete dataset (${response.status})`);
        }
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete dataset');
      }
      
      // Close dialog and refresh
      setDeleteDialogOpen(false);
      await loadDatasets();
      
      console.log('Dataset deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete dataset:', error);
      setError(error.message || 'Failed to delete dataset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    loadDatasets();
  };

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
                  helperText="Internal name for the dataset"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  helperText="User-friendly display name"
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
                  helperText="Brief description of the dataset"
                />
              </Grid>
              <Grid item xs={12} md={4}>
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
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Data Sources</InputLabel>
                  <Select
                    multiple
                    value={formData.datasource_ids}
                    onChange={(e) => setFormData({ ...formData, datasource_ids: e.target.value as string[] })}
                    label="Data Sources"
                  >
                    {datasources.map((datasource) => (
                      <MenuItem key={datasource.id} value={datasource.id}>
                        {datasource.display_name} ({datasource.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Cache TTL (seconds)"
                  type="number"
                  value={formData.cache_ttl}
                  onChange={(e) => setFormData({ ...formData, cache_ttl: parseInt(e.target.value) || 3600 })}
                  helperText="Time to live for cached data"
                />
              </Grid>
              {formData.type === 'transformation' && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Parent Datasets</InputLabel>
                    <Select
                      multiple
                      value={formData.parent_dataset_ids}
                      onChange={(e) => setFormData({ ...formData, parent_dataset_ids: e.target.value as string[] })}
                      label="Parent Datasets"
                    >
                      {availableDatasets.map((dataset) => (
                        <MenuItem key={dataset.id} value={dataset.id}>
                          {dataset.display_name} ({dataset.type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              {formData.type === 'query' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Base Query"
                    value={formData.base_query}
                    onChange={(e) => setFormData({ ...formData, base_query: e.target.value })}
                    helperText="SQL query that defines this dataset"
                    placeholder="SELECT * FROM your_table WHERE condition = 'value'"
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
                  label="Active Dataset"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFormSubmit}
              variant="contained"
              disabled={submitting || !formData.name || !formData.display_name}
            >
              {submitting ? 'Updating...' : 'Update Dataset'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the dataset "{selectedDataset?.display_name}"?
            </Typography>
            {selectedDataset?.usage_stats && (
              (selectedDataset.usage_stats.chart_count > 0 || selectedDataset.usage_stats.dashboard_count > 0) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This dataset is being used by {selectedDataset.usage_stats.chart_count} chart(s) 
                  and {selectedDataset.usage_stats.dashboard_count} dashboard(s). 
                  Deleting it will break these dependencies.
                </Alert>
              )
            )}
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