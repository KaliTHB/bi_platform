// File: web-application/src/components/admin/PermissionMatrix.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import { Info, Save, Refresh } from '@mui/icons-material';
import { usePermissionMatrix } from '../../hooks/usePermissionMatrix';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
}

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface PermissionMatrixProps {
  workspaceId: string;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ workspaceId }) => {
  const {
    users,
    permissions,
    userPermissions,
    loading,
    saving,
    error,
    loadMatrix,
    updateUserPermission,
    saveChanges,
    hasChanges
  } = usePermissionMatrix(workspaceId);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadMatrix();
  }, [workspaceId]);

  const categories = ['all', ...new Set(permissions.map(p => p.category))];
  const filteredPermissions = selectedCategory === 'all' 
    ? permissions 
    : permissions.filter(p => p.category === selectedCategory);

  const handlePermissionToggle = (userId: string, permissionId: string) => {
    const currentValue = userPermissions[userId]?.[permissionId] || false;
    updateUserPermission(userId, permissionId, !currentValue);
  };

  const getUserDisplayName = (user: User) => {
    return user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : user.username;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={loadMatrix}>
          <Refresh />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Permission Matrix</Typography>
        <Box display="flex" gap={1} alignItems="center">
          {hasChanges && (
            <Chip 
              label="Unsaved changes" 
              color="warning" 
              size="small" 
              variant="outlined"
            />
          )}
          <IconButton onClick={loadMatrix} disabled={saving}>
            <Refresh />
          </IconButton>
          <IconButton 
            onClick={saveChanges} 
            disabled={!hasChanges || saving}
            color="primary"
          >
            <Save />
          </IconButton>
        </Box>
      </Box>

      {/* Category Filter */}
      <Box mb={3}>
        <Typography variant="subtitle2" gutterBottom>
          Filter by Category:
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {categories.map((category) => (
            <Chip
              key={category}
              label={category === 'all' ? 'All Categories' : category}
              onClick={() => setSelectedCategory(category)}
              variant={selectedCategory === category ? 'filled' : 'outlined'}
              color={selectedCategory === category ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>
      </Box>

      {/* Permission Matrix Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 200, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  User
                </Typography>
              </TableCell>
              {filteredPermissions.map((permission) => (
                <TableCell 
                  key={permission.id}
                  align="center"
                  sx={{ 
                    minWidth: 120,
                    backgroundColor: '#f5f5f5',
                    borderLeft: '1px solid #e0e0e0'
                  }}
                >
                  <Tooltip title={permission.description} arrow>
                    <Box>
                      <Typography variant="caption" display="block" fontWeight="bold">
                        {permission.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {permission.id}
                      </Typography>
                    </Box>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ borderRight: '2px solid #e0e0e0' }}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {getUserDisplayName(user)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {user.email}
                    </Typography>
                    <Box display="flex" gap={0.5} mt={0.5}>
                      {user.roles.map((role) => (
                        <Chip 
                          key={role}
                          label={role} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 16, fontSize: '0.65rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                </TableCell>
                
                {filteredPermissions.map((permission) => (
                  <TableCell 
                    key={permission.id}
                    align="center"
                    sx={{ borderLeft: '1px solid #e0e0e0' }}
                  >
                    <Checkbox
                      checked={userPermissions[user.id]?.[permission.id] || false}
                      onChange={() => handlePermissionToggle(user.id, permission.id)}
                      size="small"
                      disabled={saving}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Info */}
      <Box mt={2}>
        <Alert severity="info" icon={<Info />}>
          This matrix shows individual user permissions. Users also inherit permissions from their assigned roles.
          Changes are not saved automatically - click the save button to apply changes.
        </Alert>
      </Box>
    </Box>
  );
};