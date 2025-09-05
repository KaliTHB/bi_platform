// =============================================================================
// web-application/src/pages/workspace/[workspace-slug]/datasources.tsx
// =============================================================================

import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Box } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { DatasourceList } from '@/components/builder/DatasourceList';
import { PermissionGate } from '@/components/shared/PermissionGate';

const DatasourcesPage: NextPage = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const handleDataSourceSelect = (dataSource: any) => {
    // Navigate to data source detail/edit page
    router.push(`/workspace/${workspaceSlug}/datasource/${dataSource.id}`);
  };

  return (
    <WorkspaceLayout
      title="Data Sources"
      breadcrumbs={[
        { label: 'Home', href: `/workspace/${workspaceSlug}` },
        { label: 'Data Sources', href: `/workspace/${workspaceSlug}/datasources` }
      ]}
    >
      <PermissionGate permissions={['datasource.read']}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <DatasourceList
            onDataSourceSelect={handleDataSourceSelect}
            showCreateButton={hasPermission('datasource.create')}
          />
        </Box>
      </PermissionGate>
    </WorkspaceLayout>
  );
};

export default DatasourcesPage;