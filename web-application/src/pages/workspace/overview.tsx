// web-application/src/pages/workspace/overview.tsx
import React from 'react';
import { NextPage } from 'next';
import OverviewTemplate from '../../components/templates/OverviewTemplate';

const WorkspaceOverviewPage: NextPage = () => {
  return (
    <OverviewTemplate 
      title="Workspace Overview"
    />
  );
};

export default WorkspaceOverviewPage;