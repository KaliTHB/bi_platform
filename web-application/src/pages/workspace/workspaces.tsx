// web-application/src/pages/workspace/workspaces.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Menu,
  Tooltip
} from '@mui/material';
import {
  Business as WorkspaceIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  ExitToApp as SwitchIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import CommonTableLayout, { 
  BaseListItem, 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

interface WorkspaceListItem extends BaseListItem {
  slug: string;
  is_active: boolean;
  is_public: boolean;
  member_count: number;
  dashboard_count: number;
  dataset_count: number;
  datasource_count: number;
  subscription_plan: 'free' | 'pro' | 'enterprise';
  storage_used_bytes: number;
  storage_limit_bytes: number;
  last_activity?: string;
  is_favorite?: boolean;
  tags: string[];
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  user_role?: {
    name: string;
    permissions: string[];
  };
}

const WorkspacesPage: React.FC = () => {
  const router = useRouter();
  const { workspace: currentWorkspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceListItem | null>(null);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    display_name: '',
    description: '',
    is_public: false,
    subscription_plan: 'free' as const
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
          setWorkspaces([
            {
              id: '1',
              name: 'acme-corp',
              display_name: 'ACME Corporation',
              description: 'Main corporate workspace for ACME Corp analytics',
              slug: 'acme-corp',
              is_active: true,
              is_public: false,
              member_count: 45,
              dashboard_count: 23,
              dataset_count: 67,
              datasource_count: 8,
              subscription_plan: 'enterprise',
              storage_used_bytes: 5368709120, // 5GB
              storage_limit_bytes: 107374182400, // 100GB
              last_activity: '2024-01-15T10:30:00Z',
              is_favorite: true,
              tags: ['corporate', 'main'],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-15T10:30:00Z',
              owner: {
                id: 'user1',
                name: 'John Doe',
                email: 'john@acme.com'
              },
              user_role: {
                name: 'Admin',
                permissions: ['workspace.admin', 'user.create', 'dashboard.create']
              }
            },
            {
              id: '2',
              name: 'analytics-team',
              display_name: 'Analytics Team',
              description: 'Data analytics and reporting workspace',
              slug: 'analytics-team',
              is_active: true,
              is_public: true,
              member_count: 12,
              dashboard_count: 18,
              dataset_count: 34,
              datasource_count: 5,
              subscription_plan: 'pro',
              storage_used_bytes: 2147483648, // 2GB
              storage_limit_bytes: 21474836480, // 20GB
              last_activity: '2024-01-14T15:45:00Z',
              is_favorite: false,
              tags: ['analytics', 'team'],
              created_at: '2024-01-10T00:00:00Z',
              updated_at: '2024-01-14T15:45:00Z',
              owner: {
                id: 'user2',
                name: 'Jane Smith',
                email: 'jane@acme.com'
              },
              user_role: {
                name: 'Editor',
                permissions: ['dashboard.create', 'dataset.create']
              }
            },
            {
              id: '3',
              name: 'sales-reports',
              display_name: 'Sales Reports',
              description: 'Sales team reporting and metrics',
              slug: 'sales-reports',
              is_active: true,
              is_public: false,
              member_count: 8,
              dashboard_count: 12,
              dataset_count: 15,
              datasource_count: 3,
              subscription_plan: 'free',
              storage_used_bytes: 536870912, // 512MB
              storage_limit_bytes: 1073741824, // 1GB
              last_activity: '2024-01-13T09:20:00Z',
              is_favorite: true,
              tags: ['sales', 'reports'],
              created_at: '2024-01-12T00:00:00Z',
              updated_at: '2024-01-13T09:20:00Z',
              owner: {
                id: 'user3',
                name: 'Mike Johnson',
                email: 'mike@acme.com'
              },
              user_role: {
                name: 'Viewer',
                permissions: ['dashboard.read', 'dataset.read']
              }
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStoragePercentage = (used: number, limit: number) => {
    return Math.round((used / limit) * 100);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'success';
      case 'pro': return 'primary';
      case 'free': return 'default';
      default: return 'default';
    }
  };

  const handleSwitchWorkspace = async (workspaceSlug: string) => {
    try {
      // Handle workspace switch
      router.replace(`/workspace/${workspaceSlug}`);
    } catch (error) {
      console.error('Error switching workspace:', error);
    }
  };

  const handleToggleFavorite = (workspaceId: string) => {
    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId 
        ? { ...ws, is_favorite: !ws.is_favorite }
        : ws
    ));
  };

  const columns: TableColumn<WorkspaceListItem>[] = [
    {
      key: 'name',
      label: 'Workspace',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            <WorkspaceIcon />
          </Avatar>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle2" fontWeight="bold">
                {item.display_name || item.name}
              </Typography>
              {item.is_favorite && <StarIcon fontSize="small" color="warning" />}
              {item.is_public ? (
                <PublicIcon fontSize="small" color="success" />
              ) : (
                <PrivateIcon fontSize="small" color="disabled" />
              )}
            </Box>
            {item.description && (
              <Typography variant="caption" color="textSecondary" noWrap>
                {item.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'subscription_plan',
      label: 'Plan',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.subscription_plan.toUpperCase()}
          size="small"
          color={getPlanColor(item.subscription_plan) as any}
          variant="filled"
        />
      )
    },
    {
      key: 'user_role',
      label: 'Your Role',
      sortable: true,
      render: (item) => item.user_role ? (
        <Chip
          label={item.user_role.name}
          size="small"
          variant="outlined"
        />
      ) : (
        <Typography variant="body2" color="textSecondary">None</Typography>
      )
    },
    {
      key: 'member_count',
      label: 'Members',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          <PeopleIcon fontSize="small" color="disabled" />
          <Typography variant="body2">{item.member_count}</Typography>
        </Box>
      )
    },
    {
      key: 'dashboard_count',
      label: 'Dashboards',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">{item.dashboard_count}</Typography>
      )
    },
    {
      key: 'dataset_count',
      label: 'Datasets',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">{item.dataset_count}</Typography>
      )
    },
    {
      key: 'storage_used_bytes',
      label: 'Storage',
      sortable: true,
      render: (item) => (
        <Box>
          <Typography variant="body2">
            {formatBytes(item.storage_used_bytes)} / {formatBytes(item.storage_limit_bytes)}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {getStoragePercentage(item.storage_used_bytes, item.storage_limit_bytes)}% used
          </Typography>
        </Box>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (item) => item.owner ? (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
            {item.owner.name.charAt(0)}
          </Avatar>
          <Typography variant="body2">{item.owner.name}</Typography>
        </Box>
      ) : (
        <Typography variant="body2" color="textSecondary">Unknown</Typography>
      )
    }
  ];

  const actions: TableAction<WorkspaceListItem>[] = [
    {
      label: 'Switch to Workspace',
      icon: <SwitchIcon fontSize="small" />,
      onClick: (item) => handleSwitchWorkspace(item.slug),
      primary: true
    },
    {
      label: 'Settings',
      icon: <SettingsIcon fontSize="small" />,
      onClick: (item) => {
        router.replace(`/workspace/${item.slug}/settings`);
      },
      requiresPermission: 'workspace.update'
    },
    {
      label: 'Manage Members',
      icon: <PeopleIcon fontSize="small" />,
      onClick: (item) => {
        router.replace(`/workspace/${item.slug}/admin/user-management`);
      },
      requiresPermission: 'user_mgmt.read'
    },
    {
      label: 'Toggle Favorite',
      icon: <StarIcon fontSize="small" />,
      onClick: (item) => handleToggleFavorite(item.id)
    }
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'subscription_plan',
      label: 'Plan',
      type: 'select',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise' }
      ]
    },
    {
      key: 'is_public',
      label: 'Visibility',
      type: 'select',
      options: [
        { value: 'true', label: 'Public' },
        { value: 'false', label: 'Private' }
      ]
    },
    {
      key: 'is_favorite',
      label: 'Favorites',
      type: 'select',
      options: [
        { value: 'true', label: 'Favorites Only' }
      ]
    }
  ];

  const renderWorkspaceCard = (workspace: WorkspaceListItem) => (
    <Card key={workspace.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
              <WorkspaceIcon />
            </Avatar>
            <Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6" component="h3">
                  {workspace.display_name || workspace.name}
                </Typography>
                <Tooltip title={workspace.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleToggleFavorite(workspace.id)}
                  >
                    {workspace.is_favorite ? (
                      <StarIcon fontSize="small" color="warning" />
                    ) : (
                      <StarBorderIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {workspace.description}
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={workspace.subscription_plan.toUpperCase()}
              size="small"
              color={getPlanColor(workspace.subscription_plan) as any}
            />
            {workspace.is_public ? (
              <PublicIcon fontSize="small" color="success" />
            ) : (
              <PrivateIcon fontSize="small" color="disabled" />
            )}
          </Box>
        </Box>

        <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={2} mb={2}>
          <Box textAlign="center">
            <Typography variant="h6" color="primary">
              {workspace.dashboard_count}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Dashboards
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h6" color="secondary">
              {workspace.dataset_count}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Datasets
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h6" color="info.main">
              {workspace.member_count}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Members
            </Typography>
          </Box>
        </Box>

        <Box mb={2}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary">
              Storage Usage
            </Typography>
            <Typography variant="body2">
              {getStoragePercentage(workspace.storage_used_bytes, workspace.storage_limit_bytes)}%
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: 8,
              bgcolor: 'grey.300',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${getStoragePercentage(workspace.storage_used_bytes, workspace.storage_limit_bytes)}%`,
                height: '100%',
                bgcolor: getStoragePercentage(workspace.storage_used_bytes, workspace.storage_limit_bytes) > 80 
                  ? 'error.main' 
                  : getStoragePercentage(workspace.storage_used_bytes, workspace.storage_limit_bytes) > 60 
                    ? 'warning.main' 
                    : 'success.main'
              }}
            />
          </Box>
        </Box>

        {workspace.user_role && (
          <Chip
            label={`Your Role: ${workspace.user_role.name}`}
            size="small"
            variant="outlined"
            sx={{ mb: 1 }}
          />
        )}
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between' }}>
        <Button
          size="small"
          startIcon={<SwitchIcon />}
          onClick={() => handleSwitchWorkspace(workspace.slug)}
          disabled={currentWorkspace?.id === workspace.id}
        >
          {currentWorkspace?.id === workspace.id ? 'Current' : 'Switch'}
        </Button>
        <Button
          size="small"
          startIcon={<SettingsIcon />}
          onClick={() => router.replace(`/workspace/${workspace.slug}/settings`)}
        >
          Settings
        </Button>
      </CardActions>
    </Card>
  );

  const handleCreateWorkspace = async () => {
    try {
      // Handle create logic
      console.log('Create workspace:', newWorkspace);
      setCreateDialogOpen(false);
      setNewWorkspace({
        name: '',
        display_name: '',
        description: '',
        is_public: false,
        subscription_plan: 'free'
      });
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Workspaces
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Manage and switch between your workspaces
            </Typography>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant={viewMode === 'cards' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('cards')}
              size="small"
            >
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('table')}
              size="small"
            >
              Table
            </Button>
            <PermissionGate permission="workspace.create">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Workspace
              </Button>
            </PermissionGate>
          </Box>
        </Box>

        {viewMode === 'table' ? (
          <CommonTableLayout
            data={workspaces}
            columns={columns}
            actions={actions}
            filterOptions={filterOptions}
            loading={loading}
            searchPlaceholder="Search workspaces..."
            emptyMessage="No workspaces found."
            onRowClick={(item) => handleSwitchWorkspace(item.slug)}
          />
        ) : (
          <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(400px, 1fr))" gap={3}>
            {workspaces.map(renderWorkspaceCard)}
          </Box>
        )}

        {/* Create Workspace Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                autoFocus
                label="Name"
                fullWidth
                value={newWorkspace.name}
                onChange={(e) => setNewWorkspace({...newWorkspace, name: e.target.value})}
                helperText="Unique identifier (will be used in URLs)"
              />
              <TextField
                label="Display Name"
                fullWidth
                value={newWorkspace.display_name}
                onChange={(e) => setNewWorkspace({...newWorkspace, display_name: e.target.value})}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={newWorkspace.description}
                onChange={(e) => setNewWorkspace({...newWorkspace, description: e.target.value})}
              />
              <FormControl fullWidth>
                <InputLabel>Plan</InputLabel>
                <Select
                  value={newWorkspace.subscription_plan}
                  onChange={(e) => setNewWorkspace({...newWorkspace, subscription_plan: e.target.value as any})}
                >
                  <MenuItem value="free">Free (1GB Storage)</MenuItem>
                  <MenuItem value="pro">Pro (20GB Storage)</MenuItem>
                  <MenuItem value="enterprise">Enterprise (100GB Storage)</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={newWorkspace.is_public}
                    onChange={(e) => setNewWorkspace({...newWorkspace, is_public: e.target.checked})}
                  />
                }
                label="Public Workspace"
                helperText="Allow anyone to discover and request access"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateWorkspace}
              variant="contained"
              disabled={!newWorkspace.name}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default WorkspacesPage;