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
import Navigation from '@/components/shared/Navigation';
import PermissionGate from '@/components/shared/PermissionGate';
import { useCategories, Category } from '@/hooks/useCategories';
import { useNotification } from '@/components/providers/NotificationProvider';

export default function CategoriesPage() {
  const router = useRouter();
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const { showNotification } = useNotification();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: 'category',
    color: '#1976d2',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleOpenDialog = (category: Category | null = null) => {
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

  const handleDelete = async (category: Category) => {
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
            <Typography variant="h6" gutterBottom>
              No Categories Found
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first category to organize your dashboards.
            </Typography>
            <PermissionGate permissions={['category.create']}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Create Category
              </Button>
            </PermissionGate>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card>
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
                          mr: 2,
                          color: 'white',
                          fontSize: '1.2rem',
                        }}
                      >
                        {category.icon || '📁'}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">
                          {category.display_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {category.name}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {category.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {category.description}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
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
                        color="error"
                        onClick={() => handleDelete(category)}
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

        {/* Category Form Dialog */}
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
              label="Icon (Emoji)"
              fullWidth
              variant="outlined"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
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