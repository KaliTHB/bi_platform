// src/components/builder/DashboardList.tsx
// Updated to use proper type hierarchy and handle optional Dashboard properties

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
  Badge,
  Checkbox,
  ListItemButton
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

// =============================================================================
// Type Hierarchy
// =============================================================================

/**
 * Base interface for all list items
 */
interface BaseListItem {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
}

/**
 * Dashboard-specific list item interface extending BaseListItem
 */
interface DashboardListItem extends BaseListItem {
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
  owner_id: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Full Dashboard interface for external usage
 */
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

// =============================================================================
// Component Props
// =============================================================================

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
  itemsPerPage?: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert Dashboard to DashboardListItem
 */
const dashboardToListItem = (dashboard: Dashboard): DashboardListItem => {
  return {
    id: dashboard.id,
    name: dashboard.name,
    display_name: dashboard.display_name,
    description: dashboard.description,
    created_at: dashboard.created_at,
    updated_at: dashboard.updated_at,
    workspace_id: dashboard.workspace_id,
    category_id: dashboard.category_id,
    category: dashboard.category,
    status: dashboard.status,
    visibility: dashboard.visibility,
    is_featured: dashboard.is_featured,
    chart_count: dashboard.chart_count,
    thumbnail_url: dashboard.thumbnail_url,
    last_viewed_at: dashboard.last_viewed_at,
    view_count: dashboard.view_count,
    owner_id: dashboard.owner_id,
    owner: dashboard.owner,
  };
};

/**
 * Convert DashboardListItem back to Dashboard
 */
const listItemToDashboard = (item: DashboardListItem): Dashboard => {
  return {
    id: item.id,
    name: item.name,
    display_name: item.display_name,
    description: item.description,
    created_at: item.created_at,
    updated_at: item.updated_at,
    workspace_id: item.workspace_id,
    category_id: item.category_id,
    category: item.category,
    status: item.status,
    visibility: item.visibility,
    is_featured: item.is_featured,
    chart_count: item.chart_count,
    thumbnail_url: item.thumbnail_url,
    last_viewed_at: item.last_viewed_at,
    view_count: item.view_count,
    owner_id: item.owner_id,
    owner: item.owner,
  };
};

const getDashboardDisplayInfo = (item: DashboardListItem) => {
  return {
    name: item.display_name || item.name || 'Untitled Dashboard',
    description: item.description || 'No description available',
    category: item.category?.name || 'Uncategorized',
    status: item.status,
    visibility: item.visibility,
    isFeatured: item.is_featured,
    chartCount: item.chart_count,
    viewCount: item.view_count,
    updatedAt: item.updated_at || item.created_at || '',
    createdBy: item.owner?.name || 'Unknown',
    thumbnailUrl: item.thumbnail_url
  };
};

// =============================================================================
// Main Component
// =============================================================================

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
  itemsPerPage = 12,
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

