// File: web-application/src/components/admin/CategoryManagement.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ColorPicker,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Folder,
  Dashboard as DashboardIcon,
  ColorLens,
  DragHandle
} from '@mui/icons-material';
import { PermissionGate } from '../shared/PermissionGate';
import { DashboardCategory } from '../../types';
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation } from '../../store/api/categoryApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface CategoryFormData {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  parent_category_id: string;
  sort_order: number;
}

export const CategoryManagement: React.FC = () => {
  const workspace = useSelector((state: RootState) => state.auth.workspace);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DashboardCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    display_name: '',
    description: '',
    icon: '📁',
    color: '#1976d2',
    parent_category_id: '',
    sort_order: 0
  });

  const { data: categoriesData, isLoading } = useGetCategoriesQuery({
    workspaceId: workspace?.id || '',
    include_dashboards: true
  });

  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      icon: '📁',
      color: '#1976d2',
      parent_category_id: '',
      sort_order: 0
    });
    setDialogOpen(true);
  };

  const handleEditCategory = (category: DashboardCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      display_name: category.display_name,
      description: category.description || '',
      icon: category.icon || '📁',
      color: category.color || '#1976d2',
      parent_category_id: category.parent_category_id || '',
      sort_order: category.sort_order
    });
    setDialogOpen(true);
  };

  const handleDeleteCategory = async (category: DashboardCategory) => {
    if (confirm('Are you sure you want to delete this category? All dashboards will be moved to uncategorized.')) {
      try {
        await deleteCategory(category.id).unwrap();
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          updates: formData
        }).unwrap();
      } else {
        await createCategory({
          workspace_id: workspace?.id || '',
          ...formData
        }).unwrap();
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const categories = categoriesData?.categories || [];

  return (
    <PermissionGate permissions={['category.read']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Category Management
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Organize dashboards into categories for better navigation
            </Typography>
          </Box>
          
          <PermissionGate permissions={['category.create']}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateCategory}
            >
              Add Category
            </Button>
          </PermissionGate>
        </Box>

        {isLoading ? (
          <Typography>Loading categories...</Typography>
        ) : (
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Box
                        component="span"
                        sx={{
                          fontSize: 24,
                          mr: 1,
                          color: category.color
                        }}
                      >
                        {category.icon || <Folder />}
                      </Box>
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {category.display_name}
                      </Typography>
                      
                      <PermissionGate permissions={['category.update']}>
                        <IconButton size="small" onClick={() => handleEditCategory(category)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </PermissionGate>
                      
                      <PermissionGate permissions={['category.delete']}>
                        <IconButton size="small" onClick={() => handleDeleteCategory(category)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </PermissionGate>
                    </Box>

                    {category.description && (
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {category.description}
                      </Typography>
                    )}

                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <DashboardIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {category.dashboard_count || 0} dashboards
                      </Typography>
                    </Box>

                    <Chip
                      label={`Order: ${category.sort_order}`}
                      size="small"
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Category Form Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingCategory ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Category Name (Slug)"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  name: e.target.value.toLowerCase().replace(/\s+/g, '-')
                }))}
                placeholder="sales-reports"
                fullWidth
                required
                helperText="Used in URLs, lowercase with hyphens"
              />
              
              <TextField
                label="Display Name"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                fullWidth
                required
              />
              
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={3}
              />

              <Box display="flex" gap={2}>
                <TextField
                  label="Icon (Emoji)"
                  value={formData.icon}
                  onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                  sx={{ width: 120 }}
                  placeholder="📊"
                />
                
                <TextField
                  label="Color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  type="color"
                  sx={{ width: 120 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ColorLens />
                      </InputAdornment>
                    )
                  }}
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Parent Category</InputLabel>
                <Select
                  value={formData.parent_category_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_category_id: e.target.value }))}
                >
                  <MenuItem value="">None (Top Level)</MenuItem>
                  {categories
                    .filter(cat => cat.id !== editingCategory?.id)
                    .map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.display_name}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>

              <TextField
                label="Sort Order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                fullWidth
                helperText="Lower numbers appear first"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGate>
  );
};