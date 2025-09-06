// web-application/src/pages/workspace/datasources.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Storage as DatabaseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TestTube as TestIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  CloudSync as SyncIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import CommonTableLayout, { 
  BaseListItem, 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

interface DatasourceListItem extends BaseListItem {
  plugin_name: string;
  connection_config: Record<string, any>;
  is_active: boolean;
  last_tested?: string;
  test_status: 'pending' | 'success' | 'error';
  test_error_message?: string;
  dataset_count: number;
  connection_pool_config: Record<string, any>;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

const DATASOURCE_PLUGINS = [
  { value: 'postgresql', label: 'PostgreSQL', icon: '🐘' },
  { value: 'mysql', label: 'MySQL', icon: '🐬' },
  { value: 'sqlite', label: 'SQLite', icon: '📁' },
  { value: 'mongodb', label: 'MongoDB', icon: '🍃' },
  { value: 'redis', label: 'Redis', icon: '🔴' },
  { value: 'elasticsearch', label: 'Elasticsearch', icon: '🔍' },
  { value: 'csv', label: 'CSV File', icon: '📊' },
  { value: 'json', label: 'JSON API', icon: '📡' },
  { value: 'rest', label: 'REST API', icon: '🌐' },
  { value: 'graphql', label: 'GraphQL', icon: '⚡' }
];

const DataSourcesPage: React.FC = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [datasources, setDatasources] = useState<DatasourceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [newDatasource, setNewDatasource] = useState({
    name: '',
    display_name: '',
    description: '',
    plugin_name: '',
    connection_config: {} as Record<string, any>,
    is_active: true
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchDatasources = async () => {
      try {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
          setDatasources([
            {
              id: '1',
              name: 'main-database',
              display_name: 'Main Database',
              description: 'Primary PostgreSQL database',
              plugin_name: 'postgresql',
              connection_config: {
                host: 'localhost',
                port: 5432,
                database: 'production'
              },
              is_active: true,
              last_tested: '2024-01-15T10:30:00Z',
              test_status: 'success',
              dataset_count: 15,
              connection_pool_config: { max_connections: 20 },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-15T10:30:00Z',
              owner: {
                id: 'user1',
                name: 'John Doe',
                email: 'john@company.com'
              }
            },
            {
              id: '2',
              name: 'analytics-db',
              display_name: 'Analytics Database',
              description: 'Dedicated analytics MySQL instance',
              plugin_name: 'mysql',
              connection_config: {
                host: 'analytics.db.internal',
                port: 3306,
                database: 'analytics'
              },
              is_active: false,
              last_tested: '2024-01-14T15:45:00Z',
              test_status: 'error',
              test_error_message: 'Connection timeout',
              dataset_count: 8,
              connection_pool_config: { max_connections: 10 },
              created_at: '2024-01-10T00:00:00Z',
              updated_at: '2024-01-14T15:45:00Z',
              owner: {
                id: 'user2',
                name: 'Jane Smith',
                email: 'jane@company.com'
              }
            },
            {
              id: '3',
              name: 'sales-api',
              display_name: 'Sales API',
              description: 'REST API for sales data',
              plugin_name: 'rest',
              connection_config: {
                base_url: 'https://api.sales.company.com',
                version: 'v1'
              },
              is_active: true,
              last_tested: '2024-01-15T08:00:00Z',
              test_status: 'pending',
              dataset_count: 3,
              connection_pool_config: { max_connections: 5 },
              created_at: '2024-01-12T00:00:00Z',
              updated_at: '2024-01-15T08:00:00Z',
              owner: {
                id: 'user3',
                name: 'Mike Johnson',
                email: 'mike@company.com'
              }
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching datasources:', error);
        setLoading(false);
      }
    };

    if (workspace) {
      fetchDatasources();
    }
  }, [workspace]);

  const getPluginIcon = (pluginName: string) => {
    const plugin = DATASOURCE_PLUGINS.find(p => p.value === pluginName);
    return plugin?.icon || '💾';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckIcon color="success" fontSize="small" />;
      case 'error': return <ErrorIcon color="error" fontSize="small" />;
      case 'pending': return <PendingIcon color="warning" fontSize="small" />;
      default: return <PendingIcon color="disabled" fontSize="small" />;
    }
  };

  const columns: TableColumn<DatasourceListItem>[] = [
    {
      key: 'name',
      label: 'Data Source',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'info.main' }}>
            <span style={{ fontSize: '1.2rem' }}>{getPluginIcon(item.plugin_name)}</span>
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {item.display_name || item.name}
            </Typography>
            {item.description && (
              <Typography variant="caption" color="textSecondary" noWrap>
                {item.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'plugin_name',
      label: 'Type',
      sortable: true,
      render: (item) => {
        const plugin = DATASOURCE_PLUGINS.find(p => p.value === item.plugin_name);
        return (
          <Chip
            label={plugin?.label || item.plugin_name}
            size="small"
            color="primary"
            variant="outlined"
          />
        );
      }
    },
    {
      key: 'test_status',
      label: 'Connection',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          {testingConnection === item.id ? (
            <CircularProgress size={16} />
          ) : (
            getStatusIcon(item.test_status)
          )}
          <Typography variant="body2" color={
            item.test_status === 'success' ? 'success.main' :
            item.test_status === 'error' ? 'error.main' : 'text.secondary'
          }>
            {item.test_status === 'success' ? 'Connected' :
             item.test_status === 'error' ? 'Failed' : 'Pending'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'dataset_count',
      label: 'Datasets',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">
          {item.dataset_count}
        </Typography>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={item.is_active ? 'success' : 'default'}
          variant={item.is_active ? 'filled' : 'outlined'}
        />
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (item) => item.owner ? (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
            {item.owner.name.charAt(0)}
          </Avatar>
          <Typography variant="body2">{item.owner.name}</Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary">Unknown</Typography>
      )
    }
  ];

  const handleTestConnection = async (datasourceId: string) => {
    setTestingConnection(datasourceId);
    try {
      // Simulate API call to test connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the datasource status
      setDatasources(prev => prev.map(ds => 
        ds.id === datasourceId 
          ? { ...ds, test_status: 'success' as const, last_tested: new Date().toISOString() }
          : ds
      ));
    } catch (error) {
      setDatasources(prev => prev.map(ds => 
        ds.id === datasourceId 
          ? { ...ds, test_status: 'error' as const, test_error_message: 'Connection failed' }
          : ds
      ));
    } finally {
      setTestingConnection(null);
    }
  };

  const actions: TableAction<DatasourceListItem>[] = [
    {
      label: 'Test Connection',
      icon: <TestIcon fontSize="small" />,
      onClick: (item) => handleTestConnection(item.id),
      requiresPermission: 'datasource.test'
    },
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/datasources/${item.id}/edit`);
      },
      requiresPermission: 'datasource.update'
    },
    {
      label: 'Sync Schemas',
      icon: <SyncIcon fontSize="small" />,
      onClick: (item) => {
        console.log('Sync schemas for:', item.id);
      },
      requiresPermission: 'datasource.sync'
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (item) => {
        if (confirm(`Are you sure you want to delete "${item.display_name}"? This will also remove all associated datasets.`)) {
          console.log('Delete datasource:', item.id);
        }
      },
      requiresPermission: 'datasource.delete',
      color: 'error'
    }
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'plugin_name',
      label: 'Type',
      type: 'select',
      options: DATASOURCE_PLUGINS.map(plugin => ({
        value: plugin.value,
        label: plugin.label
      }))
    },
    {
      key: 'test_status',
      label: 'Connection Status',
      type: 'select',
      options: [
        { value: 'success', label: 'Connected' },
        { value: 'error', label: 'Failed' },
        { value: 'pending', label: 'Pending' }
      ]
    },
    {
      key: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ];

  const handleCreateDatasource = async () => {
    try {
      // Handle create logic
      console.log('Create datasource:', newDatasource);
      setCreateDialogOpen(false);
      setNewDatasource({
        name: '',
        display_name: '',
        description: '',
        plugin_name: '',
        connection_config: {},
        is_active: true
      });
    } catch (error) {
      console.error('Error creating datasource:', error);
    }
  };

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Data Sources
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Connect and manage your data sources
            </Typography>
          </Box>
          
          <PermissionGate permission="datasource.create">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add Data Source
            </Button>
          </PermissionGate>
        </Box>

        <CommonTableLayout
          data={datasources}
          columns={columns}
          actions={actions}
          filterOptions={filterOptions}
          loading={loading}
          searchPlaceholder="Search data sources..."
          emptyMessage="No data sources found. Add your first data source to get started."
          onRowClick={(item) => router.push(`/workspace/${workspace?.slug}/datasources/${item.id}`)}
        />

        {/* Create Datasource Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Add New Data Source</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                autoFocus
                label="Name"
                fullWidth
                value={newDatasource.name}
                onChange={(e) => setNewDatasource({...newDatasource, name: e.target.value})}
                helperText="Unique identifier for this data source"
              />
              <TextField
                label="Display Name"
                fullWidth
                value={newDatasource.display_name}
                onChange={(e) => setNewDatasource({...newDatasource, display_name: e.target.value})}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={newDatasource.description}
                onChange={(e) => setNewDatasource({...newDatasource, description: e.target.value})}
              />
              <FormControl fullWidth>
                <InputLabel>Data Source Type</InputLabel>
                <Select
                  value={newDatasource.plugin_name}
                  onChange={(e) => setNewDatasource({...newDatasource, plugin_name: e.target.value})}
                >
                  {DATASOURCE_PLUGINS.map(plugin => (
                    <MenuItem key={plugin.value} value={plugin.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{plugin.icon}</span>
                        {plugin.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {newDatasource.plugin_name && (
                <Alert severity="info">
                  Configuration options for {newDatasource.plugin_name} will be available after creation.
                </Alert>
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={newDatasource.is_active}
                    onChange={(e) => setNewDatasource({...newDatasource, is_active: e.target.checked})}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateDatasource}
              variant="contained"
              disabled={!newDatasource.name || !newDatasource.plugin_name}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default DataSourcesPage;