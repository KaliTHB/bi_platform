import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Storage,
  Cloud,
  Database,
  ViewList,
  ViewModule,
  TableChart,
  Refresh,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataSources } from '@/hooks/useDataSources';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';

// Types
interface DataSource {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  plugin_name: string;
  plugin_category: 'relational' | 'cloud_databases' | 'storage_services' | 'data_lakes';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  connection_config: Record<string, any>;
  last_tested?: string;
  test_result?: {
    success: boolean;
    message?: string;
    tested_at: string;
  };
  created_at: string;
  updated_at: string;
  workspace_id: string;
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

interface DataSourceListProps {
  onDataSourceSelect?: (dataSource: DataSource) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDataSources?: string[];
  onSelectionChange?: (dataSourceIds: string[]) => void;
  filterByPlugin?: string;
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
  const { hasPermission } = usePermissions();
  const { 
    dataSources, 
    loading, 
    error: dataSourceError,
    createDataSource, 
    updateDataSource,
    deleteDataSource, 
    testConnection 
  } = useDataSources();

  // ============================================================================
  // State Management
  // ============================================================================
  
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
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

  // ============================================================================
  // Load Available Plugins
  // ============================================================================
  
  const loadAvailablePlugins = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    setPluginsLoading(true);
    try {
      // This would be replaced with actual API call
      const plugins: Plugin[] = [
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
              password: { type: 'password', title: 'Password' },
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
              password: { type: 'password', title: 'Password' },
            },
            required: ['host', 'database', 'username', 'password']
          }
        }
      ];
      setAvailablePlugins(plugins);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setPluginsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadAvailablePlugins();
  }, [loadAvailablePlugins]);

  // ============================================================================
  // Data Processing
  // ============================================================================
  
  const filteredDataSources = useMemo(() => {
    if (!dataSources?.data) return [];

    return dataSources.data.filter((dataSource: DataSource) => {
      const matchesSearch = !searchQuery || 
        dataSource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataSource.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dataSource.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPlugin = pluginFilter === 'all' || dataSource.plugin_name === pluginFilter;
      const matchesStatus = statusFilter === 'all' || dataSource.status === statusFilter;
      
      return matchesSearch && matchesPlugin && matchesStatus;
    });
  }, [dataSources?.data, searchQuery, pluginFilter, statusFilter]);

  const sortedDataSources = useMemo(() => {
    return [...filteredDataSources].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'plugin':
          return a.plugin_name.localeCompare(b.plugin_name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [filteredDataSources, sortBy]);

  const paginatedDataSources = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedDataSources.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedDataSources, page, rowsPerPage]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, dataSource: DataSource) => {
    event.stopPropagation();
    setSelectedDataSource(dataSource);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedDataSource(null);
  }, []);

  const handleDataSourceClick = useCallback((dataSource: DataSource) => {
    if (selectionMode) {
      const isSelected = selectedDataSources.includes(dataSource.id);
      const newSelection = isSelected
        ? selectedDataSources.filter(id => id !== dataSource.id)
        : [...selectedDataSources, dataSource.id];
      onSelectionChange?.(newSelection);
    } else {
      onDataSourceSelect?.(dataSource);
    }
  }, [selectionMode, selectedDataSources, onSelectionChange, onDataSourceSelect]);

  const handleEdit = useCallback(() => {
    if (selectedDataSource) {
      router.push(`/workspace/${currentWorkspace?.slug}/datasource/${selectedDataSource.id}/edit`);
    }
    handleMenuClose();
  }, [selectedDataSource, router, currentWorkspace?.slug, handleMenuClose]);

  const handleDelete = useCallback(async () => {
    if (selectedDataSource) {
      try {
        await deleteDataSource(selectedDataSource.id);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error('Failed to delete data source:', error);
      }
    }
    handleMenuClose();
  }, [selectedDataSource, deleteDataSource, handleMenuClose]);

  const handleTest = useCallback(async () => {
    if (selectedDataSource) {
      setTesting(true);
      setTestResult(null);
      try {
        const result = await testConnection(selectedDataSource.id);
        setTestResult(result);
      } catch (error: any) {
        setTestResult({ 
          success: false, 
          message: 'Connection test failed', 
          error: error.message 
        });
      } finally {
        setTesting(false);
      }
      setTestDialogOpen(true);
    }
    handleMenuClose();
  }, [selectedDataSource, testConnection, handleMenuClose]);

  const handleCreateDataSource = useCallback(async () => {
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
      } catch (error) {
        console.error('Failed to create data source:', error);
      }
    }
  }, [dataSourceName, dataSourceDescription, selectedPlugin, connectionConfig, createDataSource]);

  const resetForm = useCallback(() => {
    setDataSourceName('');
    setDataSourceDescription('');
    setSelectedPlugin('');
    setConnectionConfig({});
  }, []);

  const handleConnectionConfigChange = useCallback((key: string, value: any) => {
    setConnectionConfig(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const getPluginIcon = (pluginName: string, category: string) => {
    if (category === 'cloud_databases') return <Cloud fontSize="small" />;
    if (category === 'relational') return <Database fontSize="small" />;
    return <Storage fontSize="small" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle fontSize="small" color="success" />;
      case 'disconnected':
        return <Error fontSize="small" color="disabled" />;
      case 'error':
        return <Error fontSize="small" color="error" />;
      case 'testing':
        return <CircularProgress size={16} />;
      default:
        return <Warning fontSize="small" color="warning" />;
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'default';
      case 'error':
        return 'error';
      case 'testing':
        return 'info';
      default:
        return 'warning';
    }
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

  // ============================================================================
  // Render Functions
  // ============================================================================
  
  const renderDataSourceCard = (dataSource: DataSource) => {
    const isSelected = selectionMode && selectedDataSources.includes(dataSource.id);
    
    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={dataSource.id}>
        <Card
          sx={{
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: 2,
            },
            transition: 'all 0.2s ease-in-out'
          }}
          onClick={() => handleDataSourceClick(dataSource)}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                {getPluginIcon(dataSource.plugin_name, dataSource.plugin_category)}
                <Typography variant="h6" component="div" noWrap>
                  {dataSource.display_name || dataSource.name}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, dataSource)}
              >
                <MoreVert />
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              {dataSource.description || 'No description'}
            </Typography>

            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
              <Chip 
                label={dataSource.plugin_name} 
                size="small" 
                color="primary"
                variant="outlined"
              />
              <Chip 
                icon={getStatusIcon(dataSource.status)}
                label={dataSource.status} 
                size="small" 
                color={getStatusColor(dataSource.status)}
              />
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
              <Typography variant="caption" color="text.secondary">
                Updated {new Date(dataSource.updated_at).toLocaleDateString()}
              </Typography>
              {dataSource.last_tested && (
                <Typography variant="caption" color="text.secondary">
                  Tested {new Date(dataSource.last_tested).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderDataSourceListItem = (dataSource: DataSource) => {
    const isSelected = selectionMode && selectedDataSources.includes(dataSource.id);
    
    return (
      <ListItem
        key={dataSource.id}
        button
        selected={isSelected}
        onClick={() => handleDataSourceClick(dataSource)}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 1,
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {getPluginIcon(dataSource.plugin_name, dataSource.plugin_category)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={dataSource.display_name || dataSource.name}
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dataSource.description || 'No description'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Chip 
                  label={dataSource.plugin_name} 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  icon={getStatusIcon(dataSource.status)}
                  label={dataSource.status} 
                  size="small" 
                  color={getStatusColor(dataSource.status)}
                />
                <Typography variant="caption" color="text.secondary">
                  Updated {new Date(dataSource.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
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
  };

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Plugin</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Last Tested</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedDataSources.map((dataSource) => {
            const isSelected = selectionMode && selectedDataSources.includes(dataSource.id);
            return (
              <TableRow 
                key={dataSource.id}
                selected={isSelected}
                hover
                onClick={() => handleDataSourceClick(dataSource)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getPluginIcon(dataSource.plugin_name, dataSource.plugin_category)}
                    <Typography variant="body2">
                      {dataSource.display_name || dataSource.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={dataSource.plugin_name} 
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {dataSource.description || 'No description'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={getStatusIcon(dataSource.status)}
                    label={dataSource.status} 
                    size="small" 
                    color={getStatusColor(dataSource.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {dataSource.last_tested 
                      ? new Date(dataSource.last_tested).toLocaleDateString()
                      : 'Never'
                    }
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, dataSource)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ============================================================================
  // Main Render
  // ============================================================================
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (dataSourceError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load data sources: {dataSourceError}
      </Alert>
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
            onClick={() => setCurrentViewMode(
              currentViewMode === 'grid' ? 'list' : currentViewMode === 'list' ? 'table' : 'grid'
            )}
            title={`Switch to ${
              currentViewMode === 'grid' ? 'list' : currentViewMode === 'list' ? 'table' : 'grid'
            } view`}
          >
            {currentViewMode === 'grid' ? <ViewList /> : currentViewMode === 'list' ? <TableChart /> : <ViewModule />}
          </IconButton>
          
          {showCreateButton && (
            <PermissionGate permissions={['datasource.create']}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Connect Data Source
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
                {availablePlugins.map(plugin => (
                  <MenuItem key={plugin.name} value={plugin.name}>
                    {plugin.displayName}
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
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="connected">Connected</MenuItem>
                <MenuItem value="disconnected">Disconnected</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="testing">Testing</MenuItem>
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
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="plugin">Plugin</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredDataSources.length} data source{filteredDataSources.length !== 1 ? 's' : ''}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Content */}
      {currentViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {paginatedDataSources.map(renderDataSourceCard)}
        </Grid>
      ) : currentViewMode === 'list' ? (
        <List>
          {paginatedDataSources.map(renderDataSourceListItem)}
        </List>
      ) : (
        renderTableView()
      )}

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredDataSources.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{ mt: 3 }}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => onDataSourceSelect ? onDataSourceSelect(selectedDataSource!) : handleEdit()}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          {onDataSourceSelect ? 'Select' : 'View'}
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleTest}>
          <Refresh fontSize="small" sx={{ mr: 1 }} />
          {testing ? 'Testing...' : 'Test Connection'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Data Source</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDataSource?.display_name || selectedDataSource?.name}"?
            This action cannot be undone and may affect datasets that depend on this data source.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Connection Test Result</DialogTitle>
        <DialogContent>
          {testing ? (
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={24} />
              <Typography>Testing connection...</Typography>
            </Box>
          ) : testResult ? (
            <Alert severity={testResult.success ? 'success' : 'error'}>
              {testResult.message || (testResult.success ? 'Connection successful!' : 'Connection failed!')}
              {testResult.error && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Error: {testResult.error}
                </Typography>
              )}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Data Source Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Connect New Data Source</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={dataSourceName}
              onChange={(e) => setDataSourceName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={dataSourceDescription}
              onChange={(e) => setDataSourceDescription(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Plugin</InputLabel>
              <Select
                value={selectedPlugin}
                label="Plugin"
                onChange={(e) => setSelectedPlugin(e.target.value)}
              >
                {availablePlugins.map(plugin => (
                  <MenuItem key={plugin.name} value={plugin.name}>
                    {plugin.displayName} ({plugin.category})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedPlugin && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Connection Configuration
                </Typography>
                {renderConnectionConfigFields()}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateDataSource} 
            variant="contained" 
            disabled={!dataSourceName.trim() || !selectedPlugin}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataSourceList;