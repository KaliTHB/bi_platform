'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
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
  Grid,
  Paper,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  Storage,
  Cloud,
  Database,
  TestTube,
  CheckCircle,
  Error,
  Warning,
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Settings,
  Cable,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { DataSource } from '@/types/datasource.types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { useDataSources } from '@/hooks/useDataSources';
import PermissionGate from '@/components/shared/PermissionGate';

interface DataSourceListProps {
  onDataSourceSelect?: (dataSource: DataSource) => void;
  viewMode?: 'grid' | 'list';
  showCreateButton?: boolean;
  selectionMode?: boolean;
  selectedDataSources?: string[];
  onSelectionChange?: (dataSourceIds: string[]) => void;
  filterByPlugin?: string;
}

export const DataSourceList: React.FC<DataSourceListProps> = ({
  onDataSourceSelect,
  viewMode = 'grid',
  showCreateButton = true,
  selectionMode = false,
  selectedDataSources = [],
  onSelectionChange,
  filterByPlugin,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { hasPermissions } = usePermissions();
  const { 
    dataSources, 
    loading, 
    createDataSource, 
    updateDataSource,
    deleteDataSource, 
    testConnection 
  } = useDataSources();

  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pluginFilter, setPluginFilter] = useState<string>(filterByPlugin || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Form states
  const [dataSourceName, setDataSourceName] = useState('');
  const [dataSourceDescription, setDataSourceDescription] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState('');

  const filteredDataSources = dataSources
    .filter(dataSource => {
      if (pluginFilter !== 'all' && dataSource.plugin_name !== pluginFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && !dataSource.is_active) return false;
        if (statusFilter === 'inactive' && dataSource.is_active) return false;
        if (statusFilter === 'connected' && dataSource.test_status !== 'success') return false;
        if (statusFilter === 'error' && dataSource.test_status !== 'error') return false;
      }
      if (searchQuery && !dataSource.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !dataSource.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'updated_at': return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'plugin': return a.plugin_name.localeCompare(b.plugin_name);
        case 'status': return a.test_status.localeCompare(b.test_status);
        default: return 0;
      }
    });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dataSource: DataSource) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDataSource(dataSource);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDataSource(null);
  };

  const handleEdit = () => {
    if (selectedDataSource) {
      router.push(`/workspace/${currentWorkspace?.slug}/datasource/${selectedDataSource.id}/edit`);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedDataSource) {
      if (onDataSourceSelect) {
        onDataSourceSelect(selectedDataSource);
      } else {
        router.push(`/workspace/${currentWorkspace?.slug}/datasource/${selectedDataSource.id}`);
      }
    }
    handleMenuClose();
  };

  const handleTest = async () => {
    if (selectedDataSource) {
      setTesting(true);
      setTestResult(null);
      try {
        const result = await testConnection(selectedDataSource.id);
        setTestResult(result);
      } catch (error) {
        setTestResult({ success: false, message: 'Connection test failed', error: error.message });
      } finally {
        setTesting(false);
      }
      setTestDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedDataSource) {
      await deleteDataSource(selectedDataSource.id);
      setDeleteDialogOpen(false);
    }
    handleMenuClose();
  };

  const handleCreateDataSource = async () => {
    if (dataSourceName.trim() && selectedPlugin) {
      await createDataSource({
        name: dataSourceName,
        description: dataSourceDescription,
        plugin_name: selectedPlugin,
      });
      resetForm();
      setCreateDialogOpen(false);
    }
  };

  const resetForm = () => {
    setDataSourceName('');
    setDataSourceDescription('');
    setSelectedPlugin('');
  };

  const handleDataSourceClick = (dataSource: DataSource) => {
    if (selectionMode) {
      const newSelection = selectedDataSources.includes(dataSource.id)
        ? selectedDataSources.filter(id => id !== dataSource.id)
        : [...selectedDataSources, dataSource.id];
      onSelectionChange?.(newSelection);
    } else {
      onDataSourceSelect?.(dataSource);
    }
  };

  const getPluginIcon = (pluginName: string) => {
    if (pluginName.includes('postgres') || pluginName.includes('mysql') || pluginName.includes('sql')) {
      return <Database />;
    } else if (pluginName.includes('cloud') || pluginName.includes('azure') || pluginName.includes('gcp')) {
      return <Cloud />;
    } else {
      return <Storage />;
    }
  };

  const getPluginColor = (pluginName: string) => {
    if (pluginName.includes('postgres')) return 'primary';
    if (pluginName.includes('mysql')) return 'warning';
    if (pluginName.includes('mongodb')) return 'success';
    if (pluginName.includes('azure')) return 'info';
    if (pluginName.includes('aws')) return 'secondary';
    return 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'warning': return <Warning color="warning" />;
      default: return <Warning color="action" />;
    }
  };

  const DataSourceCard = ({ dataSource }: { dataSource: DataSource }) => {
    const isSelected = selectionMode && selectedDataSources.includes(dataSource.id);
    
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
        onClick={() => handleDataSourceClick(dataSource)}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1} flex={1}>
              {getPluginIcon(dataSource.plugin_name)}
              <Typography variant="h6" component="h3" noWrap>
                {dataSource.display_name || dataSource.name}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {getStatusIcon(dataSource.test_status)}
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, dataSource)}
              >
                <MoreVert />
              </IconButton>
            </Box>
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
            {dataSource.description || 'No description available'}
          </Typography>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Chip 
              label={dataSource.plugin_name} 
              size="small" 
              color={getPluginColor(dataSource.plugin_name) as any}
            />
            <Chip 
              label={dataSource.is_active ? 'Active' : 'Inactive'} 
              size="small" 
              color={dataSource.is_active ? 'success' : 'default'}
            />
          </Box>

          <Box display="flex" alignItems="center" justifyContent="space-between" mt={2}>
            <Typography variant="caption" color="text.secondary">
              {dataSource.test_status === 'success' ? 'Connected' : 
               dataSource.test_status === 'error' ? 'Connection Failed' : 
               dataSource.test_status === 'pending' ? 'Not Tested' : 'Unknown Status'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dataSource.last_tested 
                ? `Tested ${new Date(dataSource.last_tested).toLocaleDateString()}`
                : 'Never tested'
              }
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const DataSourceListItem = ({ dataSource }: { dataSource: DataSource }) => {
    const isSelected = selectionMode && selectedDataSources.includes(dataSource.id);
    
    return (
      <ListItem
        button
        selected={isSelected}
        onClick={() => handleDataSourceClick(dataSource)}
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          mb: 1,
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: getPluginColor(dataSource.plugin_name) + '.main' }}>
            {getPluginIcon(dataSource.plugin_name)}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1">
                {dataSource.display_name || dataSource.name}
              </Typography>
              {getStatusIcon(dataSource.test_status)}
            </Box>
          }
          secondary={
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {dataSource.description || 'No description'}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={dataSource.plugin_name} 
                  size="small" 
                  color={getPluginColor(dataSource.plugin_name) as any}
                />
                <Typography variant="caption" color="text.secondary">
                  Last tested: {dataSource.last_tested 
                    ? new Date(dataSource.last_tested).toLocaleDateString()
                    : 'Never'
                  } • Updated {new Date(dataSource.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton
            edge="end"
            onClick={(e) => handleMenuClick(e, dataSource)}
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
        <Typography>Loading data sources...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Data Sources
        </Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton 
            onClick={() => setCurrentViewMode(currentViewMode === 'grid' ? 'list' : 'grid')}
          >
            {currentViewMode === 'grid' ? <ViewList /> : <ViewModule />}
          </IconButton>
          
          {showCreateButton && (
            <PermissionGate permissions={['datasource.create']}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Add Data Source
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
              placeholder="Search data sources..."
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
              <InputLabel>Plugin</InputLabel>
              <Select
                value={pluginFilter}
                label="Plugin"
                onChange={(e) => setPluginFilter(e.target.value)}
              >
                <MenuItem value="all">All Plugins</MenuItem>
                <MenuItem value="postgres">PostgreSQL</MenuItem>
                <MenuItem value="mysql">MySQL</MenuItem>
                <MenuItem value="mongodb">MongoDB</MenuItem>
                <MenuItem value="azure">Azure</MenuItem>
                <MenuItem value="aws">AWS</MenuItem>
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
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="connected">Connected</MenuItem>
                <MenuItem value="error">Connection Error</MenuItem>
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
                <MenuItem value="plugin">Plugin</MenuItem>
                <MenuItem value="status">Connection Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              {filteredDataSources.length} data source(s)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Source List */}
      {filteredDataSources.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Cable sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No data sources found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchQuery || pluginFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first data source'
              }
            </Typography>
            {showCreateButton && !searchQuery && pluginFilter === 'all' && statusFilter === 'all' && (
              <PermissionGate permissions={['datasource.create']}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Add Data Source
                </Button>
              </PermissionGate>
            )}
          </CardContent>
        </Card>
      ) : currentViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {filteredDataSources.map((dataSource) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={dataSource.id}>
              <DataSourceCard dataSource={dataSource} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <List>
          {filteredDataSources.map((dataSource) => (
            <DataSourceListItem key={dataSource.id} dataSource={dataSource} />
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
          {onDataSourceSelect ? 'Select' : 'View'}
        </MenuItem>
        <PermissionGate permissions={['datasource.update']}>
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        </PermissionGate>
        <PermissionGate permissions={['datasource.test']}>
          <MenuItem onClick={handleTest}>
            <TestTube fontSize="small" sx={{ mr: 1 }} />
            Test Connection
          </MenuItem>
        </PermissionGate>
        <PermissionGate permissions={['datasource.delete']}>
          <MenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            sx={{ color: 'error.main' }}
          >
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </PermissionGate>
      </Menu>

      {/* Create Data Source Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Data Source</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Data Source Name"
            fullWidth
            variant="outlined"
            value={dataSourceName}
            onChange={(e) => setDataSourceName(e.target.value)}
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
            value={dataSourceDescription}
            onChange={(e) => setDataSourceDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Plugin Type</InputLabel>
            <Select
              value={selectedPlugin}
              label="Plugin Type"
              onChange={(e) => setSelectedPlugin(e.target.value)}
            >
              <MenuItem value="postgres">PostgreSQL</MenuItem>
              <MenuItem value="mysql">MySQL</MenuItem>
              <MenuItem value="mongodb">MongoDB</MenuItem>
              <MenuItem value="azure-sql">Azure SQL Database</MenuItem>
              <MenuItem value="aws-rds">AWS RDS</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateDataSource} 
            variant="contained"
            disabled={!dataSourceName.trim() || !selectedPlugin}
          >
            Add Data Source
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connection Test Result</DialogTitle>
        <DialogContent>
          {testing ? (
            <Box display="flex" alignItems="center" gap={2} py={4}>
              <CircularProgress size={24} />
              <Typography>Testing connection...</Typography>
            </Box>
          ) : testResult ? (
            <Alert 
              severity={testResult.success ? 'success' : 'error'}
              sx={{ mb: 2 }}
            >
              <Typography variant="body1" gutterBottom>
                {testResult.message}
              </Typography>
              {testResult.details && (
                <Typography variant="body2" color="text.secondary">
                  {JSON.stringify(testResult.details, null, 2)}
                </Typography>
              )}
              {testResult.error && (
                <Typography variant="body2" color="error">
                  {testResult.error}
                </Typography>
              )}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Data Source</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDataSource?.name}"? This action cannot be undone and may affect datasets that depend on this data source.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataSourceList;