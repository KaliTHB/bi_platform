// web-application/src/pages/workspace/charts.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
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
  Alert,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  BarChart as ChartIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  FileCopy as DuplicateIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
  ScatterPlot as ScatterChartIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Storage as DatasetIcon,
  Update as UpdateIcon
} from '@mui/icons-material';

// Use existing components
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../components/shared/PermissionGate';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

// Use existing hooks
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import useCharts from '../../hooks/useCharts'; // ✅ Use existing hook for live data

// ============================================================================
// INTERFACES (Updated to match API response)
// ============================================================================

interface ChartData {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  chart_type: string;
  chart_library: string;
  chart_category?: string;
  config_json: Record<string, any>;
  is_active: boolean;
  version: number;
  dashboard_id?: string;
  dashboard_name?: string;
  dataset_ids: string[];
  dataset_names?: string[];
  position_json?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  usage_count?: number;
  last_accessed?: string;
  dashboard_count?: number;
}

interface ChartFormData {
  name: string;
  display_name: string;
  description: string;
  chart_type: string;
  chart_library: string;
  chart_category: string;
  is_active: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChartsPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // ✅ USE EXISTING HOOK FOR LIVE DATA (instead of local state)
  const {
    charts,
    loading,
    error,
    createChart,
    updateChart,
    deleteChart,
    duplicateChart,
    refreshCharts
  } = useCharts();

  // Local UI state (keep existing dialogs and forms)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<ChartData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for editing (keep existing)
  const [formData, setFormData] = useState<ChartFormData>({
    name: '',
    display_name: '',
    description: '',
    chart_type: '',
    chart_library: '',
    chart_category: '',
    is_active: true
  });

  // ============================================================================
  // HELPER FUNCTIONS (keep existing)
  // ============================================================================

