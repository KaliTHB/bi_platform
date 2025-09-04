// web-application/src/components/builder/DashboardList.tsx
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Chip,
  Avatar,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  Share,
  Star,
  StarBorder,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboards } from '@/hooks/useDashboards';
import CommonTableLayout, { 
  BaseListItem, 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface DashboardListItem extends BaseListItem {
  display_name?: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  status: 'published' | 'draft' | 'archived';
  visibility: 'public' | 'private' | 'workspace';
  is_featured: boolean;
  chart_count: number;
  thumbnail_url?: string;
  last_viewed_at?: string;
  view_count: number;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface DashboardListProps {
  onDashboardSelect?: (dashboard: DashboardListItem) => void;
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDashboards?: string[];
  onSelectionChange?: (dashboardIds: string[]) => void;
  filterByCategory?: string;
  isWebview?: boolean;
  webviewName?: string;
}

// =============================================================================
// Main Component
// =============================================================================

const DashboardList: React.FC<DashboardListProps> = ({
  onDashboardSelect,
  showCreateButton = true,
  selectionMode = false,
  selectedDashboards = [],
  onSelectionChange,
  filterByCategory,
  isWebview = false,
  webviewName
}) => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();
  const {
    dashboards,
    categories,
    loading,
    error,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    refreshDashboards
  } = useDashboards();

  // Convert dashboards to list items
  const dashboardItems: DashboardListItem[] = useMemo(() => {
    return dashboards.map(dashboard => ({
      id: dashboard.id,
      name: dashboard.name,
      display_name: dashboard.display_name,
      description: dashboard.description,
      created_at: dashboard.created_at,
      updated_at: dashboard.updated_at,
      workspace_id: dashboard.workspace_id,
      category_id: dashboard.category_id,
      category: dashboard.category,
      status: dashboard.status,
      visibility: dashboard.visibility,
      is_featured: dashboard.is_featured,
      chart_count: dashboard.chart_count,
      thumbnail_url: dashboard.thumbnail_url,
      last_viewed_at: dashboard.last_viewed_at,
      view_count: dashboard.view_count,
      owner_id: dashboard.owner_id,
      owner: dashboard.owner
    }));
  }, [dashboards]);

  // Filter dashboards by category if specified
  const filteredDashboards = useMemo(() => {
    if (!filterByCategory) return dashboardItems;
    return dashboardItems.filter(dashboard => dashboard.category_id === filterByCategory);
  }, [dashboardItems, filterByCategory]);

  // Table Columns Configuration
  const columns: TableColumn<DashboardListItem>[] = [
    {
      key: 'name',
      label: 'Dashboard',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          {item.thumbnail_url ? (
            <Avatar
              src={item.thumbnail_url}
              alt={item.display_name || item.name}
              variant="rounded"
              sx={{ width: 40, height: 40 }}
            />
          ) : (
            <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
              <DashboardIcon />
            </Avatar>
          )}
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle2" fontWeight="bold">
                {item.display_name || item.name}
              </Typography>
              {item.is_featured && (
                <Star fontSize="small" sx={{ color: 'warning.main' }} />
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
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (item) => item.category ? (
        <Chip
          label={item.category.name}
          size="small"
          sx={{
            bgcolor: item.category.color + '20',
            color: item.category.color,
            fontWeight: 'medium'
          }}
        />
      ) : (
        <Typography variant="body2" color="textSecondary">
          Uncategorized
        </Typography>
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
          variant="outlined"
        />
      )
    },
    {
      key: 'chart_count',
      label: 'Charts',
      sortable: true,
      align: 'center',
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
      align: 'center',
      render: (item) => (
        <Typography variant="body2">
          {item.view_count.toLocaleString()}
        </Typography>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar src={item.owner?.email} sx={{ width: 24, height: 24 }}>
            {item.owner?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">
            {item.owner?.name || 'Unknown'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (item) => (
        <Typography variant="body2" color="textSecondary">
          {new Date(item.updated_at).toLocaleDateString()}
        </Typography>
      )
    }
  ];

  // Table Actions Configuration
  const actions: TableAction<DashboardListItem>[] = [
    {
      label: 'View Dashboard',
      icon: <Visibility fontSize="small" />,
      onClick: (item) => {
        if (onDashboardSelect) {
          onDashboardSelect(item);
        } else {
          router.push(`/workspace/${workspace?.slug}/dashboard/${item.id}`);
        }
      },
      color: 'primary'
    },
    {
      label: 'Edit Dashboard',
      icon: <Edit fontSize="small" />,
      onClick: (item) => {
        router.push(`/workspace/${workspace?.slug}/dashboard-builder?id=${item.id}`);
      },
      show: (item) => hasPermission('dashboard.update') && 
        (item.owner_id === user?.id || hasPermission('dashboard.admin')),
      color: 'default'
    },
    {
      label: 'Share Dashboard',
      icon: <Share fontSize="small" />,
      onClick: (item) => {
        // Handle share functionality
        navigator.clipboard.writeText(
          `${window.location.origin}/workspace/${workspace?.slug}/dashboard/${item.id}`
        );
      },
      show: (item) => item.visibility === 'public' || hasPermission('dashboard.share'),
      color: 'info'
    },
    {
      label: 'Delete Dashboard',
      icon: <Delete fontSize="small" />,
      onClick: (item) => {
        if (window.confirm(`Are you sure you want to delete "${item.display_name || item.name}"?`)) {
          deleteDashboard(item.id);
        }
      },
      show: (item) => hasPermission('dashboard.delete') && 
        (item.owner_id === user?.id || hasPermission('dashboard.admin')),
      color: 'error'
    }
  ];

  // Filter Options
  const filterOptions: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' }
      ]
    },
    {
      key: 'visibility',
      label: 'Visibility',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' },
        { value: 'workspace', label: 'Workspace' }
      ]
    }
  ];

  // Add category filter if categories exist
  if (categories.length > 0) {
    filterOptions.push({
      key: 'category_id',
      label: 'Category',
      options: categories.map(cat => ({
        value: cat.id,
        label: cat.name
      }))
    });
  }

  // Event Handlers
  const handleCreateDashboard = () => {
    router.push(`/workspace/${workspace?.slug}/dashboard-builder`);
  };

  return (
    <PermissionGate permissions={['dashboard.read']}>
      <CommonTableLayout<DashboardListItem>
        data={filteredDashboards}
        loading={loading}
        error={error as any}
        title={isWebview && webviewName ? `${webviewName} - Dashboards` : 'Dashboard List'}
        subtitle={`${filteredDashboards.length} dashboard${filteredDashboards.length !== 1 ? 's' : ''} in workspace`}
        columns={columns}
        actions={actions}
        searchable={true}
        searchPlaceholder="Search dashboards..."
        filters={filterOptions}
        selectable={selectionMode}
        selectedItems={selectedDashboards}
        onSelectionChange={onSelectionChange}
        pagination={true}
        itemsPerPage={25}
        showCreateButton={showCreateButton && hasPermission('dashboard.create')}
        createButtonLabel="Create Dashboard"
        onCreateClick={handleCreateDashboard}
        onRefresh={refreshDashboards}
      />
    </PermissionGate>
  );
};

export default DashboardList;