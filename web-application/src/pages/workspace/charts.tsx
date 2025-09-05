// =============================================================================
// web-application/src/pages/workspace/[workspace-slug]/charts.tsx
// =============================================================================

import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Box } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { ChartList } from '@/components/builder/ChartList';
import { PermissionGate } from '@/components/shared/PermissionGate';

const ChartsPage: NextPage = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const handleChartSelect = (chart: any) => {
    // Navigate to chart detail/edit page
    router.push(`/workspace/${workspaceSlug}/chart/${chart.id}`);
  };

  const handleChartEdit = (chart: any) => {
    router.push(`/workspace/${workspaceSlug}/chart-builder?id=${chart.id}`);
  };

  const handleChartDelete = async (chartId: string) => {
    // Handle chart deletion - this would typically call a hook or API
    try {
      // await deleteChart(chartId);
      console.log('Delete chart:', chartId);
    } catch (error) {
      console.error('Failed to delete chart:', error);
    }
  };

  const handleChartDuplicate = async (chartId: string) => {
    // Handle chart duplication
    try {
      // await duplicateChart(chartId);
      console.log('Duplicate chart:', chartId);
    } catch (error) {
      console.error('Failed to duplicate chart:', error);
    }
  };

  return (
    <WorkspaceLayout
      title="Charts"
      breadcrumbs={[
        { label: 'Home', href: `/workspace/${workspaceSlug}` },
        { label: 'Charts', href: `/workspace/${workspaceSlug}/charts` }
      ]}
    >
      <PermissionGate permissions={['chart.read']}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <ChartList
            charts={[]} // This would come from a hook like useCharts()
            loading={false}
            error={undefined}
            onChartSelect={handleChartSelect}
            onChartEdit={handleChartEdit}
            onChartDelete={handleChartDelete}
            onChartDuplicate={handleChartDuplicate}
            showCreateButton={hasPermission('chart.create')}
          />
        </Box>
      </PermissionGate>
    </WorkspaceLayout>
  );
};

export default ChartsPage;