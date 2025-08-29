// web-application/src/store/api/categoryApi.ts
import { baseApi } from './baseApi';

export interface Category {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order: number;
  dashboard_count: number;
  children: Category[];
}

export interface CreateCategoryRequest {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order?: number;
}

export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
    createCategory: builder.mutation<Category, CreateCategoryRequest>({
      query: (categoryData) => ({
        url: '/categories',
        method: 'POST',
        body: categoryData,
      }),
      invalidatesTags: ['Category'],
    }),
    updateCategory: builder.mutation<Category, { id: string; updates: Partial<CreateCategoryRequest> }>({
      query: ({ id, updates }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['Category'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;