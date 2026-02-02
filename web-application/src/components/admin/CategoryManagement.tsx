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
  InputAdornment,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Folder,
  Dashboard as DashboardIcon,
  ColorLens,
  DragHandle,
} from '@mui/icons-material';

// Define category interface
interface DashboardCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_category_id?: string;
  sort_order: number;
  dashboard_count?: number;
}

interface CategoryFormData {
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  parent_category_id: string;
  sort_order: number;
}

// Mock data for demonstration
const mockCategories: DashboardCategory[] = [
  {
    id: '1',
    name: 'sales',
    display_name: 'Sales',
    description: 'Sales performance dashboards',
    icon: '📊',
    color: '#1976d2',
    sort_order: 1,
    dashboard_count: 5,
  },
  {
    id: '2',
    name: 'marketing',
    display_name: 'Marketing',
    description: 'Marketing analytics',
    icon: '📈',
    color: '#388e3c',
    sort_order: 2,
    dashboard_count: 3,
  },
];

// Predefined color palette
const colorOptions = [
  '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
  '#303f9f', '#1976d2', '#00796b', '#689f38', '#f9a825',
  '#e64a19', '#5d4037', '#455a64', '#e91e63', '#9c27b0',
];

export const CategoryManagement: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DashboardCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    display_name: '',
    description: '',
    icon: '📁',
    color: '#1976d2',
    parent_category_id: '',
    sort_order: 0,
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<DashboardCategory[]>(mockCategories);

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      display_name: '',
      description: '',
      icon: '📁',
      color: '#1976d2',
      parent_category_id: '',
      sort_order: 0,
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
      sort_order: category.sort_order,
    });
    setDialogOpen(true);
  };

  const handleDeleteCategory = async (category: DashboardCategory) => {
    if (confirm('Are you sure you want to delete this category? All dashboards will be moved to uncategorized.')) {
      try {
        setLoading(true);
        // Mock delete - replace with actual API call
        setCategories(prev => prev.filter(c => c.id !== category.id));
        console.log('Deleted category:', category.id);
      } catch (error) {
        console.error('Failed to delete category:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (editingCategory) {
        // Mock update
        setCategories(prev => prev.map(c => 
          c.id === editingCategory.id 
            ? { ...c, ...formData }
            : c
        ));
      } else {
        // Mock create
        const newCategory: DashboardCategory = {
          id: Date.now().toString(),
          ...formData,
          dashboard_count: 0,
        };
        setCategories(prev => [...prev, newCategory]);
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof CategoryFormData) => {
    if (field === 'color') {
      return (event: SelectChangeEvent<string>) => {
        setFormData(prev => ({
          ...prev,
          [field]: event.target.value,
        }));
      };
    }
    
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
    };
  };

  return (
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
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateCategory}
        >
          Add Category
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid item xs={12} sm={6} md={4} key={category.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        backgroundColor: category.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        fontSize: '1.2rem',
                      }}
                    >
                      {category.icon}
                    </Box>
                    <Box flexGrow={1}>
                      <Typography variant="h6">
                        {category.display_name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {category.dashboard_count} dashboard{category.dashboard_count !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    {category.description || 'No description'}
                  </Typography>
                  
                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCategory(category)}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Category Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={formData.name}
              onChange={handleFormChange('name')}
              margin="normal"
              placeholder="e.g., sales, marketing"
              helperText="Used in URLs (lowercase, no spaces)"
            />
            
            <TextField
              fullWidth
              label="Display Name"
              value={formData.display_name}
              onChange={handleFormChange('display_name')}
              margin="normal"
              placeholder="e.g., Sales, Marketing"
            />
            
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleFormChange('description')}
              margin="normal"
              multiline
              rows={2}
              placeholder="Brief description of this category"
            />
            
            <TextField
              fullWidth
              label="Icon"
              value={formData.icon}
              onChange={handleFormChange('icon')}
              margin="normal"
              placeholder="📊"
              helperText="Use an emoji or icon character"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Color</InputLabel>
              <Select
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                label="Color"
              >
                {colorOptions.map((color) => (
                  <MenuItem key={color} value={color}>
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: color,
                          mr: 2,
                        }}
                      />
                      {color}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Sort Order"
              type="number"
              value={formData.sort_order}
              onChange={handleFormChange('sort_order')}
              margin="normal"
              helperText="Lower numbers appear first"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (editingCategory ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};