  // Chart type icon mapping
  const getChartTypeIcon = (chartType: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      line: <LineChartIcon fontSize="small" />,
      bar: <ChartIcon fontSize="small" />,
      pie: <PieChartIcon fontSize="small" />,
      area: <TimelineIcon fontSize="small" />,
      scatter: <ScatterChartIcon fontSize="small" />
    };
    return iconMap[chartType] || <ChartIcon fontSize="small" />;
  };

  // Chart library color mapping
  const getLibraryColor = (library: string) => {
    const colorMap: { [key: string]: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' } = {
      echarts: 'primary',
      d3: 'secondary',
      plotly: 'success',
      recharts: 'info',
      chartjs: 'warning'
    };
    return colorMap[library] || 'default' as any;
  };

  const formatDate = (dateString: string) => {
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

  // ============================================================================
  // EVENT HANDLERS (updated to use live data)
  // ============================================================================

  const handleCreateChart = useCallback(() => {
    router.push(`/workspace/${workspace?.slug}/chart-builder`);
  }, [router, workspace]);

  const handleDeleteChart = useCallback(async () => {
    if (!selectedChart) return;
    
    setSubmitting(true);
    try {
      const success = await deleteChart(selectedChart.id);
      if (success) {
        setDeleteDialogOpen(false);
        setSelectedChart(null);
        console.log('Chart deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete chart:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedChart, deleteChart]);

  const handleUpdateChart = useCallback(async () => {
    if (!selectedChart) return;
    
    setSubmitting(true);
    try {
      const updatedChart = await updateChart(selectedChart.id, formData);
      if (updatedChart) {
        setEditDialogOpen(false);
        setSelectedChart(null);
        console.log('Chart updated successfully');
      }
    } catch (error) {
      console.error('Failed to update chart:', error);
    } finally {
      setSubmitting(false);
    }
  }, [selectedChart, formData, updateChart]);

  const handleDuplicateChart = useCallback(async (chartId: string) => {
    try {
      const duplicatedChart = await duplicateChart(chartId);
      if (duplicatedChart) {
        console.log('Chart duplicated successfully');
      }
    } catch (error) {
      console.error('Failed to duplicate chart:', error);
    }
  }, [duplicateChart]);

  const handleRefresh = useCallback(async () => {
    await refreshCharts();
  }, [refreshCharts]);

  // ============================================================================
  // TABLE CONFIGURATION (keep existing structure)
  // ============================================================================

  // Table columns configuration
  const columns: TableColumn<ChartData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Chart',
      sortable: true,
      render: (chart: ChartData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 32, 
            height: 32, 
            borderRadius: 1, 
            bgcolor: 'primary.light', 
            color: 'primary.contrastText' 
          }}>
            {getChartTypeIcon(chart.chart_type)}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {chart.display_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {chart.name}
            </Typography>
            {chart.description && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                {chart.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'chart_type',
      label: 'Type & Library',
      sortable: true,
      render: (chart: ChartData) => (
        <Box>
          <Chip
            label={chart.chart_type.toUpperCase()}
            size="small"
            variant="outlined"
            sx={{ mb: 0.5 }}
          />
          <br />
          <Chip
            label={chart.chart_library}
            size="small"
            color={getLibraryColor(chart.chart_library)}
            variant="filled"
          />
        </Box>
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: (chart: ChartData) => (
        <Chip
          label={chart.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={chart.is_active ? 'success' : 'default'}
          variant={chart.is_active ? 'filled' : 'outlined'}
        />
      )
    },
    {
      key: 'dashboard_name',
      label: 'Dashboard',
      sortable: true,
      render: (chart: ChartData) => (
        chart.dashboard_name ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {chart.dashboard_name}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Unassigned
          </Typography>
        )
      )
    },
    {
      key: 'dataset_names',
      label: 'Datasets',
      render: (chart: ChartData) => (
        <Box>
          {chart.dataset_names && chart.dataset_names.length > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DatasetIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {chart.dataset_names.join(', ')}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No datasets
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Modified',
      sortable: true,
      render: (chart: ChartData) => (
        <Box>
          <Typography variant="body2">
            {formatDate(chart.updated_at)}
          </Typography>
          {chart.owner && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Avatar sx={{ width: 16, height: 16, fontSize: 10 }}>
                {chart.owner.name.charAt(0)}
              </Avatar>
              <Typography variant="caption" color="text.secondary">
                {chart.owner.name}
              </Typography>
            </Box>
          )}
        </Box>
      )
    },
    {
      key: 'usage_count',
      label: 'Usage',
      sortable: true,
      align: 'center',
      render: (chart: ChartData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {formatNumber(chart.usage_count)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            views
          </Typography>
        </Box>
      )
    }
  ], []);

  // Table actions configuration
  const actions: TableAction<ChartData>[] = useMemo(() => [
    {
      label: 'View',
      icon: <ViewIcon />,
      onClick: (chart) => router.push(`/workspace/${workspace?.slug}/charts/${chart.id}`),
      show: () => hasPermission('charts:read')
    },
    {
      label: 'Edit',
      icon: <EditIcon />,
      onClick: (chart) => {
        setSelectedChart(chart);
        setFormData({
          name: chart.name,
          display_name: chart.display_name,
          description: chart.description || '',
          chart_type: chart.chart_type,
          chart_library: chart.chart_library,
          chart_category: chart.chart_category || '',
          is_active: chart.is_active
        });
        setEditDialogOpen(true);
      },
      show: () => hasPermission('charts:update'),
      color: 'primary'
    },
    {
      label: 'Duplicate',
      icon: <DuplicateIcon />,
      onClick: (chart) => handleDuplicateChart(chart.id),
      show: () => hasPermission('charts:create'),
      color: 'info'
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
      onClick: (chart) => {
        setSelectedChart(chart);
        setDeleteDialogOpen(true);
      },
      show: () => hasPermission('charts:delete'),
      color: 'error'
    }
  ], [workspace, hasPermission, router, handleDuplicateChart]);

  // Filters for the table
  const filters: FilterOption[] = useMemo(() => [
    {
      key: 'chart_type',
      label: 'Chart Type',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'line', label: 'Line Chart' },
        { value: 'bar', label: 'Bar Chart' },
        { value: 'pie', label: 'Pie Chart' },
        { value: 'area', label: 'Area Chart' },
        { value: 'scatter', label: 'Scatter Plot' },
        { value: 'heatmap', label: 'Heatmap' },
        { value: 'gauge', label: 'Gauge' }
      ]
    },
    {
      key: 'chart_library',
      label: 'Library',
      options: [
        { value: 'all', label: 'All Libraries' },
        { value: 'echarts', label: 'ECharts' },
        { value: 'd3', label: 'D3.js' },
        { value: 'plotly', label: 'Plotly' },
        { value: 'chartjs', label: 'Chart.js' },
        { value: 'recharts', label: 'Recharts' }
      ]
    },
    {
      key: 'is_active',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    {
      key: 'chart_category',
      label: 'Category',
      options: [
        { value: 'all', label: 'All Categories' },
        { value: 'analytics', label: 'Analytics' },
        { value: 'financial', label: 'Financial' },
        { value: 'operational', label: 'Operational' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'sales', label: 'Sales' }
      ]
    }
  ], []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Charts
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and organize your visualization charts across dashboards
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ✅ USE EXISTING CommonTableLayout COMPONENT */}
        <CommonTableLayout
          data={charts as ChartData[]}
          loading={loading}
          error={error}
          columns={columns}
          actions={actions}
          title="All Charts"
          subtitle={`${charts.length} charts found`}
          searchable={true}
          searchPlaceholder="Search charts by name, type, or description..."
          filters={filters}
          showCreateButton={hasPermission('charts:create')}
          createButtonLabel="Create Chart"
          onCreateClick={handleCreateChart}
          onRefresh={handleRefresh}
          pagination={true}
          itemsPerPage={25}
        />

        {/* ============================================================================ */}
        {/* EXISTING DIALOGS (keep all existing dialog components) */}
        {/* ============================================================================ */}

        {/* Edit Chart Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Edit Chart: {selectedChart?.display_name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Chart Name"
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
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={formData.chart_type}
                    label="Chart Type"
                    onChange={(e) => setFormData({ ...formData, chart_type: e.target.value })}
                  >
                    <MenuItem value="line">Line Chart</MenuItem>
                    <MenuItem value="bar">Bar Chart</MenuItem>
                    <MenuItem value="pie">Pie Chart</MenuItem>
                    <MenuItem value="area">Area Chart</MenuItem>
                    <MenuItem value="scatter">Scatter Plot</MenuItem>
                    <MenuItem value="heatmap">Heatmap</MenuItem>
                    <MenuItem value="gauge">Gauge</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Chart Library</InputLabel>
                  <Select
                    value={formData.chart_library}
                    label="Chart Library"
                    onChange={(e) => setFormData({ ...formData, chart_library: e.target.value })}
                  >
                    <MenuItem value="echarts">ECharts</MenuItem>
                    <MenuItem value="d3">D3.js</MenuItem>
                    <MenuItem value="plotly">Plotly</MenuItem>
                    <MenuItem value="chartjs">Chart.js</MenuItem>
                    <MenuItem value="recharts">Recharts</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.chart_category}
                    label="Category"
                    onChange={(e) => setFormData({ ...formData, chart_category: e.target.value })}
                  >
                    <MenuItem value="analytics">Analytics</MenuItem>
                    <MenuItem value="financial">Financial</MenuItem>
                    <MenuItem value="operational">Operational</MenuItem>
                    <MenuItem value="marketing">Marketing</MenuItem>
                    <MenuItem value="sales">Sales</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleUpdateChart}
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
          onConfirm={handleDeleteChart}
          title="Delete Chart"
          message={`Are you sure you want to delete "${selectedChart?.display_name}"? This action cannot be undone and will remove the chart from all dashboards.`}
          confirmText="Delete"
          confirmColor="error"
          loading={submitting}
        />
      </Box>
    </WorkspaceLayout>
  );
};

export default ChartsPage;