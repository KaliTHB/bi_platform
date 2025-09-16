// web-application/src/pages/workspace/admin/categories.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

import { WorkspaceLayout } from '../../../components/layout/WorkspaceLayout';
import { CommonTableLayout, BaseListItem, TableColumn, TableAction, FilterOption } from '../../../components/shared/CommonTableLayout';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { 
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation
} from '../../../store/api/categoryApi';

// Create a specific interface for our categories that extends BaseListItem
interface CategoryListItem extends BaseListItem {
  icon?: string;
  color?: string;
  parent_category_id?: string;
  parent_category?: {
    id: string;
    name: string;
    display_name: string;
  };
  sort_order: number;
  is_active: boolean;
  dashboard_count: number;
  children?: any[];
  child_count?: number;
  level?: number;
}

// Form data interface
interface CategoryFormData {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  parent_category_id: string;
  sort_order: number;
  is_active: boolean;
}

// Available icons for categories
const CATEGORY_ICONS = [
  { value: 'category', label: 'Category' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'folder', label: 'Folder' },
  { value: 'palette', label: 'Palette' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'attach_money', label: 'Finance' },
  { value: 'settings', label: 'Operations' }
];

// Color options
const CATEGORY_COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f',
  '#7b1fa2', '#1565c0', '#5e35b1', '#00796b',
  '#f57c00', '#c62828', '#6a1b9a', '#0277bd'
];

