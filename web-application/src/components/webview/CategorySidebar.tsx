// web-application/src/components/webview/CategorySidebar.tsx
import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Folder,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { CategoryWithDashboards } from '../../types/index';

export interface CategorySidebarProps {
  categories: CategoryWithDashboards[];
  expandedCategories: Set<string>;
  selectedDashboard?: string;
  searchQuery: string;
  loading: boolean;
  error?: string | null;
  onCategoryToggle: (categoryId: string) => void;
  onDashboardSelect: (dashboardId: string) => void;
  onSearchChange?: (query: string) => void; // Add this prop
  onRetry?: () => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  expandedCategories,
  selectedDashboard,
  searchQuery,
  loading,
  error,
  onCategoryToggle,
  onDashboardSelect,
  onSearchChange,
  onRetry
}) => {
  const [localSearchQuery, setLocalSearchQuery] = React.useState(searchQuery);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onSearchChange && localSearchQuery !== searchQuery) {
        onSearchChange(localSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchQuery, onSearchChange]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchQuery(event.target.value);
  };

  const filteredCategories = React.useMemo(() => {
    if (!localSearchQuery.trim()) return categories;
    
    const query = localSearchQuery.toLowerCase();
    
    return categories.filter(category => {
      // Check if category name matches
      const categoryMatches = category.display_name.toLowerCase().includes(query) ||
                             (category.description && category.description.toLowerCase().includes(query));
      
      // Check if any dashboard in category matches
      const dashboardMatches = category.dashboards?.some(dashboard =>
        dashboard.display_name?.toLowerCase().includes(query) ||
        (dashboard.description && dashboard.description.toLowerCase().includes(query))
      );
      
      return categoryMatches || dashboardMatches;
    }).map(category => ({
      ...category,
      dashboards: category.dashboards?.filter(dashboard =>
        dashboard.display_name?.toLowerCase().includes(query) ||
        (dashboard.description && dashboard.description.toLowerCase().includes(query)) ||
        category.display_name.toLowerCase().includes(query)
      )
    }));
  }, [categories, localSearchQuery]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        p: 3
      }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Loading categories...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="error" 
          action={
            onRetry ? (
              <button 
                onClick={onRetry}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (!categories || categories.length === 0) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        p: 3,
        textAlign: 'center'
      }}>
        <WarningIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
        <Typography variant="h6" color="text.secondary">
          No Categories Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Categories will appear here once they are created with dashboards.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search Bar */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
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
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />
      </Box>

      {/* Category List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ py: 1 }}>
          {filteredCategories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              expanded={expandedCategories.has(category.id)}
              selectedDashboard={selectedDashboard}
              onToggle={() => onCategoryToggle(category.id)}
              onDashboardSelect={onDashboardSelect}
              searchQuery={localSearchQuery}
            />
          ))}
        </List>
        
        {/* No search results */}
        {filteredCategories.length === 0 && localSearchQuery && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No dashboards found matching "{localSearchQuery}"
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Try adjusting your search terms
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer Stats */}
      {!localSearchQuery && (
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          <Typography variant="caption" color="text.secondary">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} • {' '}
            {categories.reduce((total, cat) => total + (cat.dashboard_count || 0), 0)} dashboards
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Category Item Component with enhanced features
interface CategoryItemProps {
  category: CategoryWithDashboards;
  expanded: boolean;
  selectedDashboard?: string;
  onToggle: () => void;
  onDashboardSelect: (dashboardId: string) => void;
  searchQuery?: string;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  expanded,
  selectedDashboard,
  onToggle,
  onDashboardSelect,
  searchQuery
}) => {
  const dashboardCount = category.dashboards?.length || category.dashboard_count || 0;
  const hasSearch = searchQuery && searchQuery.trim().length > 0;

  // Highlight matching text
  const highlightText = (text: string, query?: string) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <Box component="span" key={index} sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', px: 0.5, borderRadius: 0.5 }}>
          {part}
        </Box>
      ) : part
    );
  };

  return (
    <>
      {/* Category Header */}
      <ListItem disablePadding>
        <ListItemButton
          onClick={onToggle}
          sx={{
            pl: 2,
            pr: 1,
            py: 1.5,
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {category.icon ? (
              <Box
                component="span"
                sx={{
                  fontSize: 20,
                  color: category.color || 'text.secondary'
                }}
              >
                {category.icon}
              </Box>
            ) : (
              <Folder sx={{ color: category.color || 'text.secondary' }} />
            )}
          </ListItemIcon>
          
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" component="div">
                  {highlightText(category.display_name, searchQuery)}
                </Typography>
                {dashboardCount > 0 && (
                  <Chip
                    label={dashboardCount}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      bgcolor: 'action.selected',
                      color: 'text.secondary'
                    }}
                  />
                )}
              </Box>
            }
            secondary={
              category.description ? 
                highlightText(category.description, searchQuery) : 
                `${dashboardCount} dashboards`
            }
          />
          
          {dashboardCount > 0 ? (expanded ? <ExpandLess /> : <ExpandMore />) : null}
        </ListItemButton>
      </ListItem>

      {/* Dashboards List */}
      {dashboardCount > 0 && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {category.dashboards?.map((dashboard) => (
              <ListItem key={dashboard.id} disablePadding>
                <ListItemButton
                  selected={selectedDashboard === dashboard.id}
                  onClick={() => onDashboardSelect(dashboard.id)}
                  sx={{
                    pl: 7,
                    pr: 2,
                    py: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.main'
                      },
                      '& .MuiTypography-root': {
                        color: 'primary.contrastText'
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <DashboardIcon 
                      fontSize="small" 
                      sx={{ 
                        color: selectedDashboard === dashboard.id ? 'primary.contrastText' : 'text.secondary'
                      }} 
                    />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" component="div" sx={{ flexGrow: 1 }}>
                          {highlightText(dashboard.display_name ?? '', searchQuery)}
                        </Typography>
                        {dashboard.is_featured && (
                          <StarIcon 
                            fontSize="small" 
                            sx={{ 
                              color: selectedDashboard === dashboard.id ? 'warning.light' : 'warning.main'
                            }} 
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {dashboard.view_count && dashboard.view_count > 0 && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: selectedDashboard === dashboard.id ? 'primary.contrastText' : 'text.secondary'
                            }}
                          >
                            {dashboard.view_count} views
                          </Typography>
                        )}
                        {dashboard.tags && dashboard.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {dashboard.tags.slice(0, 2).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.6rem',
                                  bgcolor: selectedDashboard === dashboard.id ? 'primary.dark' : 'action.selected'
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};