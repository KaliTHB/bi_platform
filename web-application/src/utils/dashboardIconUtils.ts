// src/utils/dashboardIconUtils.ts - Common Dashboard Icon Utilities

import React from 'react';
import {
  Dashboard as DashboardIcon,
  BarChart as BarChartIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  TableChart as TableChartIcon,
  Analytics as AnalyticsIcon,
  Insights as InsightsIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Store as StoreIcon,
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  Campaign as MarketingIcon,
  Support as SupportIcon,
  Engineering as EngineeringIcon,
  Science as ScienceIcon,
  School as EducationIcon,
  LocalHospital as HealthIcon,
  AccountBalance as FinanceIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Visibility as PublishedIcon,
  Edit as DraftIcon,
  Archive as ArchivedIcon,
  Star as FeaturedIcon,
  HelpOutline as HelpOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Tooltip, Chip } from '@mui/material';
import type { Dashboard } from '@/types/dashboard.types';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface DashboardIconOptions {
  size?: 'inherit' | 'small' | 'medium' | 'large';
  color?: 'inherit' | 'primary' | 'secondary' | 'action' | 'disabled' | 'error';
  showTooltip?: boolean;
  tooltipTitle?: string;
  fallbackStrategy?: 'help' | 'error' | 'default' | 'warning';
  className?: string;
  style?: React.CSSProperties;
}

export interface CategoryIconMap {
  [category: string]: React.ComponentType<any>;
}

// =============================================================================
// Icon Mappings
// =============================================================================

const CATEGORY_ICON_MAP: CategoryIconMap = {
  // Business Categories
  'sales': MoneyIcon,
  'marketing': MarketingIcon,
  'finance': FinanceIcon,
  'hr': PersonIcon,
  'operations': BusinessIcon,
  'inventory': InventoryIcon,
  'shipping': ShippingIcon,
  'customer-service': SupportIcon,
  
  // Data Categories
  'analytics': AnalyticsIcon,
  'reporting': AssessmentIcon,
  'metrics': TrendingUpIcon,
  'kpis': InsightsIcon,
  'financial': AccountBalance,
  'performance': ShowChartIcon,
  
  // Industry Categories
  'retail': StoreIcon,
  'healthcare': HealthIcon,
  'education': EducationIcon,
  'manufacturing': EngineeringIcon,
  'research': ScienceIcon,
  'public': PublicIcon,
  
  // Chart Type Categories
  'charts': BarChartIcon,
  'tables': TableChartIcon,
  'trends': TimelineIcon,
  'pie-charts': PieChartIcon,
  'line-charts': ShowChartIcon,
  
  // Team Categories
  'executive': BusinessIcon,
  'management': GroupIcon,
  'team': PersonIcon,
  'department': GroupIcon
};

const STATUS_ICON_MAP = {
  'published': PublishedIcon,
  'draft': DraftIcon,
  'archived': ArchivedIcon
};

const VISIBILITY_ICON_MAP = {
  'public': PublicIcon,
  'private': PrivateIcon
};

const FALLBACK_ICONS = {
  help: HelpOutlineIcon,
  error: ErrorOutlineIcon,
  warning: WarningIcon,
  default: DashboardIcon
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Safely extracts dashboard properties with fallbacks
 */
export const getDashboardDisplayInfo = (dashboard: Dashboard) => {
  return {
    name: dashboard.display_name || dashboard.name || 'Untitled Dashboard',
    description: dashboard.description || 'No description available',
    category: dashboard.category_id || 'uncategorized',
    status: dashboard.status || 'draft',
    isPublic: dashboard.is_public ?? false,
    isFeatured: dashboard.is_featured ?? false,
    viewCount: dashboard.view_count || 0,
    updatedAt: dashboard.updated_at || dashboard.created_at || '',
    createdBy: dashboard.created_by || 'Unknown',
    workspaceId: dashboard.workspace_id || 'default',
    slug: dashboard.slug || dashboard.id,
    version: dashboard.version || 1,
    tags: dashboard.tags || []
  };
};

/**
 * Gets the appropriate icon component for a dashboard category
 */
export const getDashboardIconComponent = (
  category: string,
  fallbackStrategy: 'help' | 'error' | 'default' | 'warning' = 'default'
): React.ComponentType<any> => {
  try {
    const normalizedCategory = category?.toLowerCase() || '';
    
    // Direct category match
    const IconComponent = CATEGORY_ICON_MAP[normalizedCategory];
    if (IconComponent) {
      return IconComponent;
    }
    
    // Partial matches
    for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
      if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
        return icon;
      }
    }
    
    return FALLBACK_ICONS[fallbackStrategy];
  } catch (error) {
    console.warn('Error getting dashboard icon component:', error);
    return FALLBACK_ICONS.error;
  }
};

/**
 * Gets status icon component
 */
export const getStatusIconComponent = (status: string): React.ComponentType<any> => {
  const normalizedStatus = status?.toLowerCase() || 'draft';
  return STATUS_ICON_MAP[normalizedStatus as keyof typeof STATUS_ICON_MAP] || DraftIcon;
};

/**
 * Gets visibility icon component
 */
export const getVisibilityIconComponent = (isPublic: boolean): React.ComponentType<any> => {
  return isPublic ? PublicIcon : PrivateIcon;
};

// =============================================================================
// Main Dashboard Icon Rendering Functions
// =============================================================================

/**
 * Renders a dashboard icon based on category with comprehensive error handling
 */
export const renderDashboardIcon = (
  dashboard: Dashboard,
  options: DashboardIconOptions = {}
): React.ReactElement => {
  const {
    size = 'medium',
    color = 'inherit',
    showTooltip = false,
    tooltipTitle,
    fallbackStrategy = 'default',
    className,
    style
  } = options;

  try {
    const displayInfo = getDashboardDisplayInfo(dashboard);
    const IconComponent = getDashboardIconComponent(displayInfo.category, fallbackStrategy);
    
    const iconElement = (
      <IconComponent 
        fontSize={size} 
        color={color}
        className={className}
        style={style}
      />
    );

    if (showTooltip) {
      const title = tooltipTitle || 
        `${displayInfo.name} (${displayInfo.category})`;
      
      return (
        <Tooltip title={title} arrow>
          <span>{iconElement}</span>
        </Tooltip>
      );
    }

    return iconElement;

  } catch (error) {
    console.error('Error rendering dashboard icon:', {
      error,
      dashboardId: dashboard.id,
      category: dashboard.category_id
    });
    
    const ErrorIcon = FALLBACK_ICONS.error;
    const errorElement = (
      <ErrorIcon 
        fontSize={size} 
        color="error"
        className={className}
        style={style}
      />
    );

    if (showTooltip) {
      return (
        <Tooltip title="Error loading dashboard icon" arrow>
          <span>{errorElement}</span>
        </Tooltip>
      );
    }

    return errorElement;
  }
};

/**
 * Renders a dashboard status icon
 */
export const renderDashboardStatusIcon = (
  dashboard: Dashboard,
  options: Omit<DashboardIconOptions, 'fallbackStrategy'> = {}
): React.ReactElement => {
  const displayInfo = getDashboardDisplayInfo(dashboard);
  const StatusIcon = getStatusIconComponent(displayInfo.status);
  
  const {
    size = 'small',
    color = 'inherit',
    showTooltip = true,
    className,
    style
  } = options;

  const iconElement = (
    <StatusIcon 
      fontSize={size} 
      color={color}
      className={className}
      style={style}
    />
  );

  if (showTooltip) {
    const statusLabel = displayInfo.status.charAt(0).toUpperCase() + displayInfo.status.slice(1);
    return (
      <Tooltip title={statusLabel} arrow>
        <span>{iconElement}</span>
      </Tooltip>
    );
  }

  return iconElement;
};

/**
 * Renders a dashboard visibility icon
 */
export const renderDashboardVisibilityIcon = (
  dashboard: Dashboard,
  options: Omit<DashboardIconOptions, 'fallbackStrategy'> = {}
): React.ReactElement => {
  const displayInfo = getDashboardDisplayInfo(dashboard);
  const VisibilityIcon = getVisibilityIconComponent(displayInfo.isPublic);
  
  const {
    size = 'small',
    color = 'inherit',
    showTooltip = true,
    className,
    style
  } = options;

  const iconElement = (
    <VisibilityIcon 
      fontSize={size} 
      color={color}
      className={className}
      style={style}
    />
  );

  if (showTooltip) {
    const visibilityLabel = displayInfo.isPublic ? 'Public Dashboard' : 'Private Dashboard';
    return (
      <Tooltip title={visibilityLabel} arrow>
        <span>{iconElement}</span>
      </Tooltip>
    );
  }

  return iconElement;
};

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Renders a dashboard icon with tooltip
 */
export const renderDashboardIconWithTooltip = (
  dashboard: Dashboard,
  options: Omit<DashboardIconOptions, 'showTooltip'> = {}
): React.ReactElement => {
  return renderDashboardIcon(dashboard, { ...options, showTooltip: true });
};

/**
 * Renders a small dashboard icon
 */
export const renderSmallDashboardIcon = (
  dashboard: Dashboard,
  options: Omit<DashboardIconOptions, 'size'> = {}
): React.ReactElement => {
  return renderDashboardIcon(dashboard, { ...options, size: 'small' });
};

/**
 * Renders a large dashboard icon
 */
export const renderLargeDashboardIcon = (
  dashboard: Dashboard,
  options: Omit<DashboardIconOptions, 'size'> = {}
): React.ReactElement => {
  return renderDashboardIcon(dashboard, { ...options, size: 'large' });
};

/**
 * Renders a dashboard icon for list items (small with tooltip)
 */
