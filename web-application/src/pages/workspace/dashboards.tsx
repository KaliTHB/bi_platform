// web-application/src/pages/workspace/dashboards.tsx
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
  CardContent,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  BarChart as ChartIcon,
  People as PeopleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Group as WorkspaceIcon,
  Update as UpdateIcon,
  FileCopy as DuplicateIcon,
  Category as CategoryIcon
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
interface DashboardData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'workspace';
  is_featured: boolean;
  chart_count: number;
  view_count: number;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  thumbnail_url?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  last_viewed_at?: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  config_json?: {
    auto_refresh?: {
      enabled: boolean;
      interval: number;
    };
    export_settings?: Record<string, any>;
    interaction_settings?: Record<string, any>;
  };
  theme_config?: {
    primary_color?: string;
    background_color?: string;
  };
  usage_stats?: {
    daily_views: number;
    weekly_views: number;
    unique_viewers: number;
  };
}

interface DashboardFormData {
  name: string;
  display_name: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'workspace';
  is_featured: boolean;
  category_id: string;
  tags: string[];
}

const DashboardsPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardData | null>(null);
  const [formData, setFormData] = useState<DashboardFormData>({
    name: '',
    display_name: '',
    description: '',
    status: 'draft',
    visibility: 'workspace',
    is_featured: false,
    category_id: '',
    tags: []
  });
  const [submitting, setSubmitting] = useState(false);

  // Load dashboards data
  useEffect(() => {
    if (workspace?.id) {
      loadDashboards();
    }
  }, [workspace?.id]);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API call to get all dashboards in workspace
      // const response = await fetch('/api/v1/workspaces/dashboards');
      // const data = await response.json();
      // setDashboards(data.dashboards || data);
      
      // Mock data for now - replace with actual API call
      const mockDashboards: DashboardData[] = [
        {
          id: 'dashboard-1',
          name: 'executive_overview',
          display_name: 'Executive Overview',
          description: 'High-level metrics and KPIs for executive team',
          slug: 'executive-overview',
          status: 'published',
          visibility: 'workspace',
          is_featured: true,
          chart_count: 8,
          view_count: 245,
          category_id: 'cat-1',
          category: {
            id: 'cat-1',
            name: 'Analytics',
            color: '#1976d2',
            icon: 'analytics'
          },
          thumbnail_url: '/thumbnails/dashboard-1.png',
          tags: ['executive', 'kpi', 'overview'],
          created_at: '2024-01-10T09:00:00Z',
          updated_at: '2024-01-20T16:30:00Z',
          published_at: '2024-01-15T10:00:00Z',
          last_viewed_at: '2024-01-20T14:22:00Z',
          owner_id: 'user-1',
          owner: {
            id: 'user-1',
            name: 'John Smith',
            email: 'john.smith@company.com'
          },
          config_json: {
            auto_refresh: {
              enabled: true,
              interval: 300
            }
          },
          theme_config: {
            primary_color: '#1976d2',
            background_color: '#ffffff'
          },
          usage_stats: {
            daily_views: 45,
            weekly_views: 180,
            unique_viewers: 28
          }
        },
        {
          id: 'dashboard-2',
          name: 'sales_performance',
          display_name: 'Sales Performance Dashboard',
          description: 'Comprehensive sales analytics and performance metrics',
          slug: 'sales-performance',
          status: 'published',
          visibility: 'private',
          is_featured: false,
          chart_count: 12,
          view_count: 189,
          category_id: 'cat-2',
          category: {
            id: 'cat-2',
            name: 'Sales',
            color: '#388e3c',
            icon: 'trending_up'
          },
          thumbnail_url: '/thumbnails/dashboard-2.png',
          tags: ['sales', 'revenue', 'performance'],
          created_at: '2024-01-08T11:30:00Z',
          updated_at: '2024-01-19T09:45:00Z',
          published_at: '2024-01-12T08:00:00Z',
          last_viewed_at: '2024-01-19T15:10:00Z',
          owner_id: 'user-2',
          owner: {
            id: 'user-2',
            name: 'Sarah Johnson',
            email: 'sarah.j@company.com'
          },
          config_json: {
            auto_refresh: {
              enabled: false,
              interval: 600
            }
          },
          theme_config: {
            primary_color: '#388e3c',
            background_color: '#f5f5f5'
          },
          usage_stats: {
            daily_views: 32,
            weekly_views: 156,
            unique_viewers: 19
          }
        },
        {
          id: 'dashboard-3',
          name: 'operational_metrics',
          display_name: 'Operational Metrics',
          description: 'Real-time operational KPIs and system performance',
          slug: 'operational-metrics',
          status: 'draft',
          visibility: 'public',
          is_featured: false,
          chart_count: 6,
          view_count: 67,
          category_id: 'cat-3',
          category: {
            id: 'cat-3',
            name: 'Operations',
            color: '#f57c00',
            icon: 'settings'
          },
          thumbnail_url: '/thumbnails/dashboard-3.png',
          tags: ['operations', 'monitoring', 'real-time'],
          created_at: '2024-01-15T14:20:00Z',
          updated_at: '2024-01-20T11:15:00Z',
          last_viewed_at: '2024-01-18T13:45:00Z',
          owner_id: 'user-3',
          owner: {
            id: 'user-3',
            name: 'Mike Chen',
            email: 'mike.chen@company.com'
          },
          config_json: {
            auto_refresh: {
              enabled: true,
              interval: 60
            }
          },
          theme_config: {
            primary_color: '#f57c00',
            background_color: '#fafafa'
          },
          usage_stats: {
            daily_views: 12,
            weekly_views: 67,
            unique_viewers: 8
          }
        }
      ];
      
      setDashboards(mockDashboards);
    } catch (error) {
      console.error('Failed to load dashboards:', error);
      setError('Failed to load dashboards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Visibility icon mapping
  const getVisibilityIcon = (visibility: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      public: <PublicIcon fontSize="small" />,
      private: <PrivateIcon fontSize="small" />,
      workspace: <WorkspaceIcon fontSize="small" />
    };
    return iconMap[visibility] || <WorkspaceIcon fontSize="small" />;
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: 'success' | 'warning' | 'error' | 'default' } = {
      published: 'success',
      draft: 'warning',
      archived: 'error'
    };
    return colorMap[status] || 'default';
  };

  // Table columns configuration
  const columns: TableColumn<DashboardData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Dashboard',
      sortable: true,
      render: (dashboard: DashboardData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 1, bgcolor: dashboard.category?.color || 'primary.light', color: 'white' }}>
            <DashboardIcon fontSize="small" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {dashboard.display_name}
              </Typography>
              {dashboard.is_featured && (
                <StarIcon fontSize="small" color="warning" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {dashboard.name}
            </Typography>
            {dashboard.description && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                {dashboard.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'status',
      label: 'Status & Visibility',
      sortable: true,
      render: (dashboard: DashboardData) => (
        <Box>
          <Chip
            label={dashboard.status.toUpperCase()}
            size="small"
            color={getStatusColor(dashboard.status)}
            variant="filled"
            sx={{ mb: 0.5 }}
          />
          <br />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getVisibilityIcon(dashboard.visibility)}
            <Typography variant="caption" color="text.secondary">
              {dashboard.visibility}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (dashboard: DashboardData) => (
        dashboard.category ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                bgcolor: dashboard.category.color 
              }} 
            />
            <Typography variant="body2">
              {dashboard.category.name}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No category
          </Typography>
        )
      )
    },
    {
      key: 'chart_count',
      label: 'Charts',
      sortable: true,
      align: 'center',
      render: (dashboard: DashboardData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
          <ChartIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {dashboard.chart_count}
          </Typography>
        </Box>
      )
    },
    {
      key: 'view_count',
      label: 'Views',
      sortable: true,
      align: 'center',
      render: (dashboard: DashboardData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {dashboard.view_count.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            total views
          </Typography>
          {dashboard.usage_stats && (
            <Typography variant="caption" display="block" color="text.secondary">
              {dashboard.usage_stats.unique_viewers} unique
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (dashboard: DashboardData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {dashboard.owner?.name || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dashboard.owner?.email}
          </Typography>
        </Box>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Modified',
      sortable: true,
      render: (dashboard: DashboardData) => (
        <Box>
          <Typography variant="body2">
            {new Date(dashboard.updated_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(dashboard.updated_at).toLocaleTimeString()}
          </Typography>
          {dashboard.last_viewed_at && (
            <Typography variant="caption" display="block" color="text.secondary">
              Viewed: {new Date(dashboard.last_viewed_at).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      )
    }
  ], []);

  // Table actions
  const actions: TableAction<DashboardData>[] = useMemo(() => [
    {
      label: 'View Dashboard',
      icon: <ViewIcon fontSize="small" />,
      onClick: (dashboard) => {
        console.log(`🔗 Navigating to dashboard: /workspace/dashboard/dashboard-${dashboard.id}`);
        router.replace(`/workspace/dashboard/${dashboard.id}`);
      },
      color: 'primary'
    },
    {
      label: 'Update Dashboard (Builder)',
      icon: <UpdateIcon fontSize="small" />,
      onClick: (dashboard) => {
        router.replace(`/workspace/dashboard-builder?id=${dashboard.id}`);
      },
      color: 'info',
      show: () => hasPermission('dashboard.update')
    },
    {
      label: 'Edit Dashboard (Form)',
      icon: <EditIcon fontSize="small" />,
      onClick: (dashboard) => {
        handleEditDashboard(dashboard);
      },
      color: 'primary',
      show: () => hasPermission('dashboard.update')
    },
    {
      label: 'Duplicate Dashboard',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: (dashboard) => {
        handleDuplicateDashboard(dashboard);
      },
      color: 'secondary',
      show: () => hasPermission('dashboard.create')
    },
    {
      label: 'Share Dashboard',
      icon: <ShareIcon fontSize="small" />,
      onClick: (dashboard) => {
        handleShareDashboard(dashboard);
      },
      color: 'info',
      show: (dashboard) => hasPermission('dashboard.share') || dashboard.visibility === 'public'
    },
    {
      label: 'Dashboard Settings',
      icon: <SettingsIcon fontSize="small" />,
      onClick: (dashboard) => {
        router.replace(`/workspace/${workspace?.slug}/dashboards/${dashboard.id}/settings`);
      },
      color: 'default',
      show: () => hasPermission('dashboard.update')
    },
    {
      label: 'Delete Dashboard',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (dashboard) => {
        handleDeleteDashboard(dashboard);
      },
      color: 'error',
      show: (dashboard) => hasPermission('dashboard.delete') && 
        (dashboard.owner_id === user?.id || hasPermission('dashboard.admin')),
      disabled: (dashboard) => dashboard.chart_count > 0 && dashboard.status === 'published'
    }
  ], [hasPermission, router, workspace?.slug, user?.id]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' }
      ]
    },
    {
      key: 'visibility',
      label: 'Visibility',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'workspace', label: 'Workspace' },
        { value: 'private', label: 'Private' }
      ]
    },
    {
      key: 'category.name',
      label: 'Category',
      options: [
        { value: 'Analytics', label: 'Analytics' },
        { value: 'Sales', label: 'Sales' },
        { value: 'Operations', label: 'Operations' },
        { value: 'Finance', label: 'Finance' }
      ]
    },
    {
      key: 'is_featured',
      label: 'Featured',
      options: [
        { value: 'true', label: 'Featured' },
        { value: 'false', label: 'Not Featured' }
      ]
    }
  ];

  // Handle dashboard actions
  const handleCreateDashboard = () => {
    router.replace('/workspace/dashboard-builder');
  };

  const handleEditDashboard = (dashboard: DashboardData) => {
    setSelectedDashboard(dashboard);
    setFormData({
      name: dashboard.name,
      display_name: dashboard.display_name,
      description: dashboard.description || '',
      status: dashboard.status,
      visibility: dashboard.visibility,
      is_featured: dashboard.is_featured,
      category_id: dashboard.category_id || '',
      tags: dashboard.tags || []
    });
    setEditDialogOpen(true);
  };

  const handleDuplicateDashboard = async (dashboard: DashboardData) => {
    try {
      // API call to duplicate dashboard
      // const response = await fetch(`/api/v1/workspaces/dashboards/${dashboard.id}/duplicate`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //     new_name: `${dashboard.name}_copy`, 
      //     new_display_name: `${dashboard.display_name} (Copy)`,
      //     copy_charts: true
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to duplicate dashboard');
      
      console.log('Duplicating dashboard:', dashboard.id);
      // Refresh dashboards list after duplication
      await loadDashboards();
    } catch (error) {
      console.error('Failed to duplicate dashboard:', error);
      setError('Failed to duplicate dashboard. Please try again.');
    }
  };

  const handleShareDashboard = async (dashboard: DashboardData) => {
    try {
      // Generate share link or open share dialog
      const shareUrl = `${window.location.origin}/workspace/${workspace?.slug}/dashboard/${dashboard.slug}`;
      await navigator.clipboard.writeText(shareUrl);
      // Could also open a share dialog with more options
      console.log('Dashboard share URL copied to clipboard');
    } catch (error) {
      console.error('Failed to share dashboard:', error);
      setError('Failed to generate share link. Please try again.');
    }
  };

  const handleDeleteDashboard = (dashboard: DashboardData) => {
    setSelectedDashboard(dashboard);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!selectedDashboard) return;

    try {
      setSubmitting(true);
      
      // API call to update dashboard
      // const response = await fetch(`/api/v1/workspaces/dashboards/${selectedDashboard.id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // if (!response.ok) throw new Error('Failed to update dashboard');
      
      console.log('Updating dashboard:', selectedDashboard.id, formData);
      
      // Close dialog and refresh
      setEditDialogOpen(false);
      await loadDashboards();
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      setError('Failed to update dashboard. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDashboard) return;

    try {
      setSubmitting(true);
      
      // API call to delete dashboard
      // const response = await fetch(`/api/v1/workspaces/dashboards/${selectedDashboard.id}`, {
      //   method: 'DELETE'
      // });
      // if (!response.ok) throw new Error('Failed to delete dashboard');
      
      console.log('Deleting dashboard:', selectedDashboard.id);
      
      // Close dialog and refresh
      setDeleteDialogOpen(false);
      await loadDashboards();
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      setError('Failed to delete dashboard. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    loadDashboards();
  };

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Dashboards
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage interactive dashboards to visualize your data
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Dashboards Table */}
        <CommonTableLayout
          data={dashboards}
          loading={loading}
          error={error}
          columns={columns}
          actions={actions}
          title="All Dashboards"
          subtitle={`${dashboards.length} dashboards found`}
          searchable={true}
          searchPlaceholder="Search dashboards by name, category, or description..."
          filters={filters}
          showCreateButton={true}
          createButtonLabel="Add Dashboard"
          onCreateClick={handleCreateDashboard}
          onRefresh={handleRefresh}
          pagination={true}
          itemsPerPage={25}
        />

        {/* Edit Dashboard Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Edit Dashboard: {selectedDashboard?.display_name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dashboard Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  helperText="Internal name for the dashboard"
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
                  helperText="Brief description of the dashboard"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    label="Status"
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="published">Published</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Visibility</InputLabel>
                  <Select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                    label="Visibility"
                  >
                    <MenuItem value="private">Private</MenuItem>
                    <MenuItem value="workspace">Workspace</MenuItem>
                    <MenuItem value="public">Public</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    label="Category"
                  >
                    <MenuItem value="">No Category</MenuItem>
                    <MenuItem value="cat-1">Analytics</MenuItem>
                    <MenuItem value="cat-2">Sales</MenuItem>
                    <MenuItem value="cat-3">Operations</MenuItem>
                    <MenuItem value="cat-4">Finance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    />
                  }
                  label="Featured Dashboard"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags (comma separated)"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                  })}
                  helperText="Add tags to help categorize and search dashboards"
                />
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
              {submitting ? 'Updating...' : 'Update Dashboard'}
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
              Are you sure you want to delete the dashboard "{selectedDashboard?.display_name}"?
            </Typography>
            {selectedDashboard?.chart_count && selectedDashboard.chart_count > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This dashboard contains {selectedDashboard.chart_count} chart(s). 
                Deleting it will also remove all associated charts.
              </Alert>
            )}
            {selectedDashboard?.status === 'published' && (
              <Alert severity="error" sx={{ mt: 1 }}>
                This is a published dashboard. Consider archiving it instead of deleting.
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
              {submitting ? 'Deleting...' : 'Delete Dashboard'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default DashboardsPage;