// Updated imports
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Grid,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Settings,
  CheckCircle,
  Error,
  Refresh
} from '@mui/icons-material';
// Updated import to use existing hook
import  useDataSources  from '@/hooks/useDataSources';

interface DataSource {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  plugin_name: string;
  connection_config: any;
  test_status: 'pending' | 'success' | 'failed';
  test_error_message?: string;
  last_tested?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DataSourceConfigProps {
  workspaceId: string;
}

export const DataSourceConfig: React.FC<DataSourceConfigProps> = ({ workspaceId }) => {
  // Updated to use existing hook
  const {
    dataSources,
    loading,
    error,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    testConnection: testDataSource
  } = useDataSources();

  // Add state for available plugins since useDataSources doesn't provide them
  const [availablePlugins, setAvailablePlugins] = useState<any[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    dataSource?: DataSource;
  }>({ open: false });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    dataSource?: DataSource;
  }>({ open: false });

  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Function to load available plugins
  const loadAvailablePlugins = async () => {
    setPluginsLoading(true);
    try {
      // TODO: Replace with your actual API endpoint
      const response = await fetch(`/api/workspaces/${workspaceId}/plugins/datasources`);
      if (response.ok) {
        const plugins = await response.json();
        setAvailablePlugins(plugins);
      }
    } catch (error) {
      console.error('Failed to load available plugins:', error);
      // Set some default plugins for now
      setAvailablePlugins([
        {
          name: 'postgresql',
          displayName: 'PostgreSQL',
          category: 'relational',
          configSchema: {
            type: 'object',
            properties: {
              host: { type: 'string', title: 'Host' },
              port: { type: 'number', title: 'Port', default: 5432 },
              database: { type: 'string', title: 'Database' },
              username: { type: 'string', title: 'Username' },
              password: { type: 'string', title: 'Password', format: 'password' }
            },
            required: ['host', 'database', 'username', 'password']
          }
        },
        {
          name: 'mysql',
          displayName: 'MySQL',
          category: 'relational',
          configSchema: {
            type: 'object',
            properties: {
              host: { type: 'string', title: 'Host' },
              port: { type: 'number', title: 'Port', default: 3306 },
              database: { type: 'string', title: 'Database' },
              username: { type: 'string', title: 'Username' },
              password: { type: 'string', title: 'Password', format: 'password' }
            },
            required: ['host', 'database', 'username', 'password']
          }
        }
      ]);
    } finally {
      setPluginsLoading(false);
    }
  };

  // Load available plugins when component mounts or workspaceId changes
  useEffect(() => {
    if (workspaceId) {
      loadAvailablePlugins();
    }
  }, [workspaceId]);

  const handleCreateNew = () => {
    setEditDialog({ open: true });
  };

  const handleEdit = (dataSource: DataSource) => {
    setEditDialog({ open: true, dataSource });
  };

  const handleDelete = (dataSource: DataSource) => {
    setDeleteDialog({ open: true, dataSource });
  };

