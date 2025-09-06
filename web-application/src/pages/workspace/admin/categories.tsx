// web-application/src/pages/workspace/admin/categories.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  FormControlLabel,
  Switch,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Category as CategoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  Dashboard as DashboardIcon,
  Palette as PaletteIcon,
  FolderOpen as FolderIcon,
  Folder as ClosedFolderIcon
} from '@mui/icons-material';

// Import common components
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import CommonTableLayout, { 
  TableColumn, 
  TableAction, 
  FilterOption 
} from '../../../components/shared/CommonTableLayout';
import { PermissionGate } from '../../../components/shared/PermissionGate';

// Import hooks and services
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';

// Types
interface CategoryData {
  id: string;
  name: string;
  display_name: string;
  description?: string;
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
  child_count: number;
  level: number; // For hierarchy display
  created_at: string;
  updated_at: string;
  created_by: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

interface CategoryFormData {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  parent_category_id: string;
  is_active: boolean;
}

// Available icons for categories
const CATEGORY_ICONS = [
  { value: 'category', label: 'Category', icon: CategoryIcon },
  { value: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { value: 'folder', label: 'Folder', icon: FolderIcon },
  { value: 'palette', label: 'Palette', icon: PaletteIcon }
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

  // State management
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    display_name: '',
    description: '',
    icon: 'category',
    color: '#1976d2',
    parent_category_id: '',
    is_active: true
  });

