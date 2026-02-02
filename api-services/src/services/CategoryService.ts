// File: api-services/src/services/CategoryService.ts

import { DatabaseService } from './DatabaseService';

export class CategoryService extends DatabaseService {
  async getWorkspaceCategories(workspaceId: string, includeDashboards: boolean = false) {
    let query = `
      SELECT id, workspace_id, name, display_name, description,
             icon, color, parent_category_id, sort_order, is_active,
             created_by, created_at, updated_at
      FROM dashboard_categories
      WHERE workspace_id = $1 AND is_active = true
      ORDER BY sort_order ASC, display_name ASC
    `;

    const categoriesResult = await this.query(query, [workspaceId]);
    const categories = categoriesResult.rows;

    if (includeDashboards) {
      // Get dashboard count for each category
      for (let category of categories) {
        const dashboardQuery = `
          SELECT COUNT(*) as count
          FROM dashboards
          WHERE category_id = $1 AND status = 'published' AND is_active = true
        `;
        const dashboardResult = await this.query(dashboardQuery, [category.id]);
        category.dashboard_count = parseInt(dashboardResult.rows[0].count);
      }
    }

    return categories;
  }

  async getUserAccessibleCategories(userId: string, workspaceId: string, webviewId?: string) {
    // Use the database function we created
    const query = `SELECT get_user_webview_categories($1, $2, $3) as categories`;
    const result = await this.query(query, [userId, workspaceId, webviewId || null]);
    
    return result.rows[0]?.categories || [];
  }

  async createCategory(categoryData: {
    workspace_id: string;
    name: string;
    display_name: string;
    description?: string;
    icon?: string;
    color?: string;
    parent_category_id?: string;
    sort_order?: number;
    created_by: string;
  }) {
    const query = `
      INSERT INTO dashboard_categories (
        workspace_id, name, display_name, description, icon, color,
        parent_category_id, sort_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      categoryData.workspace_id,
      categoryData.name,
      categoryData.display_name,
      categoryData.description || null,
      categoryData.icon || null,
      categoryData.color || null,
      categoryData.parent_category_id || null,
      categoryData.sort_order || 0,
      categoryData.created_by
    ];

    const result = await this.query(query, values);
    return result.rows[0];
  }

  async updateCategory(categoryId: string, updates: {
    name?: string;
    display_name?: string;
    description?: string;
    icon?: string;
    color?: string;
    sort_order?: number;
  }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE dashboard_categories 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(categoryId);
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async deleteCategory(categoryId: string) {
    const query = `
      DELETE FROM dashboard_categories 
      WHERE id = $1
    `;

    await this.query(query, [categoryId]);
  }

  async getCategoryById(categoryId: string) {
    const query = `
      SELECT id, workspace_id, name, display_name, description,
             icon, color, parent_category_id, sort_order, is_active,
             created_by, created_at, updated_at
      FROM dashboard_categories
      WHERE id = $1
    `;

    const result = await this.query(query, [categoryId]);
    return result.rows[0];
  }

  async getCategoryDashboardCount(categoryId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM dashboards
      WHERE category_id = $1 AND is_active = true
    `;

    const result = await this.query(query, [categoryId]);
    return parseInt(result.rows[0].count);
  }
}