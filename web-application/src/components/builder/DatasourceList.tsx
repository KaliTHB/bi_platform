// web-application/src/components/builder/DatasourceList.tsx
import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Card,
  CardContent,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CloudQueue,
  Visibility,
  Storage,
  MoreVert,
  CheckCircle,
  Error,
  Warning,
  Cable,
  Api,
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataSources } from '@/hooks/useDataSources';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';
import { List, FilterOption, SortOption, TableColumn, ListAction } from '@/components/shared/List';

// Types
interface DataSource {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  plugin_name: string;
  plugin_category: 'database' | 'api' | 'file' | 'cloud';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  connection_config: Record<string, any>;
  last_tested?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  workspace_id: string;
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
    error,
    createDataSource, 
    updateDataSource,
    deleteDataSource,
    testConnection,
  } = useDataSources();

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'disconnected': return 'default';
      case 'error': return 'error';
      case 'testing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle />;
      case 'disconnected': return <Cable />;
      case 'error': return <Error />;
      case 'testing': return <Warning />;
      default: return <Cable />;
    }
  };

  const getPluginIcon = (pluginName: string, category: string) => {
    switch (category) {
      case 'database': return <CloudQueue />;
      case 'api': return <Api />;
      case 'file': return <Storage />;
      case 'cloud': return <Storage />;
      default: return <Storage />;
    }
  };

  // Configuration for the List component
  const filters: FilterOption[] = [
    { key: 'plugin_category', label: 'Category', value: 'relational', count: dataSources.filter(d => d.plugin_category === 'relational').length },
    { key: 'plugin_category', label: 'Category', value: 'apis', count: dataSources.filter(d => d.plugin_category === 'apis').length },
    { key: 'plugin_category', label: 'Category', value: 'files', count: dataSources.filter(d => d.plugin_category === 'files').length },
    { key: 'plugin_category', label: 'Category', value: 'cloud_databases', count: dataSources.filter(d => d.plugin_category === 'cloud_databases').length },
    { key: 'status', label: 'Status', value: 'connected', count: dataSources.filter(d => d.status === 'connected').length },
    { key: 'status', label: 'Status', value: 'disconnected', count: dataSources.filter(d => d.status === 'disconnected').length },
    { key: 'status', label: 'Status', value: 'error', count: dataSources.filter(d => d.status === 'error').length },
  ];

  const sortOptions: SortOption[] = [
    { key: 'updated_at', label: 'Recently Updated', field: 'updated_at', direction: 'desc' },
    { key: 'created_at', label: 'Recently Created', field: 'created_at', direction: 'desc' },
    { key: 'name', label: 'Name (A-Z)', field: 'name', direction: 'asc' },
    { key: 'plugin_name', label: 'Plugin Name', field: 'plugin_name', direction: 'asc' },
    { key: 'last_tested', label: 'Recently Tested', field: 'last_tested', direction: 'desc' },
  ];

  const tableColumns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (dataSource: DataSource) => (
        <Box>
          <Typography variant="subtitle2">
            {dataSource.display_name || dataSource.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dataSource.description || 'No description'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'plugin_name',
      label: 'Plugin',
      align: 'center',
      render: (dataSource: DataSource) => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
          {getPluginIcon(dataSource.plugin_name, dataSource.plugin_category)}
          <Typography variant="body2">
            {dataSource.plugin_name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'plugin_category',
      label: 'Category',
      align: 'center',
      render: (dataSource: DataSource) => (
        <Chip
          label={dataSource.plugin_category}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (dataSource: DataSource) => (
        <Chip
          icon={getStatusIcon(dataSource.status)}
          label={dataSource.status}
          size="small"
          color={getStatusColor(dataSource.status) as any}
        />
      ),
    },
    {
      key: 'last_tested',
      label: 'Last Tested',
      render: (dataSource: DataSource) => (
        <Typography variant="body2" color="text.secondary">
          {dataSource.last_tested
            ? new Date(dataSource.last_tested).toLocaleDateString()
            : 'Never'
          }
        </Typography>
      ),
    },
  ];

  const itemActions: ListAction[] = [
    {
      key: 'view',
      label: 'View Data Source',
      icon: <Visibility />,
      onClick: (dataSource: DataSource) => {
        router.push(`/builder/datasources/${dataSource.id}`);
      },
    },
    {
      key: 'test',
      label: 'Test Connection',
      icon: <CheckCircle />,
      onClick: (dataSource: DataSource) => {
        testConnection(dataSource.id);
      },
      show: () => hasPermission('datasource.test'),
    },
    {
      key: 'edit',
      label: 'Edit Data Source',
      icon: <Edit />,
      onClick: (dataSource: DataSource) => {
        router.push(`/builder/datasources/${dataSource.id}/edit`);
      },
      show: () => hasPermission('datasource.update'),
    },
    {
      key: 'delete',
      label: 'Delete Data Source',
      icon: <Delete />,
      color: 'error',
      onClick: (dataSource: DataSource) => {
        if (confirm(`Are you sure you want to delete "${dataSource.display_name || dataSource.name}"?`)) {
          deleteDataSource(dataSource.id);
        }
      },
      show: () => hasPermission('datasource.delete'),
    },
  ];

  const bulkActions: ListAction[] = [
    {
      key: 'test_bulk',
      label: 'Test Selected',
      icon: <CheckCircle />,
      color: 'primary',
      onClick: (dataSourceIds: string[]) => {
        dataSourceIds.forEach(id => testConnection(id));
      },
    },
    {
      key: 'delete_bulk',
      label: 'Delete Selected',
      icon: <Delete />,
      color: 'error',
      onClick: (dataSourceIds: string[]) => {
        if (confirm(`Are you sure you want to delete ${dataSourceIds.length} data sources?`)) {
          dataSourceIds.forEach(id => deleteDataSource(id));
        }
      },
    },
  ];

  // Render functions for different view modes
  const renderGridItem = (dataSource: DataSource, isSelected?: boolean) => (
    <Card
      sx={{
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.light',
        },
      }}
      onClick={() => onDataSourceSelect?.(dataSource)}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            {getPluginIcon(dataSource.plugin_name, dataSource.plugin_category)}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6" noWrap>
              {dataSource.display_name || dataSource.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dataSource.plugin_name}
            </Typography>
          </Box>
          <IconButton size="small">
            <MoreVert />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.5em',
            mb: 2,
          }}
        >
          {dataSource.description || 'No description available'}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          <Chip
            label={dataSource.plugin_category}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={getStatusIcon(dataSource.status)}
            label={dataSource.status}
            size="small"
            color={getStatusColor(dataSource.status) as any}
          />
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
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
  );

  const renderListItem = (dataSource: DataSource, isSelected?: boolean) => (
    <ListItem
      key={dataSource.id}
      button
      selected={isSelected}
      onClick={() => onDataSourceSelect?.(dataSource)}
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
                color={getStatusColor(dataSource.status) as any}
              />
              <Typography variant="caption" color="text.secondary">
                Updated {new Date(dataSource.updated_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <IconButton edge="end">
          <MoreVert />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );

  return (
    <List<DataSource>
      items={dataSources}
      loading={loading}
      error={error}
      title="Data Sources"
      emptyMessage="No data sources found. Connect your first data source to get started."
      viewMode={viewMode}
      supportedViewModes={['grid', 'list', 'table']}
      selectionMode={selectionMode}
      selectedItems={selectedDataSources}
      onSelectionChange={onSelectionChange}
      getItemId={(dataSource) => dataSource.id}
      searchPlaceholder="Search data sources..."
      searchFields={['name', 'display_name', 'description', 'plugin_name']}
      filters={filters}
      sortOptions={sortOptions}
      tableColumns={tableColumns}
      itemActions={itemActions}
      bulkActions={selectionMode ? bulkActions : []}
      primaryAction={
        showCreateButton
          ? {
              label: 'Connect Data Source',
              icon: <Add />,
              onClick: () => router.push('/builder/datasources/create'),
              show: hasPermission('datasource.create'),
            }
          : undefined
      }
      renderGridItem={renderGridItem}
      renderListItem={renderListItem}
      onItemClick={onDataSourceSelect}
    />
  );
};

export default DataSourceList;