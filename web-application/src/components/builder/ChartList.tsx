// =============================================================================
// web-application/src/components/builder/ChartList.tsx
// =============================================================================

import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Chip,
  Avatar,
  Typography,
  Box
} from '@mui/material';
import {
  BarChart,
  PieChart,
  TrendingUp,
  Edit,
  Delete,
  Visibility,
  FileCopy
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useCharts } from '@/hooks/useCharts';
import CommonTableLayout, { 
  BaseListItem, 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface ChartListItem extends BaseListItem {
  chart_type: string;
  chart_library: string;
  chart_category?: string;
  config_json: Record<string, any>;
  is_active: boolean;
  version: number;
  created_by: string;
  dashboard_id?: string;
  dataset_ids?: string[];
  tab_id?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ChartListProps {
  charts?: ChartListItem[];
  loading?: boolean;
  error?: string;
  dashboardId?: string;
  onChartSelect?: (chart: ChartListItem) => void;
  onChartCreate?: (chartData: any) => Promise<void>;
  onChartEdit?: (chart: ChartListItem) => void;
  onChartDelete?: (chartId: string) => Promise<void>;
  onChartDuplicate?: (chartId: string) => Promise<void>;
  selectionMode?: boolean;
  selectedCharts?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  showCreateButton?: boolean;
}

const ChartList: React.FC<ChartListProps> = ({
  charts = [],
  loading = false,
  error,
  dashboardId,
  onChartSelect,
  onChartCreate,
  onChartEdit,
  onChartDelete,
  onChartDuplicate,
  selectionMode = false,
  selectedCharts = [],
  onSelectionChange,
  showCreateButton = true
}) => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();
  const {
    refreshCharts
  } = useCharts();

  const getChartIcon = (chartType: string) => {
    switch (chartType?.toLowerCase()) {
      case 'bar':
      case 'column': return <BarChart />;
      case 'pie':
      case 'doughnut': return <PieChart />;
      case 'line':
      case 'area': return <TrendingUp />;
      default: return <BarChart />;
    }
  };

  const columns: TableColumn<ChartListItem>[] = [
    {
      key: 'name',
      label: 'Chart',
      sortable: true,
      render: (item) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: 'warning.main' }}>
            {getChartIcon(item.chart_type)}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">
              {item.display_name || item.name}
            </Typography>
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
      key: 'chart_type',
      label: 'Type',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.chart_type}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      key: 'chart_library',
      label: 'Library',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.chart_library}
          size="small"
          color="info"
          variant="outlined"
        />
      )
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (item) => (
        <Chip
          label={item.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={item.is_active ? 'success' : 'default'}
          variant="outlined"
        />
      )
    },
    {
      key: 'version',
      label: 'Version',
      sortable: true,
      align: 'center',
      render: (item) => (
        <Typography variant="body2">
          v{item.version}
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

  const actions: TableAction<ChartListItem>[] = [
    {
      label: 'View Chart',
      icon: <Visibility fontSize="small" />,
      onClick: (item) => {
        if (onChartSelect) {
          onChartSelect(item);
        }
      },
      color: 'primary'
    },
    {
      label: 'Edit Chart',
      icon: <Edit fontSize="small" />,
      onClick: (item) => {
        if (onChartEdit) {
          onChartEdit(item);
        } else {
          router.push(`/workspace/${workspace?.slug}/chart-builder?id=${item.id}`);
        }
      },
      show: (item) => hasPermission('chart.update') && 
        (item.created_by === user?.id || hasPermission('chart.admin')),
      color: 'default'
    },
    {
      label: 'Duplicate Chart',
      icon: <FileCopy fontSize="small" />,
      onClick: (item) => {
        if (onChartDuplicate) {
          onChartDuplicate(item.id);
        }
      },
      show: (item) => hasPermission('chart.create'),
      color: 'info'
    },
    {
      label: 'Delete Chart',
      icon: <Delete fontSize="small" />,
      onClick: (item) => {
        if (window.confirm(`Are you sure you want to delete "${item.display_name || item.name}"?`)) {
          if (onChartDelete) {
            onChartDelete(item.id);
          }
        }
      },
      show: (item) => hasPermission('chart.delete') && 
        (item.created_by === user?.id || hasPermission('chart.admin')),
      color: 'error'
    }
  ];

  const filterOptions: FilterOption[] = [
    {
      key: 'chart_type',
      label: 'Chart Type',
      options: [
        { value: 'bar', label: 'Bar' },
        { value: 'line', label: 'Line' },
        { value: 'pie', label: 'Pie' },
        { value: 'area', label: 'Area' },
        { value: 'scatter', label: 'Scatter' }
      ]
    },
    {
      key: 'chart_library',
      label: 'Library',
      options: [
        { value: 'echarts', label: 'ECharts' },
        { value: 'd3js', label: 'D3.js' },
        { value: 'plotly', label: 'Plotly' },
        { value: 'chartjs', label: 'Chart.js' }
      ]
    },
    {
      key: 'is_active',
      label: 'Status',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ];

  const handleCreateChart = () => {
    if (onChartCreate) {
      // Handle create via prop
    } else {
      router.push(`/workspace/${workspace?.slug}/chart-builder`);
    }
  };

  return (
    <PermissionGate permissions={['chart.read']}>
      <CommonTableLayout<ChartListItem>
        data={charts}
        loading={loading}
        error={error}
        title="Chart List"
        subtitle={`${charts.length} chart${charts.length !== 1 ? 's' : ''} in workspace`}
        columns={columns}
        actions={actions}
        searchable={true}
        searchPlaceholder="Search charts..."
        filters={filterOptions}
        selectable={selectionMode}
        selectedItems={selectedCharts}
        onSelectionChange={onSelectionChange}
        pagination={true}
        itemsPerPage={25}
        showCreateButton={showCreateButton && hasPermission('chart.create')}
        createButtonLabel="Create Chart"
        onCreateClick={handleCreateChart}
        onRefresh={refreshCharts}
      />
    </PermissionGate>
  );
};

export {ChartList };