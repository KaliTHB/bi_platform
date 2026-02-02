// web-application/src/types/category.types.ts

// Import Dashboard type for use in CategoryWithDashboards
import { Dashboard } from './dashboard.types';

export interface DashboardCategory {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithDashboards extends DashboardCategory {
  dashboard_count: number;
  subcategories?: DashboardCategory[];
  dashboards?: Dashboard[];
}

export interface CategoryTreeNode {
  category: DashboardCategory;
  children: CategoryTreeNode[];
  dashboards: Dashboard[];
  expanded: boolean;
  level: number;
}

export interface CreateCategoryRequest {
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  display_name?: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CategoryStats {
  category_id: string;
  dashboard_count: number;
  total_views: number;
  unique_viewers: number;
  most_viewed_dashboard?: {
    id: string;
    name: string;
    view_count: number;
  };
  last_accessed?: string;
}