  // =============================================================================
  // State Management
  // =============================================================================
  
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
  const [rowsPerPage, setRowsPerPage] = useState(itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  // Create dashboard form state
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [dashboardCategory, setDashboardCategory] = useState('');

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Convert dashboards to list items
  const dashboardListItems = useMemo(() => {
    return (dashboards || []).map(dashboard => dashboardToListItem(dashboard));
  }, [dashboards]);

  // Filter and sort the dashboards
  const filteredDashboards = useMemo(() => {
    let filtered = dashboardListItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.display_name && item.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesVisibility = visibilityFilter === 'all' || item.visibility === visibilityFilter;
      const matchesFeatured = !showFeaturedOnly || item.is_featured;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesVisibility && matchesFeatured;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.display_name || a.name).localeCompare(b.display_name || b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'visibility':
          return a.visibility.localeCompare(b.visibility);
        case 'chart_count':
          return b.chart_count - a.chart_count;
        case 'view_count':
          return b.view_count - a.view_count;
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [dashboardListItems, searchQuery, categoryFilter, statusFilter, visibilityFilter, showFeaturedOnly, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredDashboards.length / rowsPerPage);
  const paginatedDashboards = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredDashboards.slice(startIndex, endIndex);
  }, [filteredDashboards, page, rowsPerPage]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleDashboardClick = (item: DashboardListItem) => {
    const dashboard = listItemToDashboard(item);
    if (selectionMode) {
      const newSelection = selectedDashboards.includes(item.id)
        ? selectedDashboards.filter(id => id !== item.id)
        : [...selectedDashboards, item.id];
      onSelectionChange?.(newSelection);
    } else if (onDashboardSelect) {
      onDashboardSelect(dashboard);
    } else if (!isWebview) {
      router.push(`/dashboard/${item.id}`);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: DashboardListItem) => {
    event.stopPropagation();
    setSelectedDashboard(listItemToDashboard(item));
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    if (selectedDashboard && !isWebview) {
      router.push(`/dashboard/${selectedDashboard.id}/edit`);
    }
  };

  const handleDuplicate = async () => {
    if (selectedDashboard && duplicateDashboard) {
      try {
        await duplicateDashboard(selectedDashboard.id);
      } catch (error) {
        console.error('Failed to duplicate dashboard:', error);
      }
    }
  };

  const handleToggleFeatured = async () => {
    if (selectedDashboard && toggleFeatured) {
      try {
        await toggleFeatured(selectedDashboard.id);
      } catch (error) {
        console.error('Failed to toggle featured status:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedDashboard && deleteDashboard) {
      try {
        await deleteDashboard(selectedDashboard.id);
        setDeleteDialogOpen(false);
        setSelectedDashboard(null);
      } catch (error) {
        console.error('Failed to delete dashboard:', error);
      }
    }
  };

  const handleCreateDashboard = async () => {
    if (!createDashboard) return;

    try {
      const dashboardData = {
        name: dashboardName,
        description: dashboardDescription,
        category_id: dashboardCategory || null,
        workspace_id: currentWorkspace?.id
      };

      await createDashboard(dashboardData);
      resetCreateForm();
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  const resetCreateForm = () => {
    setDashboardName('');
    setDashboardDescription('');
    setDashboardCategory('');
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectionChange?.(paginatedDashboards.map(item => item.id));
    } else {
      onSelectionChange?.([]);
    }
  };

  // =============================================================================
  // Utility Functions for Rendering
  // =============================================================================

  const getCategoryChip = (category?: { id: string; name: string; color?: string; icon?: string }) => {
    if (!category) return null;
    
    return (
      <Chip
        label={category.name}
        size="small"
        variant="outlined"
        sx={{
          backgroundColor: category.color ? `${category.color}15` : undefined,
          borderColor: category.color || 'primary.main',
          color: category.color || 'primary.main'
        }}
      />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'error';
      default:
        return 'default';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Public fontSize="small" />;
      case 'workspace':
        return <Person fontSize="small" />;
      case 'private':
        return <Lock fontSize="small" />;
      default:
        return <Lock fontSize="small" />;
    }
  };

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderFiltersAndControls = () => (
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
              {categories?.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
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
              <MenuItem value="all">All Visibility</MenuItem>
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="workspace">Workspace</MenuItem>
              <MenuItem value="private">Private</MenuItem>
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
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="chart_count">Chart Count</MenuItem>
              <MenuItem value="view_count">View Count</MenuItem>
              <MenuItem value="created_at">Recently Created</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Selection controls for selection mode */}
      {selectionMode && (
        <Box mt={2} pt={2} borderTop={1} borderColor="divider">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Checkbox
                indeterminate={selectedDashboards.length > 0 && selectedDashboards.length < paginatedDashboards.length}
                checked={paginatedDashboards.length > 0 && selectedDashboards.length === paginatedDashboards.length}
                onChange={handleSelectAll}
              />
              <Typography variant="body2">
                {selectedDashboards.length} of {filteredDashboards.length} selected
              </Typography>
            </Box>
            {selectedDashboards.length > 0 && (
              <Button size="small" onClick={() => onSelectionChange?.([])}>
                Clear Selection
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Results summary */}
      <Box mt={1}>
        <Typography variant="body2" color="text.secondary">
          Showing {paginatedDashboards.length} of {filteredDashboards.length} dashboards
        </Typography>
      </Box>
    </Paper>
  );

  const renderDashboardCard = (item: DashboardListItem) => {
    const displayInfo = getDashboardDisplayInfo(item);
    const isSelected = selectionMode && selectedDashboards.includes(item.id);

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
        <Card
          sx={{
            height: '100%',
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
          onClick={() => handleDashboardClick(item)}
        >
          {displayInfo.thumbnailUrl ? (
            <CardMedia
              component="img"
              height="120"
              image={displayInfo.thumbnailUrl}
              alt={displayInfo.name}
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
          
          {displayInfo.isFeatured && (
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

          {selectionMode && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'background.paper',
                borderRadius: '50%',
                p: 0.5
              }}
            >
              <Checkbox
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  handleDashboardClick(item);
                }}
                size="small"
              />
            </Box>
          )}

          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="h6" component="div" noWrap>
                {displayInfo.name}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, item)}
              >
                <MoreVert />
              </IconButton>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                height: 40,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {displayInfo.description}
            </Typography>

            <Box display="flex" gap={0.5} mb={1} flexWrap="wrap">
              {getCategoryChip(item.category)}
              <Chip 
                label={displayInfo.status} 
                size="small" 
                color={getStatusColor(displayInfo.status) as any}
              />
              <Chip 
                icon={getVisibilityIcon(displayInfo.visibility)}
                label={displayInfo.visibility} 
                size="small" 
                variant="outlined"
              />
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Box display="flex" gap={2}>
                <Tooltip title="Charts">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <BarChart fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {displayInfo.chartCount}
                    </Typography>
                  </Box>
                </Tooltip>
                <Tooltip title="Views">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Visibility fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {displayInfo.viewCount}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                {new Date(displayInfo.updatedAt).toLocaleDateString()}
              </Typography>
            </Box>

            {item.owner && !isWebview && (
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Person fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {displayInfo.createdBy}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderDashboardListItem = (item: DashboardListItem) => {
    const displayInfo = getDashboardDisplayInfo(item);
    const isSelected = selectionMode && selectedDashboards.includes(item.id);
    
    return (
      <ListItem
        key={item.id}
        disablePadding
        sx={{
          border: 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          borderRadius: 1,
          mb: 1,
          bgcolor: isSelected ? 'action.selected' : 'background.paper'
        }}
      >
        <ListItemButton
          onClick={() => handleDashboardClick(item)}
          sx={{ py: 1.5 }}
        >
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleDashboardClick(item);
              }}
              sx={{ mr: 1 }}
            />
          )}

          <ListItemAvatar>
            <Avatar 
              src={displayInfo.thumbnailUrl}
              sx={{ 
                bgcolor: item.category?.color || 'primary.main',
                width: 56,
                height: 56
              }}
            >
              {displayInfo.thumbnailUrl ? null : <Dashboard />}
            </Avatar>
          </ListItemAvatar>
          
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                {displayInfo.name}
                {displayInfo.isFeatured && <Star fontSize="small" color="warning" />}
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {displayInfo.description}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  {getCategoryChip(item.category)}
                  <Chip 
                    label={displayInfo.status} 
                    size="small" 
                    color={getStatusColor(displayInfo.status) as any}
                  />
                  <Chip 
                    icon={getVisibilityIcon(displayInfo.visibility)}
                    label={displayInfo.visibility} 
                    size="small" 
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {displayInfo.chartCount} charts • {displayInfo.viewCount} views • 
                    Updated {new Date(displayInfo.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            }
          />
          
          <IconButton
            onClick={(e) => handleMenuClick(e, item)}
            sx={{ ml: 1 }}
          >
            <MoreVert />
          </IconButton>
        </ListItemButton>
      </ListItem>
    );
  };

  const renderTableView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {selectionMode && (
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedDashboards.length > 0 && selectedDashboards.length < paginatedDashboards.length}
                  checked={paginatedDashboards.length > 0 && selectedDashboards.length === paginatedDashboards.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
            )}
            <TableCell>Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Visibility</TableCell>
            <TableCell align="center">Charts</TableCell>
            <TableCell align="center">Views</TableCell>
            <TableCell>Updated</TableCell>
            {!isWebview && <TableCell>Owner</TableCell>}
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedDashboards.map((item) => {
            const displayInfo = getDashboardDisplayInfo(item);
            const isSelected = selectionMode && selectedDashboards.includes(item.id);
            
            return (
              <TableRow
                key={item.id}
                hover
                selected={isSelected}
                onClick={() => handleDashboardClick(item)}
                sx={{ cursor: 'pointer' }}
              >
                {selectionMode && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleDashboardClick(item);
                      }}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar
                      src={displayInfo.thumbnailUrl}
                      sx={{ width: 32, height: 32 }}
                    >
                      <Dashboard />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {displayInfo.name}
                        {displayInfo.isFeatured && (
                          <Star fontSize="small" sx={{ ml: 1, color: 'warning.main' }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {displayInfo.description}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {getCategoryChip(item.category)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={displayInfo.status}
                    size="small"
                    color={getStatusColor(displayInfo.status) as any}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getVisibilityIcon(displayInfo.visibility)}
                    label={displayInfo.visibility}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  {displayInfo.chartCount}
                </TableCell>
                <TableCell align="center">
                  {displayInfo.viewCount}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(displayInfo.updatedAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                {!isWebview && (
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {displayInfo.createdBy}
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, item)}
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

  const renderEmptyState = () => (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 8 }}>
        <Dashboard sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No dashboards found
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || visibilityFilter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'Create your first dashboard to get started'
          }
        </Typography>
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
      </CardContent>
    </Card>
  );

  // =============================================================================
  // Main Render
  // =============================================================================
  
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

      {/* Filters and Controls */}
      {renderFiltersAndControls()}

      {/* Dashboard List */}
      {filteredDashboards.length === 0 ? (
        renderEmptyState()
      ) : currentViewMode === 'grid' ? (
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
        <MenuItem onClick={() => onDashboardSelect ? onDashboardSelect(selectedDashboard!) : handleDashboardClick(dashboardToListItem(selectedDashboard!))}>
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
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dashboard Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetCreateForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Dashboard</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dashboard Name"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={dashboardDescription}
                onChange={(e) => setDashboardDescription(e.target.value)}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={dashboardCategory}
                  label="Category"
                  onChange={(e) => setDashboardCategory(e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {categories?.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setCreateDialogOpen(false);
              resetCreateForm();
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDashboard}
            variant="contained"
            disabled={!dashboardName.trim()}
          >
            Create Dashboard
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog Placeholder */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Dashboard</DialogTitle>
        <DialogContent>
          <Typography>Share functionality will be implemented here.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};