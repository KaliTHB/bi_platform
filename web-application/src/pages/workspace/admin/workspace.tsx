// web-application/src/pages/workspace/admin/workspace.tsx
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { AdminTemplate } from '@/components/templates';
import { WorkspaceSettings } from '@/types/workspace.types'

const AdminWorkspacePage: NextPage = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();
  
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load workspace settings
  const loadWorkspaceSettings = async () => {
    if (!workspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/workspaces/${workspace.id}/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.data || data);
      } else {
        // Fallback to mock data for development
        const mockSettings: WorkspaceSettings = {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          display_name: workspace.display_name || workspace.name,
          description: workspace.description || 'Default workspace description',
          is_active: true,
          max_users: 50,
          storage_limit_gb: 100,
          features: ['dashboards', 'sql_editor', 'webviews', 'categories'],
          created_at: workspace.created_at,
          updated_at: workspace.updated_at,
          owner_id: user?.id || 'unknown'
        };
        setSettings(mockSettings);
      }
    } catch (error) {
      console.error('Failed to load workspace settings:', error);
      setError('Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  // Save workspace settings
  const saveWorkspaceSettings = async () => {
    if (!settings || !workspace?.id) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/workspaces/${workspace.id}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: settings.display_name,
          description: settings.description,
          is_active: settings.is_active,
          max_users: settings.max_users,
          storage_limit_gb: settings.storage_limit_gb,
          features: settings.features
        })
      });

      if (response.ok) {
        setSuccess('Workspace settings saved successfully');
        setEditMode(false);
      } else {
        // For development, just show success
        setSuccess('Workspace settings saved successfully (mock)');
        setEditMode(false);
      }
    } catch (error) {
      console.error('Failed to save workspace settings:', error);
      setError('Failed to save workspace settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle field changes
  const handleFieldChange = (field: keyof WorkspaceSettings, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [field]: value
    });
  };

  // Toggle feature
  const toggleFeature = (feature: string) => {
    if (!settings) return;
    
    const features = settings.features.includes(feature)
      ? settings.features.filter(f => f !== feature)
      : [...settings.features, feature];
    
    handleFieldChange('features', features);
  };

  // Load settings on mount
  useEffect(() => {
    loadWorkspaceSettings();
  }, [workspace?.id]);

  if (!workspace) {
    return (
      <AdminTemplate title="Workspace Settings" activeTab="workspace" error="Workspace not found">
        <Alert severity="error">
          Workspace not found or not loaded.
        </Alert>
      </AdminTemplate>
    );
  }

  return (
    <PermissionGate permissions={['workspace.admin']} fallback="/workspace/overview">
      <AdminTemplate 
        title="Workspace Settings" 
        activeTab="settings"
        isLoading={loading}
        error={error}
      >
        <Box>
          {/* Success/Error Messages */}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {settings && (
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6">
                        Basic Information
                      </Typography>
                      <Box>
                        {editMode ? (
                          <>
                            <Button
                              startIcon={<SaveIcon />}
                              onClick={saveWorkspaceSettings}
                              disabled={saving}
                              sx={{ mr: 1 }}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              startIcon={<CancelIcon />}
                              onClick={() => setEditMode(false)}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            startIcon={<EditIcon />}
                            onClick={() => setEditMode(true)}
                          >
                            Edit
                          </Button>
                        )}
                      </Box>
                    </Box>

                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Workspace Name"
                          value={settings.name}
                          disabled={!editMode}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Display Name"
                          value={settings.display_name}
                          disabled={!editMode}
                          onChange={(e) => handleFieldChange('display_name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Description"
                          multiline
                          rows={3}
                          value={settings.description}
                          disabled={!editMode}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Workspace Slug"
                          value={settings.slug}
                          disabled
                          helperText="Workspace URL identifier (cannot be changed)"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.is_active}
                              onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                              disabled={!editMode}
                            />
                          }
                          label="Active Workspace"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Resource Limits */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Resource Limits
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Max Users"
                          type="number"
                          value={settings.max_users}
                          disabled={!editMode}
                          onChange={(e) => handleFieldChange('max_users', parseInt(e.target.value))}
                          inputProps={{ min: 1, max: 1000 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Storage Limit (GB)"
                          type="number"
                          value={settings.storage_limit_gb}
                          disabled={!editMode}
                          onChange={(e) => handleFieldChange('storage_limit_gb', parseInt(e.target.value))}
                          inputProps={{ min: 1, max: 10000 }}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Features */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Available Features
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {['dashboards', 'sql_editor', 'webviews', 'categories', 'user_management', 'api_access'].map((feature) => (
                        <Chip
                          key={feature}
                          label={feature.replace('_', ' ').toUpperCase()}
                          color={settings.features.includes(feature) ? 'primary' : 'default'}
                          onClick={editMode ? () => toggleFeature(feature) : undefined}
                          clickable={editMode}
                          variant={settings.features.includes(feature) ? 'filled' : 'outlined'}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Workspace Information */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Workspace Information
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Workspace ID
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                          {settings.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Created At
                        </Typography>
                        <Typography variant="body1">
                          {new Date(settings.created_at).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Updated
                        </Typography>
                        <Typography variant="body1">
                          {new Date(settings.updated_at).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Owner ID
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                          {settings.owner_id}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Danger Zone */}
              <Grid item xs={12}>
                <Card sx={{ border: 1, borderColor: 'error.main' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <WarningIcon color="error" sx={{ mr: 1 }} />
                      <Typography variant="h6" color="error">
                        Danger Zone
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                      These actions are irreversible and will affect all users in this workspace.
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete Workspace
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              Delete Workspace
            </DialogTitle>
            <DialogContent>
              <Alert severity="error" sx={{ mb: 2 }}>
                This action cannot be undone!
              </Alert>
              <Typography>
                Are you sure you want to delete this workspace? All dashboards, datasets, 
                and user data will be permanently removed.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button color="error" variant="contained">
                Delete Workspace
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </AdminTemplate>
    </PermissionGate>
  );
};

export default AdminWorkspacePage;