  const handleTestConnection = async (dataSource: DataSource) => {
    try {
      const result = await testDataSource(dataSource.id);
      setTestResults(prev => ({
        ...prev,
        [dataSource.id]: result
      }));
    } catch (error: unknown) {
      let errorMessage = 'Test failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setTestResults(prev => ({
        ...prev,
        [dataSource.id]: {
          success: false,
          message: errorMessage
        }
      }));
    }
  };

  const confirmDelete = async () => {
    if (deleteDialog.dataSource) {
      await deleteDataSource(deleteDialog.dataSource.id);
      setDeleteDialog({ open: false });
    }
  };

  const getPluginDisplayName = (pluginName: string) => {
    const plugin = availablePlugins.find(p => p.name === pluginName);
    return plugin?.displayName || pluginName;
  };

  const getStatusChip = (dataSource: DataSource) => {
    const testResult = testResults[dataSource.id];
    
    if (testResult) {
      return testResult.success ?
        <Chip 
          icon={<CheckCircle />} 
          label="Connected" 
          color="success" 
          size="small" 
        /> :
        <Chip 
          icon={<Error />} 
          label="Failed" 
          color="error" 
          size="small" 
        />;
    }

    return (
      <Chip 
        label={dataSource.test_status === 'success' ? 'Connected' : 
               dataSource.test_status === 'failed' ? 'Failed' : 'Untested'} 
        color={dataSource.test_status === 'success' ? 'success' : 
               dataSource.test_status === 'failed' ? 'error' : 'default'}
        size="small"
      />
    );
  };

  if (loading || pluginsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading data sources: {error.message || error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Data Sources
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateNew}
        >
          Add Data Source
        </Button>
      </Box>

      <Grid container spacing={3}>
        {dataSources.map((dataSource: DataSource) => (
          <Grid item xs={12} md={6} lg={4} key={dataSource.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h2">
                    {dataSource.display_name}
                  </Typography>
                  {getStatusChip(dataSource)}
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {getPluginDisplayName(dataSource.plugin_name)}
                </Typography>
                
                {dataSource.description && (
                  <Typography variant="body2" color="text.secondary">
                    {dataSource.description}
                  </Typography>
                )}
              </CardContent>
              
              <CardActions>
                <Tooltip title="Test Connection">
                  <IconButton 
                    size="small" 
                    onClick={() => handleTestConnection(dataSource)}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Edit">
                  <IconButton 
                    size="small" 
                    onClick={() => handleEdit(dataSource)}
                  >
                    <Edit />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Delete">
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDelete(dataSource)}
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {dataSources.length === 0 && (
          <Grid item xs={12}>
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center"
              minHeight={200}
              bgcolor="grey.50"
              borderRadius={2}
              p={3}
            >
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No data sources configured
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center" mb={2}>
                Add your first data source to start building dashboards
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateNew}
              >
                Add Data Source
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Edit Dialog */}
      <DataSourceEditDialog
        open={editDialog.open}
        dataSource={editDialog.dataSource}
        availablePlugins={availablePlugins}
        onClose={() => setEditDialog({ open: false })}
        onSave={async (dataSourceData) => {
          if (editDialog.dataSource) {
            await updateDataSource(editDialog.dataSource.id, dataSourceData);
          } else {
            await createDataSource(dataSourceData);
          }
          setEditDialog({ open: false });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete Data Source</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.dataSource?.display_name}"? 
            This action cannot be undone and may affect existing dashboards.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Data Source Edit Dialog Component
interface DataSourceEditDialogProps {
  open: boolean;
  dataSource?: DataSource;
  availablePlugins: any[];
  onClose: () => void;
  onSave: (dataSourceData: any) => Promise<void>;
}

const DataSourceEditDialog: React.FC<DataSourceEditDialogProps> = ({
  open,
  dataSource,
  availablePlugins,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    plugin_name: '',
    connection_config: {}
  });

  const [saving, setSaving] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);

  useEffect(() => {
    if (dataSource) {
      setFormData({
        name: dataSource.name,
        display_name: dataSource.display_name,
        description: dataSource.description || '',
        plugin_name: dataSource.plugin_name,
        connection_config: dataSource.connection_config
      });
      setSelectedPlugin(availablePlugins.find(p => p.name === dataSource.plugin_name));
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        plugin_name: '',
        connection_config: {}
      });
      setSelectedPlugin(null);
    }
  }, [dataSource, availablePlugins, open]);

  const handlePluginChange = (pluginName: string) => {
    const plugin = availablePlugins.find(p => p.name === pluginName);
    setSelectedPlugin(plugin);
    setFormData(prev => ({
      ...prev,
      plugin_name: pluginName,
      connection_config: {} // Reset config when plugin changes
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save data source:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderConfigField = (fieldName: string, fieldSchema: any) => {
    const value = formData.connection_config[fieldName] || '';
    
    const handleChange = (newValue: any) => {
      setFormData(prev => ({
        ...prev,
        connection_config: {
          ...prev.connection_config,
          [fieldName]: newValue
        }
      }));
    };

    switch (fieldSchema.type) {
      case 'string':
        return (
          <TextField
            key={fieldName}
            label={fieldSchema.title || fieldName}
            fullWidth
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            helperText={fieldSchema.description}
            type={fieldSchema.format === 'password' ? 'password' : 'text'}
            required={selectedPlugin?.configSchema?.required?.includes(fieldName)}
            margin="normal"
          />
        );
      
      case 'number':
        return (
          <TextField
            key={fieldName}
            label={fieldSchema.title || fieldName}
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleChange(parseInt(e.target.value) || 0)}
            helperText={fieldSchema.description}
            required={selectedPlugin?.configSchema?.required?.includes(fieldName)}
            margin="normal"
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {dataSource ? 'Edit Data Source' : 'Create Data Source'}
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              helperText="Internal identifier (lowercase, no spaces)"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Display Name"
              fullWidth
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              required
              helperText="Human-readable name"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              helperText="Optional description"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Plugin Type</InputLabel>
              <Select
                value={formData.plugin_name}
                onChange={(e) => handlePluginChange(e.target.value)}
                label="Plugin Type"
                disabled={!!dataSource} // Don't allow changing plugin type for existing data sources
              >
                {availablePlugins.map((plugin) => (
                  <MenuItem key={plugin.name} value={plugin.name}>
                    {plugin.displayName} - {plugin.category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {selectedPlugin?.configSchema?.properties && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Connection Configuration
              </Typography>
              {Object.entries(selectedPlugin.configSchema.properties).map(
                ([fieldName, fieldSchema]) => renderConfigField(fieldName, fieldSchema as any)
              )}
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={saving || !formData.name || !formData.plugin_name}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};