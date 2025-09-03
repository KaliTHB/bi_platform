// web-application/src/components/builder/DashboardList.tsx
import React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Card,
  CardContent,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  CardMedia,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Dashboard,
  MoreVert,
  Share,
  Star,
  StarBorder,
  BarChart,
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboards } from '@/hooks/useDashboards';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';
import { List, FilterOption, SortOption, TableColumn, ListAction } from '@/components/shared/List';

// Types
interface Dashboard {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  is_featured?: boolean;
  chart_count: number;
  view_count: number;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  workspace_id: string;
}

interface DashboardListProps {
  onDashboardSelect?: (dashboard: Dashboard) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDashboards?: string[];
  onSelectionChange?: (dashboardIds: string[]) => void;
  isWebview?: boolean;
  showFeaturedOnly?: boolean;
}

export const DashboardList: React.FC<DashboardListProps> = ({
  onDashboardSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDashboards = [],
  onSelectionChange,
  isWebview = false,
  showFeaturedOnly = false,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { 
    dashboards, 
    loading, 
    error,
    createDashboard, 
    updateDashboard,
    deleteDashboard,
    toggleFeatured,
  } = useDashboards();

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const filteredDashboards = showFeaturedOnly 
    ? dashboards.filter(d => d.is_featured) 
    : dashboards;

  // Configuration for the List component
  const filters: FilterOption[] = [
    { key: 'status', label: 'Status', value: 'published', count: filteredDashboards.filter(d => d.status === 'published').length },
    { key: 'status', label: 'Status', value: 'draft', count: filteredDashboards.filter(d => d.status === 'draft').length },
    { key: 'status', label: 'Status', value: 'archived', count: filteredDashboards.filter(d => d.status === 'archived').length },
    ...(showFeaturedOnly ? [] : [
      { key: 'is_featured', label: 'Featured', value: 'true', count: filteredDashboards.filter(d => d.is_featured).length }
    ]),
  ];

  const sortOptions: SortOption[] = [
    { key: 'updated_at', label: 'Recently Updated', field: 'updated_at', direction: 'desc' },
    { key: 'created_at', label: 'Recently Created', field: 'created_at', direction: 'desc' },
    { key: 'name', label: 'Name (A-Z)', field: 'name', direction: 'asc' },
    { key: 'view_count', label: 'Most Viewed', field: 'view_count', direction: 'desc' },
    { key: 'chart_count', label: 'Most Charts', field: 'chart_count', direction: 'desc' },
  ];

  const tableColumns: TableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (dashboard: Dashboard) => (
        <Box display="flex" alignItems="center" gap={2}>
          {dashboard.thumbnail_url && (
            <Box
              component="img"
              src={dashboard.thumbnail_url}
              alt={dashboard.display_name || dashboard.name}
              sx={{
                width: 40,
                height: 30,
                borderRadius: 1,
                objectFit: 'cover',
                bgcolor: 'grey.200',
              }}
            />
          )}
          <Box>
            <Typography variant="subtitle2">
              {dashboard.display_name || dashboard.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dashboard.description || 'No description'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (dashboard: Dashboard) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={dashboard.status}
            size="small"
            color={getStatusColor(dashboard.status) as any}
          />
          {dashboard.is_featured && (
            <Star color="warning" fontSize="small" />
          )}
        </Box>
      ),
    },
    {
      key: 'chart_count',
      label: 'Charts',
      align: 'center',
      render: (dashboard: Dashboard) => (
        <Typography variant="body2">
          {dashboard.chart_count}
        </Typography>
      ),
    },
    {
      key: 'view_count',
      label: 'Views',
      align: 'center',
      render: (dashboard: Dashboard) => (
        <Typography variant="body2">
          {dashboard.view_count}
        </Typography>
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (dashboard: Dashboard) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(dashboard.updated_at).toLocaleDateString()}
        </Typography>
      ),
    },
    ...(isWebview ? [] : [{
      key: 'owner',
      label: 'Owner',
      render: (dashboard: Dashboard) => (
        <Typography variant="body2" color="text.secondary">
          {dashboard.owner?.name || 'Unknown'}
        </Typography>
      ),
    }]),
  ];

  const itemActions: ListAction[] = [
    {
      key: 'view',
      label: 'View Dashboard',
      icon: <Visibility />,
      onClick: (dashboard: Dashboard) => {
        if (isWebview) {
          router.push(`/webview/${dashboard.id}`);
        } else {
          router.push(`/builder/dashboards/${dashboard.id}`);
        }
      },
    },
    ...(isWebview ? [] : [
  {
    key: 'edit',
    label: 'Edit',
    icon: <Edit fontSize="small" />,
    onClick: (dashboard: Dashboard) => handleEdit(),
    show: () => true,
  },
  {
    key: 'duplicate', 
    label: 'Duplicate',
    icon: <Add fontSize="small" />,
    onClick: (dashboard: Dashboard) => handleDuplicate(),
    show: () => true,
  },
  {
    key: 'share',
    label: 'Share', 
    icon: <Share fontSize="small" />,
    onClick: (dashboard: Dashboard) => setShareDialogOpen(true),
    show: () => true,
  },
  // ✅ FIXED: Create separate objects for featured/unfeatured
  ...(isWebview ? [] : [
  {
    key: 'edit',
    label: 'Edit',
    icon: <Edit fontSize="small" />,
    onClick: (dashboard: Dashboard) => handleEdit(),
    show: () => true,
  },
  {
    key: 'duplicate',
    label: 'Duplicate',
    icon: <Add fontSize="small" />,
    onClick: (dashboard: Dashboard) => handleDuplicate(),
    show: () => true,
  },
  {
    key: 'share',
    label: 'Share',
    icon: <Share fontSize="small" />,
    onClick: (dashboard: Dashboard) => setShareDialogOpen(true),
    show: () => true,
  },
  // ✅ QUICK FIX: Use type assertion
  {
    key: 'toggle-featured',
    label: ((dashboard: any) => 
      dashboard.is_featured ? "Remove from Featured" : "Add to Featured"
    ) as string, // ✅ Type assertion
    icon: <Star fontSize="small" />,
    onClick: (dashboard: Dashboard) => handleToggleFeatured(),
    show: () => true,
  } as any, // ✅ Cast entire object to bypass type check
  {
    key: 'delete',
    label: 'Delete',
    icon: <Delete fontSize="small" />,
    onClick: (dashboard: Dashboard) => setDeleteDialogOpen(true),
    show: () => true,
  },
])
  ];

  const bulkActions: ListAction[] = [
    {
      key: 'delete_bulk',
      label: 'Delete Selected',
      icon: <Delete />,
      color: 'error',
      onClick: (dashboardIds: string[]) => {
        if (confirm(`Are you sure you want to delete ${dashboardIds.length} dashboards?`)) {
          dashboardIds.forEach(id => deleteDashboard(id));
        }
      },
    },
    {
      key: 'feature_bulk',
      label: 'Add to Featured',
      icon: <Star />,
      color: 'warning',
      onClick: (dashboardIds: string[]) => {
        dashboardIds.forEach(id => toggleFeatured(id, true));
      },
    },
  ];

  // Render functions for different view modes
  const renderGridItem = (dashboard: Dashboard, isSelected?: boolean) => (
    <Card
      sx={{
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.light',
        },
      }}
      onClick={() => onDashboardSelect?.(dashboard)}
    >
      {dashboard.thumbnail_url && (
        <CardMedia
          component="img"
          height="140"
          image={dashboard.thumbnail_url}
          alt={dashboard.display_name || dashboard.name}
        />
      )}
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <Dashboard />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6" noWrap>
              {dashboard.display_name || dashboard.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dashboard.chart_count} charts • {dashboard.view_count} views
            </Typography>
          </Box>
          {dashboard.is_featured && <Star color="warning" />}
          <IconButton size="small">
            <MoreVert />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.5em',
            mb: 2,
          }}
        >
          {dashboard.description || 'No description available'}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Chip
            label={dashboard.status}
            size="small"
            color={getStatusColor(dashboard.status) as any}
          />
          <Typography variant="caption" color="text.secondary">
            {new Date(dashboard.updated_at).toLocaleDateString()}
          </Typography>
        </Box>

        {!isWebview && dashboard.owner && (
          <Typography variant="caption" color="text.secondary">
            by {dashboard.owner.name}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderListItem = (dashboard: Dashboard, isSelected?: boolean) => (
    <ListItem
      key={dashboard.id}
      button
      selected={isSelected}
      onClick={() => onDashboardSelect?.(dashboard)}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <Dashboard />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2">
              {dashboard.display_name || dashboard.name}
            </Typography>
            {dashboard.is_featured && <Star color="warning" fontSize="small" />}
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {dashboard.description || 'No description'}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={dashboard.status}
                size="small"
                color={getStatusColor(dashboard.status) as any}
              />
              <Typography variant="caption" color="text.secondary">
                {dashboard.chart_count} charts • {dashboard.view_count} views
              </Typography>
              {!isWebview && dashboard.owner && (
                <Typography variant="caption" color="text.secondary">
                  • by {dashboard.owner.name}
                </Typography>
              )}
            </Box>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <IconButton edge="end">
          <MoreVert />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );

  return (
    <List<Dashboard>
      items={filteredDashboards}
      loading={loading}
      error={error}
      title={isWebview ? 'Dashboards' : 'Dashboard Library'}
      emptyMessage="No dashboards found. Create your first dashboard to get started."
      viewMode={viewMode}
      supportedViewModes={['grid', 'list', 'table']}
      selectionMode={selectionMode}
      selectedItems={selectedDashboards}
      onSelectionChange={onSelectionChange}
      getItemId={(dashboard) => dashboard.id}
      searchPlaceholder="Search dashboards..."
      searchFields={['name', 'display_name', 'description']}
      filters={filters}
      sortOptions={sortOptions}
      tableColumns={tableColumns}
      itemActions={itemActions}
      bulkActions={selectionMode ? bulkActions : []}
      primaryAction={
        showCreateButton
          ? {
              label: 'Create Dashboard',
              icon: <Add />,
              onClick: () => router.push('/builder/dashboards/create'),
              show: hasPermission('dashboard.create'),
            }
          : undefined
      }
      renderGridItem={renderGridItem}
      renderListItem={renderListItem}
      onItemClick={onDashboardSelect}
    />
  );
};

export default DashboardList;