const CategoriesAdminPage: NextPage = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  // RTK Query hooks - REAL API CALLS
  const { data: categoriesResponse = [], error: fetchError, isLoading, refetch } = useGetCategoriesQuery(
    { workspaceId: workspace?.id }, 
    { skip: !workspace?.id }
  );
  
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  // Transform API response to CategoryListItem format
  const categories = useMemo((): CategoryListItem[] => {
    return (categoriesResponse || []).map((cat: any): CategoryListItem => ({
      // BaseListItem required fields
      id: cat.id,
      name: cat.name,
      display_name: cat.display_name || cat.name,
      description: cat.description || '',
      created_at: cat.created_at || new Date().toISOString(),
      updated_at: cat.updated_at || new Date().toISOString(),
      workspace_id: workspace?.id || '',
      owner: cat.owner,
      
      // Category-specific fields
      icon: cat.icon,
      color: cat.color,
      parent_category_id: cat.parent_category_id,
      parent_category: cat.parent_category,
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active ?? true,
      dashboard_count: cat.dashboard_count || 0,
      children: cat.children || [],
      child_count: cat.children?.length || 0,
      level: cat.level || (cat.parent_category_id ? 1 : 0)
    }));
  }, [categoriesResponse, workspace?.id]);

  // Local state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    display_name: '',
    description: '',
    icon: 'category',
    color: '#1976d2',
    parent_category_id: '',
    sort_order: 0,
    is_active: true
  });

  // Loading state
  const loading = isLoading || isCreating || isUpdating || isDeleting;

  // Handle API errors
  React.useEffect(() => {
    if (fetchError) {
      const errorMessage = 'status' in fetchError 
        ? `Failed to load categories: ${fetchError.status}`
        : 'Failed to load categories';
      setError(errorMessage);
    }
  }, [fetchError]);

  // Handle create/edit category
  const handleCreateCategory = useCallback(() => {
    setSelectedCategory(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      icon: 'category',
      color: '#1976d2',
      parent_category_id: '',
      sort_order: categories.length,
      is_active: true
    });
    setEditDialogOpen(true);
  }, [categories.length]);

  const handleEditCategory = useCallback((category: CategoryListItem) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      display_name: category.display_name || category.name,
      description: category.description || '',
      icon: category.icon || 'category',
      color: category.color || '#1976d2',
      parent_category_id: category.parent_category_id || '',
      sort_order: category.sort_order,
      is_active: category.is_active ?? true
    });
    setEditDialogOpen(true);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      setError(null);
      
      if (selectedCategory) {
        // Update existing category
        await updateCategory({
          id: selectedCategory.id,
          updates: formData,
          workspaceId: workspace?.id
        }).unwrap();
      } else {
        // Create new category
        await createCategory({
          ...formData,
          workspaceId: workspace?.id
        }).unwrap();
      }
      
      setEditDialogOpen(false);
      await refetch(); // Refresh data
    } catch (error: any) {
      console.error('Category operation failed:', error);
      setError(error?.data?.message || 'Operation failed. Please try again.');
    }
  }, [selectedCategory, formData, createCategory, updateCategory, workspace?.id, refetch]);

  // Handle delete
  const handleDeleteCategory = useCallback(async (category: CategoryListItem) => {
    if (category.dashboard_count > 0) {
      setError('Cannot delete category with dashboards. Move dashboards first.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${category.display_name}"?`)) {
      try {
        setError(null);
        await deleteCategory({ 
          id: category.id, 
          workspaceId: workspace?.id 
        }).unwrap();
        await refetch(); // Refresh data
      } catch (error: any) {
        console.error('Delete failed:', error);
        setError(error?.data?.message || 'Delete failed. Please try again.');
      }
    }
  }, [deleteCategory, workspace?.id, refetch]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Table columns configuration - explicitly typed
  const columns = useMemo((): TableColumn<CategoryListItem>[] => [
    {
      key: 'display_name',
      label: 'Category',
      sortable: true,
      render: (category: CategoryListItem) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              backgroundColor: category.color || '#1976d2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            <CategoryIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {category.display_name || category.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {category.name}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      key: 'description',
      label: 'Description',
      render: (category: CategoryListItem) => (
        <Typography variant="body2" color="text.secondary">
          {category.description || 'No description'}
        </Typography>
      )
    },
    {
      key: 'dashboard_count',
      label: 'Dashboards',
      sortable: true,
      align: 'center',
      render: (category: CategoryListItem) => (
        <Chip
          label={category.dashboard_count}
          size="small"
          variant="outlined"
          color={category.dashboard_count > 0 ? 'primary' : 'default'}
        />
      )
    },
    {
      key: 'sort_order',
      label: 'Sort Order',
      sortable: true,
      align: 'center',
      render: (category: CategoryListItem) => (
        <Typography variant="body2">
          {category.sort_order}
        </Typography>
      )
    }
  ], []);

  // Table actions configuration - explicitly typed
  const actions = useMemo((): TableAction<CategoryListItem>[] => [
    {
      label: 'View Category',
      icon: <ViewIcon fontSize="small" />,
      onClick: (category) => {
        router.push(`/workspace/${workspace?.slug}/dashboards?category=${category.id}`);
      },
      color: 'primary'
    },
    {
      label: 'Edit Category',
      icon: <EditIcon fontSize="small" />,
      onClick: (category) => handleEditCategory(category),
      show: () => hasPermission('category.update'),
      color: 'default'
    },
    {
      label: 'Delete Category',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (category) => handleDeleteCategory(category),
      show: () => hasPermission('category.delete'),
      color: 'error',
      disabled: (category) => category.dashboard_count > 0
    }
  ], [hasPermission, router, workspace?.slug, handleEditCategory, handleDeleteCategory]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'dashboard_count',
      label: 'Dashboard Count',
      options: [
        { value: '0', label: 'Empty Categories' },
        { value: '1', label: '1+ Dashboards' },
        { value: '5', label: '5+ Dashboards' }
      ]
    }
  ];

  return (
    <WorkspaceLayout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Dashboard Categories
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organize your dashboards into categories for better navigation and webview panels
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Categories Table - Using explicit generic type */}
        <CommonTableLayout<CategoryListItem>
          data={categories}
          loading={loading}
          error={error}
          columns={columns}
          actions={actions}
          title="All Categories"
          subtitle={`${categories.length} categories configured`}
          searchable={true}
          searchPlaceholder="Search categories by name or description..."
          filters={filters}
          showCreateButton={hasPermission('category.create')}
          createButtonLabel="Add Category"
          onCreateClick={handleCreateCategory}
          onRefresh={handleRefresh}
          pagination={true}
          itemsPerPage={25}
        />

        {/* Edit/Create Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedCategory ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Category Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                  })}
                  helperText="URL-safe name, lowercase letters and hyphens only"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Icon</InputLabel>
                  <Select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    label="Icon"
                  >
                    {CATEGORY_ICONS.map((icon) => (
                      <MenuItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Color</InputLabel>
                  <Select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    label="Color"
                  >
                    {CATEGORY_COLORS.map((color) => (
                      <MenuItem key={color} value={color}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 20, height: 20, backgroundColor: color, borderRadius: 1 }} />
                          {color}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Sort Order"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  helperText="Lower numbers appear first"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active Category"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={loading || !formData.name || !formData.display_name}
            >
              {selectedCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default CategoriesAdminPage;