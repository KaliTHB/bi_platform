import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { usePermissions } from '../../contexts/PermissionContext';
import { PermissionGate } from '../shared/PermissionGate';

// Sidebar configuration based on your BRD
const SIDEBAR_CONFIG = [
  {
    section: 'Main',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        icon: '🏠',
        path: '/overview',
        permissions: ['workspace.read']
      },
      {
        id: 'dashboards',
        label: 'Dashboards',
        icon: '📊',
        path: '/dashboards',
        permissions: ['dashboard.read'],
        badge: 'New'
      }
    ]
  },
  {
    section: 'Content Management',
    items: [
      {
        id: 'datasets',
        label: 'Datasets',
        icon: '📋',
        path: '/datasets',
        permissions: ['dataset.read']
      },
      {
        id: 'charts',
        label: 'Charts',
        icon: '📈',
        path: '/charts',
        permissions: ['chart.read']
      }
    ]
  },
  {
    section: 'Tools',
    items: [
      {
        id: 'dashboard-builder',
        label: 'Dashboard Builder',
        icon: '🔧',
        path: '/builder/dashboard',
        permissions: ['dashboard.create'],
        highlight: true
      },
      {
        id: 'sql-editor',
        label: 'SQL Editor',
        icon: '💻',
        path: '/sql-editor',
        permissions: ['sql_editor.access']
      }
    ]
  },
  {
    section: 'Administration',
    items: [
      {
        id: 'users',
        label: 'User Management',
        icon: '👥',
        path: '/admin/users',
        permissions: ['user.read']
      },
      {
        id: 'roles',
        label: 'Roles & Permissions',
        icon: '🛡️',
        path: '/admin/roles',
        permissions: ['user.update']
      },
      {
        id: 'audit',
        label: 'Audit Logs',
        icon: '📜',
        path: '/admin/audit',
        permissions: ['audit.read']
      }
    ]
  }
];

interface DynamicSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function DynamicSidebar({ isCollapsed, onToggle }: DynamicSidebarProps) {
  const router = useRouter();
  const { hasAnyPermission, permissions } = usePermissions();
  const [expandedSections, setExpandedSections] = useState(new Set(['Main', 'Content Management']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleNavigation = (path: string) => {
    router.push(`/workspace/${router.query.workspaceSlug}${path}`);
  };

  const renderSidebarItem = (item: any) => (
    <PermissionGate key={item.id} permissions={item.permissions}>
      <div
        className={`
          flex items-center p-3 cursor-pointer transition-colors
          hover:bg-blue-50 dark:hover:bg-gray-700
          ${router.asPath.includes(item.path) ? 'bg-blue-100 border-r-4 border-blue-500' : ''}
          ${item.highlight ? 'bg-gradient-to-r from-green-100 to-blue-100' : ''}
        `}
        onClick={() => handleNavigation(item.path)}
      >
        <span className="text-xl mr-3">{item.icon}</span>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            {item.badge && (
              <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </div>
    </PermissionGate>
  );

  const renderSection = (section: any) => {
    // Check if any items in section are visible
    const visibleItems = section.items.filter((item: any) => 
      hasAnyPermission(item.permissions)
    );

    if (visibleItems.length === 0) {
      return null;
    }

    const isExpanded = expandedSections.has(section.section);

    return (
      <div key={section.section} className="mb-2">
        {!isCollapsed && (
          <div 
            className="px-3 py-2 cursor-pointer flex items-center justify-between text-xs font-semibold text-gray-600 uppercase tracking-wider"
            onClick={() => toggleSection(section.section)}
          >
            <span>{section.section}</span>
            <span>{isExpanded ? '▼' : '▶'}</span>
          </div>
        )}
        
        {(isExpanded || isCollapsed) && (
          <div className={isCollapsed ? '' : 'ml-2'}>
            {section.items.map(renderSidebarItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
      transition-all duration-300 ease-in-out
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
            Analytics Hub
          </h1>
        )}
        <button 
          onClick={onToggle}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isCollapsed ? '☰' : '←'}
        </button>
      </div>

      {/* Debug Info */}
      {!isCollapsed && process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-yellow-50 border-b text-xs">
          <div className="font-semibold">Debug: Permissions ({permissions.length})</div>
          <div className="max-h-20 overflow-y-auto text-gray-600">
            {permissions.slice(0, 5).join(', ')}
            {permissions.length > 5 && '...'}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        {SIDEBAR_CONFIG.map(renderSection)}
      </div>
    </div>
  );
}