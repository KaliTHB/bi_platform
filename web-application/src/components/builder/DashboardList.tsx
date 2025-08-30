'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  Tooltip,
  Fab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  Share,
  FileCopy,
  Schedule,
  TrendingUp,
  Search,
  FilterList,
  ViewModule,
  ViewList,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/types/dashboard.types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboards } from '@/hooks/useDashboards';
import PermissionGate from '@/components/shared/PermissionGate';

interface DashboardListProps {
  categoryId?: string;
  onDashboardSelect?: (dashboard: Dashboard) => void;
  viewMode?: 'grid' | 'list';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDashboards?: string[];
  onSelectionChange?: (dashboardIds: string[]) => void;
}

export const DashboardList: React.FC<DashboardListProps> = ({
  categoryId,
  onDashboardSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDashboards = [],
  onSelectionChange,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { 
    dashboards, 
    loading, 
    createDashboard, 
    updateDashboard,
    deleteDashboard, 
    duplicateDashboard 
  } = useDashboards();

  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');

  // Form states
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [dashboardCategory, setDashboardCategory] = useState('');

  const filteredDashboards = dashboards
    .filter(dashboard => {
      if (categoryId && dashboard.category_id !== categoryId) return false;
      if (statusFilter !== 'all' && dashboard.status !== statusFilter) return false;
      if (searchQuery && !dashboard.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !dashboard.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'updated_at': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'view_count': return (b.view_count || 0) - (a.view_count || 0);
        default: return 0;
      }
    });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dashboard: Dashboard) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDashboard(dashboard);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDashboard(null);
  };

  const handleEdit = () => {
    if (selectedDashboard) {
      setDashboardName(selectedDashboard.name);
      setDashboardDescription(selectedDashboard.description || '');
      setDashboardCategory(selectedDashboard.category_id || '');
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedDashboard) {
      if (onDashboardSelect) {
        onDashboardSelect(selectedDashboard);
      } else {
        router.push(`/workspace/${currentWorkspace?.slug}/dashboard/${selectedDashboard.slug}`);
      }
    }
    handleMenuClose();
  };

  const handleDuplicate = async () => {
    if (selectedDashboard) {
      await duplicateDashboard(selectedDashboard.id);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedDashboard) {
      await deleteDashboard(selectedDashboard.id);
      setDeleteDialogOpen(false);
    }
    handleMenuClose();
  };

  const handleCreateDashboard = async () => {
    if (dashboardName.trim()) {
      await createDashboard({
        name: dashboardName,
        description: dashboardDescription,
        category_id: dashboardCategory || categoryId,
      });
      resetForm();
      setCreateDialogOpen(false);
    }
  };

  const handleUpdateDashboard = async () => {
    if (selectedDashboard && dashboardName.trim()) {
      await updateDashboard(selectedDashboard.id, {
        name: dashboardName,
        description: dashboardDescription,
        category_id: dashboardCategory,
      });
      resetForm();
      setEditDialogOpen(false);
    }
  };

  const resetForm = () => {
    setDashboardName('');
    setDashboardDescription('');
    setDashboardCategory('');
  };

  const handleDashboardClick = (dashboard: Dashboard) => {
    if (selectionMode) {
      const newSelection = selectedDashboards.includes(dashboard.id)
        ? selectedDashboards.filter(id => id !== dashboard.id)
        : [...selectedDashboards, dashboard.id];
      onSelectionChange?.(newSelection);
    } else {
      onDashboardSelect?.(dashboard);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const DashboardCard = ({ dashboard }: { dashboard: Dashboard }) => {
    const isSelected = selectionMode && selectedDashboards.includes(dashboard.id);
    
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            boxShadow: 3,
          },
        }}
        onClick={() => handleDashboardClick(dashboard)}
      >
        {dashboard.thumbnail_url && (
          <Box
            component="img"
            sx={{
              height: 120,
              objectFit: 'cover',
            }}
            src={dashboard.thumbnail_url}
            alt={dashboard.display_name || dashboard.name}
          />
        )}
        
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="h6" component="h3" noWrap sx={{ flex: 1 }}>
              {dashboard.display_name || dashboard.name}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleMenuClick(e, dashboard)}
            >
              <MoreVert />
            </IconButton>
          </Box>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              minHeight: 32,
            }}
          >
            {dashboard.description || 'No description available'}
          </Typography>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Chip 
              label={dashboard.status} 
              size="small" 
              color={getStatusColor(dashboard.status) as any}
            />
            {dashboard.is_featured && (
              <Chip label="Featured" size="small" color="primary" />
            )}
          </Box>

          <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <TrendingUp fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {dashboard.view_count || 0} views
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {new Date(dashboard.updated_at).toLocaleDateString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const DashboardListItem = ({ dashboard }: { dashboard: Dashboard }) => {
    const isSelected = selectionMode && selectedDashboards.includes(dashboard.id);
    
    return (
      <ListItem
        button
        selected={isSelected}
        onClick={() => handleDashboardClick(dashboard)}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 1,
        }}
      >
        <ListItemText
          primary={dashboard.display_name || dashboard.name}
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dashboard.description || 'No description'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={dashboard.status} 
                  size="small" 
                  color={getStatusColor(dashboard.status) as any}
                />
                <Typography variant="caption" color="text.secondary">
                  {dashboard.view_count || 0} views • Updated {new Date(dashboard.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            onClick={(e) => handleMenuClick(e, dashboard)}
          >
            <MoreVert />
          </IconButton>
        </ListItemSecondaryAction>
      </ListItem>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading dashboards...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Dashboards
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => setCurrentViewMode(currentViewMode === 'grid' ? 'list' : 'grid')}>
            {currentViewMode === 'grid' ? <ViewList /> : <ViewModule />}
          </IconButton>
          
          {showCreateButton && (
            <PermissionGate permissions={['dashboard.create']}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Dashboard
              </Button>
            </PermissionGate>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search dashboards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="updated_at">Recently Updated</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="view_count">Most Viewed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredDashboards.length} dashboard(s)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Dashboard List */}
      {filteredDashboards.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No dashboards found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first dashboard'
              }
            </Typography>
            {showCreateButton && !searchQuery && statusFilter === 'all' && (
              <PermissionGate permissions={['dashboard.create']}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Dashboard
                </Button>
              </PermissionGate>
            )}
          </CardContent>
        </Card>
      ) : currentViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredDashboards.map((dashboard) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={dashboard.id}>
              <DashboardCard dashboard={dashboard} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <List>
          {filteredDashboards.map((dashboard, index) => (
            <React.Fragment key={dashboard.id}>
              <DashboardListItem dashboard={dashboard} />
              {index < filteredDashboards.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          {onDashboardSelect ? 'Select' : 'View'}
        </MenuItem>
        <PermissionGate permissions={['dashboard.update']}>
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        </PermissionGate>
        <PermissionGate permissions={['dashboard.create']}>
          <MenuItem onClick={handleDuplicate}>
            <FileCopy fontSize="small" sx={{ mr: 1 }} />
            Duplicate
          </MenuItem>
        </PermissionGate>
        <MenuItem>
          <Share fontSize="small" sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <PermissionGate permissions={['dashboard.delete']}>
          <MenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ color: 'error.main' }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </PermissionGate>
      </Menu>

      {/* Create Dashboard Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Dashboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dashboard Name"
            fullWidth
            variant="outlined"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={dashboardDescription}
            onChange={(e) => setDashboardDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Category (Optional)</InputLabel>
            <Select
              value={dashboardCategory}
              label="Category (Optional)"
              onChange={(e) => setDashboardCategory(e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {/* Add category options here */}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDashboard} 
            variant="contained"
            disabled={!dashboardName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dashboard Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Dashboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dashboard Name"
            fullWidth
            variant="outlined"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={dashboardDescription}
            onChange={(e) => setDashboardDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={dashboardCategory}
              label="Category"
              onChange={(e) => setDashboardCategory(e.target.value)}
            >
              <MenuItem value="">None</MenuItem>
              {/* Add category options here */}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateDashboard} 
            variant="contained"
            disabled={!dashboardName.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Dashboard</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDashboard?.name}"? This action cannot be undone and will also delete all associated charts.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Create (mobile) */}
      {showCreateButton && (
        <PermissionGate permissions={['dashboard.create']}>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              display: { xs: 'flex', md: 'none' },
            }}
            onClick={() => setCreateDialogOpen(true)}
          >
            <Add />
          </Fab>
        </PermissionGate>
      )}
    </Box>
  );
};

export default DashboardList;