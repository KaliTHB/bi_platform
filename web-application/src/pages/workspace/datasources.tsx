// pages/workspace/datasources.tsx
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
  Switch,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  Storage as StorageIcon,
  Cable as CableIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schema as SchemaIcon,
  QueryStats as QueryIcon,
  Timeline as UsageIcon,
  CloudQueue as CloudIcon,
  Dns as DatabaseIcon,
  InsertDriveFile as FileIcon,
  Api as ApiIcon,
  Dns as ServerIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Analytics as AnalyticsIcon
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

// Types and Interfaces
interface DataSourceData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  plugin_name: string;
  plugin_category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes' | 'nosql' | 'files' | 'apis';
  connection_config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  test_status: 'pending' | 'success' | 'failed';
  test_error_message?: string;
  last_tested?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_stats?: {
    dataset_count: number;
    chart_count: number;
    dashboard_count: number;
    total_queries: number;
    avg_response_time: number;
    last_used?: string;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PluginOption {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes' | 'nosql' | 'files' | 'apis';
  configSchema: PluginConfigSchema;
}

interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'password' | 'select';
  title?: string;
  description?: string;
  default?: any;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

interface DataSourceFormData {
  name: string;
  display_name: string;
  description: string;
  plugin_name: string;
  connection_config: Record<string, any>;
  is_active: boolean;
}

const DataSourcesPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [datasources, setDatasources] = useState<DataSourceData[]>([]);
  const [availablePlugins, setAvailablePlugins] = useState<PluginOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDatasources, setSelectedDatasources] = useState<string[]>([]);
  
  // Dialog states
  const [addDatasourceDialogOpen, setAddDatasourceDialogOpen] = useState(false);
  const [editDatasourceDialogOpen, setEditDatasourceDialogOpen] = useState(false);
  const [deleteDatasourceDialogOpen, setDeleteDatasourceDialogOpen] = useState(false);
  const [testConnectionDialogOpen, setTestConnectionDialogOpen] = useState(false);
  const [editingDatasource, setEditingDatasource] = useState<DataSourceData | null>(null);
  const [deletingDatasource, setDeletingDatasource] = useState<DataSourceData | null>(null);
  const [testingDatasource, setTestingDatasource] = useState<DataSourceData | null>(null);

  // Form state
  const [formData, setFormData] = useState<DataSourceFormData>({
    name: '',
    display_name: '',
    description: '',
    plugin_name: '',
    connection_config: {},
    is_active: true
  });

  // Connection test state
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    response_time?: number;
    error_code?: string;
  } | null>(null);

  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // Load data on mount
  useEffect(() => {
    loadDatasources();
    loadAvailablePlugins();
  }, [workspace]);

  const loadDatasources = async () => {
    if (!workspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/workspaces/datasources', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'workspace-id': workspace.id
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load datasources: ${response.statusText}`);
      }

      const data = await response.json();
      setDatasources(data.datasources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasources');
      console.error('Error loading datasources:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePlugins = async () => {
    if (!workspace?.id) return;

    try {
      const response = await fetch('/api/workspaces/plugins/datasources', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'workspace-id': workspace.id
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load available plugins');
      }

      const data = await response.json();
      setAvailablePlugins(data.plugins || []);
    } catch (err) {
      console.error('Error loading available plugins:', err);
    }
  };

  // Get plugin category icon
  const getPluginCategoryIcon = (category: string) => {
    switch (category) {
      case 'relational': return <DatabaseIcon />;
      case 'cloud_databases': return <CloudIcon />;
      case 'storage_services': return <StorageIcon />;
      case 'data_lakes': return <ServerIcon />;
      case 'nosql': return <CableIcon />;
      case 'files': return <FileIcon />;
      case 'apis': return <ApiIcon />;
      default: return <StorageIcon />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'testing': return 'warning';
      case 'error': 
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  // Table columns configuration
  const columns: TableColumn<DataSourceData>[] = useMemo(() => [
    {
      key: 'datasource',
      label: 'Data Source',
      sortable: true,
      render: (datasource) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: datasource.is_active ? 'primary.main' : 'grey.400'
            }}
          >
            {getPluginCategoryIcon(datasource.plugin_category)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {datasource.display_name || datasource.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {datasource.plugin_name} • {datasource.plugin_category.replace('_', ' ')}
            </Typography>
            {datasource.description && (
              <Typography variant="caption" color="text.secondary" display="block">
                {datasource.description.substring(0, 80)}...
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: (datasource) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Chip
            size="small"
            icon={datasource.status === 'connected' ? <CheckIcon /> : 
                  datasource.status === 'testing' ? <WarningIcon /> : <ErrorIcon />}
            label={datasource.status.charAt(0).toUpperCase() + datasource.status.slice(1)}
            color={getStatusColor(datasource.status) as any}
            variant={datasource.is_active ? 'filled' : 'outlined'}
          />
          {!datasource.is_active && (
            <Chip size="small" label="Inactive" color="default" variant="outlined" />
          )}
        </Box>
      )
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (datasource) => (
        <Box>
          {datasource.usage_stats ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption">
                📊 {datasource.usage_stats.dataset_count} datasets
              </Typography>
              <Typography variant="caption">
                🔍 {datasource.usage_stats.total_queries} queries
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ⚡ {datasource.usage_stats.avg_response_time}ms avg
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No usage data
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'last_tested',
      label: 'Last Tested',
      sortable: true,
      render: (datasource) => (
        datasource.last_tested ? (
          <Box>
            <Typography variant="body2">
              {new Date(datasource.last_tested).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(datasource.last_tested).toLocaleTimeString()}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Never tested
          </Typography>
        )
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (datasource) => (
        <Box>
          <Typography variant="body2">
            {new Date(datasource.created_at).toLocaleDateString()}
          </Typography>
          {datasource.owner && (
            <Typography variant="caption" color="text.secondary">
              by {datasource.owner.name}
            </Typography>
          )}
        </Box>
      )
    }
  ], []);

  // Table actions
  const actions: TableAction<DataSourceData>[] = useMemo(() => [
    {
      label: 'Test Connection',
      icon: <TestIcon fontSize="small" />,
      onClick: (datasource) => handleTestConnection(datasource),
      color: 'primary',
      show: () => hasPermission('datasource.test')
    },
    {
      label: 'View Schema',
      icon: <SchemaIcon fontSize="small" />,
      onClick: (datasource) => router.push(`/workspace/${workspace?.slug}/datasources/${datasource.id}/schema`),
      color: 'default',
      show: () => hasPermission('datasource.read'),
      disabled: (datasource) => datasource.status !== 'connected'
    },
    {
      label: 'Edit Configuration',
      icon: <EditIcon fontSize="small" />,
      onClick: (datasource) => handleEditDatasource(datasource),
      color: 'primary',
      show: () => hasPermission('datasource.update')
    },
    {
      label: 'View Analytics',
      icon: <AnalyticsIcon fontSize="small" />,
      onClick: (datasource) => router.push(`/workspace/${workspace?.slug}/datasources/${datasource.id}/analytics`),
      color: 'default',
      show: () => hasPermission('datasource.read')
    },
    {
      label: datasource => datasource.is_active ? 'Deactivate' : 'Activate',
      icon: (datasource) => datasource.is_active ? <ErrorIcon fontSize="small" /> : <CheckIcon fontSize="small" />,
      onClick: (datasource) => handleToggleDatasourceStatus(datasource),
      color: (datasource) => datasource.is_active ? 'warning' : 'success',
      show: () => hasPermission('datasource.update')
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (datasource) => handleDeleteDatasource(datasource),
      color: 'error',
      show: () => hasPermission('datasource.delete'),
      disabled: (datasource) => datasource.usage_stats ? datasource.usage_stats.dataset_count > 0 : false
    }
  ], [hasPermission, workspace, router]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'status',
      label: 'Connection Status',
      options: [
        { value: 'connected', label: 'Connected' },
        { value: 'disconnected', label: 'Disconnected' },
        { value: 'error', label: 'Error' },
        { value: 'testing', label: 'Testing' }
      ]
    },
    {
      key: 'plugin_category',
      label: 'Category',
      options: [
        { value: 'relational', label: 'Relational Databases' },
        { value: 'cloud_databases', label: 'Cloud Databases' },
        { value: 'storage_services', label: 'Storage Services' },
        { value: 'data_lakes', label: 'Data Lakes' },
        { value: 'nosql', label: 'NoSQL Databases' },
        { value: 'files', label: 'File Sources' },
        { value: 'apis', label: 'APIs' }
      ]
    },
    {
      key: 'plugin_name',
      label: 'Plugin Type',
      options: availablePlugins.map(plugin => ({ value: plugin.name, label: plugin.displayName }))
    },
    {
      key: 'is_active',
      label: 'Active Status',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ];

  // Event handlers
  const handleAddDatasource = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      plugin_name: '',
      connection_config: {},
      is_active: true
    });
    setAddDatasourceDialogOpen(true);
  };

  const handleEditDatasource = (datasource: DataSourceData) => {
    setEditingDatasource(datasource);
    setFormData({
      name: datasource.name,
      display_name: datasource.display_name,
      description: datasource.description || '',
      plugin_name: datasource.plugin_name,
      connection_config: datasource.connection_config,
      is_active: datasource.is_active
    });
    setEditDatasourceDialogOpen(true);
  };

  const handleDeleteDatasource = (datasource: DataSourceData) => {
    setDeletingDatasource(datasource);
    setDeleteDatasourceDialogOpen(true);
  };

  const handleTestConnection = async (datasource: DataSourceData) => {
    setTestingDatasource(datasource);
    setTestResult(null);
    setTestConnectionDialogOpen(true);

    try {
      const response = await fetch(`/api/workspaces/datasources/${datasource.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'workspace-id': workspace?.id || ''
        }
      });

      const result = await response.json();
      setTestResult(result);
      
      // Refresh the datasource list to update test status
      await loadDatasources();
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
        error_code: 'TEST_FAILED'
      });
    }
  };

  const handleToggleDatasourceStatus = async (datasource: DataSourceData) => {
    try {
      const response = await fetch(`/api/workspaces/datasources/${datasource.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'workspace-id': workspace?.id || ''
        },
        body: JSON.stringify({
          is_active: !datasource.is_active
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update datasource status');
      }

      await loadDatasources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update datasource');
    }
  };

  const handleSubmitDatasource = async () => {
    try {
      const isEdit = !!editingDatasource;
      const url = isEdit 
        ? `/api/workspaces/datasources/${editingDatasource.id}`
        : '/api/workspaces/datasources';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'workspace-id': workspace?.id || ''
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} datasource`);
      }

      await loadDatasources();
      setAddDatasourceDialogOpen(false);
      setEditDatasourceDialogOpen(false);
      setEditingDatasource(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingDatasource ? 'update' : 'create'} datasource`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDatasource) return;

    try {
      const response = await fetch(`/api/workspaces/datasources/${deletingDatasource.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'workspace-id': workspace?.id || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete datasource');
      }

      await loadDatasources();
      setDeleteDatasourceDialogOpen(false);
      setDeletingDatasource(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete datasource');
    }
  };

  const handleBulkTestConnections = async () => {
    if (selectedDatasources.length === 0) return;

    try {
      const promises = selectedDatasources.map(id => 
        fetch(`/api/workspaces/datasources/${id}/test`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'workspace-id': workspace?.id || ''
          }
        })
      );

      await Promise.all(promises);
      await loadDatasources();
    } catch (err) {
      setError('Failed to test some connections');
    }
  };

  // Render configuration form based on plugin schema
  const renderConfigurationForm = (plugin: PluginOption) => {
    if (!plugin.configSchema.properties) return null;

    return Object.entries(plugin.configSchema.properties).map(([key, property]) => {
      const value = formData.connection_config[key] || property.default || '';
      
      if (property.type === 'password') {
        return (
          <TextField
            key={key}
            label={property.title || key}
            type={showPassword[key] ? 'text' : 'password'}
            value={value}
            onChange={(e) => setFormData({
              ...formData,
              connection_config: {
                ...formData.connection_config,
                [key]: e.target.value
              }
            })}
            required={property.required}
            fullWidth
            helperText={property.description}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword({
                      ...showPassword,
                      [key]: !showPassword[key]
                    })}
                    edge="end"
                  >
                    {showPassword[key] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        );
      }

      if (property.type === 'select') {
        return (
          <FormControl key={key} fullWidth required={property.required}>
            <InputLabel>{property.title || key}</InputLabel>
            <Select
              value={value}
              onChange={(e) => setFormData({
                ...formData,
                connection_config: {
                  ...formData.connection_config,
                  [key]: e.target.value
                }
              })}
            >
              {property.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      }

      if (property.type === 'number') {
        return (
          <TextField
            key={key}
            label={property.title || key}
            type="number"
            value={value}
            onChange={(e) => setFormData({
              ...formData,
              connection_config: {
                ...formData.connection_config,
                [key]: parseInt(e.target.value) || property.default || 0
              }
            })}
            required={property.required}
            fullWidth
            helperText={property.description}
            inputProps={{
              min: property.validation?.min,
              max: property.validation?.max
            }}
          />
        );
      }

      if (property.type === 'boolean') {
        return (
          <FormControlLabel
            key={key}
            control={
              <Switch
                checked={!!value}
                onChange={(e) => setFormData({
                  ...formData,
                  connection_config: {
                    ...formData.connection_config,
                    [key]: e.target.checked
                  }
                })}
              />
            }
            label={property.title || key}
          />
        );
      }

      return (
        <TextField
          key={key}
          label={property.title || key}
          value={value}
          onChange={(e) => setFormData({
            ...formData,
            connection_config: {
              ...formData.connection_config,
              [key]: e.target.value
            }
          })}
          required={property.required}
          fullWidth
          helperText={property.description}
          inputProps={{
            minLength: property.validation?.minLength,
            maxLength: property.validation?.maxLength,
            pattern: property.validation?.pattern
          }}
        />
      );
    });
  };

  // Render datasource form dialog
  const renderDatasourceDialog = (open: boolean, onClose: () => void, title: string) => {
    const selectedPlugin = availablePlugins.find(p => p.name === formData.plugin_name);

    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              fullWidth
              helperText="Internal identifier for this datasource"
            />
            
            <TextField
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              required
              fullWidth
              helperText="Human-friendly name displayed in the UI"
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              multiline
              rows={2}
              fullWidth
              helperText="Optional description of this datasource"
            />

            <FormControl fullWidth required>
              <InputLabel>Plugin Type</InputLabel>
              <Select
                value={formData.plugin_name}
                onChange={(e) => {
                  setFormData({
                    ...formData, 
                    plugin_name: e.target.value,
                    connection_config: {}
                  });
                }}
                disabled={!!editingDatasource} // Can't change plugin type when editing
              >
                {availablePlugins.map((plugin) => (
                  <MenuItem key={plugin.name} value={plugin.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPluginCategoryIcon(plugin.category)}
                      <Box>
                        <Typography variant="body2">{plugin.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plugin.category.replace('_', ' ')}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedPlugin && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Connection Configuration
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {renderConfigurationForm(selectedPlugin)}
                </Box>
              </Box>
            )}
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
              }
              label="Active datasource"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmitDatasource} 
            variant="contained"
            disabled={!formData.name || !formData.display_name || !formData.plugin_name}
          >
            {editingDatasource ? 'Update' : 'Create'} Datasource
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Bulk actions
  const bulkActions = [
    {
      label: 'Test Selected Connections',
      icon: <TestIcon />,
      onClick: handleBulkTestConnections,
      permission: 'datasource.test'
    },
    {
      label: 'Activate Selected',
      icon: <CheckIcon />,
      onClick: () => {/* Handle bulk activate */},
      permission: 'datasource.update'
    },
    {
      label: 'Deactivate Selected',
      icon: <ErrorIcon />,
      onClick: () => {/* Handle bulk deactivate */},
      permission: 'datasource.update'
    }
  ];

  return (
    <PermissionGate permissions={['datasource.read']}>
      <WorkspaceLayout>
        <Box sx={{ p: 3 }}>
          <CommonTableLayout
            title="Data Source Management"
            subtitle="Manage database connections and data source configurations"
            data={datasources}
            columns={columns}
            actions={actions}
            filters={filters}
            loading={loading}
            error={error as any}
            searchable={true}
            searchPlaceholder="Search data sources by name, plugin type, or description..."
            selectable={true}
            selectedItems={selectedDatasources}
            onSelectionChange={setSelectedDatasources}
            pagination={true}
            itemsPerPage={25}
            showCreateButton={hasPermission('datasource.create')}
            createButtonLabel="Add Data Source"
            onCreateClick={handleAddDatasource}
            onRefresh={loadDatasources}
            bulkActions={bulkActions}
            emptyState={
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <StorageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No data sources configured
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Connect your first data source to start building datasets and dashboards
                </Typography>
                {hasPermission('datasource.create') && (
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={handleAddDatasource}
                  >
                    Add Data Source
                  </Button>
                )}
              </Box>
            }
          />

          {/* Dialogs */}
          {renderDatasourceDialog(
            addDatasourceDialogOpen,
            () => setAddDatasourceDialogOpen(false),
            'Add New Data Source'
          )}

          {renderDatasourceDialog(
            editDatasourceDialogOpen,
            () => setEditDatasourceDialogOpen(false),
            'Edit Data Source'
          )}

          <Dialog
            open={deleteDatasourceDialogOpen}
            onClose={() => setDeleteDatasourceDialogOpen(false)}
          >
            <DialogTitle>Delete Data Source</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete "{deletingDatasource?.display_name}"?
              </Typography>
              {deletingDatasource?.usage_stats && deletingDatasource.usage_stats.dataset_count > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This data source is used by {deletingDatasource.usage_stats.dataset_count} dataset(s). 
                  Deleting it will affect existing charts and dashboards.
                </Alert>
              )}
              <Typography color="error" sx={{ mt: 2 }}>
                This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDatasourceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmDelete} color="error" variant="contained">
                Delete Data Source
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={testConnectionDialogOpen}
            onClose={() => setTestConnectionDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Connection Test - {testingDatasource?.display_name}</DialogTitle>
            <DialogContent>
              {testResult ? (
                <Box>
                  <Alert severity={testResult.success ? 'success' : 'error'}>
                    {testResult.message}
                  </Alert>
                  {testResult.response_time && (
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Response time: {testResult.response_time}ms
                    </Typography>
                  )}
                  {testResult.error_code && (
                    <Typography variant="body2" color="error">
                      Error code: {testResult.error_code}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                  <Typography>Testing connection...</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTestConnectionDialogOpen(false)}>Close</Button>
              <Button 
                onClick={() => testingDatasource && handleTestConnection(testingDatasource)}
                startIcon={<TestIcon />}
              >
                Test Again
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </WorkspaceLayout>
    </PermissionGate>
  );
};

// Export as default - this is crucial for Next.js routing
export default DataSourcesPage;