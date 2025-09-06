// web-application/src/pages/workspace/datasets.tsx
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
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Dataset as DatasetIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow as QueryIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Storage as StorageIcon
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

interface DatasetListItem extends BaseListItem {
  datasource_id: string;
  datasource_name: string;
  type: 'table' | 'query' | 'view' | 'file';
  query: string;
  columns_info: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
  row_count?: number;
  size_bytes?: number;
  last_refreshed?: string;
  refresh_status: 'pending' | 'running' | 'success' | 'error';
  is_active: boolean;
  version: number;
  schema_name?: string;
  refresh_interval?: number;
  chart_count: number;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

const DatasetsPage: React.FC = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [datasources, setDatasources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [refreshingDataset, setRefreshingDataset] = useState<string | null>(null);
  const [newDataset, setNewDataset] = useState({
    name: '',
    display_name: '',
    description: '',
    datasource_id: '',
    type: 'table' as const,
    query: '',
    is_active: true
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
          setDatasets([
            {
              id: '1',
              name: 'sales_orders',
              display_name: 'Sales Orders',
              description: 'Daily sales order data with customer information',
              datasource_id: 'ds1',
              datasource_name: 'Main Database',
              type: 'table',
              query: 'SELECT * FROM sales_orders',
              columns_info: [
                { name: 'order_id', type: 'uuid', nullable: false },
                { name: 'customer_id', type: 'uuid', nullable: false },
                { name: 'order_date', type: 'date', nullable: false },
                { name: 'total_amount', type: 'decimal', nullable: false },
                { name: 'status', type: 'varchar', nullable: false }
              ],
              row_count: 15420,
              size_bytes: 2048000,
              last_refreshed: '2024-01-15T10:30:00Z',
              refresh_status: 'success',
              is_active: true,
              version: 3,
              schema_name: 'public',
              refresh_interval: 3600,
              chart_count: 8,
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
              name: 'customer_analytics',
              display_name: 'Customer Analytics View',
              description: 'Aggregated customer metrics and behavior data',
              datasource_id: 'ds1',
              datasource_name: 'Main Database',
              type: 'query',
              query: `SELECT 
                c.customer_id,
                c.customer_name,
                COUNT(o.order_id) as order_count,
                SUM(o.total_amount) as total_spent,
                MAX(o.order_date) as last_order_date
              FROM customers c
              LEFT JOIN sales_orders o ON c.customer_id = o.customer_id
              WHERE o.order_date >= CURRENT_DATE - INTERVAL '365 days'
              GROUP BY c.customer_id, c.customer_name`,
              columns_info: [
                { name: 'customer_id', type: 'uuid', nullable: false },
                { name: 'customer_name', type: 'varchar', nullable: false },
                { name: 'order_count', type: 'bigint', nullable: true },
                { name: 'total_spent', type: 'decimal', nullable: true },
                { name: 'last_order_date', type: 'date', nullable: true }
              ],
              row_count: 8934,
              size_bytes: 456000,
              last_refreshed: '2024-01-14T15:45:00Z',
              refresh_status: 'error',
              is_active: true,
              version: 2,
              refresh_interval: 7200,
              chart_count: 5,
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
              name: 'product_catalog',
              display_name: 'Product Catalog',
              description: 'Complete product information and inventory',
              datasource_id: 'ds2',
              datasource_name: 'Analytics DB',
              type: 'view',
              query: 'SELECT * FROM products_view',
              columns_info: [
                { name: 'product_id', type: 'uuid', nullable: false },
                { name: 'product_name', type: 'varchar', nullable: false },
                { name: 'category', type: 'varchar', nullable: false },
                { name: 'price', type: 'decimal', nullable: false },
                { name: 'inventory_count', type: 'integer', nullable: true }
              ],
              row_count: 2156,
              size_bytes: 128000,
              last_refreshed: '2024-01-15T09:00:00Z',
              refresh_status: 'running',
              is_active: true,
              version: 1,
              schema_name: 'catalog',
              chart_count: 3,
              created_at: '2024-01-12T00:00:00Z',
              updated_at: '2024-01-15T09:00:00Z',
              owner: {
                id: 'user3',
                name: 'Mike Johnson',
                email: 'mike@company.com'
              }
            }
          ]);

          setDatasources([
            { id: 'ds1', name: 'Main Database', type: 'postgresql' },
            { id: 'ds2', name: 'Analytics DB', type: 'mysql' },
            { id: 'ds3', name: 'Sales API', type: 'rest' }
          ]);

          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching datasets:', error);
        setLoading(false);
      }
    };

    if (workspace) {
      fetchDatasets();
    }
  }, [workspace]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <StorageIcon />;
      case 'query': return <QueryIcon />;
      case 'view': return <DatasetIcon />;
      case 'file': return <DatasetIcon />;
      default: return <DatasetIcon />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckIcon color="success" fontSize="small" />;
      case 'error': return <ErrorIcon color="error" fontSize="small" />;
      case 'running': return <CircularProgress size={16} />;
      case 'pending': return <ScheduleIcon color="warning" fontSize="small" />;
      default: return <WarningIcon color="disabled" fontSize="small" />;
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num?: number) => {
    if (!num) return 'Unknown';
    return new Intl.NumberFormat().format(num);
  };

  const columns: TableColumn<DatasetListItem>[] = [
    {
      key: 'name',
      label: 'Dataset',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'secondary.main' }}>
            {getTypeIcon(item.type)}
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
          label={item.type}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      key: 'datasource_name',
      label: 'Data Source',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">
          {item.datasource_name}
        </Typography>
      )
    },
    {
      key: 'row_count',
      label: 'Records',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">
          {formatNumber(item.row_count)}
        </Typography>
      )
    },
    {
      key: 'size_bytes',
      label: 'Size',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">
          {formatBytes(item.size_bytes)}
        </Typography>
      )
    },
    {
      key: 'refresh_status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          {refreshingDataset === item.id ? (
            <CircularProgress size={16} />
          ) : (
            getStatusIcon(item.refresh_status)
          )}
          <Typography variant="body2" color={
            item.refresh_status === 'success' ? 'success.main' :
            item.refresh_status === 'error' ? 'error.main' :
            item.refresh_status === 'running' ? 'info.main' : 'text.secondary'
          }>
            {item.refresh_status === 'success' ? 'Fresh' :
             item.refresh_status === 'error' ? 'Error' :
             item.refresh_status === 'running' ? 'Running' : 'Pending'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'chart_count',
      label: 'Charts',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">
          {item.chart_count}
        </Typography>
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

  const handleRefreshDataset = async (datasetId: string) => {
    setRefreshingDataset(datasetId);
    try {
      // Simulate API call to refresh dataset
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update the dataset status
      setDatasets(prev => prev.map(ds => 
        ds.id === datasetId 
          ? { ...ds, refresh_status: 'success' as const, last_refreshed: new Date().toISOString() }
          : ds
      ));
    } catch (error) {
      setDatasets(prev => prev.map(ds => 
        ds.id === datasetId 
          ? { ...ds, refresh_status: 'error' as const }
          : ds
      ));
    } finally {
      setRefreshingDataset(null);
    }
  };

  const actions: TableAction<DatasetListItem>[] = [
    {
      label: 'Query',
      icon: <QueryIcon fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/sql-editor?dataset=${item.id}`);
      },
      requiresPermission: 'dataset.query'
    },
    {
      label: 'Refresh',
      icon: <RefreshIcon fontSize="small" />,
      onClick: (item) => handleRefreshDataset(item.id),
      requiresPermission: 'dataset.refresh'
    },
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/datasets/${item.id}/edit`);
      },
      requiresPermission: 'dataset.update'
    },
    {
      label: 'Schedule',
      icon: <ScheduleIcon fontSize="small" />,
      onClick: (item) => {
        console.log('Schedule refresh for:', item.id);
      },
      requiresPermission: 'dataset.schedule'
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (item) => {
        if (confirm(`Are you sure you want to delete "${item.display_name}"? This will also remove all associated charts.`)) {
          console.log('Delete dataset:', item.id);
        }
      },
      requiresPermission: 'dataset.delete',
      color: 'error'
    }
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'table', label: 'Table' },
        { value: 'query', label: 'Query' },
        { value: 'view', label: 'View' },
        { value: 'file', label: 'File' }
      ]
    },
    {
      key: 'datasource_id',
      label: 'Data Source',
      type: 'select',
      options: datasources.map(ds => ({
        value: ds.id,
        label: ds.name
      }))
    },
    {
      key: 'refresh_status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'success', label: 'Fresh' },
        { value: 'error', label: 'Error' },
        { value: 'running', label: 'Running' },
        { value: 'pending', label: 'Pending' }
      ]
    }
  ];

  const handleCreateDataset = async () => {
    try {
      // Handle create logic
      console.log('Create dataset:', newDataset);
      setCreateDialogOpen(false);
      setNewDataset({
        name: '',
        display_name: '',
        description: '',
        datasource_id: '',
        type: 'table',
        query: '',
        is_active: true
      });
    } catch (error) {
      console.error('Error creating dataset:', error);
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
              Datasets
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Manage your data models and transformations
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<QueryIcon />}
              onClick={() => router.push(`/workspace/sql-editor`)}
            >
              SQL Editor
            </Button>
            <PermissionGate permissions={['dataset.read']}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Dataset
              </Button>
            </PermissionGate>
          </Box>
        </Box>

        <CommonTableLayout
          data={datasets}
          columns={columns}
          actions={actions}
          filterOptions={filterOptions}
          loading={loading}
          searchPlaceholder="Search datasets..."
          emptyMessage="No datasets found. Create your first dataset to get started."
          onRowClick={(item) => router.push(`/workspace/${workspace?.slug}/datasets/${item.id}`)}
        />

        {/* Create Dataset Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Dataset</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                autoFocus
                label="Name"
                fullWidth
                value={newDataset.name}
                onChange={(e) => setNewDataset({...newDataset, name: e.target.value})}
                helperText="Unique identifier for this dataset"
              />
              <TextField
                label="Display Name"
                fullWidth
                value={newDataset.display_name}
                onChange={(e) => setNewDataset({...newDataset, display_name: e.target.value})}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={newDataset.description}
                onChange={(e) => setNewDataset({...newDataset, description: e.target.value})}
              />
              <FormControl fullWidth>
                <InputLabel>Data Source</InputLabel>
                <Select
                  value={newDataset.datasource_id}
                  onChange={(e) => setNewDataset({...newDataset, datasource_id: e.target.value})}
                >
                  {datasources.map(ds => (
                    <MenuItem key={ds.id} value={ds.id}>
                      {ds.name} ({ds.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newDataset.type}
                  onChange={(e) => setNewDataset({...newDataset, type: e.target.value as any})}
                >
                  <MenuItem value="table">Table</MenuItem>
                  <MenuItem value="query">Custom Query</MenuItem>
                  <MenuItem value="view">Database View</MenuItem>
                  <MenuItem value="file">File Upload</MenuItem>
                </Select>
              </FormControl>
              
              {newDataset.type === 'query' && (
                <TextField
                  label="SQL Query"
                  fullWidth
                  multiline
                  rows={4}
                  value={newDataset.query}
                  onChange={(e) => setNewDataset({...newDataset, query: e.target.value})}
                  placeholder="SELECT * FROM your_table WHERE condition..."
                />
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={newDataset.is_active}
                    onChange={(e) => setNewDataset({...newDataset, is_active: e.target.checked})}
                  />
                }
                label="Active"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateDataset}
              variant="contained"
              disabled={!newDataset.name || !newDataset.datasource_id}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default DatasetsPage;