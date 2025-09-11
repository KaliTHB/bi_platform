// web-application/src/pages/dashboard/[dashboard-uuid].tsx
import React from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import DashboardTemplate from '@/components/templates/DashboardTemplate';
import { useAuth } from '@/hooks/useAuth';

interface DirectDashboardPageProps {
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

const DirectDashboardPage: React.FC<DirectDashboardPageProps> = ({
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

  // Handle navigation back
  const handleBack = () => {
    if (dashboardData?.workspace_slug) {
      // Go to workspace dashboards list
      router.push(`/workspace/${dashboardData.workspace_slug}/dashboards`);
    } else {
      // Fallback to browser back
      router.back();
    }
  };

  // Handle edit action
  const handleEdit = () => {
    if (dashboardData?.workspace_slug) {
      router.push(`/workspace/${dashboardData.workspace_slug}/dashboard-builder?id=${dashboardId}`);
    }
  };

  // Handle share action
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/dashboard/${dashboardId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      // You could show a toast notification here
      console.log('Dashboard URL copied to clipboard');
      alert('Dashboard URL copied to clipboard!');
    });
  };

  // Handle export action
  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting dashboard:', dashboardId);
  };

  return (
    <DashboardTemplate
      dashboardId={dashboardId}
      workspaceSlug={dashboardData?.workspace_slug}
      title={dashboardData?.display_name}
      description={dashboardData?.description}
      showToolbar={true}
      showBreadcrumbs={false} // Simplified view, no breadcrumbs needed
      allowEdit={!!user} // Only allow edit if user is logged in
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

    // Fetch dashboard data to check if it exists and get basic info
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    
    // Try to get dashboard info without authentication first (for public dashboards)
    let dashboardResponse;
    try {
      dashboardResponse = await fetch(`${apiUrl}/api/v1/public/dashboards/${dashboardUuid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (publicError) {
      // If public endpoint fails, we'll handle it in the component
      console.log('Public dashboard fetch failed, will handle client-side');
    }

    let dashboardData = null;
    if (dashboardResponse && dashboardResponse.ok) {
      const response = await dashboardResponse.json();
      if (response.success) {
        dashboardData = response.data;
      }
    }

    return {
      props: {
        dashboardId: dashboardUuid as string,
        dashboardData,
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

export default DirectDashboardPage;