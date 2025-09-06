// web-application/src/pages/workspace/datasources.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  Switch,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Cable as CableIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PlayArrow as TestIcon,
  Storage as DatabaseIcon
} from '@mui/icons-material';

// Hooks and Components
import { useAuth } from '@/hooks/useAuth';
import { useDataSources } from '@/hooks/useDataSources';
import { usePermissions } from '@/hooks/usePermissions';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWebSocket } from '@/hooks/useWebSocket';
import CommonTableLayout from '@/components/shared/CommonTableLayout';
import { PermissionGate } from '@/components/shared/PermissionGate';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

// Types
interface DataSource {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  type: 'postgresql' | 'mysql' | 'mssql' | 'oracle' | 'sqlite' | 'bigquery' | 'snowflake' | 'redshift';
  connection_config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
  last_tested_at?: string | Date;
  connection_status: 'connected' | 'disconnected' | 'error' | 'testing';
  error_message?: string;
  dataset_count: number;
  owner?: {
    name: string;
    email: string;
  };
}

interface CreateDataSourceRequest {
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  type: string;
  connection_config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_by: string;
}

interface UpdateDataSourceRequest {
  name?: string;
  display_name?: string;
  description?: string;
  connection_config?: Record<string, any>;
  is_active?: boolean;
  is_default?: boolean;
}

// =============================================================================
// Connection Form Component
// =============================================================================

interface ConnectionFormProps {
  type: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  errors: Record<string, string>;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({ type, config, onChange, errors }) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (key: string, value: any) => {
    onChange({
      ...config,
      [key]: value
    });
  };

  const getFormFields = () => {
    switch (type) {
      case 'postgresql':
      case 'mysql':
        return [
          { key: 'host', label: 'Host', type: 'text', required: true },
          { key: 'port', label: 'Port', type: 'number', required: true, defaultValue: type === 'postgresql' ? 5432 : 3306 },
          { key: 'database', label: 'Database', type: 'text', required: true },
          { key: 'username', label: 'Username', type: 'text', required: true },
          { key: 'password', label: 'Password', type: 'password', required: true },
          { key: 'ssl', label: 'Use SSL', type: 'boolean', defaultValue: false },
        ];
      
      case 'mssql':
        return [
          { key: 'server', label: 'Server', type: 'text', required: true },
          { key: 'port', label: 'Port', type: 'number', defaultValue: 1433 },
          { key: 'database', label: 'Database', type: 'text', required: true },
          { key: 'username', label: 'Username', type: 'text', required: true },
          { key: 'password', label: 'Password', type: 'password', required: true },
          { key: 'encrypt', label: 'Encrypt Connection', type: 'boolean', defaultValue: true },
        ];
      
      case 'bigquery':
        return [
          { key: 'project_id', label: 'Project ID', type: 'text', required: true },
          { key: 'credentials', label: 'Service Account JSON', type: 'textarea', required: true },
          { key: 'location', label: 'Location', type: 'text', defaultValue: 'US' },
        ];
      
      case 'snowflake':
        return [
          { key: 'account', label: 'Account', type: 'text', required: true },
          { key: 'username', label: 'Username', type: 'text', required: true },
          { key: 'password', label: 'Password', type: 'password', required: true },
          { key: 'warehouse', label: 'Warehouse', type: 'text', required: true },
          { key: 'database', label: 'Database', type: 'text', required: true },
          { key: 'schema', label: 'Schema', type: 'text', defaultValue: 'public' },
        ];
      
      default:
        return [];
    }
  };

  const fields = getFormFields();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {fields.map((field) => {
        if (field.type === 'boolean') {
          return (
            <FormControlLabel
              key={field.key}
              control={
                <Switch
                  checked={config[field.key] || field.defaultValue || false}
                  onChange={(e) => handleChange(field.key, e.target.checked)}
                />
              }
              label={field.label}
            />
          );
        }

        if (field.type === 'textarea') {
          return (
            <TextField
              key={field.key}
              label={field.label}
              value={config[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              error={!!errors[field.key]}
              helperText={errors[field.key]}
              multiline
              rows={4}
              fullWidth
              required={field.required}
            />
          );
        }

        return (
          <TextField
            key={field.key}
            label={field.label}
            type={field.type === 'password' ? (showPassword ? 'text' : 'password') : field.type}
            value={config[field.key] || field.defaultValue || ''}
            onChange={(e) => handleChange(field.key, field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
            error={!!errors[field.key]}
            helperText={errors[field.key]}
            fullWidth
            required={field.required}
            InputProps={field.type === 'password' ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              )
            } : undefined}
          />
        );
      })}
    </Box>
  );
};

// =============================================================================
// Create Data Source Dialog Component
// =============================================================================

interface CreateDataSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDataSourceRequest) => Promise<void>;
  loading: boolean;
}

