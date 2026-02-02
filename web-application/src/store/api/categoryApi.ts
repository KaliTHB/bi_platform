// web-application/src/store/api/categoryApi.ts
import { baseApi } from './baseApi';
import { BaseListItem } from '../../components/shared/CommonTableLayout';

// Category interface that extends BaseListItem for table compatibility
export interface Category extends BaseListItem {
  slug?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  parent_category?: {
    id: string;
    name: string;
    display_name: string;
  };
  sort_order: number;
  dashboard_count: number;
  children: Category[];
  child_count?: number;
  level?: number;
  is_active?: boolean;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateCategoryRequest {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

// API Response types
interface GetCategoriesResponse {
  success: boolean;
  data: {
    categories: Category[];
    metadata: {
      total_categories: number;
      total_dashboards: number;
      featured_dashboards: number;
    };
  };
}

interface CategoryResponse {
  success: boolean;
  data: {
    category: Category;
  };
  message?: string;
}

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], { workspaceId?: string }>({
      query: ({ workspaceId } = {}) => ({
        url: workspaceId 
          ? `/workspaces/${workspaceId}/categories`
          : '/categories',
        method: 'GET',
      }),
      transformResponse: (response: GetCategoriesResponse): Category[] => {
        // Transform API response to match our Category interface
        return response.data.categories.map(cat => ({
          ...cat,
          // Ensure required BaseListItem fields exist
          created_at: cat.created_at || new Date().toISOString(),
          updated_at: cat.updated_at || new Date().toISOString(),
          display_name: cat.display_name || cat.name,
          child_count: cat.children?.length || 0,
          level: cat.parent_category_id ? 1 : 0, // Simple level calculation
        }));
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Category' as const, id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
    }),

    getCategory: builder.query<Category, { id: string; workspaceId?: string }>({
      query: ({ id, workspaceId }) => ({
        url: workspaceId 
          ? `/workspaces/${workspaceId}/categories/${id}`
          : `/categories/${id}`,
      }),
      transformResponse: (response: CategoryResponse) => ({
        ...response.data.category,
        created_at: response.data.category.created_at || new Date().toISOString(),
        updated_at: response.data.category.updated_at || new Date().toISOString(),
        display_name: response.data.category.display_name || response.data.category.name,
        child_count: response.data.category.children?.length || 0,
        level: response.data.category.parent_category_id ? 1 : 0,
      }),
      providesTags: (result, error, { id }) => [{ type: 'Category', id }],
    }),

    createCategory: builder.mutation<Category, CreateCategoryRequest & { workspaceId?: string }>({
      query: ({ workspaceId, ...categoryData }) => ({
        url: workspaceId 
          ? `/workspaces/${workspaceId}/categories`
          : '/categories',
        method: 'POST',
        body: categoryData,
      }),
      transformResponse: (response: CategoryResponse) => ({
        ...response.data.category,
        created_at: response.data.category.created_at || new Date().toISOString(),
        updated_at: response.data.category.updated_at || new Date().toISOString(),
        display_name: response.data.category.display_name || response.data.category.name,
        child_count: response.data.category.children?.length || 0,
        level: response.data.category.parent_category_id ? 1 : 0,
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    updateCategory: builder.mutation<Category, { id: string; updates: Partial<CreateCategoryRequest>; workspaceId?: string }>({
      query: ({ id, updates, workspaceId }) => ({
        url: workspaceId 
          ? `/workspaces/${workspaceId}/categories/${id}`
          : `/categories/${id}`,
        method: 'PUT',
        body: updates,
      }),
      transformResponse: (response: CategoryResponse) => ({
        ...response.data.category,
        created_at: response.data.category.created_at || new Date().toISOString(),
        updated_at: response.data.category.updated_at || new Date().toISOString(),
        display_name: response.data.category.display_name || response.data.category.name,
        child_count: response.data.category.children?.length || 0,
        level: response.data.category.parent_category_id ? 1 : 0,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
      ],
    }),

    deleteCategory: builder.mutation<void, { id: string; workspaceId?: string }>({
      query: ({ id, workspaceId }) => ({
        url: workspaceId 
          ? `/workspaces/${workspaceId}/categories/${id}`
          : `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
      ],
    }),

    // Bulk operations
    bulkDeleteCategories: builder.mutation<void, { ids: string[]; workspaceId?: string }>({
      query: ({ ids, workspaceId }) => ({
        url: workspaceId 
          ? `/workspaces/${workspaceId}/categories/bulk-delete`
          : '/categories/bulk-delete',
        method: 'DELETE',
        body: { ids },
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    reorderCategories: builder.mutation<void, { 
      categories: { id: string; sort_order: number }[]; 
      workspaceId?: string;
    }>({
      query: ({ categories, workspaceId }) => ({
        url: workspaceId 
          ? `/workspaces/${workspaceId}/categories/reorder`
          : '/categories/reorder',
        method: 'PUT',
        body: { categories },
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useBulkDeleteCategoriesMutation,
  useReorderCategoriesMutation,
} = categoryApi;