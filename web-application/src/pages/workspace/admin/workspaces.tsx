// web-application/src/pages/workspace/admin/workspaces.tsx
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
  Grid
} from '@mui/material';
import {
  Business as WorkspaceIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

// Import common components
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';
import { authStorage, workspaceStorage } from '@/utils/storageUtils';

// Import hooks and services
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';

// Types
interface WorkspaceData {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  user_count: number;
  dashboard_count: number;
  dataset_count: number;
  is_active: boolean;
  is_default: boolean;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  settings?: {
    timezone?: string;
    theme?: 'light' | 'dark' | 'auto';
    max_users?: number;
    features?: {
      sql_editor: boolean;
      dashboard_builder: boolean;
      data_exports: boolean;
      api_access: boolean;
    };
  };
}

interface WorkspaceFormData {
  name: string;
  display_name: string;
  slug: string;
  description: string;
  is_active: boolean;
  settings: {
    timezone: string;
    theme: 'light' | 'dark' | 'auto';
    max_users: number;
    features: {
      sql_editor: boolean;
      dashboard_builder: boolean;
      data_exports: boolean;
      api_access: boolean;
    };
  };
}

const WorkspacesAdminPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace: currentWorkspace } = useAuth();
  const { hasPermission } = usePermissions();

  // State management
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceData | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<WorkspaceData | null>(null);

  // Form state
  const [formData, setFormData] = useState<WorkspaceFormData>({
    name: '',
    display_name: '',
    slug: '',
    description: '',
    is_active: true,
    settings: {
      timezone: 'UTC',
      theme: 'light',
      max_users: 50,
      features: {
        sql_editor: true,
        dashboard_builder: true,
        data_exports: true,
        api_access: false
      }
    }
  });

  // Load workspaces data
  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
  try {
    setLoading(true);
    setError(null);
    const token = authStorage.getToken();
    const response = await fetch('/api/admin/workspaces', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load workspaces: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('API Response:', result); // For debugging
    
    // Fix: Map backend data to frontend interface
    if (result.success && result.data) {
      const mappedWorkspaces = result.data.map((workspace: any) => ({
        id: workspace.id,
        name: workspace.name,
        display_name: workspace.display_name || workspace.name,
        description: workspace.description || '',
        slug: workspace.slug,
        logo_url: workspace.logo_url || null,
        user_count: workspace.member_count || 0,
        dashboard_count: workspace.dashboard_count || 0,
        dataset_count: workspace.dataset_count || 0,
        is_active: workspace.is_active,
        is_default: false, // You can determine this based on your logic
        status: workspace.is_active ? 'active' : 'inactive' as 'active' | 'inactive' | 'suspended', // Map boolean to status
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        last_accessed: workspace.last_accessed || null,
        owner: workspace.owner || null,
        settings: workspace.settings || {
          timezone: 'UTC',
          theme: 'light' as const,
          max_users: 50,
          features: {
            sql_editor: true,
            dashboard_builder: true,
            data_exports: true,
            api_access: true
          }
        }
      }));
      
      setWorkspaces(mappedWorkspaces);
    } else {
      setWorkspaces([]);
      setError('Failed to load workspaces data');
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    setWorkspaces([]);
  } finally {
    setLoading(false);
  }
};

  // Table column definitions
  const columns: TableColumn<WorkspaceData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Workspace',
      sortable: true,
      render: (workspace: WorkspaceData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={workspace.logo_url}
            sx={{ 
              width: 40, 
              height: 40,
              bgcolor: workspace.is_active ? 'primary.main' : 'grey.400'
            }}
          >
            <WorkspaceIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              {workspace.display_name || workspace.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              /{workspace.slug}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: (workspace: WorkspaceData) => (
        <Chip
          label={workspace.status.toUpperCase()}
          size="small"
          color={
            workspace.status === 'active' ? 'success' : 
            workspace.status === 'suspended' ? 'error' : 'default'
          }
          variant={workspace.is_active ? 'filled' : 'outlined'}
        />
      )
    },
    {
      key: 'user_count',
      label: 'Users',
      sortable: true,
      align: 'center',
      render: (workspace: WorkspaceData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
          <PeopleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {workspace.user_count.toLocaleString()}
          </Typography>
        </Box>
      )
    },
    {
      key: 'dashboard_count',
      label: 'Dashboards',
      sortable: true,
      align: 'center',
      render: (workspace: WorkspaceData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
          <DashboardIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {workspace.dashboard_count.toLocaleString()}
          </Typography>
        </Box>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (workspace: WorkspaceData) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {workspace.owner?.name || 'System'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {workspace.owner?.email}
          </Typography>
        </Box>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (workspace: WorkspaceData) => (
        <Box>
          <Typography variant="body2">
            {new Date(workspace.created_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(workspace.created_at).toLocaleTimeString()}
          </Typography>
        </Box>
      )
    },
    {
      key: 'last_accessed',
      label: 'Last Accessed',
      sortable: true,
      render: (workspace: WorkspaceData) => (
        workspace.last_accessed ? (
          <Box>
            <Typography variant="body2">
              {new Date(workspace.last_accessed).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(workspace.last_accessed).toLocaleTimeString()}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Never
          </Typography>
        )
      )
    }
  ], []);

  // Table actions
  const actions: TableAction<WorkspaceData>[] = useMemo(() => [
    {
      label: 'View Workspace',
      icon: <ViewIcon fontSize="small" />,
      onClick: (workspace) => {
        router.replace(`/workspace/${workspace.slug}`);
      },
      color: 'primary'
    },
    {
      label: 'Edit Workspace',
      icon: <EditIcon fontSize="small" />,
      onClick: (workspace) => {
        handleEditWorkspace(workspace);
      },
      color: 'primary',
      show: () => hasPermission('workspace', 'update')
    },
    {
      label: 'Workspace Settings',
      icon: <SettingsIcon fontSize="small" />,
      onClick: (workspace) => {
        router.replace(`/workspace/${workspace.slug}/admin/settings`);
      },
      color: 'default',
      show: () => hasPermission('workspace', 'admin')
    },
    {
      label: 'Manage Users',
      icon: <AdminIcon fontSize="small" />,
      onClick: (workspace) => {
        router.replace(`/workspace/admin/users`);
      },
      color: 'default',
      show: () => hasPermission('user_mgmt', 'read')
    },
    {
      label: 'Delete Workspace',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (workspace) => {
        handleDeleteWorkspace(workspace);
      },
      color: 'error',
      show: (workspace) => hasPermission('workspace', 'delete') && !workspace.is_default,
      disabled: (workspace) => workspace.user_count > 0
    }
  ], [hasPermission, router]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'suspended', label: 'Suspended' }
      ]
    },
    {
      key: 'theme',
      label: 'Theme',
      options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'auto', label: 'Auto' }
      ]
    }
  ];

  // Handle workspace actions
  const handleCreateWorkspace = () => {
    setFormData({
      name: '',
      display_name: '',
      slug: '',
      description: '',
      is_active: true,
      settings: {
        timezone: 'UTC',
        theme: 'light',
        max_users: 50,
        features: {
          sql_editor: true,
          dashboard_builder: true,
          data_exports: true,
          api_access: false
        }
      }
    });
    setEditingWorkspace(null);
    setEditDialogOpen(true);
  };

  const handleEditWorkspace = (workspace: WorkspaceData) => {
    setFormData({
      name: workspace.name,
      display_name: workspace.display_name,
      slug: workspace.slug,
      description: workspace.description || '',
      is_active: workspace.is_active,
      settings: {
        timezone: workspace.settings?.timezone || 'UTC',
        theme: workspace.settings?.theme || 'light',
        max_users: workspace.settings?.max_users || 50,
        features: workspace.settings?.features || {
          sql_editor: true,
          dashboard_builder: true,
          data_exports: true,
          api_access: false
        }
      }
    });
    setEditingWorkspace(workspace);
    setEditDialogOpen(true);
  };

  const handleDeleteWorkspace = (workspace: WorkspaceData) => {
    setDeletingWorkspace(workspace);
    setDeleteDialogOpen(true);
  };

  const handleSaveWorkspace = async () => {
    try {
      const url = editingWorkspace 
        ? `/api/admin/workspaces/${editingWorkspace.id}`
        : '/api/admin/workspaces';
      
      const method = editingWorkspace ? 'PUT' : 'POST';
      const token = authStorage.getToken();
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save workspace: ${response.statusText}`);
      }

      setEditDialogOpen(false);
      await loadWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workspace');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWorkspace) return;

    try {
      const token = authStorage.getToken();
      const response = await fetch(`/api/admin/workspaces/${deletingWorkspace.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete workspace: ${response.statusText}`);
      }

      setDeleteDialogOpen(false);
      setDeletingWorkspace(null);
      await loadWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
    }
  };

  return (
    <PermissionGate permissions={['workspace.read']}>
      <WorkspaceLayout>
        <Box sx={{ p: 3 }}>
          <CommonTableLayout
            title="Workspace Management"
            subtitle="Manage all workspaces in the system"
            data={workspaces}
            columns={columns}
            actions={actions}
            filters={filters}
            loading={loading}
            error={error as any}
            searchable={true}
            searchPlaceholder="Search workspaces by name, slug, or owner..."
            selectable={true}
            selectedItems={selectedWorkspaces}
            onSelectionChange={setSelectedWorkspaces}
            pagination={true}
            itemsPerPage={25}
            showCreateButton={hasPermission('workspace', 'create')}
            createButtonLabel="Create Workspace"
            onCreateClick={handleCreateWorkspace}
            onRefresh={loadWorkspaces}
            emptyState={
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <WorkspaceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No workspaces found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create your first workspace to get started
                </Typography>
              </Box>
            }
          />

          {/* Edit/Create Workspace Dialog */}
          <Dialog 
            open={editDialogOpen} 
            onClose={() => setEditDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {editingWorkspace ? 'Edit Workspace' : 'Create New Workspace'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Workspace Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Display Name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    helperText="URL-friendly identifier"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={formData.settings.theme}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, theme: e.target.value as any }
                      })}
                      label="Theme"
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveWorkspace} variant="contained">
                {editingWorkspace ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog 
            open={deleteDialogOpen} 
            onClose={() => setDeleteDialogOpen(false)}
          >
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This action cannot be undone. All data in this workspace will be permanently deleted.
              </Alert>
              <Typography>
                Are you sure you want to delete the workspace "{deletingWorkspace?.display_name || deletingWorkspace?.name}"?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmDelete} variant="contained" color="error">
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </WorkspaceLayout>
    </PermissionGate>
  );
};

export default WorkspacesAdminPage;