const CreateDataSourceDialog: React.FC<CreateDataSourceDialogProps> = ({
  open,
  onClose,
  onSubmit,
  loading
}) => {
  const [formData, setFormData] = useState<CreateDataSourceRequest>({
    workspace_id: '',
    name: '',
    display_name: '',
    description: '',
    type: 'postgresql',
    connection_config: {},
    is_active: true,
    is_default: false,
    created_by: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  useEffect(() => {
    if (workspace && user) {
      setFormData(prev => ({
        ...prev,
        workspace_id: workspace.id,
        created_by: user.id
      }));
    }
  }, [workspace, user]);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Mock test connection - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Simulate successful connection test
      setErrors(prev => ({ ...prev, connection: '' }));
      alert('Connection successful!');
    } catch (error: any) {
      setErrors(prev => ({ ...prev, connection: error.message || 'Connection failed' }));
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.display_name) newErrors.display_name = 'Display name is required';
    if (!formData.type) newErrors.type = 'Type is required';

    // Validate connection config based on type
    const validateConfig = (config: Record<string, any>, type: string) => {
      const requiredFields: Record<string, string[]> = {
        postgresql: ['host', 'port', 'database', 'username', 'password'],
        mysql: ['host', 'port', 'database', 'username', 'password'],
        mssql: ['server', 'database', 'username', 'password'],
        bigquery: ['project_id', 'credentials'],
        snowflake: ['account', 'username', 'password', 'warehouse', 'database']
      };

      const required = requiredFields[type] || [];
      for (const field of required) {
        if (!config[field]) {
          newErrors[field] = `${field} is required`;
        }
      }
    };

    validateConfig(formData.connection_config, formData.type);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit(formData);
        onClose();
        // Reset form
        setFormData({
          workspace_id: workspace?.id || '',
          name: '',
          display_name: '',
          description: '',
          type: 'postgresql',
          connection_config: {},
          is_active: true,
          is_default: false,
          created_by: user?.id || ''
        });
      } catch (error) {
        console.error('Error creating data source:', error);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Data Source</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
          />
          
          <TextField
            label="Display Name"
            value={formData.display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            error={!!errors.display_name}
            helperText={errors.display_name}
            fullWidth
            required
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            multiline
            rows={2}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Database Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                type: e.target.value,
                connection_config: {} // Reset config when type changes
              }))}
            >
              <MenuItem value="postgresql">PostgreSQL</MenuItem>
              <MenuItem value="mysql">MySQL</MenuItem>
              <MenuItem value="mssql">Microsoft SQL Server</MenuItem>
              <MenuItem value="oracle">Oracle</MenuItem>
              <MenuItem value="bigquery">Google BigQuery</MenuItem>
              <MenuItem value="snowflake">Snowflake</MenuItem>
              <MenuItem value="redshift">Amazon Redshift</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="h6" sx={{ mt: 2 }}>Connection Configuration</Typography>
          
          <ConnectionForm
            type={formData.type}
            config={formData.connection_config}
            onChange={(config) => setFormData(prev => ({ ...prev, connection_config: config }))}
            errors={errors}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_default}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                />
              }
              label="Default Data Source"
            />
          </Box>

          {errors.connection && (
            <Alert severity="error">{errors.connection}</Alert>
          )}

          <Button
            variant="outlined"
            startIcon={<TestIcon />}
            onClick={handleTestConnection}
            disabled={testing || !formData.type}
            sx={{ alignSelf: 'flex-start' }}
          >
            {testing ? 'Testing Connection...' : 'Test Connection'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Data Source'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =============================================================================
// Main Data Sources Page Component
// =============================================================================

const DataSourcesPage: NextPage = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { hasPermission } = usePermissions();
  
  // Data source management (mock implementation)
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data sources
  useEffect(() => {
    const mockDataSources: DataSource[] = [
      {
        id: '1',
        name: 'main_db',
        display_name: 'Main Database',
        description: 'Primary PostgreSQL database',
        type: 'postgresql',
        connection_config: { host: 'localhost', port: 5432 },
        is_active: true,
        is_default: true,
        created_by: 'user1',
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-20'),
        last_tested_at: new Date('2024-01-20'),
        connection_status: 'connected',
        dataset_count: 5,
        owner: { name: 'John Doe', email: 'john@example.com' }
      },
      {
        id: '2',
        name: 'analytics_db',
        display_name: 'Analytics Warehouse',
        description: 'BigQuery data warehouse for analytics',
        type: 'bigquery',
        connection_config: { project_id: 'my-project' },
        is_active: true,
        is_default: false,
        created_by: 'user2',
        created_at: new Date('2024-01-10'),
        updated_at: new Date('2024-01-18'),
        last_tested_at: new Date('2024-01-18'),
        connection_status: 'connected',
        dataset_count: 3,
        owner: { name: 'Jane Smith', email: 'jane@example.com' }
      },
      {
        id: '3',
        name: 'legacy_db',
        display_name: 'Legacy System',
        description: 'Old MySQL database',
        type: 'mysql',
        connection_config: { host: 'legacy.db.com' },
        is_active: false,
        is_default: false,
        created_by: 'user1',
        created_at: new Date('2023-12-01'),
        updated_at: new Date('2024-01-10'),
        last_tested_at: new Date('2024-01-10'),
        connection_status: 'error',
        error_message: 'Connection timeout',
        dataset_count: 0,
        owner: { name: 'John Doe', email: 'john@example.com' }
      }
    ];
    setDataSources(mockDataSources);
  }, []);

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'datasource_updated' || message.type === 'datasource_created') {
        // Refresh data sources
        console.log('Data source updated via WebSocket');
      }
    }
  });

  // State management
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Show snackbar message
  const showMessage = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle data source creation
  const handleCreateDataSource = async (data: CreateDataSourceRequest) => {
    setOperationLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newDataSource: DataSource = {
        id: Date.now().toString(),
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
        connection_status: 'connected',
        dataset_count: 0,
        owner: { name: 'Current User', email: 'current@example.com' }
      };
      setDataSources(prev => [...prev, newDataSource]);
      showMessage('Data source created successfully');
    } catch (error: any) {
      showMessage(error.message || 'Failed to create data source', 'error');
      throw error;
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle data source test connection
  const handleTestConnection = async (dataSource: DataSource) => {
    setOperationLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update connection status
      setDataSources(prev => prev.map(ds => 
        ds.id === dataSource.id 
          ? { ...ds, connection_status: 'connected', last_tested_at: new Date(), error_message: undefined }
          : ds
      ));
      showMessage('Connection test successful');
    } catch (error: any) {
      setDataSources(prev => prev.map(ds => 
        ds.id === dataSource.id 
          ? { ...ds, connection_status: 'error', error_message: error.message }
          : ds
      ));
      showMessage(error.message || 'Connection test failed', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // Handle data source deletion
  const handleDeleteDataSource = async () => {
    if (!selectedDataSource) return;
    
    setOperationLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDataSources(prev => prev.filter(ds => ds.id !== selectedDataSource.id));
      showMessage('Data source deleted successfully');
      setDeleteDialogOpen(false);
    } catch (error: any) {
      showMessage(error.message || 'Failed to delete data source', 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // Table configuration
  const columns = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      render: (item: DataSource) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DatabaseIcon color="primary" fontSize="small" />
          <Box>
            <Typography variant="body2" fontWeight={600}>{item.display_name}</Typography>
            <Typography variant="caption" color="textSecondary">{item.name}</Typography>
          </Box>
        </Box>
      )
    },
    {
      id: 'type',
      label: 'Type',
      render: (item: DataSource) => (
        <Chip 
          label={item.type.toUpperCase()} 
          size="small" 
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      id: 'status',
      label: 'Status',
      render: (item: DataSource) => {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'connected': return 'success';
            case 'error': return 'error';
            case 'testing': return 'warning';
            default: return 'default';
          }
        };

        const getStatusIcon = (status: string) => {
          switch (status) {
            case 'connected': return <CheckCircleIcon fontSize="small" />;
            case 'error': return <ErrorIcon fontSize="small" />;
            case 'testing': return <WarningIcon fontSize="small" />;
            default: return <CableIcon fontSize="small" />;
          }
        };

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              icon={getStatusIcon(item.connection_status)}
              label={item.connection_status}
              size="small" 
              color={getStatusColor(item.connection_status) as any}
            />
            {item.is_default && (
              <Chip 
                label="Default" 
                size="small" 
                color="info" 
                variant="outlined"
              />
            )}
          </Box>
        );
      }
    },
    {
      id: 'datasets',
      label: 'Datasets',
      render: (item: DataSource) => (
        <Typography variant="body2">
          {item.dataset_count} dataset{item.dataset_count !== 1 ? 's' : ''}
        </Typography>
      )
    },
    {
      id: 'last_tested',
      label: 'Last Tested',
      sortable: true,
      render: (item: DataSource) => (
        <Typography variant="body2" color="textSecondary">
          {item.last_tested_at 
            ? new Date(item.last_tested_at).toLocaleDateString()
            : 'Never'
          }
        </Typography>
      )
    },
    {
      id: 'updated_at',
      label: 'Updated',
      sortable: true,
      render: (item: DataSource) => (
        <Typography variant="body2" color="textSecondary">
          {new Date(item.updated_at).toLocaleDateString()}
        </Typography>
      )
    }
  ];

  const actions = [
    {
      label: 'Test Connection',
      icon: <TestIcon />,
      onClick: (item: DataSource) => handleTestConnection(item),
      color: 'primary'
    },
    {
      label: 'Edit',
      icon: <EditIcon />,
      onClick: (item: DataSource) => {
        setSelectedDataSource(item);
        setEditDialogOpen(true);
      },
      permission: 'data_source.write'
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
      onClick: (item: DataSource) => {
        setSelectedDataSource(item);
        setDeleteDialogOpen(true);
      },
      permission: 'data_source.delete',
      color: 'error'
    }
  ];

  const filterOptions = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { label: 'All Types', value: '' },
        { label: 'PostgreSQL', value: 'postgresql' },
        { label: 'MySQL', value: 'mysql' },
        { label: 'SQL Server', value: 'mssql' },
        { label: 'BigQuery', value: 'bigquery' },
        { label: 'Snowflake', value: 'snowflake' }
      ]
    },
    {
      key: 'connection_status',
      label: 'Status',
      options: [
        { label: 'All Status', value: '' },
        { label: 'Connected', value: 'connected' },
        { label: 'Disconnected', value: 'disconnected' },
        { label: 'Error', value: 'error' }
      ]
    },
    {
      key: 'is_active',
      label: 'Active',
      options: [
        { label: 'All', value: '' },
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' }
      ]
    }
  ];

  return (
    <WorkspaceLayout>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" fontWeight={600}>
              Data Sources
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Refresh data sources">
                <IconButton onClick={() => {}} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <PermissionGate permissions={['data_source.create']}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Add Data Source
                </Button>
              </PermissionGate>
            </Box>
          </Box>

          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h4" color="primary" fontWeight={600}>
                    {dataSources.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Sources
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h4" color="success.main" fontWeight={600}>
                    {dataSources.filter(ds => ds.connection_status === 'connected').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Connected
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h4" color="warning.main" fontWeight={600}>
                    {dataSources.filter(ds => ds.is_active).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Sources
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 2 }}>
                  <Typography variant="h4" color="error.main" fontWeight={600}>
                    {dataSources.filter(ds => ds.connection_status === 'error').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Error Status
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Loading indicator */}
        {loading && <LinearProgress />}

        {/* Error handling */}
        {error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6">Error Loading Data Sources</Typography>
              <Typography>{error}</Typography>
              <Button onClick={() => {}} sx={{ mt: 1 }}>
                Try Again
              </Button>
            </Alert>
          </Box>
        )}

        {/* Data Table */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <CommonTableLayout
            data={dataSources}
            columns={columns}
            actions={actions}
            loading={loading}
            searchPlaceholder="Search data sources..."
            filterOptions={filterOptions}
            emptyMessage="No data sources configured. Add your first data source to get started."
            onRowClick={(item: DataSource) => {
              router.push(`/workspace/${workspace?.slug}/datasource/${item.id}`);
            }}
          />
        </Box>

        {/* Dialogs */}
        <CreateDataSourceDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onSubmit={handleCreateDataSource}
          loading={operationLoading}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Data Source</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the data source "{selectedDataSource?.display_name}"? 
            </Typography>
            {selectedDataSource?.dataset_count && selectedDataSource.dataset_count > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                This data source is used by {selectedDataSource.dataset_count} dataset(s). 
                Deleting it may affect those datasets.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteDataSource}
              color="error"
              variant="contained"
              disabled={operationLoading}
            >
              {operationLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </WorkspaceLayout>
  );
};

export default DataSourcesPage;