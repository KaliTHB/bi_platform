// web-application/src/components/builder/DatasourceList.tsx

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Avatar,
  Chip,
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
  SelectChangeEvent,
  Grid,
  CardContent,
  Card,
  IconButton
} from '@mui/material';
import {
  Storage,
  Database,
  Cloud,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  MoreVert,
  Add,
  Refresh
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataSources } from '@/hooks/useDataSources';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';
import BaseList, { BaseListItem, ColumnConfig, MenuAction, FilterOption, SortOption } from '@/components/shared/BaseList';

// Types
import { DataSource } from '@/types/datasource.types';

// =============================================================================
// Props and Interfaces
// =============================================================================

interface DatasourceListProps {
  onDataSourceSelect?: (dataSource: DataSource) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDataSources?: string[];
  onSelectionChange?: (dataSourceIds: string[]) => void;
  filterByPlugin?: string;
}

// Extend DataSource to match BaseListItem interface
interface DatasourceListItem extends DataSource, BaseListItem {}

// =============================================================================
// Main Component
// =============================================================================

const DatasourceList: React.FC<DatasourceListProps> = ({
  onDataSourceSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDataSources = [],
  onSelectionChange,
  filterByPlugin
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const {
    dataSources,
    loading,
    error,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection,
    refreshDataSources
  } = useDataSources();

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);

  // Form states
  const [dataSourceName, setDataSourceName] = useState('');
  const [dataSourceDescription, setDataSourceDescription] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Available plugins (this would normally come from a plugin registry)
  const availablePlugins = useMemo(() => [
    { name: 'postgresql', displayName: 'PostgreSQL', category: 'relational' },
    { name: 'mysql', displayName: 'MySQL', category: 'relational' },
    { name: 'sqlite', displayName: 'SQLite', category: 'relational' },
    { name: 'mongodb', displayName: 'MongoDB', category: 'nosql' },
    { name: 'bigquery', displayName: 'Google BigQuery', category: 'cloud_databases' },
    { name: 's3', displayName: 'Amazon S3', category: 'storage_services' }
  ], []);

  // =============================================================================
  // Configuration
  // =============================================================================

  const filterOptions: FilterOption[] = [
    { value: 'plugin_name', label: 'Plugin' },
    { value: 'plugin_category', label: 'Category' },
    { value: 'status', label: 'Status' }
  ];

  const sortOptions: SortOption[] = [
    { value: 'updated_at', label: 'Last Updated' },
    { value: 'created_at', label: 'Created Date' },
    { value: 'name', label: 'Name' },
    { value: 'plugin_name', label: 'Plugin' },
    { value: 'last_tested', label: 'Last Tested' }
  ];

  const columns: ColumnConfig[] = [
    {
      key: 'name',
      label: 'Name',
      render: (item: DatasourceListItem) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: getPluginColor(item.plugin_category)
            }}
          >
            {getPluginIcon(item.plugin_category)}
          </Avatar>
          <Box>
            <Typography variant="subtitle2">
              {item.display_name || item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.description || 'No description'}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'plugin_name',
      label: 'Plugin',
      render: (item: DatasourceListItem) => {
        const plugin = availablePlugins.find(p => p.name === item.plugin_name);
        return (
          <Chip 
            label={plugin?.displayName || item.plugin_name} 
            size="small" 
            color="primary"
            variant="outlined"
          />
        );
      }
    },
    {
      key: 'plugin_category',
      label: 'Category',
      render: (item: DatasourceListItem) => (
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {item.plugin_category?.replace('_', ' ') || 'Unknown'}
        </Typography>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: DatasourceListItem) => (
        <Chip 
          icon={getStatusIcon(item.status)}
          label={item.status} 
          size="small" 
          color={getStatusColor(item.status)}
        />
      )
    },
    {
      key: 'last_tested',
      label: 'Last Tested',
      render: (item: DatasourceListItem) => (
        <Typography variant="body2" color="text.secondary">
          {item.last_tested ? 
            new Date(item.last_tested).toLocaleDateString() : 
            'Never'
          }
        </Typography>
      )
    }
  ];

  const menuActions: MenuAction[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: <Visibility />,
      onClick: handleView
    },
    {
      key: 'test',
      label: 'Test Connection',
      icon: <Refresh />,
      onClick: handleTest
    },
    ...(hasPermission('datasource.update') ? [{
      key: 'edit',
      label: 'Edit Data Source',
      icon: <Edit />,
      onClick: handleEdit
    }] : []),
    ...(hasPermission('datasource.delete') ? [{
      key: 'delete',
      label: 'Delete Data Source',
      icon: <Delete />,
      onClick: handleDeleteDataSource,
      color: 'error' as const,
      divider: true
    }] : [])
  ];

  // =============================================================================
  // Event Handlers
  // =============================================================================

  function handleView(item: DatasourceListItem) {
    const dataSource = item as DataSource;
    if (onDataSourceSelect) {
      onDataSourceSelect(dataSource);
    }
  }

  function handleEdit(item: DatasourceListItem) {
    const dataSource = item as DataSource;
    router.push(`/workspace/${currentWorkspace?.slug}/datasource-builder?id=${dataSource.id}`);
  }

  function handleDeleteDataSource(item: DatasourceListItem) {
    const dataSource = item as DataSource;
    setSelectedDataSource(dataSource);
    setDeleteDialogOpen(true);
  }

  function handleTest(item: DatasourceListItem) {
    const dataSource = item as DataSource;
    setSelectedDataSource(dataSource);
    handleTestConnection(dataSource);
  }

  const handleTestConnection = useCallback(async (dataSource: DataSource) => {
    setTesting(true);
    setTestDialogOpen(true);
    try {
      const result = await testConnection(dataSource.id);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
        error: error
      });
    } finally {
      setTesting(false);
    }
  }, [testConnection]);

  const handleCreateDataSource = useCallback(async () => {
    if (dataSourceName.trim() && selectedPlugin) {
      try {
        const dataSourceData = {
          name: dataSourceName,
          description: dataSourceDescription,
          plugin_name: selectedPlugin,
          connection_config: {} // This would be filled by a proper configuration form
        };

        await createDataSource(dataSourceData);
        resetForm();
        setCreateDialogOpen(false);
      } catch (error) {
        console.error('Failed to create data source:', error);
      }
    }
  }, [dataSourceName, dataSourceDescription, selectedPlugin, createDataSource]);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedDataSource) {
      try {
        await deleteDataSource(selectedDataSource.id);
        setDeleteDialogOpen(false);
        setSelectedDataSource(null);
      } catch (error) {
        console.error('Failed to delete data source:', error);
      }
    }
  }, [selectedDataSource, deleteDataSource]);

  const resetForm = useCallback(() => {
    setDataSourceName('');
    setDataSourceDescription('');
    setSelectedPlugin('');
  }, []);

  const handleItemClick = useCallback((item: DatasourceListItem) => {
    if (onDataSourceSelect) {
      onDataSourceSelect(item as DataSource);
    }
  }, [onDataSourceSelect]);

  // =============================================================================
  // Helper Functions
  // =============================================================================

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'testing':
        return 'info';
      case 'disconnected':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle fontSize="small" />;
      case 'error':
        return <ErrorIcon fontSize="small" />;
      case 'disconnected':
      case 'testing':
        return <Warning fontSize="small" />;
      default:
        return <Warning fontSize="small" />;
    }
  };

  const getPluginIcon = (category: string) => {
    switch (category) {
      case 'relational':
        return <Database fontSize="small" />;
      case 'cloud_databases':
        return <Cloud fontSize="small" />;
      case 'storage_services':
        return <Storage fontSize="small" />;
      default:
        return <Database fontSize="small" />;
    }
  };

  const getPluginColor = (category: string): string => {
    switch (category) {
      case 'relational':
        return '#1976d2';
      case 'cloud_databases':
        return '#388e3c';
      case 'storage_services':
        return '#f57c00';
      default:
        return '#757575';
    }
  };

  const getItemAvatar = useCallback((item: DatasourceListItem) => (
    <Avatar sx={{ bgcolor: getPluginColor(item.plugin_category) }}>
      {getPluginIcon(item.plugin_category)}
    </Avatar>
  ), []);

  const getItemChips = useCallback((item: DatasourceListItem) => {
    const plugin = availablePlugins.find(p => p.name === item.plugin_name);
    return [
      <Chip 
        key="plugin"
        label={plugin?.displayName || item.plugin_name} 
        size="small" 
        color="primary"
        variant="outlined"
      />,
      <Chip 
        key="status"
        icon={getStatusIcon(item.status)}
        label={item.status} 
        size="small" 
        color={getStatusColor(item.status)}
      />
    ];
  }, [availablePlugins]);

  const renderCustomCard = useCallback((item: DatasourceListItem, isSelected: boolean) => (
    <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
      <Card
        sx={{
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:hover': { boxShadow: 3 }
        }}
        onClick={() => handleItemClick(item)}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: getPluginColor(item.plugin_category) }}>
                {getPluginIcon(item.plugin_category)}
              </Avatar>
              <Box>
                <Typography variant="h6" component="div" noWrap>
                  {item.display_name || item.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {availablePlugins.find(p => p.name === item.plugin_name)?.displayName || item.plugin_name}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small">
              <MoreVert />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {item.description || 'No description'}
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={1}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              {getItemChips(item)}
            </Box>
            
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                Last tested: {item.last_tested ? 
                  new Date(item.last_tested).toLocaleDateString() : 
                  'Never'
                }
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(item.updated_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  ), [handleItemClick, availablePlugins, getItemChips, getPluginColor, getPluginIcon]);

  // =============================================================================
  // Render Filters
  // =============================================================================

  const renderFilters = useCallback(() => (
    <>
      <Grid item xs={12} sm={6} md={2}>
        <FormControl fullWidth>
          <InputLabel>Plugin</InputLabel>
          <Select value={filterByPlugin || ''} label="Plugin">
            <MenuItem value="">All Plugins</MenuItem>
            {availablePlugins.map((plugin) => (
              <MenuItem key={plugin.name} value={plugin.name}>
                {plugin.displayName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={2}>
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select value="" label="Status">
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="connected">Connected</MenuItem>
            <MenuItem value="disconnected">Disconnected</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="testing">Testing</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </>
  ), [availablePlugins, filterByPlugin]);

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <>
      <BaseList<DatasourceListItem>
        items={dataSources as DatasourceListItem[]}
        loading={loading}
        error={error}
        title="Data Sources"
        entityName="data source"
        entityNamePlural="data sources"
        viewMode={viewMode}
        showCreateButton={showCreateButton}
        createButtonLabel="Connect Data Source"
        createButtonIcon={<Add />}
        emptyStateIcon={<Storage />}
        selectionMode={selectionMode}
        selectedItems={selectedDataSources}
        onSelectionChange={onSelectionChange}
        searchPlaceholder="Search data sources..."
        filterOptions={filterOptions}
        sortOptions={sortOptions}
        columns={columns}
        menuActions={menuActions}
        onItemClick={handleItemClick}
        onCreateClick={() => setCreateDialogOpen(true)}
        onRefresh={refreshDataSources}
        renderCard={renderCustomCard}
        renderFilters={renderFilters}
        getItemAvatar={getItemAvatar}
        getItemChips={getItemChips}
      />

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect New Data Source</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Data Source Name"
              value={dataSourceName}
              onChange={(e) => setDataSourceName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={dataSourceDescription}
              onChange={(e) => setDataSourceDescription(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Plugin</InputLabel>
              <Select
                value={selectedPlugin}
                label="Plugin"
                onChange={(e: SelectChangeEvent) => setSelectedPlugin(e.target.value)}
                required
              >
                {availablePlugins.map((plugin) => (
                  <MenuItem key={plugin.name} value={plugin.name}>
                    {plugin.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDataSource}
            variant="contained"
            disabled={!dataSourceName.trim() || !selectedPlugin}
          >
            Connect Data Source
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Data Source</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDataSource?.name}"? 
            This action cannot be undone and may affect datasets that depend on this data source.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)}>
        <DialogTitle>Test Connection Results</DialogTitle>
        <DialogContent>
          {testing ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Refresh sx={{ animation: 'spin 1s linear infinite' }} />
              <Typography>Testing connection...</Typography>
            </Box>
          ) : testResult ? (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {testResult.success ? 
                  <CheckCircle color="success" /> : 
                  <ErrorIcon color="error" />
                }
                <Typography variant="h6">
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </Typography>
              </Box>
              <Typography variant="body2">
                {testResult.message}
              </Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DatasourceList;