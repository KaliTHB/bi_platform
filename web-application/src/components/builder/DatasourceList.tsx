'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Paper,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  Storage,
  Cloud,
  CheckCircle,
  Error,
  Warning,
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Settings,
  Cable,
} from '@mui/icons-material';
import StorageIcon from '@mui/icons-material/Storage';
import ScienceIcon from '@mui/icons-material/Science';
import { useRouter } from 'next/navigation';
import { DataSource } from '@/types/datasource.types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import useDataSources from '@/hooks/useDataSources';
import PermissionGate from '@/components/shared/PermissionGate';

interface DataSourceListProps {
  onDataSourceSelect?: (dataSource: DataSource) => void;
  viewMode?: 'grid' | 'list';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDataSources?: string[];
  onSelectionChange?: (dataSourceIds: string[]) => void;
  filterByPlugin?: string;
}

interface Plugin {
  name: string;
  displayName: string;
  category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  version?: string;
  configSchema: {
    type: 'object';
    properties: Record<string, SchemaProperty>;
    required?: string[];
  };
}

interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'password';
  title?: string;
  description?: string;
  default?: any;
  format?: string;
  minimum?: number;
  maximum?: number;
}

export const DataSourceList: React.FC<DataSourceListProps> = ({
  onDataSourceSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDataSources = [],
  onSelectionChange,
  filterByPlugin,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermissions } = usePermissions();
  const { 
    dataSources, 
    loading, 
    createDataSource, 
    updateDataSource,
    deleteDataSource, 
    testConnection 
  } = useDataSources();

  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pluginFilter, setPluginFilter] = useState<string>(filterByPlugin || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Form states
  const [dataSourceName, setDataSourceName] = useState('');
  const [dataSourceDescription, setDataSourceDescription] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [connectionConfig, setConnectionConfig] = useState<Record<string, any>>({});

  // Plugin states
  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);

  // Load available plugins
  const loadAvailablePlugins = async () => {
    if (!currentWorkspace?.id) return;
    
    setPluginsLoading(true);
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/plugins/datasources`);
      if (response.ok) {
        const plugins = await response.json();
        setAvailablePlugins(plugins);
      } else {
        // Fallback plugins if API fails
        setAvailablePlugins([
          {
            name: 'postgresql',
            displayName: 'PostgreSQL',
            category: 'relational',
            configSchema: {
              type: 'object',
              properties: {
                host: { type: 'string', title: 'Host' },
                port: { type: 'number', title: 'Port', default: 5432 },
                database: { type: 'string', title: 'Database' },
                username: { type: 'string', title: 'Username' },
                password: { type: 'password', title: 'Password' }
              },
              required: ['host', 'database', 'username', 'password']
            }
          },
          {
            name: 'mysql',
            displayName: 'MySQL',
            category: 'relational',
            configSchema: {
              type: 'object',
              properties: {
                host: { type: 'string', title: 'Host' },
                port: { type: 'number', title: 'Port', default: 3306 },
                database: { type: 'string', title: 'Database' },
                username: { type: 'string', title: 'Username' },
                password: { type: 'password', title: 'Password' }
              },
              required: ['host', 'database', 'username', 'password']
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load available plugins:', error);
    } finally {
      setPluginsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailablePlugins();
  }, [currentWorkspace?.id]);

  const filteredDataSources = dataSources
    .filter((ds) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          ds.name.toLowerCase().includes(query) ||
          ds.display_name?.toLowerCase().includes(query) ||
          ds.description?.toLowerCase().includes(query) ||
          ds.plugin_name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Plugin filter
      if (pluginFilter !== 'all' && ds.plugin_name !== pluginFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !ds.is_active) return false;
        if (statusFilter === 'inactive' && ds.is_active) return false;
        if (statusFilter === 'success' && ds.test_status !== 'success') return false;
        if (statusFilter === 'failed' && ds.test_status !== 'failed') return false;
        if (statusFilter === 'pending' && ds.test_status !== 'pending') return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'plugin':
          return a.plugin_name.localeCompare(b.plugin_name);
        case 'status':
          return a.test_status.localeCompare(b.test_status);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: // updated_at
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  const uniquePlugins = Array.from(new Set(dataSources.map(ds => ds.plugin_name)));

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDataSource(null);
  };

  const handleEdit = () => {
    if (selectedDataSource) {
      router.push(`/workspace/${currentWorkspace?.slug}/datasource/${selectedDataSource.id}/edit`);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedDataSource) {
      if (onDataSourceSelect) {
        onDataSourceSelect(selectedDataSource);
      } else {
        router.push(`/workspace/${currentWorkspace?.slug}/datasource/${selectedDataSource.id}`);
      }
    }
    handleMenuClose();
  };

  const handleTest = async () => {
    if (selectedDataSource) {
      setTesting(true);
      setTestResult(null);
      try {
        const result = await testConnection(selectedDataSource.id);
        setTestResult(result);
      } catch (error: any) {
        setTestResult({ success: false, message: 'Connection test failed', error: error.message });
      } finally {
        setTesting(false);
      }
      setTestDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedDataSource) {
      await deleteDataSource(selectedDataSource.id);
      setDeleteDialogOpen(false);
    }
    handleMenuClose();
  };

  const handleCreateDataSource = async () => {
    if (dataSourceName.trim() && selectedPlugin) {
      try {
        await createDataSource({
          name: dataSourceName,
          description: dataSourceDescription,
          plugin_name: selectedPlugin,
          connection_config: connectionConfig
        });
        resetForm();
        setCreateDialogOpen(false);
      } catch (error: any) {
        console.error('Failed to create data source:', error);
      }
    }
  };

  const resetForm = () => {
    setDataSourceName('');
    setDataSourceDescription('');
    setSelectedPlugin('');
    setConnectionConfig({});
  };

  const handleConnectionConfigChange = (key: string, value: any) => {
    setConnectionConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderConnectionConfigFields = () => {
    const plugin = availablePlugins.find(p => p.name === selectedPlugin);
    if (!plugin?.configSchema?.properties) return null;

    return Object.entries(plugin.configSchema.properties).map(([fieldName, fieldSchema]: [string, SchemaProperty]) => {
      switch (fieldSchema.type) {
        case 'password':
          return (
            <TextField
              key={fieldName}
              fullWidth
              type="password"
              label={fieldSchema.title || fieldName}
              value={connectionConfig[fieldName] || ''}
              onChange={(e) => handleConnectionConfigChange(fieldName, e.target.value)}
              required={plugin.configSchema.required?.includes(fieldName)}
              helperText={fieldSchema.description}
              margin="normal"
            />
          );
        case 'number':
          return (
            <TextField
              key={fieldName}
              fullWidth
              type="number"
              label={fieldSchema.title || fieldName}
              value={connectionConfig[fieldName] || fieldSchema.default || ''}
              onChange={(e) => handleConnectionConfigChange(fieldName, parseInt(e.target.value))}
              required={plugin.configSchema.required?.includes(fieldName)}
              helperText={fieldSchema.description}
              margin="normal"
            />
          );
        default:
          return (
            <TextField
              key={fieldName}
              fullWidth
              label={fieldSchema.title || fieldName}
              value={connectionConfig[fieldName] || ''}
              onChange={(e) => handleConnectionConfigChange(fieldName, e.target.value)}
              required={plugin.configSchema.required?.includes(fieldName)}
              helperText={fieldSchema.description}
              margin="normal"
            />
          );
      }
    });
  };

  const handleDataSourceClick = (dataSource: DataSource) => {
    if (selectionMode) {
      const newSelection = selectedDataSources.includes(dataSource.id)
        ? selectedDataSources.filter(id => id !== dataSource.id)
        : [...selectedDataSources, dataSource.id];
      onSelectionChange?.(newSelection);
    } else {
      onDataSourceSelect?.(dataSource);
    }
  };

  const getPluginIcon = (pluginName: string) => {
    switch (pluginName.toLowerCase()) {
      case 'postgresql':
      case 'mysql':
      case 'sqlite':
      case 'oracle':
      case 'mariadb':
        return <StorageIcon />;
      case 'snowflake':
      case 'bigquery':
      case 'redshift':
        return <Cloud />;
      default:
        return <Storage />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'pending':
        return <Warning color="warning" />;
      default:
        return <Warning color="disabled" />;
    }
  };

  const DataSourceCard: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => (
    <Card 
      sx={{ 
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        opacity: dataSource.is_active ? 1 : 0.6
      }}
      onClick={() => handleDataSourceClick(dataSource)}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {getPluginIcon(dataSource.plugin_name)}
            </Avatar>
            <Box>
              <Typography variant="h6" noWrap>
                {dataSource.display_name || dataSource.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {dataSource.plugin_name}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {getStatusIcon(dataSource.test_status)}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMenuClick(e, dataSource);
              }}
            >
              <MoreVert />
            </IconButton>
          </Box>
        </Box>
        
        {dataSource.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {dataSource.description}
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Chip
            size="small"
            label={dataSource.test_status}
            color={
              dataSource.test_status === 'success' ? 'success' :
              dataSource.test_status === 'failed' ? 'error' : 'warning'
            }
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary">
            {new Date(dataSource.updated_at).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const DataSourceListItem: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => (
    <ListItem
      button
      onClick={() => handleDataSourceClick(dataSource)}
      sx={{ opacity: dataSource.is_active ? 1 : 0.6 }}
    >
      <ListItemAvatar>
        <Avatar>
          {getPluginIcon(dataSource.plugin_name)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1">
              {dataSource.display_name || dataSource.name}
            </Typography>
            <Chip
              size="small"
              label={dataSource.test_status}
              color={
                dataSource.test_status === 'success' ? 'success' :
                dataSource.test_status === 'failed' ? 'error' : 'warning'
              }
              variant="outlined"
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary">
              {dataSource.plugin_name} • {dataSource.description || 'No description'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last tested: {
                dataSource.last_tested 
                  ? new Date(dataSource.last_tested).toLocaleDateString()
                  : 'Never'
              } • Updated {new Date(dataSource.updated_at).toLocaleDateString()}
            </Typography>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          onClick={(e) => handleMenuClick(e, dataSource)}
        >
          <MoreVert />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading data sources...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Data Sources
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={() => setCurrentViewMode(currentViewMode === 'grid' ? 'list' : 'grid')}
          >
            {currentViewMode === 'grid' ? <ViewList /> : <ViewModule />}
          </IconButton>
          
          {showCreateButton && (
            <PermissionGate permissions={['datasource.create']}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Add Data Source
              </Button>
            </PermissionGate>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search data sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Plugin</InputLabel>
              <Select
                value={pluginFilter}
                label="Plugin"
                onChange={(e) => setPluginFilter(e.target.value)}
              >
                <MenuItem value="all">All Plugins</MenuItem>
                {uniquePlugins.map((plugin) => (
                  <MenuItem key={plugin} value={plugin}>
                    {plugin}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="success">Connected</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="updated_at">Last Updated</MenuItem>
                <MenuItem value="created_at">Created Date</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="plugin">Plugin</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                {filteredDataSources.length} of {dataSources.length} sources
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Sources List/Grid */}
      {filteredDataSources.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Cable sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No data sources found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchQuery || pluginFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first data source'
              }
            </Typography>
            {showCreateButton && !searchQuery && pluginFilter === 'all' && statusFilter === 'all' && (
              <PermissionGate permissions={['datasource.create']}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Add Data Source
                </Button>
              </PermissionGate>
            )}
          </CardContent>
        </Card>
      ) : currentViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredDataSources.map((dataSource) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={dataSource.id}>
              <DataSourceCard dataSource={dataSource} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <List>
          {filteredDataSources.map((dataSource) => (
            <DataSourceListItem key={dataSource.id} dataSource={dataSource} />
          ))}
        </List>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          {onDataSourceSelect ? 'Select' : 'View'}
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleTest}>
          <ScienceIcon fontSize="small" sx={{ mr: 1 }} />
          Test Connection
        </MenuItem>
        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Data Source Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Data Source</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="normal"
            label="Name"
            fullWidth
            required
            value={dataSourceName}
            onChange={(e) => setDataSourceName(e.target.value)}
            helperText="Internal identifier (lowercase, no spaces recommended)"
          />
          <TextField
            margin="normal"
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={dataSourceDescription}
            onChange={(e) => setDataSourceDescription(e.target.value)}
            helperText="Optional description for this data source"
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Plugin Type</InputLabel>
            <Select
              value={selectedPlugin}
              label="Plugin Type"
              onChange={(e) => {
                setSelectedPlugin(e.target.value);
                setConnectionConfig({}); // Reset config when plugin changes
              }}
              disabled={pluginsLoading}
            >
              {availablePlugins.map((plugin) => (
                <MenuItem key={plugin.name} value={plugin.name}>
                  {plugin.displayName} - {plugin.category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedPlugin && (
            <>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                Connection Configuration
              </Typography>
              {renderConnectionConfigFields()}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateDataSource}
            variant="contained"
            disabled={!dataSourceName.trim() || !selectedPlugin}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Connection Test</DialogTitle>
        <DialogContent>
          {testing ? (
            <Box display="flex" alignItems="center" gap={2} py={4}>
              <CircularProgress size={24} />
              <Typography>Testing connection...</Typography>
            </Box>
          ) : testResult ? (
            <Alert 
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" gutterBottom>
                {testResult.message}
              </Typography>
              {testResult.details && (
                <Typography variant="body2" color="text.secondary">
                  {JSON.stringify(testResult.details, null, 2)}
                </Typography>
              )}
              {testResult.error && (
                <Typography variant="body2" color="error">
                  {testResult.error}
                </Typography>
              )}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Data Source</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDataSource?.name}"? This action cannot be undone and may affect datasets that depend on this data source.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataSourceList;