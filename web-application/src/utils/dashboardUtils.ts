// web-application/src/utils/dashboardUtils.ts
import type { Dashboard as DashboardType } from '../types/dashboard.types';

export interface DashboardSettings {
  dashboardName: string;
  dashboardDescription: string;
  isPublic: boolean;
  isFeatured: boolean;
}

// Extract settings from dashboard
export const extractDashboardSettings = (dashboard: DashboardType | null): DashboardSettings => ({
  dashboardName: dashboard?.name || '',
  dashboardDescription: dashboard?.description || '',
  isPublic: dashboard?.is_public || false,
  isFeatured: dashboard?.is_featured || false
});

// Apply settings to dashboard
export const applySettingsToDashboard = (
  dashboard: DashboardType | null, 
  settings: DashboardSettings
): DashboardType | null => {
  if (!dashboard) return null;
  
  return {
    ...dashboard,
    name: settings.dashboardName,
    display_name: settings.dashboardName,
    description: settings.dashboardDescription,
    is_public: settings.isPublic,
    is_featured: settings.isFeatured
  };
};

// Generate dashboard slug from name
export const generateDashboardSlug = (name: string): string => 
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Validate dashboard before save
export const validateDashboard = (dashboard: DashboardType | null): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!dashboard) {
    errors.push('Dashboard data is missing');
    return { valid: false, errors };
  }
  
  if (!dashboard.name?.trim()) {
    errors.push('Dashboard name is required');
  }
  
  if (dashboard.name && dashboard.name.length > 100) {
    errors.push('Dashboard name must be less than 100 characters');
  }
  
  if (dashboard.description && dashboard.description.length > 500) {
    errors.push('Dashboard description must be less than 500 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Check if dashboard has unsaved changes
export const hasUnsavedChanges = (
  originalDashboard: DashboardType | null,
  currentDashboard: DashboardType | null,
  originalCharts: any[],
  currentCharts: any[]
): boolean => {
  if (!originalDashboard || !currentDashboard) return false;
  
  // Check dashboard properties
  if (
    originalDashboard.name !== currentDashboard.name ||
    originalDashboard.description !== currentDashboard.description ||
    originalDashboard.is_public !== currentDashboard.is_public ||
    originalDashboard.is_featured !== currentDashboard.is_featured
  ) {
    return true;
  }
  
  // Check charts count
  if (originalCharts.length !== currentCharts.length) return true;
  
  // Check chart changes (simplified - could be more detailed)
  for (let i = 0; i < originalCharts.length; i++) {
    const original = originalCharts[i];
    const current = currentCharts[i];
    
    if (
      original.name !== current.name ||
      original.type !== current.type ||
      JSON.stringify(original.position) !== JSON.stringify(current.position)
    ) {
      return true;
    }
  }
  
  return false;
};