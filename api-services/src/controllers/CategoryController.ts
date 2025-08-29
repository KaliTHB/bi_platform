// File: api-services/src/controllers/CategoryController.ts

import { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';
import { PermissionService } from '../services/PermissionService';
import { validateCategoryRequest } from '../validators/categoryValidators';

export class CategoryController {
  private categoryService = new CategoryService();
  private permissionService = new PermissionService();

  getCategories = async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { include_dashboards, user_accessible_only, webview_id } = req.query;
      const userId = req.user?.user_id;

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId,
        workspaceId,
        'category.read'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          errors: [{ message: 'Insufficient permissions' }]
        });
      }

      let categories;
      if (user_accessible_only === 'true') {
        categories = await this.categoryService.getUserAccessibleCategories(
          userId,
          workspaceId,
          webview_id as string
        );
      } else {
        categories = await this.categoryService.getWorkspaceCategories(
          workspaceId,
          include_dashboards === 'true'
        );
      }

      // Get metadata
      const totalCategories = categories.length;
      const totalDashboards = categories.reduce((sum, cat) => sum + (cat.dashboard_count || 0), 0);
      const featuredDashboards = categories.reduce((sum, cat) => 
        sum + (cat.dashboards?.filter(d => d.is_featured).length || 0), 0
      );

      res.json({
        success: true,
        data: {
          categories,
          metadata: {
            total_categories: totalCategories,
            total_dashboards: totalDashboards,
            featured_dashboards: featuredDashboards
          }
        }
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        errors: [{ message: 'Internal server error' }]
      });
    }
  };

  createCategory = async (req: Request, res: Response) => {
    try {
      const { error, value } = validateCategoryRequest(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          errors: error.details.map(d => ({ message: d.message, field: d.path.join('.') }))
        });
      }

      const userId = req.user?.user_id;
      const { workspace_id } = value;

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId,
        workspace_id,
        'category.create'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          errors: [{ message: 'Insufficient permissions' }]
        });
      }

      const category = await this.categoryService.createCategory({
        ...value,
        created_by: userId
      });

      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        errors: [{ message: 'Internal server error' }]
      });
    }
  };

  updateCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { error, value } = validateCategoryRequest(req.body, true);
      
      if (error) {
        return res.status(400).json({
          success: false,
          errors: error.details.map(d => ({ message: d.message, field: d.path.join('.') }))
        });
      }

      const userId = req.user?.user_id;

      // Get category to check workspace
      const existingCategory = await this.categoryService.getCategoryById(id);
      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          errors: [{ message: 'Category not found' }]
        });
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId,
        existingCategory.workspace_id,
        'category.update'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          errors: [{ message: 'Insufficient permissions' }]
        });
      }

      const category = await this.categoryService.updateCategory(id, value);

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        errors: [{ message: 'Internal server error' }]
      });
    }
  };

  deleteCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.user_id;

      // Get category to check workspace and dashboard count
      const category = await this.categoryService.getCategoryById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          errors: [{ message: 'Category not found' }]
        });
      }

      // Check permissions
      const hasPermission = await this.permissionService.hasPermission(
        userId,
        category.workspace_id,
        'category.delete'
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          errors: [{ message: 'Insufficient permissions' }]
        });
      }

      // Check if category has dashboards
      const dashboardCount = await this.categoryService.getCategoryDashboardCount(id);
      if (dashboardCount > 0) {
        return res.status(400).json({
          success: false,
          errors: [{ message: 'Cannot delete category with associated dashboards' }]
        });
      }

      await this.categoryService.deleteCategory(id);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        errors: [{ message: 'Internal server error' }]
      });
    }
  };
}