// web-application/src/services/categoryAPI.ts
import { apiClient } from '../utils/apiUtils';
import { CategoryWithDashboards, CreateCategoryRequest, UpdateCategoryRequest } from '../types/category.types';

export interface GetCategoriesParams {
  workspace_id: string;
  webview_id?: string;
  include_dashboards?: boolean;
  include_inactive?: boolean;
  search?: string;
  parent_id?: string;
}

export interface GetCategoriesResponse {
  success: boolean;
  categories: CategoryWithDashboards[];
  total_count: number;
  message?: string;
}

export interface CategoryResponse {
  success: boolean;
  category: CategoryWithDashboards;
  message?: string;
}

export const categoryAPI = {
  // Get categories with dashboards for webview
  getCategories: async (params: GetCategoriesParams): Promise<GetCategoriesResponse> => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/categories?${queryParams.toString()}`);
    return response.data;
  },

  // Get categories specifically for a webview (with proper access control)
  getWebviewCategories: async (webviewId: string, searchQuery?: string): Promise<GetCategoriesResponse> => {
    const params = new URLSearchParams({
      webview_id: webviewId,
      include_dashboards: 'true',
      include_inactive: 'false'
    });

    if (searchQuery) {
      params.append('search', searchQuery);
    }

    const response = await apiClient.get(`/webviews/${webviewId}/categories?${params.toString()}`);
    return response.data;
  },

  // Get single category with dashboards
  getCategory: async (categoryId: string, includeDashboards: boolean = false): Promise<CategoryResponse> => {
    const params = includeDashboards ? '?include_dashboards=true' : '';
    const response = await apiClient.get(`/categories/${categoryId}${params}`);
    return response.data;
  },

  // Create new category
  createCategory: async (data: CreateCategoryRequest): Promise<CategoryResponse> => {
    const response = await apiClient.post('/categories', data);
    return response.data;
  },

  // Update category
  updateCategory: async (categoryId: string, data: UpdateCategoryRequest): Promise<CategoryResponse> => {
    const response = await apiClient.put(`/categories/${categoryId}`, data);
    return response.data;
  },

  // Delete category
  deleteCategory: async (categoryId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/categories/${categoryId}`);
    return response.data;
  },

  // Reorder categories
  reorderCategories: async (workspaceId: string, categoryIds: string[]): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/categories/reorder', {
      workspace_id: workspaceId,
      category_ids: categoryIds
    });
    return response.data;
  },

  // Get category statistics
  getCategoryStats: async (categoryId: string, dateRange?: { start: string; end: string }) => {
    const params = dateRange ? `?start_date=${dateRange.start}&end_date=${dateRange.end}` : '';
    const response = await apiClient.get(`/categories/${categoryId}/stats${params}`);
    return response.data;
  },

  // Search across categories and dashboards
  searchCategoriesAndDashboards: async (workspaceId: string, query: string, limit: number = 50) => {
    const response = await apiClient.get(`/search/categories-dashboards`, {
      params: {
        workspace_id: workspaceId,
        q: query,
        limit
      }
    });
    return response.data;
  }
};

// Enhanced version with caching and error handling
export class CategoryService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private ttl: number = 5 * 60 * 1000) {
    this.CACHE_TTL = ttl;
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  // Cached version of getCategories
  async getCategories(params: GetCategoriesParams, useCache: boolean = true): Promise<GetCategoriesResponse> {
    const cacheKey = this.getCacheKey('getCategories', params);
    
    if (useCache) {
      const cached = this.getCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const result = await categoryAPI.getCategories(params);
      if (useCache && result.success) {
        this.setCache(cacheKey, result);
      }
      return result;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
  }

  // Real-time updates via WebSocket (if needed)
  subscribeToUpdates(workspaceId: string, callback: (update: any) => void): () => void {
    // This would connect to WebSocket for real-time updates
    // Implementation depends on your WebSocket setup
    
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/categories/${workspaceId}`);
    
    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        callback(update);
        // Invalidate relevant cache entries
        this.invalidateCacheByWorkspace(workspaceId);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }

  private invalidateCacheByWorkspace(workspaceId: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.includes(`workspace_id":"${workspaceId}"`)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const categoryService = new CategoryService();