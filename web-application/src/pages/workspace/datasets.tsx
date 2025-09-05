// =============================================================================
// web-application/src/pages/workspace/datasets.tsx
// =============================================================================

import React from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { Box } from '@mui/material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import { DatasetList } from '@/components/builder/DatasetList';
import { PermissionGate } from '@/components/shared/PermissionGate';

const DatasetsPage: NextPage = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const handleDatasetSelect = (dataset: any) => {
    router.push(`/workspace/${workspaceSlug}/dataset/${dataset.id}`);
  };

  return (
    <WorkspaceLayout
      title="Datasets"
      breadcrumbs={[
        { label: 'Home', href: `/workspace/${workspaceSlug}` },
        { label: 'Datasets', href: `/workspace/${workspaceSlug}/datasets` }
      ]}
    >
      <PermissionGate permissions={['dataset.read']}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <DatasetList
            onDatasetSelect={handleDatasetSelect}
            showCreateButton={hasPermission('dataset.create')}
          />
        </Box>
      </PermissionGate>
    </WorkspaceLayout>
  );
};

export default DatasetsPage;