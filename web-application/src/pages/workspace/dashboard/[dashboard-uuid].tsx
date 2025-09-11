// web-application/src/pages/workspace/[dashboard-uuid].tsx
import React from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import DashboardTemplate from '@/components/templates/DashboardTemplate';
import { useAuth } from '@/hooks/useAuth';

interface WorkspaceDashboardPageProps {
  dashboardId: string;
  dashboardData?: {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    workspace_slug: string;
    is_public: boolean;
    status: string;
  };
  error?: string;
}

const WorkspaceDashboardPage: React.FC<WorkspaceDashboardPageProps> = ({
  dashboardId,
  dashboardData,
  error
}) => {
  const router = useRouter();
  const { user, workspace } = useAuth();

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h1>Dashboard Not Found</h1>
        <p>{error}</p>
        <button onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  // Handle navigation back to workspace
  const handleBack = () => {
    if (workspace?.slug) {
      router.push(`/workspace/${workspace.slug}/dashboards`);
    } else {
      router.push('/workspace/overview');
    }
  };

  // Handle edit action
  const handleEdit = () => {
    if (workspace?.slug) {
      router.push(`/workspace/${workspace.slug}/dashboard-builder?id=${dashboardId}`);
    }
  };

  // Handle share action
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/workspace/${dashboardId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      console.log('Dashboard URL copied to clipboard');
      alert('Dashboard URL copied to clipboard!');
    });
  };

  // Handle export action
  const handleExport = () => {
    console.log('Exporting dashboard:', dashboardId);
    // Implement export functionality
  };

  return (
    <DashboardTemplate
      dashboardId={dashboardId}
      workspaceSlug={workspace?.slug}
      title={dashboardData?.display_name || `Dashboard ${dashboardId}`}
      description={dashboardData?.description}
      showToolbar={true}
      showBreadcrumbs={true}
      allowEdit={!!user}
      allowShare={true}
      allowExport={true}
      onBack={handleBack}
      onEdit={handleEdit}
      onShare={handleShare}
      onExport={handleExport}
    />
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { 'dashboard-uuid': dashboardUuid } = context.params!;
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dashboardUuid as string)) {
      return {
        props: {
          dashboardId: dashboardUuid as string,
          error: 'Invalid dashboard ID format'
        }
      };
    }

    // Get authorization token from request
    const token = context.req.cookies.token || 
                  context.req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // Redirect to login if no token (this should be handled by middleware, but double-check)
      return {
        redirect: {
          destination: `/login?returnUrl=${encodeURIComponent(`/workspace/${dashboardUuid}`)}`,
          permanent: false,
        },
      };
    }

    // Fetch dashboard data server-side
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    try {
      const response = await fetch(`${apiUrl}/api/v1/dashboards/${dashboardUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            props: {
              dashboardId: dashboardUuid as string,
              dashboardData: data.data
            }
          };
        }
      }

      // If API call fails, still render the page but with limited data
      console.log('Failed to fetch dashboard data server-side');
      
    } catch (serverError) {
      console.error('Server-side fetch error:', serverError);
    }

    return {
      props: {
        dashboardId: dashboardUuid as string
      }
    };

  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    
    return {
      props: {
        dashboardId: dashboardUuid as string,
        error: 'Failed to load dashboard information'
      }
    };
  }
};

export default WorkspaceDashboardPage;