// src/pages/workspace/admin/settings.tsx
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Grid,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Palette as ThemeIcon,
  Language as LanguageIcon,
  Schedule as TimezoneIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Edit as EditIcon
} from '@mui/icons-material';

// Import layout and components
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';

// Import hooks
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

// Types
interface WorkspaceSettings {
  general: {
    name: string;
    display_name: string;
    description: string;
    timezone: string;
    language: string;
    date_format: string;
    number_format: string;
    currency: string;
  };
  theme: {
    default_theme: 'light' | 'dark' | 'auto';
    custom_colors: {
      primary: string;
      secondary: string;
    };
    logo_url: string;
    favicon_url: string;
  };
  features: {
    sql_editor: boolean;
    dashboard_builder: boolean;
    data_exports: boolean;
    api_access: boolean;
    webhooks: boolean;
    public_dashboards: boolean;
  };
  security: {
    session_timeout: number;
    max_query_timeout: number;
    max_export_rows: number;
    allow_external_data_sources: boolean;
    require_ssl: boolean;
  };
  notifications: {
    email_notifications: boolean;
    webhook_notifications: boolean;
    alert_thresholds: {
      error_rate: number;
      response_time: number;
    };
  };
}

const WorkspaceAdminSettingsPage: NextPage = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State
  const [settings, setSettings] = useState<WorkspaceSettings>({
    general: {
      name: '',
      display_name: '',
      description: '',
      timezone: 'UTC',
      language: 'en-US',
      date_format: 'MM/DD/YYYY',
      number_format: 'en-US',
      currency: 'USD'
    },
    theme: {
      default_theme: 'light',
      custom_colors: {
        primary: '#1976d2',
        secondary: '#dc004e'
      },
      logo_url: '',
      favicon_url: ''
    },
    features: {
      sql_editor: true,
      dashboard_builder: true,
      data_exports: true,
      api_access: false,
      webhooks: false,
      public_dashboards: true
    },
    security: {
      session_timeout: 3600,
      max_query_timeout: 300,
      max_export_rows: 100000,
      allow_external_data_sources: false,
      require_ssl: true
    },
    notifications: {
      email_notifications: true,
      webhook_notifications: false,
      alert_thresholds: {
        error_rate: 5,
        response_time: 2000
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (workspace?.id) {
      loadSettings();
    }
  }, [workspace?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspaces/${workspace?.id}/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setSettings(data.settings || settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspaces/${workspace?.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ settings })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConfirmDialog(true);
  };

  const confirmReset = () => {
    loadSettings();
    setConfirmDialog(false);
  };

  const updateSettings = (section: keyof WorkspaceSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateNestedSettings = (section: keyof WorkspaceSettings, subsection: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  return (
    <PermissionGate permissions={['workspace.update']}>
      <WorkspaceLayout>
        <Box sx={{ py: 3, px: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Workspace Settings
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Configure workspace preferences and features
            </Typography>
            
            {/* Action Bar */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={loading}
              >
                Reset Changes
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={loading}
              >
                Save Settings
              </Button>
            </Box>
          </Box>

          {/* Status Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {saved && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Settings saved successfully!
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* General Settings */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <EditIcon sx={{ mr: 1 }} />
                    General Settings
                  </Typography>

                  <TextField
                    label="Workspace Name"
                    fullWidth
                    value={settings.general.name}
                    onChange={(e) => updateSettings('general', 'name', e.target.value)}
                    margin="normal"
                  />

                  <TextField
                    label="Display Name"
                    fullWidth
                    value={settings.general.display_name}
                    onChange={(e) => updateSettings('general', 'display_name', e.target.value)}
                    margin="normal"
                  />

                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    value={settings.general.description}
                    onChange={(e) => updateSettings('general', 'description', e.target.value)}
                    margin="normal"
                  />

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={settings.general.timezone}
                      onChange={(e) => updateSettings('general', 'timezone', e.target.value)}
                      label="Timezone"
                    >
                      <MenuItem value="UTC">UTC</MenuItem>
                      <MenuItem value="America/New_York">Eastern Time</MenuItem>
                      <MenuItem value="America/Chicago">Central Time</MenuItem>
                      <MenuItem value="America/Denver">Mountain Time</MenuItem>
                      <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                      <MenuItem value="Europe/London">London</MenuItem>
                      <MenuItem value="Europe/Berlin">Berlin</MenuItem>
                      <MenuItem value="Asia/Tokyo">Tokyo</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={settings.general.language}
                      onChange={(e) => updateSettings('general', 'language', e.target.value)}
                      label="Language"
                    >
                      <MenuItem value="en-US">English (US)</MenuItem>
                      <MenuItem value="en-GB">English (UK)</MenuItem>
                      <MenuItem value="es-ES">Español</MenuItem>
                      <MenuItem value="fr-FR">Français</MenuItem>
                      <MenuItem value="de-DE">Deutsch</MenuItem>
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            {/* Theme Settings */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <ThemeIcon sx={{ mr: 1 }} />
                    Theme & Branding
                  </Typography>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>Default Theme</InputLabel>
                    <Select
                      value={settings.theme.default_theme}
                      onChange={(e) => updateSettings('theme', 'default_theme', e.target.value)}
                      label="Default Theme"
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto (System)</MenuItem>
                    </Select>
                  </FormControl>

                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <TextField
                      label="Primary Color"
                      type="color"
                      value={settings.theme.custom_colors.primary}
                      onChange={(e) => updateNestedSettings('theme', 'custom_colors', 'primary', e.target.value)}
                      sx={{ flexGrow: 1 }}
                    />

                    <TextField
                      label="Secondary Color"
                      type="color"
                      value={settings.theme.custom_colors.secondary}
                      onChange={(e) => updateNestedSettings('theme', 'custom_colors', 'secondary', e.target.value)}
                      sx={{ flexGrow: 1 }}
                    />
                  </Box>

                  <TextField
                    label="Logo URL"
                    fullWidth
                    value={settings.theme.logo_url}
                    onChange={(e) => updateSettings('theme', 'logo_url', e.target.value)}
                    margin="normal"
                    placeholder="https://example.com/logo.png"
                  />

                  <TextField
                    label="Favicon URL"
                    fullWidth
                    value={settings.theme.favicon_url}
                    onChange={(e) => updateSettings('theme', 'favicon_url', e.target.value)}
                    margin="normal"
                    placeholder="https://example.com/favicon.ico"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Feature Settings */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Feature Settings
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.features.sql_editor}
                          onChange={(e) => updateSettings('features', 'sql_editor', e.target.checked)}
                        />
                      }
                      label="SQL Editor"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.features.dashboard_builder}
                          onChange={(e) => updateSettings('features', 'dashboard_builder', e.target.checked)}
                        />
                      }
                      label="Dashboard Builder"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.features.data_exports}
                          onChange={(e) => updateSettings('features', 'data_exports', e.target.checked)}
                        />
                      }
                      label="Data Exports"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.features.api_access}
                          onChange={(e) => updateSettings('features', 'api_access', e.target.checked)}
                        />
                      }
                      label="API Access"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.features.webhooks}
                          onChange={(e) => updateSettings('features', 'webhooks', e.target.checked)}
                        />
                      }
                      label="Webhooks"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.features.public_dashboards}
                          onChange={(e) => updateSettings('features', 'public_dashboards', e.target.checked)}
                        />
                      }
                      label="Public Dashboards"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Security Settings */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <SecurityIcon sx={{ mr: 1 }} />
                    Security Settings
                  </Typography>

                  <TextField
                    label="Session Timeout (seconds)"
                    type="number"
                    fullWidth
                    value={settings.security.session_timeout}
                    onChange={(e) => updateSettings('security', 'session_timeout', parseInt(e.target.value))}
                    margin="normal"
                  />

                  <TextField
                    label="Max Query Timeout (seconds)"
                    type="number"
                    fullWidth
                    value={settings.security.max_query_timeout}
                    onChange={(e) => updateSettings('security', 'max_query_timeout', parseInt(e.target.value))}
                    margin="normal"
                  />

                  <TextField
                    label="Max Export Rows"
                    type="number"
                    fullWidth
                    value={settings.security.max_export_rows}
                    onChange={(e) => updateSettings('security', 'max_export_rows', parseInt(e.target.value))}
                    margin="normal"
                  />

                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.security.allow_external_data_sources}
                          onChange={(e) => updateSettings('security', 'allow_external_data_sources', e.target.checked)}
                        />
                      }
                      label="Allow External Data Sources"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.security.require_ssl}
                          onChange={(e) => updateSettings('security', 'require_ssl', e.target.checked)}
                        />
                      }
                      label="Require SSL"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Reset Confirmation Dialog */}
          <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
            <DialogTitle>Reset Settings</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to reset all settings to their saved values? 
                This will discard any unsaved changes.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
              <Button onClick={confirmReset} variant="contained" color="primary">
                Reset
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </WorkspaceLayout>
    </PermissionGate>
  );
};

// CRITICAL: This must be the default export and must be a React component
export default WorkspaceAdminSettingsPage;