export const renderListDashboardIcon = (dashboard: Dashboard): React.ReactElement => {
  return renderDashboardIcon(dashboard, {
    size: 'small',
    showTooltip: true,
    fallbackStrategy: 'help'
  });
};

/**
 * Renders a dashboard icon for card headers (medium with tooltip)
 */
export const renderCardDashboardIcon = (dashboard: Dashboard): React.ReactElement => {
  return renderDashboardIcon(dashboard, {
    size: 'medium',
    showTooltip: true,
    color: 'primary'
  });
};

/**
 * Renders a featured star icon if dashboard is featured
 */
export const renderFeaturedIcon = (dashboard: Dashboard): React.ReactElement | null => {
  const displayInfo = getDashboardDisplayInfo(dashboard);
  
  if (!displayInfo.isFeatured) {
    return null;
  }

  return (
    <Tooltip title="Featured Dashboard" arrow>
      <FeaturedIcon fontSize="small" color="warning" />
    </Tooltip>
  );
};

/**
 * Renders dashboard status as a chip
 */
export const renderDashboardStatusChip = (
  dashboard: Dashboard,
  options: { size?: 'small' | 'medium'; variant?: 'filled' | 'outlined' } = {}
): React.ReactElement => {
  const displayInfo = getDashboardDisplayInfo(dashboard);
  const { size = 'small', variant = 'outlined' } = options;
  
  const statusColors = {
    'published': 'success' as const,
    'draft': 'warning' as const,
    'archived': 'default' as const
  };

  const color = statusColors[displayInfo.status as keyof typeof statusColors] || 'default';

  return (
    <Chip
      icon={renderDashboardStatusIcon(dashboard, { size: 'small', showTooltip: false })}
      label={displayInfo.status.charAt(0).toUpperCase() + displayInfo.status.slice(1)}
      size={size}
      variant={variant}
      color={color}
    />
  );
};

/**
 * Renders dashboard visibility as a chip
 */
export const renderDashboardVisibilityChip = (
  dashboard: Dashboard,
  options: { size?: 'small' | 'medium'; variant?: 'filled' | 'outlined' } = {}
): React.ReactElement => {
  const displayInfo = getDashboardDisplayInfo(dashboard);
  const { size = 'small', variant = 'outlined' } = options;

  return (
    <Chip
      icon={renderDashboardVisibilityIcon(dashboard, { size: 'small', showTooltip: false })}
      label={displayInfo.isPublic ? 'Public' : 'Private'}
      size={size}
      variant={variant}
      color={displayInfo.isPublic ? 'info' : 'default'}
    />
  );
};

// =============================================================================
// Category and Status Utilities
// =============================================================================

/**
 * Gets display-friendly category name
 */
export const getCategoryDisplayName = (category?: string): string => {
  if (!category) return 'Uncategorized';
  
  const displayNames: { [key: string]: string } = {
    'sales': 'Sales',
    'marketing': 'Marketing',
    'finance': 'Finance',
    'hr': 'Human Resources',
    'operations': 'Operations',
    'analytics': 'Analytics',
    'reporting': 'Reporting',
    'metrics': 'Metrics',
    'kpis': 'KPIs',
    'performance': 'Performance'
  };
  
  return displayNames[category.toLowerCase()] || 
         category.charAt(0).toUpperCase() + category.slice(1).replace(/[-_]/g, ' ');
};

/**
 * Gets all available dashboard categories
 */
export const getAvailableDashboardCategories = (): string[] => {
  return Object.keys(CATEGORY_ICON_MAP).sort();
};

/**
 * Checks if a category is supported
 */
export const isCategorySupported = (category: string): boolean => {
  return Object.keys(CATEGORY_ICON_MAP).includes(category?.toLowerCase() || '');
};

// =============================================================================
// React Hook for Dashboard Icons
// =============================================================================

/**
 * React hook for dashboard icon rendering with memoization
 */
export const useDashboardIcon = (
  dashboard: Dashboard,
  options: DashboardIconOptions = {}
): React.ReactElement => {
  return React.useMemo(() => {
    return renderDashboardIcon(dashboard, options);
  }, [
    dashboard.id,
    dashboard.category_id,
    dashboard.name,
    dashboard.status,
    dashboard.is_public,
    dashboard.is_featured,
    options.size,
    options.color,
    options.showTooltip,
    options.fallbackStrategy
  ]);
};

export default {
  renderDashboardIcon,
  renderDashboardIconWithTooltip,
  renderSmallDashboardIcon,
  renderLargeDashboardIcon,
  renderListDashboardIcon,
  renderCardDashboardIcon,
  renderDashboardStatusIcon,
  renderDashboardVisibilityIcon,
  renderFeaturedIcon,
  renderDashboardStatusChip,
  renderDashboardVisibilityChip,
  getDashboardDisplayInfo,
  getCategoryDisplayName,
  getAvailableDashboardCategories,
  isCategorySupported,
  useDashboardIcon
};