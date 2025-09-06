// File: web-application/src/components/admin/RoleEditor.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
  Alert,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useRoleManagement } from '../../hooks/useRoleManagement';

interface Permission {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Role {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
}

interface RoleEditorProps {
  open: boolean;
  role?: Role;
  onClose: () => void;
  onSave: (role: Role) => Promise<void>;
}

const PERMISSION_CATEGORIES = [
  'Workspace Management',
  'User Management', 
  'Dashboard Management',
  'Dataset Management',
  'Chart Management',
  'Category Management',
  'Webview Management',
  'Export Permissions',
  'System Administration'
];

const AVAILABLE_PERMISSIONS: Permission[] = [
  // Workspace permissions
  { id: 'workspace.read', name: 'View Workspace', category: 'Workspace Management', description: 'View workspace information and settings' },
  { id: 'workspace.create', name: 'Create Workspace', category: 'Workspace Management', description: 'Create new workspaces' },
  { id: 'workspace.update', name: 'Update Workspace', category: 'Workspace Management', description: 'Modify workspace settings' },
  { id: 'workspace.delete', name: 'Delete Workspace', category: 'Workspace Management', description: 'Delete workspaces' },
  
  // User management
  { id: 'user_mgmt.read', name: 'View Users', category: 'User Management', description: 'View user information' },
  { id: 'user_mgmt.create', name: 'Create Users', category: 'User Management', description: 'Add new users to workspace' },
  { id: 'user_mgmt.update', name: 'Update Users', category: 'User Management', description: 'Modify user information and roles' },
  { id: 'user_mgmt.delete', name: 'Delete Users', category: 'User Management', description: 'Remove users from workspace' },
  
  // Dashboard permissions
  { id: 'dashboard.read', name: 'View Dashboards', category: 'Dashboard Management', description: 'View and access dashboards' },
  { id: 'dashboard.create', name: 'Create Dashboards', category: 'Dashboard Management', description: 'Create new dashboards' },
  { id: 'dashboard.update', name: 'Update Dashboards', category: 'Dashboard Management', description: 'Edit existing dashboards' },
  { id: 'dashboard.delete', name: 'Delete Dashboards', category: 'Dashboard Management', description: 'Remove dashboards' },
  { id: 'dashboard.publish', name: 'Publish Dashboards', category: 'Dashboard Management', description: 'Make dashboards available to users' },
  
  // Dataset permissions
  { id: 'dataset.read', name: 'View Datasets', category: 'Dataset Management', description: 'Access and query datasets' },
  { id: 'dataset.create', name: 'Create Datasets', category: 'Dataset Management', description: 'Create new datasets' },
  { id: 'dataset.update', name: 'Update Datasets', category: 'Dataset Management', description: 'Modify existing datasets' },
  { id: 'dataset.delete', name: 'Delete Datasets', category: 'Dataset Management', description: 'Remove datasets' },
  
  // Chart permissions
  { id: 'chart.read', name: 'View Charts', category: 'Chart Management', description: 'View charts in dashboards' },
  { id: 'chart.create', name: 'Create Charts', category: 'Chart Management', description: 'Create new charts' },
  { id: 'chart.update', name: 'Update Charts', category: 'Chart Management', description: 'Edit existing charts' },
  { id: 'chart.delete', name: 'Delete Charts', category: 'Chart Management', description: 'Remove charts' },
  
  // Category permissions
  { id: 'category.read', name: 'View Categories', category: 'Category Management', description: 'View dashboard categories' },
  { id: 'category.create', name: 'Create Categories', category: 'Category Management', description: 'Create new categories' },
  { id: 'category.update', name: 'Update Categories', category: 'Category Management', description: 'Modify categories' },
  { id: 'category.delete', name: 'Delete Categories', category: 'Category Management', description: 'Remove categories' },
  
  // Webview permissions
  { id: 'webview.read', name: 'Access Webview', category: 'Webview Management', description: 'Access webview panels' },
  { id: 'webview.manage', name: 'Manage Webviews', category: 'Webview Management', description: 'Configure webview settings' },
  { id: 'webview.create', name: 'Create Webviews', category: 'Webview Management', description: 'Create new webview configurations' },
  
  // Export permissions
  { id: 'export.pdf', name: 'PDF Export', category: 'Export Permissions', description: 'Export dashboards and charts as PDF' },
  { id: 'export.excel', name: 'Excel Export', category: 'Export Permissions', description: 'Export data as Excel files' },
  { id: 'export.csv', name: 'CSV Export', category: 'Export Permissions', description: 'Export data as CSV files' },
  { id: 'export.png', name: 'Image Export', category: 'Export Permissions', description: 'Export charts as PNG/SVG images' },
  
  // System administration
  { id: 'sql_editor.access', name: 'SQL Editor Access', category: 'System Administration', description: 'Access SQL query editor' },
  { id: 'sql_editor.execute', name: 'Execute SQL', category: 'System Administration', description: 'Execute SQL queries' },
  { id: 'plugin.config.read', name: 'View Plugin Config', category: 'System Administration', description: 'View plugin configurations' },
  { id: 'plugin.config.update', name: 'Update Plugin Config', category: 'System Administration', description: 'Modify plugin configurations' },
  { id: 'audit.read', name: 'View Audit Logs', category: 'System Administration', description: 'Access audit logs' },
  { id: 'audit.export', name: 'Export Audit Logs', category: 'System Administration', description: 'Export audit log data' }
];

export const RoleEditor: React.FC<RoleEditorProps> = ({
  open,
  role,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Role>({
    name: '',
    description: '',
    permissions: [],
    is_system: false
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (role) {
      setFormData(role);
      setSelectedPermissions(new Set(role.permissions));
    } else {
      setFormData({
        name: '',
        description: '',
        permissions: [],
        is_system: false
      });
      setSelectedPermissions(new Set());
    }
    setError('');
  }, [role, open]);

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleCategoryToggle = (category: string) => {
    const categoryPermissions = AVAILABLE_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const allSelected = categoryPermissions.every(id => selectedPermissions.has(id));
    const newSelected = new Set(selectedPermissions);
    
    if (allSelected) {
      categoryPermissions.forEach(id => newSelected.delete(id));
    } else {
      categoryPermissions.forEach(id => newSelected.add(id));
    }
    
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Role name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave({
        ...formData,
        permissions: Array.from(selectedPermissions)
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionsByCategory = (category: string) => {
    return AVAILABLE_PERMISSIONS.filter(p => p.category === category);
  };

  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions = getPermissionsByCategory(category);
    return categoryPermissions.every(p => selectedPermissions.has(p.id));
  };

  const isCategoryPartiallySelected = (category: string) => {
    const categoryPermissions = getPermissionsByCategory(category);
    return categoryPermissions.some(p => selectedPermissions.has(p.id)) && 
           !isCategoryFullySelected(category);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        {role ? `Edit Role: ${role.name}` : 'Create New Role'}
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Role Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!formData.name.trim() && error !== ''}
              helperText={!formData.name.trim() && error !== '' ? 'Role name is required' : ''}
              disabled={formData.is_system}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>
          
          {formData.is_system && (
            <Grid item xs={12}>
              <Alert severity="info">
                This is a system role. The name cannot be modified, but permissions can be customized.
              </Alert>
            </Grid>
          )}
          
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Permissions
              </Typography>
              <Chip 
                label={`${selectedPermissions.size} selected`} 
                color="primary" 
                size="small" 
              />
            </Box>
            
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {PERMISSION_CATEGORIES.map((category) => (
                <Accordion key={category} defaultExpanded>
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    onClick={() => handleCategoryToggle(category)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isCategoryFullySelected(category)}
                          indeterminate={isCategoryPartiallySelected(category)}
                          onChange={() => handleCategoryToggle(category)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                      label={
                        <Typography variant="subtitle1" fontWeight="medium">
                          {category}
                        </Typography>
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </AccordionSummary>
                  
                  <AccordionDetails sx={{ pt: 0 }}>
                    <FormGroup>
                      {getPermissionsByCategory(category).map((permission) => (
                        <FormControlLabel
                          key={permission.id}
                          control={
                            <Checkbox
                              checked={selectedPermissions.has(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id)}
                              size="small"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {permission.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {permission.description}
                              </Typography>
                            </Box>
                          }
                          sx={{ ml: 2, alignItems: 'flex-start' }}
                        />
                      ))}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};