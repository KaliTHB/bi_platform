'use client';

import React from 'react';

interface BreadcrumbItem {
  name: string;
  data: any[];
}

interface NavigationBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onBreadcrumbClick: (index: number) => void;
}

export const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({
  breadcrumbs,
  onBreadcrumbClick,
}) => {
  return (
    <div className="navigation-breadcrumbs" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 'bold', color: '#666' }}>Navigation:</span>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span style={{ color: '#999' }}>/</span>
            )}
            <button
              onClick={() => onBreadcrumbClick(index)}
              style={{
                background: 'none',
                border: 'none',
                color: index === breadcrumbs.length - 1 ? '#333' : '#007bff',
                cursor: index === breadcrumbs.length - 1 ? 'default' : 'pointer',
                textDecoration: index === breadcrumbs.length - 1 ? 'none' : 'underline',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              disabled={index === breadcrumbs.length - 1}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default NavigationBreadcrumbs;