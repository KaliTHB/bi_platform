// web-application/src/pages/[webview-name]/index.tsx
import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import {LoadingSpinner} from '@/components/shared/LoadingSpinner';

interface WebviewData {
  id: string;
  name: string;
  webview_name: string;
  title: string;
  description?: string;
  theme: 'light' | 'dark' | 'auto';
  is_public: boolean;
  categories: Category[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  dashboard_count: number;
  icon?: string;
  color?: string;
}

interface WebviewPageProps {
  webviewName: string;
}

const WebviewPage: React.FC<WebviewPageProps> = ({ webviewName }) => {
  const router = useRouter();
  const [webviewData, setWebviewData] = useState<WebviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWebview = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock API call - replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        // Mock data
        const mockWebview: WebviewData = {
          id: '1',
          name: 'Analytics Dashboard',
          webview_name: webviewName,
          title: `${webviewName.charAt(0).toUpperCase() + webviewName.slice(1)} Analytics`,
          description: 'Comprehensive analytics and reporting dashboard',
          theme: 'auto',
          is_public: true,
          categories: [
            {
              id: '1',
              name: 'Sales & Revenue',
              slug: 'sales-revenue',
              dashboard_count: 8,
              icon: '📊',
              color: '#3B82F6'
            },
            {
              id: '2',
              name: 'Marketing',
              slug: 'marketing',
              dashboard_count: 12,
              icon: '📈',
              color: '#10B981'
            },
            {
              id: '3',
              name: 'Operations',
              slug: 'operations',
              dashboard_count: 6,
              icon: '⚙️',
              color: '#F59E0B'
            },
            {
              id: '4',
              name: 'Customer Analytics',
              slug: 'customer-analytics',
              dashboard_count: 10,
              icon: '👥',
              color: '#8B5CF6'
            }
          ]
        };

        setWebviewData(mockWebview);
      } catch (err) {
        setError('Failed to load webview data');
      } finally {
        setLoading(false);
      }
    };

    if (webviewName) {
      fetchWebview();
    }
  }, [webviewName]);

  const handleCategoryClick = (category: Category) => {
    router.replace(`/${webviewName}/category/${category.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (error || !webviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Webview Not Found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {error || 'The requested webview could not be found or is not accessible.'}
            </p>
            <button
              onClick={() => router.replace('/')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {webviewData.title}
                </h1>
                {webviewData.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {webviewData.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Public Access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Dashboard Categories
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explore our comprehensive analytics dashboards organized by category
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {webviewData.categories.map((category) => (
            <div
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className="group cursor-pointer bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {category.icon && (
                      <span className="text-2xl">{category.icon}</span>
                    )}
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                  </div>
                  
                  <svg 
                    className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                  {category.name}
                </h3>

                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {category.dashboard_count} dashboard{category.dashboard_count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {webviewData.categories.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No categories available
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Dashboard categories will appear here once they are created.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
   const { 'webview-slug': webviewSlug } = context.params!;

  return {
    props: {
      webviewName: webviewSlug as string,
      layout: 'webview',
    },
  };
};

export default WebviewPage;