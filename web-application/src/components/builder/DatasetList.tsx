// web-application/src/components/builder/DatasetList.tsx
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
  Visibility,
  Storage,
  MoreVert,
  TableChart,
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDatasets } from '@/hooks/useDatasets';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';
import { List, FilterOption, SortOption, TableColumn, ListAction } from '@/components/shared/List';

// Types
interface Dataset {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  type: 'table' | 'query' | 'transformation';
  status: 'active' | 'inactive' | 'error' | 'refreshing';
  row_count_estimate?: number;
  last_refreshed?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  workspace_id: string;
}

interface DatasetListProps {
  onDatasetSelect?: (dataset: Dataset) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDatasets?: string[];
  onSelectionChange?: (datasetIds: string[]) => void;
  filterByType?: string;
}

export const DatasetList: React.FC<DatasetListProps> = ({
  onDatasetSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDatasets = [],
  onSelectionChange,
  filterByType,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { 
    datasets, 
    loading, 
    error,
    createDataset, 
    updateDataset,
    deleteDataset,
    refreshDataset,
  } = useDatasets();

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      case 'refreshing': return 'warning';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <TableChart />;
      case 'query': return <Storage />;
      case 'transformation': return <Edit />;
      default: return <TableChart />;
    }
  };

  // Configuration for the List component
  const filters: FilterOption[] = [
    { key: 'type', label: 'Type', value: 'table', count: datasets.filter(d => d.type === 'table').length },
    { key: 'type', label: 'Type', value: 'query', count: datasets.filter(d => d.type === 'query').length },
    { key: 'type', label: 'Type', value: 'transformation', count: datasets.filter(d => d.type === 'transformation').length },
    { key: 'status', label: 'Status', value: 'active', count: datasets.filter(d => d.status === 'active').length },
    { key: 'status', label: 'Status', value: 'inactive', count: datasets.filter(d => d.status === 'inactive').length },
    { key: 'status', label: 'Status', value: 'error', count: datasets.filter(d => d.status === 'error').length },
  ];

  const sortOptions: SortOption[] = [
    { key: 'updated_at', label: 'Recently Updated', field: 'updated_at', direction: 'desc' },
    { key: 'created_at', label: 'Recently Created', field: 'created_at', direction: 'desc' },
    { key: 'name', label: 'Name (A-Z)', field: 'name', direction: 'asc' },
    { key: 'row_count', label: 'Row Count', field: 'row_count_estimate', direction: 'desc' },
  ];

  const tableColumns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (dataset: Dataset) => (
        <Box>
          <Typography variant="subtitle2">
            {dataset.display_name || dataset.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dataset.description || 'No description'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      align: 'center',
      render: (dataset: Dataset) => (
        <Chip
          icon={getTypeIcon(dataset.type)}
          label={dataset.type}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      key: 'row_count_estimate',
      label: 'Rows',
      align: 'right',
      render: (dataset: Dataset) => (
        <Typography variant="body2">
          {dataset.row_count_estimate ? dataset.row_count_estimate.toLocaleString() : 'Unknown'}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (dataset: Dataset) => (
        <Chip
          label={dataset.status}
          size="small"
          color={getStatusColor(dataset.status) as any}
        />
      ),
    },
    {
      key: 'last_refreshed',
      label: 'Last Refreshed',
      render: (dataset: Dataset) => (
        <Typography variant="body2" color="text.secondary">
          {dataset.last_refreshed
            ? new Date(dataset.last_refreshed).toLocaleDateString()
            : 'Never'
          }
        </Typography>
      ),
    },
  ];

  const itemActions: ListAction[] = [
    {
      key: 'view',
      label: 'View Dataset',
      icon: <Visibility />,
      onClick: (dataset: Dataset) => {
        router.push(`/builder/datasets/${dataset.id}`);
      },
    },
    {
      key: 'edit',
      label: 'Edit Dataset',
      icon: <Edit />,
      onClick: (dataset: Dataset) => {
        router.push(`/builder/datasets/${dataset.id}/edit`);
      },
      show: () => hasPermission('dataset.update'),
    },
    {
      key: 'refresh',
      label: 'Refresh Data',
      icon: <Storage />,
      onClick: (dataset: Dataset) => {
        refreshDataset(dataset.id);
      },
      show: (dataset: Dataset) => hasPermission('dataset.refresh') && dataset.type !== 'transformation',
    },
    {
      key: 'delete',
      label: 'Delete Dataset',
      icon: <Delete />,
      color: 'error',
      onClick: (dataset: Dataset) => {
        if (confirm(`Are you sure you want to delete "${dataset.display_name || dataset.name}"?`)) {
          deleteDataset(dataset.id);
        }
      },
      show: () => hasPermission('dataset.delete'),
    },
  ];

  const bulkActions: ListAction[] = [
    {
      key: 'delete_bulk',
      label: 'Delete Selected',
      icon: <Delete />,
      color: 'error',
      onClick: (datasetIds: string[]) => {
        if (confirm(`Are you sure you want to delete ${datasetIds.length} datasets?`)) {
          datasetIds.forEach(id => deleteDataset(id));
        }
      },
    },
  ];

  // Render functions for different view modes
  const renderGridItem = (dataset: Dataset, isSelected?: boolean) => (
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
      onClick={() => onDatasetSelect?.(dataset)}
    >
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            {getTypeIcon(dataset.type)}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6" noWrap>
              {dataset.display_name || dataset.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dataset.type}
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
          {dataset.description || 'No description available'}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Chip
            label={dataset.status}
            size="small"
            color={getStatusColor(dataset.status) as any}
          />
          <Typography variant="caption" color="text.secondary">
            {dataset.row_count_estimate ? `${dataset.row_count_estimate.toLocaleString()} rows` : 'Unknown rows'}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Updated {new Date(dataset.updated_at).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );

  const renderListItem = (dataset: Dataset, isSelected?: boolean) => (
    <ListItem
      key={dataset.id}
      button
      selected={isSelected}
      onClick={() => onDatasetSelect?.(dataset)}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {getTypeIcon(dataset.type)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={dataset.display_name || dataset.name}
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {dataset.description || 'No description'}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={dataset.type}
                size="small"
                variant="outlined"
              />
              <Chip
                label={dataset.status}
                size="small"
                color={getStatusColor(dataset.status) as any}
              />
              <Typography variant="caption" color="text.secondary">
                {dataset.row_count_estimate ? `${dataset.row_count_estimate.toLocaleString()} rows` : 'Unknown rows'}
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
    <List<Dataset>
      items={datasets}
      loading={loading}
      error={error}
      title="Datasets"
      emptyMessage="No datasets found. Create your first dataset to get started."
      viewMode={viewMode}
      supportedViewModes={['grid', 'list', 'table']}
      selectionMode={selectionMode}
      selectedItems={selectedDatasets}
      onSelectionChange={onSelectionChange}
      getItemId={(dataset) => dataset.id}
      searchPlaceholder="Search datasets..."
      searchFields={['name', 'display_name', 'description']}
      filters={filters}
      sortOptions={sortOptions}
      tableColumns={tableColumns}
      itemActions={itemActions}
      bulkActions={selectionMode ? bulkActions : []}
      primaryAction={
        showCreateButton
          ? {
              label: 'Create Dataset',
              icon: <Add />,
              onClick: () => router.push('/builder/datasets/create'),
              show: hasPermission('dataset.create'),
            }
          : undefined
      }
      renderGridItem={renderGridItem}
      renderListItem={renderListItem}
      onItemClick={onDatasetSelect}
    />
  );
};

export default DatasetList;