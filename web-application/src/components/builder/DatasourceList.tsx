// =============================================================================
// web-application/src/components/builder/DatasourceList.tsx  
// =============================================================================

import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Chip,
  Avatar,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import {
  Storage,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataSources } from '@/hooks/useDataSources';
import CommonTableLayout, { 
  BaseListItem, 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface DatasourceListItem extends BaseListItem {
  plugin_id: string;
  plugin_name: string;
  connection_config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  last_connection_test?: string;
  error_message?: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface DatasourceListProps {
  onDataSourceSelect?: (dataSource: DatasourceListItem) => void;
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDataSources?: string[];
  onSelectionChange?: (dataSourceIds: string[]) => void;
  filterByPlugin?: string;
}

const DatasourceList: React.FC<DatasourceListProps> = ({
  onDataSourceSelect,
  showCreateButton = true,
  selectionMode = false,
  selectedDataSources = [],
  onSelectionChange,
  filterByPlugin
}) => {
  const router = useRouter();
  const { workspace, user } = useAuth();
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

  const datasourceItems: DatasourceListItem[] = useMemo(() => {
    return dataSources.map(ds => ({
      id: ds.id,
      name: ds.name,
      display_name: ds.display_name,
      description: ds.description,
      created_at: ds.created_at,
      updated_at: ds.updated_at,
      workspace_id: ds.workspace_id,
      plugin_id: ds.plugin_id,
      plugin_name: ds.plugin_name,
      connection_config: ds.connection_config,
      status: ds.status,
      last_connection_test: ds.last_connection_test,
      error_message: ds.error_message,
      owner_id: ds.owner_id,
      owner: ds.owner
    }));
  }, [dataSources]);

  const filteredDataSources = useMemo(() => {
    if (!filterByPlugin) return datasourceItems;
    return datasourceItems.filter(ds => ds.plugin_id === filterByPlugin);
  }, [datasourceItems, filterByPlugin]);

  const getPluginIcon = (pluginName: string) => {
    // You can customize these icons based on actual plugins
    return <Storage />;
  };

  const columns: TableColumn<DatasourceListItem>[] = [
    {
      key: 'name',
      label: 'Data Source',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'success.main' }}>
            {getPluginIcon(item.plugin_name)}
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
      label: 'Plugin',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.plugin_name}
          size="small"
          color="info"
          variant="outlined"
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          {item.status === 'connected' && <CheckCircle color="success" fontSize="small" />}
          {item.status === 'disconnected' && <Pause color="warning" fontSize="small" />}
          {item.status === 'error' && <ErrorIcon color="error" fontSize="small" />}
          <Chip
            label={item.status}
            size="small"
            color={
              item.status === 'connected' ? 'success' :
              item.status === 'error' ? 'error' : 'warning'
            }
            variant="outlined"
          />
        </Box>
      )
    },
    {
      key: 'last_connection_test',
      label: 'Last Test',
      sortable: true,
      render: (item) => (
        <Typography variant="body2" color="textSecondary">
          {item.last_connection_test 
            ? new Date(item.last_connection_test).toLocaleDateString()
            : 'Never'
          }
        </Typography>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar src={item.owner?.email} sx={{ width: 24, height: 24 }}>
            {item.owner?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">
            {item.owner?.name || 'Unknown'}
          </Typography>
        </Box>
      )
    }
  ];

  const actions: TableAction<DatasourceListItem>[] = [
    {
      label: 'Test Connection',
      icon: <PlayArrow fontSize="small" />,
      onClick: (item) => testConnection(item.id),
      show: (item) => hasPermission('datasource.test') && item.status !== 'testing',
      color: 'info'
    },
    {
      label: 'Edit Data Source',
      icon: <Edit fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/datasource-builder?id=${item.id}`);
      },
      show: (item) => hasPermission('datasource.update') && 
        (item.owner_id === user?.id || hasPermission('datasource.admin')),
      color: 'default'
    },
    {
      label: 'Delete Data Source',
      icon: <Delete fontSize="small" />,
      onClick: (item) => {
        if (window.confirm(`Are you sure you want to delete "${item.display_name || item.name}"?`)) {
          deleteDataSource(item.id);
        }
      },
      show: (item) => hasPermission('datasource.delete') && 
        (item.owner_id === user?.id || hasPermission('datasource.admin')),
      color: 'error'
    }
  ];

  const filterOptions: FilterOption[] = [
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
      key: 'plugin_name',
      label: 'Plugin',
      options: [
        { value: 'PostgreSQL', label: 'PostgreSQL' },
        { value: 'MySQL', label: 'MySQL' },
        { value: 'MongoDB', label: 'MongoDB' },
        { value: 'SQLite', label: 'SQLite' }
      ]
    }
  ];

  const handleCreateDataSource = () => {
    router.push(`/workspace/${workspace?.slug}/datasource-builder`);
  };

  return (
    <PermissionGate permissions={['datasource.read']}>
      <CommonTableLayout<DatasourceListItem>
        data={filteredDataSources}
        loading={loading}
        error={error}
        title="Data Source List"
        subtitle={`${filteredDataSources.length} data source${filteredDataSources.length !== 1 ? 's' : ''} in workspace`}
        columns={columns}
        actions={actions}
        searchable={true}
        searchPlaceholder="Search data sources..."
        filters={filterOptions}
        selectable={selectionMode}
        selectedItems={selectedDataSources}
        onSelectionChange={onSelectionChange}
        pagination={true}
        itemsPerPage={25}
        showCreateButton={showCreateButton && hasPermission('datasource.create')}
        createButtonLabel="Create Data Source"
        onCreateClick={handleCreateDataSource}
        onRefresh={refreshDataSources}
      />
    </PermissionGate>
  );
};
export { DatasourceList };