// File: web-application/src/components/admin/WebviewConfiguration.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Grid,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  ExpandMore,
  Palette,
  Navigation,
  Branding
} from '@mui/icons-material';
import { useWebviewConfiguration } from '../../hooks/useWebviewConfiguration';

interface WebviewConfig {
  id: string;
  webview_name: string;
  display_name: string;
  description?: string;
  theme_config: any;
  navigation_config: any;
  branding_config: any;
  default_category_id?: string;
  is_active: boolean;
}

interface WebviewConfigurationProps {
  workspaceId: string;
}

export const WebviewConfiguration: React.FC<WebviewConfigurationProps> = ({ workspaceId }) => {
  const {
    webviews,
    categories,
    loading,
    error,
    loadWebviews,
    createWebview,
    updateWebview,
    deleteWebview
  } = useWebviewConfiguration(workspaceId);

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    webview?: WebviewConfig;
  }>({ open: false });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    webview?: WebviewConfig;
  }>({ open: false });

  useEffect(() => {
    loadWebviews();
  }, [workspaceId]);

  const handleCreateNew = () => {
    setEditDialog({ open: true });
  };

  const handleEdit = (webview: WebviewConfig) => {
    setEditDialog({ open: true, webview });
  };

  const handleDelete = (webview: WebviewConfig) => {
    setDeleteDialog({ open: true, webview });
  };

  const confirmDelete = async () => {
    if (deleteDialog.webview) {
      await deleteWebview(deleteDialog.webview.id);
      setDeleteDialog({ open: false });
      loadWebviews();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Webview Configuration</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateNew}
        >
          Create Webview
        </Button>
      </Box>

      {/* Webview Cards */}
      <Grid container spacing={3}>
        {webviews.map((webview) => (
          <Grid item xs={12} sm={6} md={4} key={webview.id}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6" component="h3">
                    {webview.display_name}
                  </Typography>
                  <Chip 
                    label={webview.is_active ? 'Active' : 'Inactive'} 
                    color={webview.is_active ? 'success' : 'default'}
                    size="small" 
                  />
                </Box>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  URL: /{webview.webview_name}
                </Typography>

                {webview.description && (
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {webview.description}
                  </Typography>
                )}

                <Box mt={2}>
                  <Typography variant="caption" color="textSecondary">
                    Theme: {webview.theme_config?.navbar_style || 'Default'}
                  </Typography>
                </Box>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  href={`/${webview.webview_name}`}
                  target="_blank"
                  disabled={!webview.is_active}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => handleEdit(webview)}
                >
                  Edit
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(webview)}
                >
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {webviews.length === 0 && (
          <Grid item xs={12}>
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center"
              minHeight={200}
              bgcolor="grey.50"
              borderRadius={2}
              p={3}
            >
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No webviews configured
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center" mb={2}>
                Create a webview panel to provide dashboard access for end users
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateNew}
              >
                Create Webview
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Edit Dialog */}
      <WebviewEditDialog
        open={editDialog.open}
        webview={editDialog.webview}
        categories={categories}
        onClose={() => setEditDialog({ open: false })}
        onSave={async (webviewData) => {
          if (editDialog.webview) {
            await updateWebview(editDialog.webview.id, webviewData);
          } else {
            await createWebview(webviewData);
          }
          setEditDialog({ open: false });
          loadWebviews();
        }}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete Webview</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.webview?.display_name}"?
            This will make the webview URL inaccessible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Webview Edit Dialog Component
interface WebviewEditDialogProps {
  open: boolean;
  webview?: WebviewConfig;
  categories: any[];
  onClose: () => void;
  onSave: (webviewData: any) => Promise<void>;
}

const WebviewEditDialog: React.FC<WebviewEditDialogProps> = ({
  open,
  webview,
  categories,
  onClose,
  onSave
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    webview_name: '',
    display_name: '',
    description: '',
    theme_config: {
      primary_color: '#1976d2',
      secondary_color: '#dc004e',
      background_color: '#ffffff',
      navbar_style: 'light',
      sidebar_style: 'light'
    },
    navigation_config: {
      show_dashboard_thumbnails: true,
      show_view_counts: true,
      show_last_accessed: true,
      enable_search: true,
      sidebar_width: 280
    },
    branding_config: {
      company_name: '',
      company_logo: '',
      favicon_url: ''
    },
    default_category_id: '',
    is_active: true
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (webview) {
      setFormData({
        webview_name: webview.webview_name,
        display_name: webview.display_name,
        description: webview.description || '',
        theme_config: { ...formData.theme_config, ...webview.theme_config },
        navigation_config: { ...formData.navigation_config, ...webview.navigation_config },
        branding_config: { ...formData.branding_config, ...webview.branding_config },
        default_category_id: webview.default_category_id || '',
        is_active: webview.is_active
      });
    } else {
      setFormData({
        webview_name: '',
        display_name: '',
        description: '',
        theme_config: {
          primary_color: '#1976d2',
          secondary_color: '#dc004e',
          background_color: '#ffffff',
          navbar_style: 'light',
          sidebar_style: 'light'
        },
        navigation_config: {
          show_dashboard_thumbnails: true,
          show_view_counts: true,
          show_last_accessed: true,
          enable_search: true,
          sidebar_width: 280
        },
        branding_config: {
          company_name: '',
          company_logo: '',
          favicon_url: ''
        },
        default_category_id: '',
        is_active: true
      });
    }
  }, [webview, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {webview ? 'Edit Webview' : 'Create Webview'}
      </DialogTitle>
      
      <DialogContent dividers>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Basic" />
          <Tab label="Theme" />
          <Tab label="Navigation" />
          <Tab label="Branding" />
        </Tabs>

        {/* Basic Tab */}
        {tabValue === 0 && (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="URL Name"
                  fullWidth
                  value={formData.webview_name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    webview_name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                  }))}
                  required
                  helperText="Used in URL: /{webview-name}"
                  disabled={!!webview} // Don't allow changing URL for existing webviews
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Display Name"
                  fullWidth
                  value={formData.display_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  required
                  helperText="Name shown to users"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Default Category</InputLabel>
                  <Select
                    value={formData.default_category_id}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      default_category_id: e.target.value 
                    }))}
                    label="Default Category"
                  >
                    <MenuItem value="">None</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        is_active: e.target.checked 
                      }))}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Theme Tab */}
        {tabValue === 1 && (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Primary Color"
                  type="color"
                  fullWidth
                  value={formData.theme_config.primary_color}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    theme_config: { ...prev.theme_config, primary_color: e.target.value }
                  }))}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Secondary Color"
                  type="color"
                  fullWidth
                  value={formData.theme_config.secondary_color}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    theme_config: { ...prev.theme_config, secondary_color: e.target.value }
                  }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Navbar Style</InputLabel>
                  <Select
                    value={formData.theme_config.navbar_style}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      theme_config: { ...prev.theme_config, navbar_style: e.target.value }
                    }))}
                    label="Navbar Style"
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sidebar Style</InputLabel>
                  <Select
                    value={formData.theme_config.sidebar_style}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      theme_config: { ...prev.theme_config, sidebar_style: e.target.value }
                    }))}
                    label="Sidebar Style"
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Navigation Tab */}
        {tabValue === 2 && (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sidebar Width (px)"
                  type="number"
                  fullWidth
                  value={formData.navigation_config.sidebar_width}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    navigation_config: { 
                      ...prev.navigation_config, 
                      sidebar_width: parseInt(e.target.value) || 280 
                    }
                  }))}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Navigation Features
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.navigation_config.show_dashboard_thumbnails}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        navigation_config: { 
                          ...prev.navigation_config, 
                          show_dashboard_thumbnails: e.target.checked 
                        }
                      }))}
                    />
                  }
                  label="Show Dashboard Thumbnails"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.navigation_config.show_view_counts}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        navigation_config: { 
                          ...prev.navigation_config, 
                          show_view_counts: e.target.checked 
                        }
                      }))}
                    />
                  }
                  label="Show View Counts"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.navigation_config.enable_search}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        navigation_config: { 
                          ...prev.navigation_config, 
                          enable_search: e.target.checked 
                        }
                      }))}
                    />
                  }
                  label="Enable Search"
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Branding Tab */}
        {tabValue === 3 && (
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Company Name"
                  fullWidth
                  value={formData.branding_config.company_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding_config: { ...prev.branding_config, company_name: e.target.value }
                  }))}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Company Logo URL"
                  fullWidth
                  value={formData.branding_config.company_logo}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding_config: { ...prev.branding_config, company_logo: e.target.value }
                  }))}
                  helperText="URL to company logo image"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Favicon URL"
                  fullWidth
                  value={formData.branding_config.favicon_url}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding_config: { ...prev.branding_config, favicon_url: e.target.value }
                  }))}
                  helperText="URL to favicon image"
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving || !formData.webview_name || !formData.display_name}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};