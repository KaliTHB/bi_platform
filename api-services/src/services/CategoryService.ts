// File: api-services/src/services/CategoryService.ts

import { Pool } from 'pg';

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
  created_at: Date;
  updated_at: Date;
  dashboard_count?: number;
  subcategories?: DashboardCategory[];
  dashboards?: any[];
}

export class CategoryService {
  constructor(private db: Pool) {}

  async getWorkspaceCategories(
    workspaceId: string,
    includeDashboards: boolean = false,
    userAccessibleOnly: boolean = false,
    userId?: string
  ): Promise<DashboardCategory[]> {
    let query = `
      SELECT 
        c.*,
        COUNT(d.id) as dashboard_count
      FROM dashboard_categories c
      LEFT JOIN dashboards d ON c.id = d.category_id AND d.status = 'published'
      WHERE c.workspace_id = $1 AND c.is_active = true
    `;
    
    const params = [workspaceId];

    if (userAccessibleOnly && userId) {
      query += `
        AND EXISTS (
          SELECT 1 FROM dashboard_access da
          LEFT JOIN user_role_assignments ura ON da.role_id = ura.role_id
          WHERE da.dashboard_id = d.id
          AND da.is_active = true
          AND (da.expires_at IS NULL OR da.expires_at > NOW())
          AND (
            da.user_id = $2 OR
            (da.role_id IS NOT NULL AND ura.user_id = $2 AND ura.is_active = true)
          )
        )
      `;
      params.push(userId);
    }

    query += `
      GROUP BY c.id, c.workspace_id, c.name, c.display_name, c.description, 
               c.icon, c.color, c.parent_category_id, c.sort_order, 
               c.is_active, c.created_by, c.created_at, c.updated_at
      ORDER BY c.sort_order, c.display_name
    `;

    const result = await this.db.query(query, params);
    let categories = result.rows;

    if (includeDashboards) {
      for (const category of categories) {
        category.dashboards = await this.getCategoryDashboards(
          category.id,
          userAccessibleOnly,
          userId
        );
      }
    }

    return this.buildCategoryTree(categories);
  }

  private async getCategoryDashboards(
    categoryId: string,
    userAccessibleOnly: boolean,
    userId?: string
  ) {
    let query = `
      SELECT 
        d.id,
        d.name,
        d.display_name,
        d.description,
        d.slug,
        d.thumbnail_url,
        d.is_featured,
        d.sort_order,
        d.view_count,
        d.last_viewed,
        d.published_at
      FROM dashboards d
      WHERE d.category_id = $1 AND d.status = 'published'
    `;

    const params = [categoryId];

    if (userAccessibleOnly && userId) {
      query += `
        AND EXISTS (
          SELECT 1 FROM dashboard_access da
          LEFT JOIN user_role_assignments ura ON da.role_id = ura.role_id
          WHERE da.dashboard_id = d.id
          AND da.is_active = true
          AND (da.expires_at IS NULL OR da.expires_at > NOW())
          AND da.access_level = 'can_read'
          AND (
            da.user_id = $2 OR
            (da.role_id IS NOT NULL AND ura.user_id = $2 AND ura.is_active = true)
          )
        )
      `;
      params.push(userId);
    }

    query += ' ORDER BY d.sort_order, d.display_name';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  private buildCategoryTree(categories: DashboardCategory[]): DashboardCategory[] {
    const categoryMap = new Map<string, DashboardCategory>();
    const rootCategories: DashboardCategory[] = [];

    // Create category map
    categories.forEach(category => {
      category.subcategories = [];
      categoryMap.set(category.id, category);
    });

    // Build tree structure
    categories.forEach(category => {
      if (category.parent_category_id) {
        const parent = categoryMap.get(category.parent_category_id);
        if (parent) {
          parent.subcategories!.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  async createCategory(categoryData: Partial<DashboardCategory>): Promise<DashboardCategory> {
    const query = `
      INSERT INTO dashboard_categories 
      (workspace_id, name, display_name, description, icon, color, parent_category_id, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      categoryData.workspace_id,
      categoryData.name,
      categoryData.display_name,
      categoryData.description,
      categoryData.icon,
      categoryData.color,
      categoryData.parent_category_id,
      categoryData.sort_order || 0,
      categoryData.created_by
    ]);

    return result.rows[0];
  }

  async updateCategory(
    categoryId: string,
    categoryData: Partial<DashboardCategory>
  ): Promise<DashboardCategory> {
    const query = `
      UPDATE dashboard_categories 
      SET 
        name = COALESCE($2, name),
        display_name = COALESCE($3, display_name),
        description = COALESCE($4, description),
        icon = COALESCE($5, icon),
        color = COALESCE($6, color),
        parent_category_id = COALESCE($7, parent_category_id),
        sort_order = COALESCE($8, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [
      categoryId,
      categoryData.name,
      categoryData.display_name,
      categoryData.description,
      categoryData.icon,
      categoryData.color,
      categoryData.parent_category_id,
      categoryData.sort_order
    ]);

    return result.rows[0];
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check if category has dashboards
      const dashboardCheck = await client.query(
        'SELECT COUNT(*) FROM dashboards WHERE category_id = $1',
        [categoryId]
      );

      if (parseInt(dashboardCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete category with existing dashboards');
      }

      // Check if category has subcategories
      const subcategoryCheck = await client.query(
        'SELECT COUNT(*) FROM dashboard_categories WHERE parent_category_id = $1',
        [categoryId]
      );

      if (parseInt(subcategoryCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete category with subcategories');
      }

      // Delete category
      const result = await client.query(
        'DELETE FROM dashboard_categories WHERE id = $1',
        [categoryId]
      );

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async moveDashboardToCategory(
    dashboardId: string,
    categoryId: string | null
  ): Promise<void> {
    const query = `
      UPDATE dashboards 
      SET category_id = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [dashboardId, categoryId]);
  }
}