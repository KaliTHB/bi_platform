// File: web-application/src/components/webview/CategorySidebar.tsx

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
  CircularProgress
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Folder,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { CategoryWithDashboards } from '../../types/webview.types';

export interface CategorySidebarProps {
  categories: CategoryWithDashboards[];
  expandedCategories: Set<string>;
  selectedDashboard?: string;
  searchQuery: string;
  loading: boolean;
  onCategoryToggle: (categoryId: string) => void;
  onDashboardSelect: (dashboardId: string) => void;
  onSearchChange?: (query: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  expandedCategories,
  selectedDashboard,
  searchQuery,
  loading,
  onCategoryToggle,
  onDashboardSelect,
  onSearchChange
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
    
    return categories.filter(category => {
      // Check if category name matches
      if (category.display_name.toLowerCase().includes(localSearchQuery.toLowerCase())) {
        return true;
      }
      
      // Check if any dashboard in category matches
      return category.dashboards?.some(dashboard =>
        dashboard.display_name.toLowerCase().includes(localSearchQuery.toLowerCase())
      );
    }).map(category => ({
      ...category,
      dashboards: category.dashboards?.filter(dashboard =>
        dashboard.display_name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        category.display_name.toLowerCase().includes(localSearchQuery.toLowerCase())
      )
    }));
  }, [categories, localSearchQuery]);

  if (loading) {
    return (
      <Box className="flex items-center justify-center p-4">
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb' }}>
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
              borderRadius: '8px'
            }
          }}
        />
      </Box>

      {/* Category List */}
      <List sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        {filteredCategories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            expanded={expandedCategories.has(category.id)}
            selectedDashboard={selectedDashboard}
            onToggle={() => onCategoryToggle(category.id)}
            onDashboardSelect={onDashboardSelect}
          />
        ))}
        
        {filteredCategories.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              {localSearchQuery ? 'No dashboards found' : 'No categories available'}
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
};

// Category Item Component
interface CategoryItemProps {
  category: CategoryWithDashboards;
  expanded: boolean;
  selectedDashboard?: string;
  onToggle: () => void;
  onDashboardSelect: (dashboardId: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  expanded,
  selectedDashboard,
  onToggle,
  onDashboardSelect
}) => {
  const dashboardCount = category.dashboards?.length || 0;

  return (
    <>
      {/* Category Header */}
      <ListItem disablePadding>
        <ListItemButton
          onClick={onToggle}
          sx={{
            pl: 2,
            pr: 1,
            py: 1,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {category.icon ? (
              <Box
                component="span"
                sx={{
                  fontSize: 20,
                  color: category.color || '#6b7280'
                }}
              >
                {category.icon}
              </Box>
            ) : (
              <Folder sx={{ color: category.color || '#6b7280' }} />
            )}
          </ListItemIcon>
          
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" component="span">
                  {category.display_name}
                </Typography>
                {dashboardCount > 0 && (
                  <Chip
                    label={dashboardCount}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.7rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151'
                    }}
                  />
                )}
              </Box>
            }
            secondary={category.description}
          />
          
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      </ListItem>

      {/* Dashboards */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {category.dashboards?.map((dashboard) => (
            <ListItem key={dashboard.id} disablePadding>
              <ListItemButton
                selected={selectedDashboard === dashboard.id}
                onClick={() => onDashboardSelect(dashboard.id)}
                sx={{
                  pl: 6,
                  pr: 2,
                  py: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.16)'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <DashboardIcon fontSize="small" sx={{ color: '#6b7280' }} />
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="span">
                        {dashboard.display_name}
                      </Typography>
                      {dashboard.is_featured && (
                        <StarIcon fontSize="small" sx={{ color: '#fbbf24' }} />
                      )}
                    </Box>
                  }
                  secondary={
                    dashboard.view_count > 0 ? `${dashboard.view_count} views` : undefined
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </>
  );
};