  // Load categories
  useEffect(() => {
    if (workspace?.id) {
      loadCategories();
    }
  }, [workspace?.id]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data - replace with actual API call
      const mockCategories: CategoryData[] = [
        {
          id: '1',
          name: 'analytics',
          display_name: 'Analytics',
          description: 'Business intelligence and analytics dashboards',
          icon: 'dashboard',
          color: '#1976d2',
          sort_order: 1,
          is_active: true,
          dashboard_count: 12,
          child_count: 2,
          level: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          created_by: 'user1',
          owner: {
            id: 'user1',
            name: 'John Doe',
            email: 'john.doe@company.com'
          }
        },
        {
          id: '2',
          name: 'sales-analytics',
          display_name: 'Sales Analytics',
          description: 'Sales performance and revenue tracking',
          icon: 'palette',
          color: '#2e7d32',
          parent_category_id: '1',
          parent_category: {
            id: '1',
            name: 'analytics',
            display_name: 'Analytics'
          },
          sort_order: 1,
          is_active: true,
          dashboard_count: 5,
          child_count: 0,
          level: 1,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-12T14:20:00Z',
          created_by: 'user2',
          owner: {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane.smith@company.com'
          }
        },
        {
          id: '3',
          name: 'marketing-analytics',
          display_name: 'Marketing Analytics',
          description: 'Campaign performance and customer insights',
          icon: 'folder',
          color: '#ed6c02',
          parent_category_id: '1',
          parent_category: {
            id: '1',
            name: 'analytics',
            display_name: 'Analytics'
          },
          sort_order: 2,
          is_active: true,
          dashboard_count: 7,
          child_count: 0,
          level: 1,
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-14T16:45:00Z',
          created_by: 'user1',
          owner: {
            id: 'user1',
            name: 'John Doe',
            email: 'john.doe@company.com'
          }
        },
        {
          id: '4',
          name: 'operations',
          display_name: 'Operations',
          description: 'Operational metrics and system monitoring',
          icon: 'category',
          color: '#d32f2f',
          sort_order: 2,
          is_active: true,
          dashboard_count: 4,
          child_count: 0,
          level: 0,
          created_at: '2024-01-08T00:00:00Z',
          updated_at: '2024-01-10T11:15:00Z',
          created_by: 'user3',
          owner: {
            id: 'user3',
            name: 'Mike Chen',
            email: 'mike.chen@company.com'
          }
        },
        {
          id: '5',
          name: 'financial',
          display_name: 'Financial Reports',
          description: 'Financial reporting and budget tracking',
          icon: 'dashboard',
          color: '#7b1fa2',
          sort_order: 3,
          is_active: false,
          dashboard_count: 0,
          child_count: 0,
          level: 0,
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-11T09:30:00Z',
          created_by: 'user2',
          owner: {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane.smith@company.com'
          }
        }
      ];

      // Sort by hierarchy and sort order
      const sortedCategories = mockCategories.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.sort_order - b.sort_order;
      });
      
      setCategories(sortedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getCategoryIcon = (iconName: string) => {
    const iconConfig = CATEGORY_ICONS.find(ic => ic.value === iconName);
    const IconComponent = iconConfig?.icon || CategoryIcon;
    return <IconComponent fontSize="small" />;
  };

  const getIndentedName = (category: CategoryData) => {
    const indent = '  '.repeat(category.level);
    return `${indent}${category.display_name}`;
  };

  // Event handlers
  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      icon: 'category',
      color: '#1976d2',
      parent_category_id: '',
      is_active: true
    });
    setEditDialogOpen(true);
  };

  const handleEditCategory = (category: CategoryData) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      display_name: category.display_name,
      description: category.description || '',
      icon: category.icon || 'category',
      color: category.color || '#1976d2',
      parent_category_id: category.parent_category_id || '',
      is_active: category.is_active
    });
    setEditDialogOpen(true);
  };

  const handleDeleteCategory = (category: CategoryData) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (selectedCategory) {
        // Update existing category
        setCategories(prev => prev.map(cat => 
          cat.id === selectedCategory.id 
            ? { 
                ...cat, 
                ...formData,
                updated_at: new Date().toISOString()
              }
            : cat
        ));
      } else {
        // Create new category
        const newCategory: CategoryData = {
          id: `cat_${Date.now()}`,
          ...formData,
          dashboard_count: 0,
          child_count: 0,
          level: formData.parent_category_id ? 1 : 0,
          sort_order: categories.length + 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id || '',
          owner: {
            id: user?.id || '',
            name: user?.display_name || user?.username || 'Unknown',
            email: user?.email || ''
          }
        };
        setCategories(prev => [...prev, newCategory]);
      }
      
      setEditDialogOpen(false);
    } catch (error) {
      setError('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory) return;

    try {
      setSubmitting(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCategories(prev => prev.filter(cat => cat.id !== selectedCategory.id));
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      setError('Failed to delete category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveCategory = async (category: CategoryData, direction: 'up' | 'down') => {
    try {
      // Find categories at the same level
      const sameLevelCategories = categories.filter(cat => 
        cat.level === category.level && 
        cat.parent_category_id === category.parent_category_id
      );
      
      const currentIndex = sameLevelCategories.findIndex(cat => cat.id === category.id);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex < 0 || newIndex >= sameLevelCategories.length) return;
      
      // Swap sort orders
      const targetCategory = sameLevelCategories[newIndex];
      const newCategories = categories.map(cat => {
        if (cat.id === category.id) return { ...cat, sort_order: targetCategory.sort_order };
        if (cat.id === targetCategory.id) return { ...cat, sort_order: category.sort_order };
        return cat;
      });
      
      setCategories(newCategories.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.sort_order - b.sort_order;
      }));
    } catch (error) {
      setError('Failed to move category');
    }
  };

  const handleRefresh = () => {
    loadCategories();
  };

  // Get parent category options (exclude current category and its children)
  const getParentOptions = () => {
    return categories.filter(cat => 
      cat.level === 0 && // Only top-level categories can be parents
      cat.id !== selectedCategory?.id && // Can't be parent of itself
      cat.is_active
    );
  };

  // Table columns configuration
  const columns: TableColumn<CategoryData>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Category',
      sortable: true,
      render: (category) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pl: category.level * 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: 32, 
            height: 32, 
            borderRadius: 1, 
            bgcolor: category.color || '#1976d2',
            color: 'white'
          }}>
            {getCategoryIcon(category.icon || 'category')}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {category.display_name}
              </Typography>
              {!category.is_active && (
                <Chip label="Inactive" size="small" color="default" variant="outlined" />
              )}
              {category.child_count > 0 && (
                <Chip label={`${category.child_count} children`} size="small" color="primary" variant="outlined" />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {category.name}
            </Typography>
            {category.description && (
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                {category.description}
              </Typography>
            )}
          </Box>
        </Box>
      )
    },
    {
      key: 'hierarchy',
      label: 'Hierarchy',
      render: (category) => (
        <Box>
          {category.parent_category ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Parent: {category.parent_category.display_name}
              </Typography>
              <Chip 
                label={`Level ${category.level + 1}`} 
                size="small" 
                color="secondary" 
                variant="outlined"
              />
            </>
          ) : (
            <Chip 
              label="Root Category" 
              size="small" 
              color="primary" 
              variant="filled"
            />
          )}
        </Box>
      )
    },
    {
      key: 'dashboard_count',
      label: 'Usage',
      sortable: true,
      render: (category) => (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="primary.main">
            {category.dashboard_count}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            dashboards
          </Typography>
          {category.child_count > 0 && (
            <Typography variant="caption" display="block" color="text.secondary">
              {category.child_count} subcategories
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'sort_order',
      label: 'Order',
      sortable: true,
      render: (category) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">
            {category.sort_order}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <IconButton
              size="small"
              onClick={() => handleMoveCategory(category, 'up')}
              disabled={categories.filter(c => 
                c.level === category.level && 
                c.parent_category_id === category.parent_category_id
              )[0]?.id === category.id}
            >
              <MoveUpIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleMoveCategory(category, 'down')}
              disabled={categories.filter(c => 
                c.level === category.level && 
                c.parent_category_id === category.parent_category_id
              ).slice(-1)[0]?.id === category.id}
            >
              <MoveDownIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      )
    },
    {
      key: 'owner',
      label: 'Owner',
      sortable: true,
      render: (category) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar src={category.owner?.email} sx={{ width: 24, height: 24 }}>
            {category.owner?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2">
            {category.owner?.name || 'Unknown'}
          </Typography>
        </Box>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (category) => (
        <Box>
          <Typography variant="body2">
            {new Date(category.updated_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(category.updated_at).toLocaleTimeString()}
          </Typography>
        </Box>
      )
    }
  ], [categories]);

  // Table actions configuration
  const actions: TableAction<CategoryData>[] = useMemo(() => [
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
      show: (category) => hasPermission('category.update') && 
        (category.owner?.id === user?.id || hasPermission('category.admin')),
      color: 'default'
    },
    {
      label: 'Delete Category',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (category) => handleDeleteCategory(category),
      show: (category) => hasPermission('category.delete') && 
        (category.owner?.id === user?.id || hasPermission('category.admin')),
      color: 'error',
      disabled: (category) => category.dashboard_count > 0 || category.child_count > 0
    }
  ], [hasPermission, router, workspace?.slug, user?.id]);

  // Filter options
  const filters: FilterOption[] = [
    {
      key: 'is_active',
      label: 'Status',
      options: [
        { value: true, label: 'Active' },
        { value: false, label: 'Inactive' }
      ]
    },
    {
      key: 'level',
      label: 'Hierarchy Level',
      options: [
        { value: 0, label: 'Root Categories' },
        { value: 1, label: 'Subcategories' }
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

        {/* Categories Table */}
        <CommonTableLayout
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
          showCreateButton={true}
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
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
                  <InputLabel>Parent Category</InputLabel>
                  <Select
                    value={formData.parent_category_id}
                    onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
                    label="Parent Category"
                  >
                    <MenuItem value="">None (Root Category)</MenuItem>
                    {getParentOptions().map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Icon</InputLabel>
                  <Select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    label="Icon"
                  >
                    {CATEGORY_ICONS.map((iconOption) => (
                      <MenuItem key={iconOption.value} value={iconOption.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <iconOption.icon fontSize="small" />
                          {iconOption.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Category Color
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {CATEGORY_COLORS.map((color) => (
                    <Box
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: color,
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: formData.color === color ? '2px solid #000' : '2px solid transparent',
                        '&:hover': { transform: 'scale(1.1)' }
                      }}
                    />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategory}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (selectedCategory ? 'Update Category' : 'Create Category')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Category Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Delete Category</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              Are you sure you want to delete "{selectedCategory?.display_name}"?
            </Typography>
            {selectedCategory && (selectedCategory.dashboard_count > 0 || selectedCategory.child_count > 0) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This category contains{' '}
                <strong>{selectedCategory.dashboard_count}</strong> dashboards and{' '}
                <strong>{selectedCategory.child_count}</strong> subcategories.
                Please move or delete them first.
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary">
              This action cannot be undone. Dashboards in this category will become uncategorized.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={submitting || (selectedCategory?.dashboard_count || 0) > 0 || (selectedCategory?.child_count || 0) > 0}
            >
              {submitting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </WorkspaceLayout>
  );
};

export default CategoriesAdminPage;