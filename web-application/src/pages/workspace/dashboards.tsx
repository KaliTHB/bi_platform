// web-application/src/pages/workspace/dashboards.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Skeleton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Visibility as ViewIcon,
  Share as ShareIcon,
  Public as PublicIcon,
  Lock as PrivateIcon
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

interface DashboardListItem extends BaseListItem {
  slug: string;
  category_id?: string;
  category_name?: string;
  is_public: boolean;
  status: 'draft' | 'published' | 'archived';
  chart_count: number;
  view_count: number;
  last_accessed?: string;
  tags: string[];
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

const DashboardsPage: React.FC = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardListItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: '',
    category_id: '',
    is_public: false
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
          setDashboards([
            {
              id: '1',
              name: 'sales-overview',
              display_name: 'Sales Overview',
              description: 'Monthly sales performance metrics',
              slug: 'sales-overview',
              category_name: 'Analytics',
              is_public: true,
              status: 'published',
              chart_count: 8,
              view_count: 245,
              last_accessed: '2024-01-15T10:30:00Z',
              tags: ['sales', 'revenue', 'kpi'],
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-15T10:30:00Z',
              owner: {
                id: 'user1',
                name: 'John Doe',
                email: 'john@company.com'
              }
            },
            {
              id: '2',
              name: 'financial-report',
              display_name: 'Financial Report',
              description: 'Quarterly financial analysis',
              slug: 'financial-report',
              category_name: 'Finance',
              is_public: false,
              status: 'draft',
              chart_count: 12,
              view_count: 89,
              last_accessed: '2024-01-14T15:45:00Z',
              tags: ['finance', 'quarterly', 'budget'],
              created_at: '2024-01-10T00:00:00Z',
              updated_at: '2024-01-14T15:45:00Z',
              owner: {
                id: 'user2',
                name: 'Jane Smith',
                email: 'jane@company.com'
              }
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching dashboards:', error);
        setLoading(false);
      }
    };

    if (workspace) {
      fetchDashboards();
    }
  }, [workspace]);

  const columns: TableColumn<DashboardListItem>[] = [
    {
      key: 'name',
      label: 'Dashboard',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
            <DashboardIcon />
          </Avatar>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle2" fontWeight="bold">
                {item.display_name || item.name}
              </Typography>
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
      key: 'category_name',
      label: 'Category',
      sortable: true,
      render: (item) => item.category_name ? (
        <Chip label={item.category_name} size="small" variant="outlined" />
      ) : (
        <Typography variant="body2" color="textSecondary">Uncategorized</Typography>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.status}
          size="small"
          color={
            item.status === 'published' ? 'success' :
            item.status === 'draft' ? 'warning' : 'default'
          }
        />
      )
    },
    {
      key: 'chart_count',
      label: 'Charts',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">
          {item.chart_count}
        </Typography>
      )
    },
    {
      key: 'view_count',
      label: 'Views',
      sortable: true,
      render: (item) => (
        <Typography variant="body2">
          {item.view_count}
        </Typography>
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

  const actions: TableAction<DashboardListItem>[] = [
    {
      label: 'View',
      icon: <ViewIcon fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/dashboard/${item.slug}`);
      }
    },
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/dashboard/${item.slug}/edit`);
      },
      requiresPermission: 'dashboard.update'
    },
    {
      label: 'Share',
      icon: <ShareIcon fontSize="small" />,
      onClick: (item) => {
        // Handle share logic
        console.log('Share dashboard:', item.id);
      },
      requiresPermission: 'dashboard.share'
    },
    {
      label: 'Duplicate',
      icon: <CopyIcon fontSize="small" />,
      onClick: (item) => {
        // Handle duplicate logic
        console.log('Duplicate dashboard:', item.id);
      },
      requiresPermission: 'dashboard.create'
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (item) => {
        // Handle delete logic
        if (confirm(`Are you sure you want to delete "${item.display_name}"?`)) {
          console.log('Delete dashboard:', item.id);
        }
      },
      requiresPermission: 'dashboard.delete',
      color: 'error'
    }
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' }
      ]
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'analytics', label: 'Analytics' },
        { value: 'finance', label: 'Finance' },
        { value: 'operations', label: 'Operations' }
      ]
    },
    {
      key: 'visibility',
      label: 'Visibility',
      type: 'select',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' }
      ]
    }
  ];

  const handleCreateDashboard = async () => {
    try {
      // Handle create logic
      console.log('Create dashboard:', newDashboard);
      setCreateDialogOpen(false);
      setNewDashboard({ name: '', description: '', category_id: '', is_public: false });
    } catch (error) {
      console.error('Error creating dashboard:', error);
    }
  };

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Dashboards
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Create and manage your interactive dashboards
            </Typography>
          </Box>
          
          <PermissionGate permission="dashboard.create">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Dashboard
            </Button>
          </PermissionGate>
        </Box>

        <CommonTableLayout
          data={dashboards}
          columns={columns}
          actions={actions}
          filterOptions={filterOptions}
          loading={loading}
          searchPlaceholder="Search dashboards..."
          emptyMessage="No dashboards found. Create your first dashboard to get started."
          onRowClick={(item) => router.push(`/workspace/${workspace?.slug}/dashboard/${item.slug}`)}
        />

        {/* Create Dashboard Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Dashboard</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} pt={1}>
              <TextField
                autoFocus
                label="Dashboard Name"
                fullWidth
                value={newDashboard.name}
                onChange={(e) => setNewDashboard({...newDashboard, name: e.target.value})}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={newDashboard.description}
                onChange={(e) => setNewDashboard({...newDashboard, description: e.target.value})}
              />
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newDashboard.category_id}
                  onChange={(e) => setNewDashboard({...newDashboard, category_id: e.target.value})}
                >
                  <MenuItem value="analytics">Analytics</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="operations">Operations</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateDashboard}
              variant="contained"
              disabled={!newDashboard.name}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default DashboardsPage;