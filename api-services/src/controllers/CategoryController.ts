// api-services/src/controllers/CategoryController.ts
import { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService';
import { logger } from '../utils/logger';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const userId = (req as any).user?.id;
      
      const categories = await this.categoryService.getCategories(workspaceId, userId);
      
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
        errors: [{ code: 'GET_CATEGORIES_FAILED', message: error.message }]
      });
    }
  };

  createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.headers['x-workspace-id'] as string;
      const createdBy = (req as any).user?.id;
      const categoryData = req.body;
      
      const category = await this.categoryService.createCategory(workspaceId, categoryData, createdBy);
      
      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error: any) {
      logger.error('Create category error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'CATEGORY_CREATE_FAILED', message: error.message }]
      });
    }
  };

  updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const userId = (req as any).user?.id;
      const updates = req.body;
      
      const category = await this.categoryService.updateCategory(categoryId, updates, userId);
      
      res.status(200).json({
        success: true,
        data: category,
        message: 'Category updated successfully'
      });
    } catch (error: any) {
      logger.error('Update category error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'CATEGORY_UPDATE_FAILED', message: error.message }]
      });
    }
  };

  deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const userId = (req as any).user?.id;
      
      await this.categoryService.deleteCategory(categoryId, userId);
      
      res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete category error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
        errors: [{ code: 'CATEGORY_DELETE_FAILED', message: error.message }]
      });
    }
  };
}