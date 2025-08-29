// api-services/src/services/CategoryService.ts
import { DatabaseService } from './DatabaseService';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';

export interface CreateCategoryRequest {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order?: number;
}

export class CategoryService {
  private db: DatabaseService;
  private cache: CacheService;

  constructor() {
    this.db = new DatabaseService();
    this.cache = new CacheService();
  }

  async getCategories(workspaceId: string, userId: string): Promise<any[]> {
    try {
      const cacheKey = `categories:${workspaceId}`;
      
      // Try cache first
      let categories = await this.cache.get<any[]>(cacheKey);
      
      if (!categories) {
        const query = `
          SELECT 
            dc.*,
            COUNT(d.id) as dashboard_count
          FROM dashboard_categories dc
          LEFT JOIN dashboards d ON dc.id = d.category_id AND d.status = 'published'
          WHERE dc.workspace_id = $1 AND dc.is_active = true
          GROUP BY dc.id
          ORDER BY dc.sort_order, dc.display_name
        `;
        
        const result = await this.db.query(query, [workspaceId]);
        categories = this.buildCategoryTree(result.rows);
        
        // Cache for 5 minutes
        await this.cache.set(cacheKey, categories, 300);
      }
      
      return categories;
    } catch (error) {
      logger.error('Get categories service error:', error);
      throw error;
    }
  }

  async createCategory(workspaceId: string, categoryData: CreateCategoryRequest, createdBy: string): Promise<any> {
    try {
      // Check if category name already exists in workspace
      const existingCategory = await this.db.query(
        'SELECT id FROM dashboard_categories WHERE workspace_id = $1 AND name = $2',
        [workspaceId, categoryData.name]
      );

      if (existingCategory.rows.length > 0) {
        throw new Error('Category name already exists in this workspace');
      }

      const result = await this.db.query(`
        INSERT INTO dashboard_categories (
          workspace_id, name, display_name, description, icon, color,
          parent_category_id, sort_order, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        workspaceId,
        categoryData.name,
        categoryData.display_name,
        categoryData.description,
        categoryData.icon,
        categoryData.color,
        categoryData.parent_category_id,
        categoryData.sort_order || 0,
        createdBy
      ]);

      // Invalidate cache
      await this.cache.delete(`categories:${workspaceId}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Create category service error:', error);
      throw error;
    }
  }

  async updateCategory(categoryId: string, updates: any, userId: string): Promise<any> {
    try {
      const setClause: string[] = [];
      const values: any[] = [categoryId];
      let paramIndex = 2;

      const updatableFields = ['display_name', 'description', 'icon', 'color', 'parent_category_id', 'sort_order'];
      
      updatableFields.forEach(field => {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramIndex++}`);
          values.push(updates[field]);
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push('updated_at = CURRENT_TIMESTAMP');

      const result = await this.db.query(`
        UPDATE dashboard_categories
        SET ${setClause.join(', ')}
        WHERE id = $1 AND is_active = true
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Category not found');
      }

      const category = result.rows[0];

      // Invalidate cache
      await this.cache.delete(`categories:${category.workspace_id}`);

      return category;
    } catch (error) {
      logger.error('Update category service error:', error);
      throw error;
    }
  }

  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    try {
      // Check if category has dashboards
      const dashboardCount = await this.db.query(
        'SELECT COUNT(*) as count FROM dashboards WHERE category_id = $1 AND status != $2',
        [categoryId, 'archived']
      );

      if (parseInt(dashboardCount.rows[0].count) > 0) {
        throw new Error('Cannot delete category that contains dashboards');
      }

      // Check if category has child categories
      const childCount = await this.db.query(
        'SELECT COUNT(*) as count FROM dashboard_categories WHERE parent_category_id = $1 AND is_active = true',
        [categoryId]
      );

      if (parseInt(childCount.rows[0].count) > 0) {
        throw new Error('Cannot delete category that has child categories');
      }

      // Get workspace_id before deletion for cache invalidation
      const categoryResult = await this.db.query(
        'SELECT workspace_id FROM dashboard_categories WHERE id = $1',
        [categoryId]
      );

      if (categoryResult.rows.length === 0) {
        throw new Error('Category not found');
      }

      const workspaceId = categoryResult.rows[0].workspace_id;

      // Soft delete
      await this.db.query(`
        UPDATE dashboard_categories
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [categoryId]);

      // Invalidate cache
      await this.cache.delete(`categories:${workspaceId}`);
    } catch (error) {
      logger.error('Delete category service error:', error);
      throw error;
    }
  }

  private buildCategoryTree(categories: any[]): any[] {
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map and initialize children arrays
    categories.forEach(category => {
      category.children = [];
      categoryMap.set(category.id, category);
    });

    // Second pass: build tree structure
    categories.forEach(category => {
      if (category.parent_category_id) {
        const parent = categoryMap.get(category.parent_category_id);
        if (parent) {
          parent.children.push(category);
        } else {
          // Parent not found, treat as root
          rootCategories.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }
}