// web-application/src/hooks/useCategories.ts
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useSelector((state: RootState) => state.auth);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'X-Workspace-Id': auth.workspace?.id || '',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data);
      } else {
        setError(data.message || 'Failed to fetch categories');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData: any) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
          'X-Workspace-Id': auth.workspace?.id || '',
        },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchCategories(); // Refresh the list
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create category');
      }
    } catch (error) {
      throw error;
    }
  };

  const updateCategory = async (categoryId: string, updates: any) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
          'X-Workspace-Id': auth.workspace?.id || '',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchCategories(); // Refresh the list
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update category');
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'X-Workspace-Id': auth.workspace?.id || '',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchCategories(); // Refresh the list
        return true;
      } else {
        throw new Error(data.message || 'Failed to delete category');
      }
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    if (auth.token && auth.workspace) {
      fetchCategories();
    }
  }, [auth.token, auth.workspace]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};