import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Menu,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Tooltip,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Dashboard,
  Share,
  Star,
  StarBorder,
  ViewList,
  ViewModule,
  TableChart,
  Refresh,
  Category,
  BarChart,
  DateRange,
  Person,
  Public,
  Lock
} from '@mui/icons-material';

// Hooks
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboards } from '@/hooks/useDashboards';
import { useCategories } from '@/hooks/useCategories';

// Components
import { PermissionGate } from '@/components/shared/PermissionGate';

// Types
interface Dashboard {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'workspace' | 'public';
  is_featured: boolean;
  chart_count: number;
  thumbnail_url?: string;
  last_viewed_at?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  workspace_id: string;
}

interface DashboardCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  dashboard_count: number;
}

interface DashboardListProps {
  onDashboardSelect?: (dashboard: Dashboard) => void;
  viewMode?: 'grid' | 'list' | 'table';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDashboards?: string[];
  onSelectionChange?: (dashboardIds: string[]) => void;
  filterByCategory?: string;
  isWebview?: boolean;
  webviewName?: string;
}

export const DashboardList: React.FC<DashboardListProps> = ({
  onDashboardSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDashboards = [],
  onSelectionChange,
  filterByCategory,
  isWebview = false,
  webviewName,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  const { 
    dashboards, 
    loading, 
    error: dashboardError,
    createDashboard, 
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    toggleFeatured
  } = useDashboards();
  const { categories } = useCategories();

  // ============================================================================
  // State Management
  // ============================================================================
  
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(filterByCategory || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  // Form states
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // ============================================================================
  // Data Processing
  // ============================================================================
  
  const filteredDashboards = useMemo(() => {
    if (!dashboards?.data) return [];

    return dashboards.data.filter((dashboard: Dashboard) => {
      // Webview filter - only published dashboards
      if (isWebview && dashboard.status !== 'published') return false;
      
      const matchesSearch = !searchQuery || 
        dashboard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || dashboard.category_id === categoryFilter;
      const matchesStatus = statusFilter === 'all' || dashboard.status === statusFilter;
      const matchesVisibility = visibilityFilter === 'all' || dashboard.visibility === visibilityFilter;
      const matchesFeatured = !showFeaturedOnly || dashboard.is_featured;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesVisibility && matchesFeatured;
    });
  }, [dashboards?.data, searchQuery, categoryFilter, statusFilter, visibilityFilter, showFeaturedOnly, isWebview]);

  const sortedDashboards = useMemo(() => {
    return [...filteredDashboards].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.display_name || a.name).localeCompare(b.display_name || b.name);
        case 'category':
          return (a.category?.name || '').localeCompare(b.category?.name || '');
        case 'views':
          return b.view_count - a.view_count;
        case 'charts':
          return b.chart_count - a.chart_count;
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
  }, [filteredDashboards, sortBy]);

  const paginatedDashboards = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedDashboards.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedDashboards, page, rowsPerPage]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, dashboard: Dashboard) => {
    event.stopPropagation();
    setSelectedDashboard(dashboard);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedDashboard(null);
  }, []);

  const handleDashboardClick = useCallback((dashboard: Dashboard) => {
    if (selectionMode) {
      const isSelected = selectedDashboards.includes(dashboard.id);
      const newSelection = isSelected
        ? selectedDashboards.filter(id => id !== dashboard.id)
        : [...selectedDashboards, dashboard.id];
      onSelectionChange?.(newSelection);
    } else if (onDashboardSelect) {
      onDashboardSelect(dashboard);
    } else if (isWebview && webviewName) {
      router.push(`/${webviewName}/${dashboard.name}`);
    } else {
      router.push(`/workspace/${currentWorkspace?.slug}/dashboard/${dashboard.name}`);
    }
  }, [selectionMode, selectedDashboards, onSelectionChange, onDashboardSelect, isWebview, webviewName, router, currentWorkspace?.slug]);

  const handleEdit = useCallback(() => {
    if (selectedDashboard) {
      router.push(`/workspace/${currentWorkspace?.slug}/dashboard-builder?id=${selectedDashboard.id}`);
    }
    handleMenuClose();
  }, [selectedDashboard, router, currentWorkspace?.slug, handleMenuClose]);

  const handleDelete = useCallback(async () => {
    if (selectedDashboard) {
      try {
        await deleteDashboard(selectedDashboard.id);
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error('Failed to delete dashboard:', error);
      }
    }
    handleMenuClose();
  }, [selectedDashboard, deleteDashboard, handleMenuClose]);

  const handleDuplicate = useCallback(async () => {
    if (selectedDashboard) {
      try {
        await duplicateDashboard(selectedDashboard.id);
      } catch (error) {
        console.error('Failed to duplicate dashboard:', error);
      }
    }
    handleMenuClose();
  }, [selectedDashboard, duplicateDashboard, handleMenuClose]);

  const handleToggleFeatured = useCallback(async () => {
    if (selectedDashboard) {
      try {
        await toggleFeatured(selectedDashboard.id, !selectedDashboard.is_featured);
      } catch (error) {
        console.error('Failed to toggle featured status:', error);
      }
    }
    handleMenuClose();
  }, [selectedDashboard, toggleFeatured, handleMenuClose]);

  const handleCreateDashboard = useCallback(async () => {
    if (dashboardName.trim()) {
      try {
        const newDashboard = await createDashboard({
          name: dashboardName,
          description: dashboardDescription,
          category_id: selectedCategory || undefined
        });
        resetForm();
        setCreateDialogOpen(false);
        
        // Navigate to dashboard builder
        router.push(`/workspace/${currentWorkspace?.slug}/dashboard-builder?id=${newDashboard.id}`);
      } catch (error) {
        console.error('Failed to create dashboard:', error);
      }
    }
  }, [dashboardName, dashboardDescription, selectedCategory, createDashboard, resetForm, router, currentWorkspace?.slug]);

  const resetForm = useCallback(() => {
    setDashboardName('');
    setDashboardDescription('');
    setSelectedCategory('');
  }, []);

  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Public fontSize="small" />;
      case 'workspace':
        return <Dashboard fontSize="small" />;
      case 'private':
      default:
        return <Lock fontSize="small" />;
    }
  };

  const getCategoryChip = (category: DashboardCategory | undefined) => {
    if (!category) return null;
    
    return (
      <Chip
        icon={<Category fontSize="small" />}
        label={category.name}
        size="small"
        sx={{
          backgroundColor: category.color || 'primary.main',
          color: 'white',
          '& .MuiChip-icon': { color: 'white' }
        }}
      />
    );
  };

  // ============================================================================
  // Render Functions
  // ============================================================================
  
  const renderDashboardCard = (dashboard: Dashboard) => {
    const isSelected = selectionMode && selectedDashboards.includes(dashboard.id);
    
    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={dashboard.id}>
        <Card
          sx={{
            cursor: 'pointer',
            border: isSelected ? 2 : 1,
            borderColor: isSelected ? 'primary.main' : 'divider',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: 3,
              transform: 'translateY(-2px)'
            },
            transition: 'all 0.2s ease-in-out',
            position: 'relative'
          }}
          onClick={() => handleDashboardClick(dashboard)}
        >
          {dashboard.thumbnail_url ? (
            <CardMedia
              component="img"
              height="120"
              image={dashboard.thumbnail_url}
              alt={dashboard.display_name || dashboard.name}
              sx={{ objectFit: 'cover' }}
            />
          ) : (
            <Box
              sx={{
                height: 120,
                backgroundColor: 'grey.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Dashboard sx={{ fontSize: 48, color: 'grey.400' }} />
            </Box>
          )}
          
          {dashboard.is_featured && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'warning.main',
                borderRadius: '50%',
                p: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Star sx={{ fontSize: 16, color: 'white' }} />
            </Box>
          )}

          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="h6" component="div" noWrap>
                {dashboard.display_name || dashboard.name}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, dashboard)}
                sx={{ ml: 1 }}
              >
                <MoreVert />
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph>
              {dashboard.description || 'No description'}
            </Typography>

            <Box display="flex" gap={1} mb={2} flexWrap="wrap">
              {getCategoryChip(dashboard.category)}
              <Chip 
                label={dashboard.status} 
                size="small" 
                color={getStatusColor(dashboard.status)}
              />
              <Chip 
                icon={getVisibilityIcon(dashboard.visibility)}
                label={dashboard.visibility} 
                size="small" 
                variant="outlined"
              />
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Tooltip title="Charts">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <BarChart fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {dashboard.chart_count}
                    </Typography>
                  </Box>
                </Tooltip>
                <Tooltip title="Views">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Visibility fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {dashboard.view_count}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                {new Date(dashboard.updated_at).toLocaleDateString()}
              </Typography>
            </Box>

            {dashboard.owner && !isWebview && (
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Person fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {dashboard.owner.name}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderDashboardListItem = (dashboard: Dashboard) => {
    const isSelected = selectionMode && selectedDashboards.includes(dashboard.id);
    
    return (
      <ListItem
        key={dashboard.id}
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
        <ListItemAvatar>
          <Avatar 
            src={dashboard.thumbnail_url}
            sx={{ 
              bgcolor: dashboard.category?.color || 'primary.main',
              width: 56,
              height: 56
            }}
          >
            {dashboard.thumbnail_url ? null : <Dashboard />}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              {dashboard.display_name || dashboard.name}
              {dashboard.is_featured && <Star fontSize="small" color="warning" />}
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dashboard.description || 'No description'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                {getCategoryChip(dashboard.category)}
                <Chip 
                  label={dashboard.status} 
                  size="small" 
                  color={getStatusColor(dashboard.status)}
                />
                <Chip 
                  icon={getVisibilityIcon(dashboard.visibility)}
                  label={dashboard.visibility} 
                  size="small" 
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  {dashboard.chart_count} charts • {dashboard.view_count} views • 
                  Updated {new Date(dashboard.updated_at).toLocaleDateString()}
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

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Visibility</TableCell>
            <TableCell align="center">Charts</TableCell>
            <TableCell align="center">Views</TableCell>
            <TableCell>Last Updated</TableCell>
            {!isWebview && <TableCell>Owner</TableCell>}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedDashboards.map((dashboard) => {
            const isSelected = selectionMode && selectedDashboards.includes(dashboard.id);
            return (
              <TableRow 
                key={dashboard.id}
                selected={isSelected}
                hover
                onClick={() => handleDashboardClick(dashboard)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Dashboard fontSize="small" />
                    <Typography variant="body2">
                      {dashboard.display_name || dashboard.name}
                    </Typography>
                    {dashboard.is_featured && <Star fontSize="small" color="warning" />}
                  </Box>
                </TableCell>
                <TableCell>
                  {getCategoryChip(dashboard.category)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={dashboard.status} 
                    size="small" 
                    color={getStatusColor(dashboard.status)}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={getVisibilityIcon(dashboard.visibility)}
                    label={dashboard.visibility} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  {dashboard.chart_count}
                </TableCell>
                <TableCell align="center">
                  {dashboard.view_count}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(dashboard.updated_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                {!isWebview && (
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {dashboard.owner?.name || 'Unknown'}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, dashboard)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ============================================================================
  // Main Render
  // ============================================================================
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (dashboardError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Failed to load dashboards: {dashboardError}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          {isWebview ? 'Dashboards' : 'Dashboard Library'}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={() => setCurrentViewMode(
              currentViewMode === 'grid' ? 'list' : currentViewMode === 'list' ? 'table' : 'grid'
            )}
            title={`Switch to ${
              currentViewMode === 'grid' ? 'list' : currentViewMode === 'list' ? 'table' : 'grid'
            } view`}
          >
            {currentViewMode === 'grid' ? <ViewList /> : currentViewMode === 'list' ? <TableChart /> : <ViewModule />}
          </IconButton>
          
          {!isWebview && (
            <IconButton
              onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              title={showFeaturedOnly ? 'Show all dashboards' : 'Show featured only'}
              color={showFeaturedOnly ? 'warning' : 'default'}
            >
              {showFeaturedOnly ? <Star /> : <StarBorder />}
            </IconButton>
          )}
          
          {showCreateButton && !isWebview && (
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories?.data?.map((category: DashboardCategory) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name} ({category.dashboard_count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {!isWebview && (
            <>
              <Grid item xs={12} md={2}>
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
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Visibility</InputLabel>
                  <Select
                    value={visibilityFilter}
                    label="Visibility"
                    onChange={(e) => setVisibilityFilter(e.target.value)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="workspace">Workspace</MenuItem>
                    <MenuItem value="private">Private</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="updated_at">Last Updated</MenuItem>
                <MenuItem value="created_at">Created</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="views">Views</MenuItem>
                <MenuItem value="charts">Charts</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Typography variant="body2" color="text.secondary">
              {filteredDashboards.length} found
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Content */}
      {currentViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {paginatedDashboards.map(renderDashboardCard)}
        </Grid>
      ) : currentViewMode === 'list' ? (
        <List>
          {paginatedDashboards.map(renderDashboardListItem)}
        </List>
      ) : (
        renderTableView()
      )}

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredDashboards.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        sx={{ mt: 3 }}
      />

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => onDashboardSelect ? onDashboardSelect(selectedDashboard!) : handleDashboardClick(selectedDashboard!)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          {onDashboardSelect ? 'Select' : 'View'}
        </MenuItem>
        {!isWebview && (
          <>
            <MenuItem onClick={handleEdit}>
              <Edit fontSize="small" sx={{ mr: 1 }} />
              Edit
            </MenuItem>
            <MenuItem onClick={handleDuplicate}>
              <Add fontSize="small" sx={{ mr: 1 }} />
              Duplicate
            </MenuItem>
            <MenuItem onClick={() => setShareDialogOpen(true)}>
              <Share fontSize="small" sx={{ mr: 1 }} />
              Share
            </MenuItem>
            <MenuItem onClick={handleToggleFeatured}>
              {selectedDashboard?.is_featured ? (
                <StarBorder fontSize="small" sx={{ mr: 1 }} />
              ) : (
                <Star fontSize="small" sx={{ mr: 1 }} />
              )}
              {selectedDashboard?.is_featured ? 'Remove from Featured' : 'Add to Featured'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Dashboard</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDashboard?.display_name || selectedDashboard?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dashboard Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Dashboard</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={dashboardDescription}
              onChange={(e) => setDashboardDescription(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Category (Optional)</InputLabel>
              <Select
                value={selectedCategory}
                label="Category (Optional)"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {categories?.data?.map((category: DashboardCategory) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateDashboard} variant="contained" disabled={!dashboardName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardList;