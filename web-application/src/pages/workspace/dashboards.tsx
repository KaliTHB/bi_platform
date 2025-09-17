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
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

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
  tags?: string[];
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
  const { user, currentWorkspace } = useAuth();
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
    if (currentWorkspace?.id) {
      loadDashboards();
    }
  }, [currentWorkspace?.id]);

  const loadDashboards = async () => {
  try {
    setLoading(true);
    setError(null);
    console.log('🔄 Loading dashboards for workspace:', currentWorkspace?.id);
    
    const token = authStorage.getToken();
    const user = authStorage.getUser();  
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Use the correct API endpoint based on your backend structure
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/dashboards`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Workspace-ID': currentWorkspace?.id || '',  // ✅ CRITICAL: Use header instead of query
        'X-user-ID': user?.id || '',
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      throw new Error(`Failed to fetch dashboards: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('📊 Dashboards response:', responseData);
    
    if (responseData.success) {
      setDashboards(responseData.data || []);
      console.log('✅ Dashboards loaded:', responseData.data?.length || 0);
    } else {
      // If API returns success: false, fall back to mock data temporarily
      console.warn('⚠️ API returned success: false, using mock data');
      setDashboards([
        {
          id: 'dashboard-1',
          name: 'executive_overview',
          display_name: 'Executive Overview',
          description: 'High-level metrics and KPIs',
          slug: 'executive-overview',
          status: 'published',
          visibility: 'workspace',
          is_featured: true,
          chart_count: 8,
          view_count: 245,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_id: 'current-user'
        }
      ]);
    }
  } catch (err) {
    console.error('❌ Error loading dashboards:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboards';
    setError(errorMessage);
    
    // For development, show mock data on error
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: showing mock data');
      setDashboards([
        {
          id: 'dashboard-1',
          name: 'executive_overview', 
          display_name: 'Executive Overview',
          description: 'High-level metrics and KPIs',
          slug: 'executive-overview',
          status: 'published',
          visibility: 'workspace',
          is_featured: true,
          chart_count: 8,
          view_count: 245,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_id: 'current-user'
        }
      ]);
      setError(null); // Clear error in dev mode
    }
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
        router.replace(`/workspace/${currentWorkspace?.slug}/dashboards/${dashboard.id}/settings`);
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
  ], [hasPermission, router, currentWorkspace?.slug, user?.id]);

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
      // const response = await fetch(`/api/workspaces/dashboards/${dashboard.id}/duplicate`, {
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
      const shareUrl = `${window.location.origin}/workspace/${currentWorkspace?.slug}/dashboard/${dashboard.slug}`;
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
      // const response = await fetch(`/api/workspaces/dashboards/${selectedDashboard.id}`, {
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
      // const response = await fetch(`/api/workspaces/dashboards/${selectedDashboard.id}`, {
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
          error={error as any}
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