// web-application/src/pages/workspace/admin/webviews.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Settings as SettingsIcon,
  Public as PublicIcon,
  Launch as LaunchIcon,
  Palette as PaletteIcon,
  Navigation as NavigationIcon,
  Business as BrandingIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';

// Types
interface WebviewConfig {
  id: string;
  webview_name: string;
  display_name: string;
  description?: string;
  workspace_id: string;
  theme_config: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    sidebar_style: 'light' | 'dark';
    navbar_style: 'light' | 'dark';
    font_family: string;
  };
  navigation_config: {
    show_dashboard_thumbnails: boolean;
    show_view_counts: boolean;
    show_last_accessed: boolean;
    enable_search: boolean;
    enable_favorites: boolean;
    sidebar_width: number;
  };
  branding_config: {
    company_name: string;
    company_logo: string;
    favicon_url: string;
  };
  default_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  public_url?: string;
  usage_stats?: {
    total_views: number;
    unique_visitors: number;
    dashboard_count: number;
    last_accessed?: string;
  };
}

interface WebviewFormData {
  webview_name: string;
  display_name: string;
  description: string;
  theme_config: {
    primary_color: string;
    secondary_color: string;
    background_color: string;
    sidebar_style: 'light' | 'dark';
    navbar_style: 'light' | 'dark';
    font_family: string;
  };
  navigation_config: {
    show_dashboard_thumbnails: boolean;
    show_view_counts: boolean;
    show_last_accessed: boolean;
    enable_search: boolean;
    enable_favorites: boolean;
    sidebar_width: number;
  };
  branding_config: {
    company_name: string;
    company_logo: string;
    favicon_url: string;
  };
  is_active: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`webview-tabpanel-${index}`}
    aria-labelledby={`webview-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const WebviewsAdminPage: NextPage = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  // State
  const [webviews, setWebviews] = useState<WebviewConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWebview, setSelectedWebview] = useState<WebviewConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Form data
  const [formData, setFormData] = useState<WebviewFormData>({
    webview_name: '',
    display_name: '',
    description: '',
    theme_config: {
      primary_color: '#1976d2',
      secondary_color: '#dc004e',
      background_color: '#f5f5f5',
      sidebar_style: 'light',
      navbar_style: 'light',
      font_family: 'Roboto, sans-serif'
    },
    navigation_config: {
      show_dashboard_thumbnails: true,
      show_view_counts: true,
      show_last_accessed: true,
      enable_search: true,
      enable_favorites: false,
      sidebar_width: 280
    },
    branding_config: {
      company_name: '',
      company_logo: '',
      favicon_url: ''
    },
    is_active: true
  });

  // Load webviews
  useEffect(() => {
    if (workspace?.id) {
      loadWebviews();
    }
  }, [workspace?.id]);

  const loadWebviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data - replace with actual API call
      const mockWebviews: WebviewConfig[] = [
        {
          id: '1',
          webview_name: 'public-dashboards',
          display_name: 'Public Dashboards',
          description: 'Main public dashboard portal for external stakeholders',
          workspace_id: workspace?.id || '',
          theme_config: {
            primary_color: '#1976d2',
            secondary_color: '#dc004e',
            background_color: '#ffffff',
            sidebar_style: 'light',
            navbar_style: 'dark',
            font_family: 'Roboto, sans-serif'
          },
          navigation_config: {
            show_dashboard_thumbnails: true,
            show_view_counts: false,
            show_last_accessed: true,
            enable_search: true,
            enable_favorites: false,
            sidebar_width: 280
          },
          branding_config: {
            company_name: 'ACME Corp',
            company_logo: '/logo.png',
            favicon_url: '/favicon.ico'
          },
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          created_by: 'user1',
          public_url: '/public-dashboards',
          usage_stats: {
            total_views: 15420,
            unique_visitors: 2840,
            dashboard_count: 12,
            last_accessed: '2024-01-15T11:30:00Z'
          }
        },
        {
          id: '2',
          webview_name: 'analytics-hub',
          display_name: 'Analytics Hub',
          description: 'Internal analytics portal for team members',
          workspace_id: workspace?.id || '',
          theme_config: {
            primary_color: '#2e7d32',
            secondary_color: '#1976d2',
            background_color: '#f5f5f5',
            sidebar_style: 'dark',
            navbar_style: 'light',
            font_family: 'Inter, sans-serif'
          },
          navigation_config: {
            show_dashboard_thumbnails: false,
            show_view_counts: true,
            show_last_accessed: false,
            enable_search: true,
            enable_favorites: true,
            sidebar_width: 320
          },
          branding_config: {
            company_name: 'Analytics Team',
            company_logo: '',
            favicon_url: ''
          },
          is_active: false,
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-10T16:45:00Z',
          created_by: 'user2',
          public_url: '/analytics-hub',
          usage_stats: {
            total_views: 3240,
            unique_visitors: 480,
            dashboard_count: 8,
            last_accessed: '2024-01-10T14:20:00Z'
          }
        }
      ];

      setWebviews(mockWebviews);
    } catch (error) {
      console.error('Failed to load webviews:', error);
      setError('Failed to load webview configurations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleCreateWebview = () => {
    setSelectedWebview(null);
    setFormData({
      webview_name: '',
      display_name: '',
      description: '',
      theme_config: {
        primary_color: '#1976d2',
        secondary_color: '#dc004e',
        background_color: '#f5f5f5',
        sidebar_style: 'light',
        navbar_style: 'light',
        font_family: 'Roboto, sans-serif'
      },
      navigation_config: {
        show_dashboard_thumbnails: true,
        show_view_counts: true,
        show_last_accessed: true,
        enable_search: true,
        enable_favorites: false,
        sidebar_width: 280
      },
      branding_config: {
        company_name: '',
        company_logo: '',
        favicon_url: ''
      },
      is_active: true
    });
    setEditDialogOpen(true);
  };

  const handleEditWebview = (webview: WebviewConfig) => {
    setSelectedWebview(webview);
    setFormData({
      webview_name: webview.webview_name,
      display_name: webview.display_name,
      description: webview.description || '',
      theme_config: webview.theme_config,
      navigation_config: webview.navigation_config,
      branding_config: webview.branding_config,
      is_active: webview.is_active
    });
    setEditDialogOpen(true);
  };

  const handleDeleteWebview = (webview: WebviewConfig) => {
    setSelectedWebview(webview);
    setDeleteDialogOpen(true);
  };

  const handleSaveWebview = async () => {
    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (selectedWebview) {
        // Update existing
        setWebviews(prev => prev.map(w => 
          w.id === selectedWebview.id 
            ? { 
                ...w, 
                ...formData,
                updated_at: new Date().toISOString(),
                public_url: `/${formData.webview_name}`
              }
            : w
        ));
      } else {
        // Create new
        const newWebview: WebviewConfig = {
          id: `webview_${Date.now()}`,
          ...formData,
          workspace_id: workspace?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || '',
          public_url: `/${formData.webview_name}`
        };
        setWebviews(prev => [newWebview, ...prev]);
      }
      
      setEditDialogOpen(false);
    } catch (error) {
      setError('Failed to save webview configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedWebview) return;

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setWebviews(prev => prev.filter(w => w.id !== selectedWebview.id));
      setDeleteDialogOpen(false);
      setSelectedWebview(null);
    } catch (error) {
      setError('Failed to delete webview');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWebviewNavigation = (webviewName: string) => {
    window.open(`/${webviewName}`, '_blank');
  };

  const updateFormData = <T extends keyof WebviewFormData>(
    section: T,
    field?: T extends 'theme_config' | 'navigation_config' | 'branding_config' ? string : never,
    value?: any
  ) => {
    if (field && (section === 'theme_config' || section === 'navigation_config' || section === 'branding_config')) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [section]: value }));
    }
  };

  // Table columns
  const columns: TableColumn<WebviewConfig>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Webview',
      sortable: true,
      render: (webview) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: webview.is_active ? 'success.light' : 'grey.light',
            color: webview.is_active ? 'success.main' : 'grey.main'
          }}>
            <PublicIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {webview.display_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              /{webview.webview_name}
            </Typography>
            {webview.description && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                {webview.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'status',
      label: 'Status & Theme',
      sortable: true,
      render: (webview) => (
        <Box>
          <Chip
            label={webview.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={webview.is_active ? 'success' : 'default'}
            variant="filled"
            sx={{ mb: 0.5 }}
          />
          <Typography variant="caption" display="block" color="text.secondary">
            {webview.theme_config.navbar_style} navbar, {webview.theme_config.sidebar_style} sidebar
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            {webview.branding_config.company_name || 'No branding'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'usage_stats',
      label: 'Usage Stats',
      render: (webview) => (
        webview.usage_stats ? (
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {webview.usage_stats.total_views.toLocaleString()} views
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {webview.usage_stats.unique_visitors.toLocaleString()} visitors
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              {webview.usage_stats.dashboard_count} dashboards
            </Typography>
            {webview.usage_stats.last_accessed && (
              <Typography variant="caption" display="block" color="text.secondary">
                Last: {new Date(webview.usage_stats.last_accessed).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No usage data
          </Typography>
        )
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (webview) => (
        <Box>
          <Typography variant="body2">
            {new Date(webview.updated_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(webview.updated_at).toLocaleTimeString()}
          </Typography>
        </Box>
      )
    }
  ], []);

  // Table actions
  const actions: TableAction<WebviewConfig>[] = useMemo(() => [
    {
      label: 'View Webview',
      icon: <ViewIcon fontSize="small" />,
      onClick: (webview) => handleWebviewNavigation(webview.webview_name),
      color: 'primary'
    },
    {
      label: 'Edit Configuration',
      icon: <EditIcon fontSize="small" />,
      onClick: (webview) => handleEditWebview(webview),
      show: () => hasPermission('webview.write'),
      color: 'default'
    },
    {
      label: 'View Analytics',
      icon: <AnalyticsIcon fontSize="small" />,
      onClick: (webview) => {
        router.replace(`/workspace/${workspace?.slug}/admin/webviews/${webview.id}/analytics`);
      },
      show: (webview) => hasPermission('webview.read') && webview.usage_stats,
      color: 'info'
    },
    {
      label: 'Delete Webview',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (webview) => handleDeleteWebview(webview),
      show: () => hasPermission('webview.write'),
      color: 'error',
      disabled: (webview) => webview.is_active
    }
  ], [hasPermission, router, workspace?.slug]);

  // Filters
  const filters: FilterOption[] = [
    {
      key: 'is_active',
      label: 'Status',
      options: [
        { value: true, label: 'Active' },
        { value: false, label: 'Inactive' }
      ]
    }
  ];

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Webview Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure and manage public dashboard panels for external access
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Webviews Table */}
        <CommonTableLayout
          data={webviews}
          loading={loading}
          error={error}
          columns={columns}
          actions={actions}
          title="Webview Configurations"
          subtitle={`${webviews.length} webview${webviews.length !== 1 ? 's' : ''} configured`}
          searchable={true}
          searchPlaceholder="Search webviews by name or description..."
          filters={filters}
          showCreateButton={true}
          createButtonLabel="Create Webview"
          onCreateClick={handleCreateWebview}
          onRefresh={loadWebviews}
          pagination={true}
          itemsPerPage={10}
        />

        {/* Edit/Create Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedWebview ? 'Edit Webview Configuration' : 'Create New Webview'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Basic Settings" icon={<SettingsIcon />} iconPosition="start" />
                <Tab label="Theme" icon={<PaletteIcon />} iconPosition="start" />
                <Tab label="Navigation" icon={<NavigationIcon />} iconPosition="start" />
                <Tab label="Branding" icon={<BrandingIcon />} iconPosition="start" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Webview Name (URL)"
                      value={formData.webview_name}
                      onChange={(e) => updateFormData('webview_name', undefined, e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      helperText="Used in URL, lowercase letters and hyphens only"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Display Name"
                      value={formData.display_name}
                      onChange={(e) => updateFormData('display_name', undefined, e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={formData.description}
                      onChange={(e) => updateFormData('description', undefined, e.target.value)}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.is_active}
                          onChange={(e) => updateFormData('is_active', undefined, e.target.checked)}
                        />
                      }
                      label="Active"
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Primary Color"
                      type="color"
                      value={formData.theme_config.primary_color}
                      onChange={(e) => updateFormData('theme_config', 'primary_color', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Secondary Color"
                      type="color"
                      value={formData.theme_config.secondary_color}
                      onChange={(e) => updateFormData('theme_config', 'secondary_color', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Sidebar Style</InputLabel>
                      <Select
                        value={formData.theme_config.sidebar_style}
                        onChange={(e) => updateFormData('theme_config', 'sidebar_style', e.target.value)}
                        label="Sidebar Style"
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Navbar Style</InputLabel>
                      <Select
                        value={formData.theme_config.navbar_style}
                        onChange={(e) => updateFormData('theme_config', 'navbar_style', e.target.value)}
                        label="Navbar Style"
                      >
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.navigation_config.show_dashboard_thumbnails}
                          onChange={(e) => updateFormData('navigation_config', 'show_dashboard_thumbnails', e.target.checked)}
                        />
                      }
                      label="Show Dashboard Thumbnails"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.navigation_config.enable_search}
                          onChange={(e) => updateFormData('navigation_config', 'enable_search', e.target.checked)}
                        />
                      }
                      label="Enable Search"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.navigation_config.show_view_counts}
                          onChange={(e) => updateFormData('navigation_config', 'show_view_counts', e.target.checked)}
                        />
                      }
                      label="Show View Counts"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.navigation_config.enable_favorites}
                          onChange={(e) => updateFormData('navigation_config', 'enable_favorites', e.target.checked)}
                        />
                      }
                      label="Enable Favorites"
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={formData.branding_config.company_name}
                      onChange={(e) => updateFormData('branding_config', 'company_name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Company Logo URL"
                      value={formData.branding_config.company_logo}
                      onChange={(e) => updateFormData('branding_config', 'company_logo', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Favicon URL"
                      value={formData.branding_config.favicon_url}
                      onChange={(e) => updateFormData('branding_config', 'favicon_url', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </TabPanel>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveWebview} variant="contained" disabled={submitting}>
              {submitting ? 'Saving...' : (selectedWebview ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Delete Webview</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              Are you sure you want to delete "{selectedWebview?.display_name}"?
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This action cannot be undone. The webview URL will become inaccessible.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default WebviewsAdminPage;