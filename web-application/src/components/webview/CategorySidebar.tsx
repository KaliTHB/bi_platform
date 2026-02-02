// web-application/src/components/webview/CategorySidebar.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Badge,
  Divider,
  Skeleton,
  Alert,
  InputAdornment,
  Chip
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Clear as ClearIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CategoryWithDashboards {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  color?: string;
  icon?: string;
  dashboard_count: number;
  order_index: number;
  is_visible: boolean;
  dashboards: WebviewDashboard[];
}

export interface WebviewDashboard {
  id: string;
  dashboard_id: string;
  webview_id: string;
  category_id: string;
  name: string;
  display_name: string;
  description?: string;
  thumbnail_url?: string;
  is_featured: boolean;
  is_public: boolean;
  view_count: number;
  last_viewed_at?: string;
  order_index: number;
  tags: string[];
}

export interface CategorySidebarProps {
  categories: CategoryWithDashboards[];
  expandedCategories: Set<string>;
  selectedDashboard?: string;
  searchQuery: string;
  loading?: boolean;
  error?: string | null;
  onCategoryToggle: (categoryId: string) => void;
  onDashboardSelect: (dashboardId: string) => void;
  onSearchChange: (query: string) => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getCategoryIcon = (iconName?: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'dashboard': <DashboardIcon />,
    'folder': <FolderIcon />,
    'category': <CategoryIcon />,
    'star': <StarIcon />
  };
  
  return iconMap[iconName || 'folder'] || <FolderIcon />;
};

const getColorFromString = (str: string): string => {
  const colors = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', 
    '#7b1fa2', '#303f9f', '#0288d1', '#00796b'
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  expandedCategories,
  selectedDashboard,
  searchQuery,
  loading = false,
  error = null,
  onCategoryToggle,
  onDashboardSelect,
  onSearchChange
}) => {
  const router = useRouter();
  const { 'webview-slug': webviewSlug } = router.query;
  
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories.filter(cat => cat.is_visible);
    }

    const query = searchQuery.toLowerCase();
    
    return categories
      .filter(cat => cat.is_visible)
      .map(category => {
        // Filter dashboards that match the search
        const matchingDashboards = category.dashboards.filter(dashboard =>
          dashboard.display_name.toLowerCase().includes(query) ||
          dashboard.description?.toLowerCase().includes(query) ||
          dashboard.tags.some(tag => tag.toLowerCase().includes(query))
        );

        // Include category if name matches or has matching dashboards
        const categoryMatches = category.display_name.toLowerCase().includes(query) ||
                               category.description?.toLowerCase().includes(query);

        return {
          ...category,
          dashboards: matchingDashboards,
          dashboard_count: matchingDashboards.length,
          _matches: categoryMatches || matchingDashboards.length > 0
        };
      })
      .filter(category => (category as any)._matches);
  }, [categories, searchQuery]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalSearchQuery(value);
    onSearchChange(value);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    onSearchChange('');
  };

  const handleDashboardClick = (dashboard: WebviewDashboard) => {
    onDashboardSelect(dashboard.dashboard_id);
    
    // Navigate to dashboard
    if (webviewSlug) {
      router.replace(`/${webviewSlug}/${dashboard.dashboard_id}`);
    }
  };

  // =============================================================================
  // LOADING STATE
  // =============================================================================

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {/* Search Skeleton */}
        <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
        
        {/* Category Skeletons */}
        {Array.from({ length: 3 }).map((_, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={48} sx={{ mb: 1 }} />
            <Box sx={{ ml: 2 }}>
              {Array.from({ length: 2 }).map((_, dashIndex) => (
                <Skeleton 
                  key={dashIndex} 
                  variant="rectangular" 
                  height={32} 
                  sx={{ mb: 1 }} 
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  // =============================================================================
  // ERROR STATE
  // =============================================================================

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Section */}
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search dashboards..."
          value={localSearchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: localSearchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  edge="end"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'background.paper'
              }
            }
          }}
        />
      </Box>

      <Divider />

      {/* Categories List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List dense sx={{ py: 0 }}>
          {filteredCategories.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {searchQuery ? 'No dashboards found matching your search' : 'No categories available'}
              </Typography>
            </Box>
          ) : (
            filteredCategories.map((category) => (
              <Box key={category.id}>
                {/* Category Header */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => onCategoryToggle(category.id)}
                    sx={{
                      py: 1.5,
                      minHeight: 48,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: category.color || getColorFromString(category.name),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px'
                        }}
                      >
                        {getCategoryIcon(category.icon)}
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" noWrap>
                            {category.display_name}
                          </Typography>
                          {category.dashboard_count > 0 && (
                            <Badge
                              badgeContent={category.dashboard_count}
                              color="primary"
                              sx={{
                                '& .MuiBadge-badge': {
                                  fontSize: '10px',
                                  height: '16px',
                                  minWidth: '16px'
                                }
                              }}
                            />
                          )}
                        </Box>
                      }
                      secondary={category.description}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        noWrap: true,
                        sx: { color: 'text.secondary' }
                      }}
                    />
                    
                    {category.dashboards.length > 0 && (
                      expandedCategories.has(category.id) ? 
                        <ExpandLess /> : <ExpandMore />
                    )}
                  </ListItemButton>
                </ListItem>

                {/* Category Dashboards */}
                <Collapse
                  in={expandedCategories.has(category.id)}
                  timeout="auto"
                  unmountOnExit
                >
                  <List dense disablePadding>
                    {category.dashboards
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((dashboard) => (
                        <ListItem key={dashboard.id} disablePadding>
                          <ListItemButton
                            selected={selectedDashboard === dashboard.dashboard_id}
                            onClick={() => handleDashboardClick(dashboard)}
                            sx={{
                              pl: 4,
                              py: 0.75,
                              minHeight: 36,
                              '&.Mui-selected': {
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                '&:hover': {
                                  bgcolor: 'primary.dark'
                                }
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <DashboardIcon 
                                fontSize="small" 
                                color={selectedDashboard === dashboard.dashboard_id ? 'inherit' : 'action'}
                              />
                            </ListItemIcon>
                            
                            <ListItemText
                              primary={dashboard.display_name}
                              primaryTypographyProps={{
                                variant: 'body2',
                                noWrap: true
                              }}
                            />
                            
                            {/* Dashboard Metadata */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {dashboard.is_featured && (
                                <StarIcon 
                                  fontSize="inherit" 
                                  sx={{ 
                                    color: selectedDashboard === dashboard.dashboard_id 
                                      ? 'inherit' 
                                      : 'warning.main',
                                    fontSize: 14 
                                  }} 
                                />
                              )}
                              {dashboard.view_count > 0 && (
                                <Chip
                                  size="small"
                                  label={dashboard.view_count}
                                  icon={<ViewIcon />}
                                  sx={{
                                    height: 16,
                                    fontSize: 10,
                                    '& .MuiChip-icon': { fontSize: 12 },
                                    bgcolor: selectedDashboard === dashboard.dashboard_id 
                                      ? 'rgba(255,255,255,0.2)' 
                                      : 'action.hover'
                                  }}
                                />
                              )}
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      ))}
                  </List>
                </Collapse>

                <Divider variant="middle" />
              </Box>
            ))
          )}
        </List>
      </Box>

      {/* Footer */}
      <Divider />
      <Box sx={{ p: 2, pt: 1 }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} • {' '}
          {filteredCategories.reduce((sum, cat) => sum + cat.dashboards.length, 0)} dashboards
        </Typography>
      </Box>
    </Box>
  );
};

export default CategorySidebar;