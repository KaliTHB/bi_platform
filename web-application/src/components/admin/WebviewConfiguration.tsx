import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Settings,
  Palette,
  Web
} from '@mui/icons-material';
import { PermissionGate } from '../shared/PermissionGate';
import { WebviewConfig } from '../../types';
import { useGetWebviewConfigsQuery, useCreateWebviewConfigMutation, useUpdateWebviewConfigMutation } from '../../store/api/webviewApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

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

export const WebviewConfiguration: React.FC = () => {
  const workspace = useSelector((state: RootState) => state.auth.workspace);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebview, setEditingWebview] = useState<WebviewConfig | null>(null);
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

  const { data: webviewConfigs, isLoading } = useGetWebviewConfigsQuery({
    workspaceId: workspace?.id || ''
  });

  const [createWebviewConfig] = useCreateWebviewConfigMutation();
  const [updateWebviewConfig] = useUpdateWebviewConfigMutation();

  const handleCreateWebview = () => {
    setEditingWebview(null);
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
    setDialogOpen(true);
  };

  const handleEditWebview = (webview: WebviewConfig) => {
    setEditingWebview(webview);
    setFormData({
      webview_name: webview.webview_name,
      display_name: webview.display_name,
      description: webview.description || '',
      theme_config: {
        primary_color: webview.theme_config.primary_color,
        secondary_color: webview.theme_config.secondary_color,
        background_color: webview.theme_config.background_color,
        sidebar_style: webview.theme_config.sidebar_style,
        navbar_style: webview.theme_config.navbar_style,
        font_family: webview.theme_config.font_family || 'Roboto, sans-serif' // Provide default
      },
      navigation_config: {
        show_dashboard_thumbnails: webview.navigation_config.show_dashboard_thumbnails,
        show_view_counts: webview.navigation_config.show_view_counts,
        show_last_accessed: webview.navigation_config.show_last_accessed,
        enable_search: webview.navigation_config.enable_search,
        enable_favorites: webview.navigation_config.enable_favorites,
        sidebar_width: webview.navigation_config.sidebar_width
      },
      branding_config: {
        company_name: webview.branding_config.company_name,
        company_logo: webview.branding_config.company_logo,
        favicon_url: webview.branding_config.favicon_url
      },
      is_active: webview.is_active
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingWebview) {
        await updateWebviewConfig({
          id: editingWebview.id,
          updates: formData
        }).unwrap();
      } else {
        await createWebviewConfig({
          workspace_id: workspace?.id || '',
          ...formData
        }).unwrap();
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save webview config:', error);
    }
  };

   const updateFormData = <T extends keyof WebviewFormData>(
  section: T,
  field?: T extends 'theme_config' | 'navigation_config' | 'branding_config' ? string : never,
  value?: any
) => {
  if (field !== undefined) {
    // Handle nested object update
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...((prev[section] as object) || {}),
        [field]: value
      }
    }));
  } else {
    // Handle direct property update
    setFormData(prev => ({ ...prev, [section]: value }));
  }
};

  return (
    <PermissionGate permissions={['webview.manage']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Webview Configuration
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Configure webview panels for dashboard consumption
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateWebview}
          >
            Create Webview
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Webviews provide simplified dashboard viewing interfaces for end users.
          Each webview has its own URL structure: <code>/{'{webview-name}'}/</code>
        </Alert>

        {isLoading ? (
          <Typography>Loading webview configurations...</Typography>
        ) : (
          <Grid container spacing={3}>
            {webviewConfigs?.data.map((webview) => (
              <Grid item xs={12} md={6} lg={4} key={webview.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {webview.display_name}
                        </Typography>
                        <Typography variant="body2" color="primary" gutterBottom>
                          /{webview.webview_name}/
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditWebview(webview)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Box>
                    </Box>

                    {webview.description && (
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {webview.description}
                      </Typography>
                    )}

                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      <Chip 
                        label={webview.is_active ? 'Active' : 'Inactive'}
                        color={webview.is_active ? 'success' : 'error'}
                        size="small"
                      />
                      
                      {webview.navigation_config.enable_search && (
                        <Chip label="Search Enabled" size="small" variant="outlined" />
                      )}
                      
                      {webview.navigation_config.show_dashboard_thumbnails && (
                        <Chip label="Thumbnails" size="small" variant="outlined" />
                      )}
                    </Box>

                    <Typography variant="body2" color="textSecondary">
                      Theme: {webview.theme_config.navbar_style} navbar, {webview.theme_config.sidebar_style} sidebar
                    </Typography>
                    
                    {webview.branding_config.company_name && (
                      <Typography variant="body2" color="textSecondary">
                        Brand: {webview.branding_config.company_name}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Webview Configuration Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingWebview ? 'Edit Webview Configuration' : 'Create Webview Configuration'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3} mt={1}>
              {/* Basic Settings */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Basic Settings</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Webview Name (URL)"
                        value={formData.webview_name}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          webview_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        }))}
                        fullWidth
                        required
                        helperText="Used in URL, lowercase letters and hyphens only"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Display Name"
                        value={formData.display_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        fullWidth
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.is_active}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          />
                        }
                        label="Active"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Theme Configuration */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Theme Configuration</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={4}>
                      <TextField
                        label="Primary Color"
                        type="color"
                        value={formData.theme_config.primary_color}
                        onChange={(e) => updateFormData('theme_config', 'primary_color', e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField
                        label="Secondary Color"
                        type="color"
                        value={formData.theme_config.secondary_color}
                        onChange={(e) => updateFormData('theme_config', 'secondary_color', e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField
                        label="Background Color"
                        type="color"
                        value={formData.theme_config.background_color}
                        onChange={(e) => updateFormData('theme_config', 'background_color', e.target.value)}
                        fullWidth
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
                    <Grid item xs={12}>
                      <TextField
                        label="Font Family"
                        value={formData.theme_config.font_family}
                        onChange={(e) => updateFormData('theme_config', 'font_family', e.target.value)}
                        fullWidth
                        helperText="CSS font family (e.g., 'Roboto, sans-serif')"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Navigation Configuration */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Navigation Configuration</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
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
                    <Grid item xs={12} sm={6}>
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
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.navigation_config.show_last_accessed}
                            onChange={(e) => updateFormData('navigation_config', 'show_last_accessed', e.target.checked)}
                          />
                        }
                        label="Show Last Accessed"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
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
                    <Grid item xs={12} sm={6}>
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
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Sidebar Width (px)"
                        type="number"
                        value={formData.navigation_config.sidebar_width}
                        onChange={(e) => updateFormData('navigation_config', 'sidebar_width', parseInt(e.target.value) || 280)}
                        fullWidth
                        inputProps={{ min: 200, max: 500 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Branding Configuration */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Branding Configuration</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Company Name"
                        value={formData.branding_config.company_name}
                        onChange={(e) => updateFormData('branding_config', 'company_name', e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Company Logo URL"
                        value={formData.branding_config.company_logo}
                        onChange={(e) => updateFormData('branding_config', 'company_logo', e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Favicon URL"
                        value={formData.branding_config.favicon_url}
                        onChange={(e) => updateFormData('branding_config', 'favicon_url', e.target.value)}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingWebview ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  );
};