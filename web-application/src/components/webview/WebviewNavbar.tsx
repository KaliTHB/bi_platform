// File: web-application/src/components/webview/WebviewNavbar.tsx

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Avatar
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { WebviewConfig } from '../../types/webview.types';

export interface WebviewNavbarProps {
  webviewConfig?: WebviewConfig;
  onSearch?: (query: string) => void;
}

export const WebviewNavbar: React.FC<WebviewNavbarProps> = ({
  webviewConfig,
  onSearch
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    
    // Debounced search
    const timeoutId = setTimeout(() => {
      onSearch?.(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <>
      {/* Logo/Brand */}
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
        {webviewConfig?.branding_config?.company_logo && (
          <Avatar
            src={webviewConfig.branding_config.company_logo}
            alt={webviewConfig.branding_config.company_name || 'Logo'}
            sx={{ width: 32, height: 32, mr: 1 }}
          />
        )}
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            fontWeight: 600,
            color: 'inherit'
          }}
        >
          {webviewConfig?.display_name || 'BI Platform'}
        </Typography>
      </Box>

      {/* Search Bar */}
      <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 300 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search dashboards..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            sx: {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: 'none'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: '1px solid rgba(255, 255, 255, 0.3)'
              },
              '& input': {
                color: 'inherit',
                '&::placeholder': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  opacity: 1
                }
              }
            }
          }}
        />
      </Box>
    </>
  );
};