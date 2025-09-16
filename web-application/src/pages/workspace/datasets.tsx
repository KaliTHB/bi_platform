// web-application/src/pages/workspace/datasets.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Chip
} from '@mui/material';
import { 
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

// Use existing components
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { CommonTableLayout, TableColumn, TableAction } from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

// Use existing hooks
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import useDatasets from '@/hooks/useDatasets'; // ✅ Use existing hook for live data

// ============================================================================
// INTERFACES (Updated to match API response)
// ============================================================================

interface DatasetData {
  id: string;
  workspace_id: string;
  name: string;
  display_name?: string;
  description?: string;
  type: 'table' | 'query' | 'transformation' | 'view';
  status: string;
  refresh_status?: string;
  datasource_ids: string[];
  datasource_names?: string[];
  parent_dataset_ids?: string[];
  base_query?: string;
  cache_ttl?: number;
  refresh_schedule?: {
    enabled: boolean;
    cron_expression?: string;
    next_run?: string;
  };
  last_refreshed?: string;
  last_query_time?: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  metadata_json?: {
    tags?: string[];
    documentation?: string;
    quality_score?: number;
  };
  usage_stats?: {
    chart_count: number;
    dashboard_count: number;
    query_count: number;
    last_used?: string;
    daily_queries?: number;
    weekly_queries?: number;
  };
  data_quality?: {
    completeness_score: number;
    accuracy_score: number;
    consistency_score: number;
    last_checked?: string;
  };
}

interface DatasetFormData {
  name: string;
  display_name: string;
  description: string;
  type: 'table' | 'query' | 'transformation' | 'view';
  datasource_ids: string[];
  parent_dataset_ids: string[];
  base_query: string;
  cache_ttl: number;
  is_active: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DatasetsPage: NextPage = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  // ✅ USE EXISTING HOOK FOR LIVE DATA (instead of local state)
  const {
    datasets,
    loading,
    error,
    createDataset,
    updateDataset,
    deleteDataset,
    refreshDataset,
    refreshDatasets,
    clearError
  } = useDatasets();

  // Local UI state (keep existing dialogs and forms)
  const [refreshingDatasets, setRefreshingDatasets] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<DatasetData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for editing (keep existing)
  const [formData, setFormData] = useState<DatasetFormData>({
    name: '',
    display_name: '',
    description: '',
    type: 'table',
    datasource_ids: [],
    parent_dataset_ids: [],
    base_query: '',
    cache_ttl: 3600,
    is_active: true
  });

  // ============================================================================
  // EXISTING HELPER FUNCTIONS (keep these)
  // ============================================================================

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num?: number) => {
    return num ? num.toLocaleString() : '0';
  };

  const getStatusColor = (status: string, isActive?: boolean) => {
    if (!isActive) return 'default';
    switch (status) {
      case 'active': return 'success';
      case 'error': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // ============================================================================
  // EVENT HANDLERS (updated to use live data)
  // ============================================================================

  const handleRefreshDataset = useCallback(async (datasetId: string) => {
    setRefreshingDatasets(prev => new Set(prev).add(datasetId));
    
    try {
      const success = await refreshDataset(datasetId);
      if (success) {
        console.log(`Dataset ${datasetId} refreshed successfully`);
      }
    } catch (error) {
      console.error('Failed to refresh dataset:', error);
    } finally {
      setRefreshingDatasets(prev => {
        const newSet = new Set(prev);
        newSet.delete(datasetId);
        return newSet;
      });
    }
  }, [refreshDataset]);

  const handleDeleteDataset = useCallback(async () => {
    if (!selectedDataset) return;
    
    setSubmitting(true);
    try {
      const success = await deleteDataset(selectedDataset.id);
      if (success) {
        setDeleteDialogOpen(false);
        setSelectedDataset(null);
        console.log('Dataset deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete dataset:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedDataset, deleteDataset]);

  const handleUpdateDataset = useCallback(async () => {
    if (!selectedDataset) return;
    
    setSubmitting(true);
    try {
      const updatedDataset = await updateDataset(selectedDataset.id, formData);
      if (updatedDataset) {
        setEditDialogOpen(false);
        setSelectedDataset(null);
        console.log('Dataset updated successfully');
      }
    } catch (error) {
      console.error('Failed to update dataset:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedDataset, formData, updateDataset]);

  const handleCreateDataset = useCallback(() => {
    // Navigate to dataset builder or open create dialog
    router.push(`/workspace/${workspace?.slug}/dataset-builder`);
  }, [router, workspace]);

  const handleRefresh = useCallback(async () => {
    await refreshDatasets();
  }, [refreshDatasets]);

  // ============================================================================
  // TABLE CONFIGURATION (keep existing structure)
  // ============================================================================

  const columns: TableColumn<DatasetData>[] = [
    {
      key: 'name',
      label: 'Dataset',
      sortable: true,
      render: (dataset) => (
        <Box>
          <Typography variant="subtitle2" fontWeight={600}>
            {dataset.display_name || dataset.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {dataset.description || 'No description'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (dataset) => (
        <Chip 
          label={dataset.type} 
          size="small" 
          variant="outlined"
          color="primary"
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (dataset) => (
        <Chip 
          label={dataset.is_active ? (dataset.status || 'Active') : 'Inactive'} 
          size="small" 
          color={getStatusColor(dataset.status || 'active', dataset.is_active)}
        />
      )
    },
    {
      key: 'datasource_names',
      label: 'Data Sources',
      render: (dataset) => (
        <Typography variant="body2">
          {dataset.datasource_names?.join(', ') || 'N/A'}
        </Typography>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (dataset) => (
        <Typography variant="body2">
          {formatDate(dataset.updated_at)}
        </Typography>
      )
    },
    {
      key: 'usage_stats',
      label: 'Usage',
      render: (dataset) => (
        dataset.usage_stats ? (
          <Box>
            <Typography variant="body2">
              Charts: {formatNumber(dataset.usage_stats.chart_count)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Queries: {formatNumber(dataset.usage_stats.query_count)}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">N/A</Typography>
        )
      )
    }
  ];

  const actions: TableAction<DatasetData>[] = [
    {
      label: 'View',
      icon: <ViewIcon />,
      onClick: (dataset) => router.push(`/workspace/${workspace?.slug}/datasets/${dataset.id}`),
      show: () => hasPermission('datasets:read')
    },
    {
      label: 'Refresh',
      icon: <RefreshIcon />,
      onClick: (dataset) => handleRefreshDataset(dataset.id),
      show: () => hasPermission('datasets:update'),
      disabled: (dataset) => refreshingDatasets.has(dataset.id)
    },
    {
      label: 'Edit',
      icon: <EditIcon />,
      onClick: (dataset) => {
        setSelectedDataset(dataset);
        setFormData({
          name: dataset.name,
          display_name: dataset.display_name || '',
          description: dataset.description || '',
          type: dataset.type,
          datasource_ids: dataset.datasource_ids || [],
          parent_dataset_ids: dataset.parent_dataset_ids || [],
          base_query: dataset.base_query || '',
          cache_ttl: dataset.cache_ttl || 3600,
          is_active: dataset.is_active
        });
        setEditDialogOpen(true);
      },
      show: () => hasPermission('datasets:update'),
      color: 'primary'
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
      onClick: (dataset) => {
        setSelectedDataset(dataset);
        setDeleteDialogOpen(true);
      },
      show: () => hasPermission('datasets:delete'),
      color: 'error'
    }
  ];

  // Filters for the table
  const filters = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'table', label: 'Table' },
        { value: 'query', label: 'Query' },
        { value: 'transformation', label: 'Transformation' },
        { value: 'view', label: 'View' }
      ]
    },
    {
      key: 'status',
      label: 'Status', 
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Datasets
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your data sources and create datasets for analysis and visualization
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {/* ✅ USE EXISTING CommonTableLayout COMPONENT */}
        <CommonTableLayout
          data={datasets as DatasetData[]}
          loading={loading}
          error={error as any}
          columns={columns}
          actions={actions}
          title="All Datasets"
          subtitle={`${datasets.length} datasets found`}
          searchable={true}
          searchPlaceholder="Search datasets by name, type, or description..."
          filters={filters}
          showCreateButton={hasPermission('datasets:create')}
          createButtonLabel="Add Dataset"
          onCreateClick={handleCreateDataset}
          onRefresh={handleRefresh}
          pagination={true}
          itemsPerPage={25}
        />

        {/* ============================================================================ */}
        {/* EXISTING DIALOGS (keep all existing dialog components) */}
        {/* ============================================================================ */}

        {/* Edit Dataset Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Edit Dataset: {selectedDataset?.display_name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dataset Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    label="Type"
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <MenuItem value="table">Table</MenuItem>
                    <MenuItem value="query">Query</MenuItem>
                    <MenuItem value="transformation">Transformation</MenuItem>
                    <MenuItem value="view">View</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Cache TTL (seconds)"
                  type="number"
                  value={formData.cache_ttl}
                  onChange={(e) => setFormData({ ...formData, cache_ttl: parseInt(e.target.value) || 3600 })}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
              {formData.type === 'query' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Base Query"
                    multiline
                    rows={6}
                    value={formData.base_query}
                    onChange={(e) => setFormData({ ...formData, base_query: e.target.value })}
                    placeholder="SELECT * FROM your_table WHERE..."
                  />
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleUpdateDataset}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteDataset}
          title="Delete Dataset"
          message={`Are you sure you want to delete "${selectedDataset?.display_name || selectedDataset?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmColor="error"
          loading={submitting}
        />
      </Box>
    </WorkspaceLayout>
  );
};

export default DatasetsPage;