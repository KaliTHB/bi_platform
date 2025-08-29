// File: api-services/src/controllers/CategoryController.ts

import { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';
import { PermissionService } from '../services/PermissionService';

export class CategoryController {
  constructor(
    private categoryService: CategoryService,
    private permissionService: PermissionService
  ) {}

  async getWorkspaceCategories(req: Request, res: Response) {
    try {
      const { workspaceId } = req.params;
      const { 
        include_dashboards = false, 
        user_accessible_only = false,
        webview_id 
      } = req.query;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspaceId, 'dashboard.read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const categories = await this.categoryService.getWorkspaceCategories(
        workspaceId,
        include_dashboards === 'true',
        user_accessible_only === 'true',
        req.user.id
      );

      const metadata = {
        total_categories: this.countCategories(categories),
        total_dashboards: this.countDashboards(categories),
        featured_dashboards: this.countFeaturedDashboards(categories)
      };

      res.json({
        success: true,
        data: {
          categories,
          metadata
        }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load categories' }
      });
    }
  }

  async createCategory(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'category.create')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const categoryData = {
        ...req.body,
        workspace_id,
        created_by: req.user.id
      };

      const category = await this.categoryService.createCategory(categoryData);

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      
      if (error.message.includes('unique constraint')) {
        return res.status(409).json({
          success: false,
          error: { code: 'CATEGORY_EXISTS', message: 'Category name already exists' }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create category' }
      });
    }
  }

  async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'category.update')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const category = await this.categoryService.updateCategory(id, req.body);

      if (!category) {
        return res.status(404).json({
          success: false,
          error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' }
        });
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update category' }
      });
    }
  }

  async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'category.delete')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      const deleted = await this.categoryService.deleteCategory(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' }
        });
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      
      if (error.message.includes('dashboards') || error.message.includes('subcategories')) {
        return res.status(400).json({
          success: false,
          error: { 
            code: 'CATEGORY_HAS_DEPENDENCIES', 
            message: error.message 
          }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete category' }
      });
    }
  }

  async moveDashboardToCategory(req: Request, res: Response) {
    try {
      const { dashboardId } = req.params;
      const { category_id } = req.body;
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'dashboard.update')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Insufficient permissions' }
        });
      }

      await this.categoryService.moveDashboardToCategory(dashboardId, category_id);

      res.json({
        success: true,
        message: 'Dashboard moved successfully'
      });
    } catch (error) {
      console.error('Error moving dashboard:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to move dashboard' }
      });
    }
  }

  private countCategories(categories: any[]): number {
    let count = categories.length;
    categories.forEach(category => {
      if (category.subcategories) {
        count += this.countCategories(category.subcategories);
      }
    });
    return count;
  }

  private countDashboards(categories: any[]): number {
    let count = 0;
    categories.forEach(category => {
      if (category.dashboards) {
        count += category.dashboards.length;
      }
      if (category.subcategories) {
        count += this.countDashboards(category.subcategories);
      }
    });
    return count;
  }

  private countFeaturedDashboards(categories: any[]): number {
    let count = 0;
    categories.forEach(category => {
      if (category.dashboards) {
        count += category.dashboards.filter(d => d.is_featured).length;
      }
      if (category.subcategories) {
        count += this.countFeaturedDashboards(category.subcategories);
      }
    });
    return count;
  }
}