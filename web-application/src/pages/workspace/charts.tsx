// web-application/src/pages/workspace/charts.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
  CardContent
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

// Import common components
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../components/shared/PermissionGate';

// Import hooks and services
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

// Types
interface ChartData {
  id: string;
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

const ChartsPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<ChartData | null>(null);
  const [formData, setFormData] = useState<ChartFormData>({
    name: '',
    display_name: '',
    description: '',
    chart_type: '',
    chart_library: '',
    chart_category: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Load charts data
  useEffect(() => {
    if (workspace?.id) {
      loadCharts();
    }
  }, [workspace?.id]);

  const loadCharts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual API call
      const mockCharts: ChartData[] = [
        {
          id: 'chart-1',
          name: 'sales_revenue_chart',
          display_name: 'Sales Revenue Trend',
          description: 'Monthly sales revenue trending analysis',
          chart_type: 'line',
          chart_library: 'echarts',
          chart_category: 'analytics',
          config_json: {
            title: 'Sales Revenue Trend',
            xAxis: 'month',
            yAxis: 'revenue',
            aggregation: 'sum'
          },
          is_active: true,
          version: 1,
          dashboard_id: 'dashboard-1',
          dashboard_name: 'Executive Dashboard',
          dataset_ids: ['dataset-1', 'dataset-2'],
          dataset_names: ['Sales Data', 'Revenue Data'],
          position_json: { x: 0, y: 0, width: 6, height: 4 },
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-20T14:22:00Z',
          created_by: 'user-1',
          owner: {
            id: 'user-1',
            name: 'John Smith',
            email: 'john.smith@company.com'
          },
          usage_count: 45,
          last_accessed: '2024-01-20T09:15:00Z',
          dashboard_count: 3
        },
        {
          id: 'chart-2',
          name: 'customer_segments_pie',
          display_name: 'Customer Segments Distribution',
          description: 'Customer distribution across different segments',
          chart_type: 'pie',
          chart_library: 'd3',
          chart_category: 'demographics',
          config_json: {
            title: 'Customer Segments',
            dataField: 'segment',
            valueField: 'customer_count'
          },
          is_active: true,
          version: 2,
          dashboard_id: 'dashboard-2',
          dashboard_name: 'Customer Analytics',
          dataset_ids: ['dataset-3'],
          dataset_names: ['Customer Data'],
          position_json: { x: 6, y: 0, width: 6, height: 4 },
          created_at: '2024-01-10T08:45:00Z',
          updated_at: '2024-01-18T16:30:00Z',
          created_by: 'user-2',
          owner: {
            id: 'user-2',
            name: 'Sarah Johnson',
            email: 'sarah.j@company.com'
          },
          usage_count: 28,
          last_accessed: '2024-01-19T13:42:00Z',
          dashboard_count: 2
        },
        {
          id: 'chart-3',
          name: 'inventory_levels_bar',
          display_name: 'Inventory Levels by Category',
          description: 'Current inventory levels across product categories',
          chart_type: 'bar',
          chart_library: 'plotly',
          chart_category: 'operations',
          config_json: {
            title: 'Inventory Levels',
            xAxis: 'category',
            yAxis: 'inventory_count',
            orientation: 'vertical'
          },
          is_active: false,
          version: 1,
          dashboard_id: 'dashboard-3',
          dashboard_name: 'Operations Dashboard',
          dataset_ids: ['dataset-4'],
          dataset_names: ['Inventory Data'],
          position_json: { x: 0, y: 4, width: 12, height: 3 },
          created_at: '2024-01-05T12:15:00Z',
          updated_at: '2024-01-12T10:20:00Z',
          created_by: 'user-3',
          owner: {
            id: 'user-3',
            name: 'Mike Chen',
            email: 'mike.chen@company.com'
          },
          usage_count: 12,
          last_accessed: '2024-01-15T11:30:00Z',
          dashboard_count: 1
        }
      ];
      
      setCharts(mockCharts);
    } catch (error) {
      console.error('Failed to load charts:', error);
      setError('Failed to load charts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  // Table columns configuration
  const columns: TableColumn<ChartData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Chart',
      sortable: true,
      render: (chart: ChartData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 1, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DashboardIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {chart.dashboard_name}
            </Typography>
            {chart.dashboard_count && chart.dashboard_count > 1 && (
              <Chip label={`+${chart.dashboard_count - 1}`} size="small" variant="outlined" />
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No dashboard
          </Typography>
        )
      )
    },
    {
      key: 'dataset_names',
      label: 'Datasets',
      render: (chart: ChartData) => (
        <Box>
          {chart.dataset_names?.map((dataset, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <DatasetIcon fontSize="small" color="action" />
              <Typography variant="body2">
                {dataset}
              </Typography>
            </Box>
          ))}
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
            {chart.usage_count || 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            views
          </Typography>
        </Box>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (chart: ChartData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {chart.owner?.name || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {chart.owner?.email}
          </Typography>
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
            {new Date(chart.updated_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(chart.updated_at).toLocaleTimeString()}
          </Typography>
        </Box>
      )
    }
  ], []);

  // Table actions
  const actions: TableAction<ChartData>[] = useMemo(() => [
    {
      label: 'View Chart',
      icon: <ViewIcon fontSize="small" />,
      onClick: (chart) => {
        if (chart.dashboard_id) {
          router.push(`/workspace/dashboard/${chart.dashboard_id}?highlight=${chart.id}`);
        } else {
          // Open chart preview in modal or new page
          window.open(`/workspace/chart-preview/${chart.id}`, '_blank');
        }
      },
      color: 'primary'
    },
    {
      label: 'Update Chart (Builder)',
      icon: <UpdateIcon fontSize="small" />,
      onClick: (chart) => {
        router.push(`/workspace/chart-builder?id=${chart.id}`);
      },
      color: 'info',
      show: () => hasPermission('chart.update')
    },
    {
      label: 'Edit Chart (Form)',
      icon: <EditIcon fontSize="small" />,
      onClick: (chart) => {
        handleEditChart(chart);
      },
      color: 'primary',
      show: () => hasPermission('chart.update')
    },
    {
      label: 'Duplicate Chart',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: (chart) => {
        handleDuplicateChart(chart);
      },
      color: 'secondary',
      show: () => hasPermission('chart.create')
    },
    {
      label: 'Chart Settings',
      icon: <SettingsIcon fontSize="small" />,
      onClick: (chart) => {
        router.push(`/workspace/charts/${chart.id}/settings`);
      },
      color: 'default',
      show: () => hasPermission('chart.update')
    },
    {
      label: 'Delete Chart',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (chart) => {
        handleDeleteChart(chart);
      },
      color: 'error',
      show: (chart) => hasPermission('chart.delete') && (chart.created_by === user?.id || hasPermission('chart.admin')),
      disabled: (chart) => chart.dashboard_count && chart.dashboard_count > 0
    }
  ], [hasPermission, router, workspace?.slug, user?.id]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'chart_type',
      label: 'Chart Type',
      options: [
        { value: 'line', label: 'Line Chart' },
        { value: 'bar', label: 'Bar Chart' },
        { value: 'pie', label: 'Pie Chart' },
        { value: 'area', label: 'Area Chart' },
        { value: 'scatter', label: 'Scatter Plot' }
      ]
    },
    {
      key: 'chart_library',
      label: 'Library',
      options: [
        { value: 'echarts', label: 'ECharts' },
        { value: 'd3', label: 'D3.js' },
        { value: 'plotly', label: 'Plotly' },
        { value: 'recharts', label: 'Recharts' },
        { value: 'chartjs', label: 'Chart.js' }
      ]
    },
    {
      key: 'is_active',
      label: 'Status',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    {
      key: 'chart_category',
      label: 'Category',
      options: [
        { value: 'analytics', label: 'Analytics' },
        { value: 'demographics', label: 'Demographics' },
        { value: 'operations', label: 'Operations' },
        { value: 'financial', label: 'Financial' }
      ]
    }
  ];

  // Handle chart actions
  const handleCreateChart = () => {
    router.push(`/workspace/chart-builder`);
  };

  const handleEditChart = (chart: ChartData) => {
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
  };

  const handleDuplicateChart = async (chart: ChartData) => {
    try {
      // API call to duplicate chart
      console.log('Duplicating chart:', chart.id);
      // Refresh charts list after duplication
      await loadCharts();
    } catch (error) {
      console.error('Failed to duplicate chart:', error);
      setError('Failed to duplicate chart. Please try again.');
    }
  };

  const handleDeleteChart = (chart: ChartData) => {
    setSelectedChart(chart);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!selectedChart) return;

    try {
      setSubmitting(true);
      // API call to update chart
      console.log('Updating chart:', selectedChart.id, formData);
      
      // Close dialog and refresh
      setEditDialogOpen(false);
      await loadCharts();
    } catch (error) {
      console.error('Failed to update chart:', error);
      setError('Failed to update chart. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedChart) return;

    try {
      setSubmitting(true);
      
      // API call to delete chart
      // const response = await fetch(`/api/v1/workspaces/charts/${selectedChart.id}`, {
      //   method: 'DELETE'
      // });
      // if (!response.ok) throw new Error('Failed to delete chart');
      
      console.log('Deleting chart:', selectedChart.id);
      
      // Close dialog and refresh
      setDeleteDialogOpen(false);
      await loadCharts();
    } catch (error) {
      console.error('Failed to delete chart:', error);
      setError('Failed to delete chart. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    loadCharts();
  };

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
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Charts Table */}
        <CommonTableLayout
          data={charts}
          loading={loading}
          error={error}
          columns={columns}
          actions={actions}
          title="All Charts"
          subtitle={`${charts.length} charts found`}
          searchable={true}
          searchPlaceholder="Search charts by name, type, or description..."
          filters={filters}
          showCreateButton={true}
          createButtonLabel="Add Chart"
          onCreateClick={handleCreateChart}
          onRefresh={handleRefresh}
          pagination={true}
          itemsPerPage={25}
        />

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
                  helperText="Internal name for the chart"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  helperText="User-friendly display name"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  helperText="Brief description of the chart"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={formData.chart_type}
                    onChange={(e) => setFormData({ ...formData, chart_type: e.target.value })}
                    label="Chart Type"
                  >
                    <MenuItem value="line">Line Chart</MenuItem>
                    <MenuItem value="bar">Bar Chart</MenuItem>
                    <MenuItem value="pie">Pie Chart</MenuItem>
                    <MenuItem value="area">Area Chart</MenuItem>
                    <MenuItem value="scatter">Scatter Plot</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Library</InputLabel>
                  <Select
                    value={formData.chart_library}
                    onChange={(e) => setFormData({ ...formData, chart_library: e.target.value })}
                    label="Library"
                  >
                    <MenuItem value="echarts">ECharts</MenuItem>
                    <MenuItem value="d3">D3.js</MenuItem>
                    <MenuItem value="plotly">Plotly</MenuItem>
                    <MenuItem value="recharts">Recharts</MenuItem>
                    <MenuItem value="chartjs">Chart.js</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.chart_category}
                    onChange={(e) => setFormData({ ...formData, chart_category: e.target.value })}
                    label="Category"
                  >
                    <MenuItem value="analytics">Analytics</MenuItem>
                    <MenuItem value="demographics">Demographics</MenuItem>
                    <MenuItem value="operations">Operations</MenuItem>
                    <MenuItem value="financial">Financial</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFormSubmit}
              variant="contained"
              disabled={submitting || !formData.name || !formData.display_name}
            >
              {submitting ? 'Updating...' : 'Update Chart'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the chart "{selectedChart?.display_name}"?
            </Typography>
            {selectedChart?.dashboard_count && selectedChart.dashboard_count > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This chart is being used in {selectedChart.dashboard_count} dashboard(s). 
                Deleting it will remove it from all dashboards.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete Chart'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default ChartsPage;