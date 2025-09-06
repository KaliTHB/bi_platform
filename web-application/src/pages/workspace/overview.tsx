// web-application/src/pages/workspace/overview.tsx
import React from 'react';
import { NextPage } from 'next';
import { GetServerSideProps } from 'next';
import { OverviewTemplate } from '@/components/templates/OverviewTemplate';
import { useAuth } from '../../hooks/useAuth';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface WorkspaceOverviewPageProps {
  workspaceSlug?: string;
}

const WorkspaceOverviewPage: NextPage<WorkspaceOverviewPageProps> = ({ workspaceSlug }) => {
  const { workspace } = useAuth();

  return (
    <PermissionGate permissions={['workspace.read']} fallback="/login">
      <OverviewTemplate 
        title={`${workspace?.display_name || workspace?.name || 'Workspace'} Overview`}
        showNavigation={true}
      />
    </PermissionGate>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { workspaceSlug } = context.params || {};

  return {
    props: {
      workspaceSlug: workspaceSlug || null,
    },
  };
};

export default WorkspaceOverviewPage;