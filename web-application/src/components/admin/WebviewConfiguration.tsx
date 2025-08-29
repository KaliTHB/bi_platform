// File: web-application/src/components/admin/WebviewConfiguration.tsx

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
  DialogActions
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
      theme_config: webview.theme_config,
      navigation_config: webview.navigation_config,
      branding_config: webview.branding_config,
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

  const updateFormData = (section: keyof WebviewFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
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
            {webviewConfigs?.map((webview: WebviewConfig) => (
              <Grid item xs={12} md={6} key={webview.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Web color="primary" />
                        <Typography variant="h6">
                          {webview.display_name}
                        </Typography>
                      </Box>
                      
                      <Box display="flex" gap={1}>
                        <IconButton size="small" onClick={() => handleEditWebview(webview)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => window.open(`/${webview.webview_name}`, '_blank')}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="textSecondary" paragraph>
                      URL: <code>/{webview.webview_name}</code>
                    </Typography>

                    {webview.description && (
                      <Typography variant="body2" paragraph>
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
                            checked={formData.navigation_config.enable_search}
                            onChange={(e) => updateFormData('navigation_config', 'enable_search', e.target.checked)}
                          />
                        }
                        label="Enable Search"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Status */}
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                }
                label="Active Webview"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingWebview ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  );
};