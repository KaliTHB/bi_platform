// web-application/src/pages/workspace/[workspace-slug]/admin/categories.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
} from '@mui/material';
import { Add, Edit, Delete, Category as CategoryIcon } from '@mui/icons-material';
import Navigation from '../../../../components/shared/Navigation';
import PermissionGate from '../../../../components/shared/PermissionGate';
import { useCategories } from '../../../../hooks/useCategories';
import { useNotification } from '../../../../components/providers/NotificationProvider';

export default function CategoriesPage() {
  const router = useRouter();
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { showNotification } = useNotification();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: 'category',
    color: '#1976d2',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        display_name: category.display_name,
        description: category.description || '',
        icon: category.icon || 'category',
        color: category.color || '#1976d2',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        display_name: '',
        description: '',
        icon: 'category',
        color: '#1976d2',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        showNotification('Category updated successfully', 'success');
      } else {
        await createCategory(formData);
        showNotification('Category created successfully', 'success');
      }
      
      handleCloseDialog();
    } catch (error: any) {
      showNotification(error.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: any) => {
    if (window.confirm(`Are you sure you want to delete "${category.display_name}"?`)) {
      try {
        await deleteCategory(category.id);
        showNotification('Category deleted successfully', 'success');
      } catch (error: any) {
        showNotification(error.message || 'Delete failed', 'error');
      }
    }
  };

  if (loading) {
    return (
      <Box>
        <Navigation />
        <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading categories...
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navigation />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Dashboard Categories
          </Typography>
          <PermissionGate permissions={['category.create']}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Add Category
            </Button>
          </PermissionGate>
        </Box>

        {categories.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CategoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              No categories found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Create your first category to organize dashboards
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 1, 
                          backgroundColor: category.color || '#1976d2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2
                        }}
                      >
                        <CategoryIcon sx={{ color: 'white' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" component="h2">
                          {category.display_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {category.dashboard_count} dashboards
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {category.description || 'No description'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <PermissionGate permissions={['category.update']}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(category)}
                      >
                        <Edit />
                      </IconButton>
                    </PermissionGate>
                    <PermissionGate permissions={['category.delete']}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(category)}
                        disabled={category.dashboard_count > 0}
                      >
                        <Delete />
                      </IconButton>
                    </PermissionGate>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingCategory ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Category Name"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Display Name"
              fullWidth
              variant="outlined"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting || !formData.name || !formData.display_name}
            >
              {submitting ? <CircularProgress size={24} /> : (editingCategory ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}