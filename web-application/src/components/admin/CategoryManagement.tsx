// File: web-application/src/components/admin/CategoryManagement.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Menu,
  MenuItem,
  TreeView,
  TreeItem
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  DragIndicator,
  ExpandMore,
  ChevronRight,
  MoreVert,
  Folder,
  FolderOpen
} from '@mui/icons-material';
import { useCategoryManagement } from '../../hooks/useCategoryManagement';

interface Category {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order: number;
  is_active: boolean;
  dashboard_count?: number;
  subcategories?: Category[];
}

interface CategoryManagementProps {
  workspaceId: string;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ workspaceId }) => {
  const {
    categories,
    loading,
    error,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    moveDashboardToCategory
  } = useCategoryManagement(workspaceId);

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    category?: Category;
    parentId?: string;
  }>({ open: false });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    category?: Category;
  }>({ open: false });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, [workspaceId]);

  const handleCreateCategory = (parentId?: string) => {
    setEditDialog({ open: true, parentId });
  };

  const handleEditCategory = (category: Category) => {
    setEditDialog({ open: true, category });
  };

  const handleDeleteCategory = (category: Category) => {
    setDeleteDialog({ open: true, category });
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, category: Category) => {
    setAnchorEl(event.currentTarget);
    setSelectedCategory(category);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCategory(null);
  };

  const confirmDelete = async () => {
    if (deleteDialog.category) {
      try {
        await deleteCategory(deleteDialog.category.id);
        setDeleteDialog({ open: false });
        loadCategories();
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const renderCategoryTree = (categories: Category[], level = 0) => {
    return categories.map((category) => (
      <TreeItem
        key={category.id}
        nodeId={category.id}
        label={
          <Box display="flex" alignItems="center" justifyContent="space-between" py={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              {category.icon ? (
                <span style={{ color: category.color || '#666' }}>{category.icon}</span>
              ) : (
                <Folder sx={{ color: category.color || '#666' }} />
              )}
              
              <Box>
                <Typography variant="body1">{category.display_name}</Typography>
                {category.description && (
                  <Typography variant="caption" color="textSecondary">
                    {category.description}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={`${category.dashboard_count || 0} dashboards`}
                size="small"
                variant="outlined"
              />
              
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuClick(e, category);
                }}
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
        }
      >
        {category.subcategories && category.subcategories.length > 0 &&
          renderCategoryTree(category.subcategories, level + 1)
        }
      </TreeItem>
    ));
  };

  if (loading) {
    return <Box>Loading categories...</Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Dashboard Categories</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleCreateCategory()}
        >
          Create Category
        </Button>
      </Box>

      {/* Categories Tree */}
      <Paper sx={{ p: 2 }}>
        {categories.length > 0 ? (
          <TreeView
            defaultCollapseIcon={<ExpandMore />}
            defaultExpandIcon={<ChevronRight />}
            sx={{ flexGrow: 1, overflowY: 'auto' }}
          >
            {renderCategoryTree(categories)}
          </TreeView>
        ) : (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            minHeight={200}
            color="text.secondary"
          >
            <Folder sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No categories created yet
            </Typography>
            <Typography variant="body2" align="center" mb={2}>
              Create your first category to organize dashboards
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleCreateCategory()}
            >
              Create Category
            </Button>
          </Box>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleEditCategory(selectedCategory!);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleCreateCategory(selectedCategory!.id);
          handleMenuClose();
        }}>
          <Add sx={{ mr: 1 }} /> Add Subcategory
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            handleDeleteCategory(selectedCategory!);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <CategoryEditDialog
        open={editDialog.open}
        category={editDialog.category}
        parentId={editDialog.parentId}
        allCategories={categories}
        onClose={() => setEditDialog({ open: false })}
        onSave={async (categoryData) => {
          if (editDialog.category) {
            await updateCategory(editDialog.category.id, categoryData);
          } else {
            await createCategory(categoryData);
          }
          setEditDialog({ open: false });
          loadCategories();
        }}
      />

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.category?.display_name}"?
          </Typography>
          {deleteDialog.category?.dashboard_count && deleteDialog.category.dashboard_count > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This category contains {deleteDialog.category.dashboard_count} dashboards. 
              They will be moved to the root level.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Category Edit Dialog Component
interface CategoryEditDialogProps {
  open: boolean;
  category?: Category;
  parentId?: string;
  allCategories: Category[];
  onClose: () => void;
  onSave: (categoryData: any) => Promise<void>;
}

const CategoryEditDialog: React.FC<CategoryEditDialogProps> = ({
  open,
  category,
  parentId,
  allCategories,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: '',
    color: '',
    parent_category_id: parentId || '',
    sort_order: 0
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        display_name: category.display_name,
        description: category.description || '',
        icon: category.icon || '',
        color: category.color || '',
        parent_category_id: category.parent_category_id || '',
        sort_order: category.sort_order
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        icon: '',
        color: '',
        parent_category_id: parentId || '',
        sort_order: 0
      });
    }
  }, [category, parentId, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {category ? 'Edit Category' : 'Create Category'}
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
            helperText="Internal identifier (lowercase, no spaces)"
          />
          
          <TextField
            label="Display Name"
            fullWidth
            value={formData.display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            required
            helperText="Name shown to users"
          />
          
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            helperText="Optional description"
          />

          <Box display="flex" gap={2}>
            <TextField
              label="Icon"
              value={formData.icon}
              onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
              helperText="Unicode emoji or icon"
              sx={{ flex: 1 }}
            />
            
            <TextField
              label="Color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              helperText="Category color"
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="Sort Order"
            type="number"
            value={formData.sort_order}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              sort_order: parseInt(e.target.value) || 0 
            }))}
            helperText="Lower numbers appear first"
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving || !formData.name || !formData.display_name}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};