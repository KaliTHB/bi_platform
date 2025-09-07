// =============================================================================
// web-application/src/components/builder/DatasetList.tsx
// =============================================================================

import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Chip,
  Avatar,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import {
  TableChart,
  Transform,
  QueryStats,
  Edit,
  Delete,
  Visibility,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDatasets } from '@/hooks/useDatasets';
import CommonTableLayout, { 
  BaseListItem, 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface DatasetListItem extends BaseListItem {
  type: 'table' | 'query' | 'transformation';
  status: 'active' | 'inactive' | 'error' | 'refreshing';
  row_count_estimate?: number;
  last_refreshed?: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  datasource_id?: string;
  query_config?: Record<string, any>;
  transformation_config?: Record<string, any>;
}

interface DatasetListProps {
  onDatasetSelect?: (dataset: DatasetListItem) => void;
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDatasets?: string[];
  onSelectionChange?: (datasetIds: string[]) => void;
  filterByType?: string;
}

const DatasetList: React.FC<DatasetListProps> = ({
  onDatasetSelect,
  showCreateButton = true,
  selectionMode = false,
  selectedDatasets = [],
  onSelectionChange,
  filterByType
}) => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();
  const {
    datasets,
    loading,
    error,
    createDataset,
    updateDataset,
    deleteDataset,
    refreshDataset,
    refreshDatasets
  } = useDatasets();

  const datasetItems: DatasetListItem[] = useMemo(() => {
    return datasets.map(dataset => ({
      id: dataset.id,
      name: dataset.name,
      display_name: dataset.display_name,
      description: dataset.description,
      created_at: dataset.created_at,
      updated_at: dataset.updated_at,
      workspace_id: dataset.workspace_id,
      type: dataset.type,
      status: dataset.status,
      row_count_estimate: dataset.row_count_estimate,
      last_refreshed: dataset.last_refreshed,
      owner_id: dataset.owner_id,
      owner: dataset.owner,
      datasource_id: dataset.datasource_id,
      query_config: dataset.query_config,
      transformation_config: dataset.transformation_config
    }));
  }, [datasets]);

  const filteredDatasets = useMemo(() => {
    if (!filterByType) return datasetItems;
    return datasetItems.filter(dataset => dataset.type === filterByType);
  }, [datasetItems, filterByType]);

  const getDatasetIcon = (type: string) => {
    switch (type) {
      case 'table': return <TableChart />;
      case 'query': return <QueryStats />;
      case 'transformation': return <Transform />;
      default: return <TableChart />;
    }
  };

  const columns: TableColumn<DatasetListItem>[] = [
    {
      key: 'name',
      label: 'Dataset',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'info.main' }}>
            {getDatasetIcon(item.type)}
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
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          size="small"
          color={
            item.type === 'table' ? 'primary' :
            item.type === 'query' ? 'info' : 'secondary'
          }
          variant="outlined"
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <Box>
          <Chip
            label={item.status}
            size="small"
            color={
              item.status === 'active' ? 'success' :
              item.status === 'error' ? 'error' : 'default'
            }
            variant="outlined"
          />
          {item.status === 'refreshing' && (
            <LinearProgress sx={{ mt: 1 }} size="small" />
          )}
        </Box>
      )
    },
    {
      key: 'row_count_estimate',
      label: 'Rows',
      sortable: true,
      align: 'right',
      render: (item) => (
        <Typography variant="body2">
          {item.row_count_estimate ? item.row_count_estimate.toLocaleString() : '-'}
        </Typography>
      )
    },
    {
      key: 'last_refreshed',
      label: 'Last Refreshed',
      sortable: true,
      render: (item) => (
        <Typography variant="body2" color="textSecondary">
          {item.last_refreshed 
            ? new Date(item.last_refreshed).toLocaleDateString()
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

  const actions: TableAction<DatasetListItem>[] = [
    {
      label: 'View Dataset',
      icon: <Visibility fontSize="small" />,
      onClick: (item) => {
        if (onDatasetSelect) {
          onDatasetSelect(item);
        } else {
          router.push(`/workspace/${workspace?.slug}/dataset/${item.id}`);
        }
      },
      color: 'primary'
    },
    {
      label: 'Refresh Dataset',
      icon: <Refresh fontSize="small" />,
      onClick: (item) => refreshDataset(item.id),
      show: (item) => hasPermission('dataset.update') && item.status !== 'refreshing',
      color: 'info'
    },
    {
      label: 'Edit Dataset',
      icon: <Edit fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/dataset-builder?id=${item.id}`);
      },
      show: (item) => hasPermission('dataset.update') && 
        (item.owner_id === user?.id || hasPermission('dataset.admin')),
      color: 'default'
    },
    {
      label: 'Delete Dataset',
      icon: <Delete fontSize="small" />,
      onClick: (item) => {
        if (window.confirm(`Are you sure you want to delete "${item.display_name || item.name}"?`)) {
          deleteDataset(item.id);
        }
      },
      show: (item) => hasPermission('dataset.delete') && 
        (item.owner_id === user?.id || hasPermission('dataset.admin')),
      color: 'error'
    }
  ];

  const filterOptions: FilterOption[] = [
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
        { value: 'error', label: 'Error' },
        { value: 'refreshing', label: 'Refreshing' }
      ]
    }
  ];

  const handleCreateDataset = () => {
    router.push(`/workspace/dataset-builder`);
  };

  return (
    <PermissionGate permissions={['dataset.read']}>
      <CommonTableLayout<DatasetListItem>
        data={filteredDatasets}
        loading={loading}
        error={error as any}
        title="Dataset List"
        subtitle={`${filteredDatasets.length} dataset${filteredDatasets.length !== 1 ? 's' : ''} in workspace`}
        columns={columns}
        actions={actions}
        searchable={true}
        searchPlaceholder="Search datasets..."
        filters={filterOptions}
        selectable={selectionMode}
        selectedItems={selectedDatasets}
        onSelectionChange={onSelectionChange}
        pagination={true}
        itemsPerPage={25}
        showCreateButton={showCreateButton && hasPermission('dataset.create')}
        createButtonLabel="Create Dataset"
        onCreateClick={handleCreateDataset}
        onRefresh={refreshDatasets}
      />
    </PermissionGate>
  );
};

export { DatasetList };