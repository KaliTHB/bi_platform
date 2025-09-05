// =============================================================================
// web-application/src/pages/workspace/[workspace-slug]/dashboards.tsx
// =============================================================================

import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Box, Typography } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import DashboardList from '@/components/builder/DashboardList';
import { PermissionGate } from '@/components/shared/PermissionGate';

const DashboardsPage: NextPage = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const handleDashboardSelect = (dashboard: any) => {
    router.push(`/workspace/${workspaceSlug}/dashboard/${dashboard.id}`);
  };

  return (
    <WorkspaceLayout
      title="Dashboards"
      breadcrumbs={[
        { label: 'Home', href: `/workspace/${workspaceSlug}` },
        { label: 'Dashboards', href: `/workspace/${workspaceSlug}/dashboards` }
      ]}
    >
      <PermissionGate permissions={['dashboard.read']}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <DashboardList
            onDashboardSelect={handleDashboardSelect}
            showCreateButton={hasPermission('dashboard.create')}
          />
        </Box>
      </PermissionGate>
    </WorkspaceLayout>
  );
};

export default DashboardsPage;