// web-application/src/pages/workspace/dataset-builder.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Chip,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  PlayArrow as RunIcon,
  Storage as DataIcon,
  Transform as TransformIcon,
  Schema as SchemaIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import NavbarOnlyLayout from '@/components/layout/NavbarOnlyLayout';

interface DataSource {
  id: string;
  name: string;
  display_name: string;
  type: string;
  status: 'connected' | 'error' | 'pending';
  tables: Array<{
    name: string;
    schema?: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
    }>;
  }>;
}

interface DatasetConfig {
  name: string;
  display_name: string;
  description: string;
  datasource_id: string;
  type: 'table' | 'query' | 'view' | 'transformation';
  source_table?: string;
  custom_query?: string;
  transformations: Array<{
    type: 'filter' | 'aggregate' | 'join' | 'pivot';
    config: Record<string, any>;
  }>;
  columns: Array<{
    name: string;
    alias?: string;
    type: string;
    transformation?: string;
  }>;
  refresh_schedule?: {
    enabled: boolean;
    interval: number;
    type: 'manual' | 'scheduled';
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const steps = ['Select Source', 'Configure Dataset', 'Transform Data', 'Preview & Save'];

const DatasetBuilderPage: React.FC = () => {
  const router = useRouter();
  const { workspace } = useAuth();
  const { hasPermission } = usePermissions();

  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [selectedDatasource, setSelectedDatasource] = useState<DataSource | null>(null);
  const [datasetConfig, setDatasetConfig] = useState<DatasetConfig>({
    name: '',
    display_name: '',
    description: '',
    datasource_id: '',
    type: 'table',
    transformations: [],
    columns: [],
    refresh_schedule: {
      enabled: false,
      interval: 3600,
      type: 'manual'
    }
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load datasources
  useEffect(() => {
    const loadDatasources = async () => {
      try {
        setLoading(true);
        
        // Mock data - replace with actual API call
        setTimeout(() => {
          setDatasources([
            {
              id: '1',
              name: 'main-database',
              display_name: 'Main Database',
              type: 'PostgreSQL',
              status: 'connected',
              tables: [
                {
                  name: 'users',
                  schema: 'public',
                  columns: [
                    { name: 'id', type: 'uuid', nullable: false },
                    { name: 'email', type: 'varchar', nullable: false },
                    { name: 'name', type: 'varchar', nullable: true },
                    { name: 'created_at', type: 'timestamp', nullable: false }
                  ]
                },
                {
                  name: 'orders',
                  schema: 'public',
                  columns: [
                    { name: 'id', type: 'uuid', nullable: false },
                    { name: 'user_id', type: 'uuid', nullable: false },
                    { name: 'total_amount', type: 'decimal', nullable: false },
                    { name: 'order_date', type: 'date', nullable: false },
                    { name: 'status', type: 'varchar', nullable: false }
                  ]
                }
              ]
            },
            {
              id: '2',
              name: 'analytics-db',
              display_name: 'Analytics Database',
              type: 'MySQL',
              status: 'connected',
              tables: [
                {
                  name: 'events',
                  columns: [
                    { name: 'id', type: 'bigint', nullable: false },
                    { name: 'user_id', type: 'varchar', nullable: false },
                    { name: 'event_type', type: 'varchar', nullable: false },
                    { name: 'timestamp', type: 'datetime', nullable: false },
                    { name: 'properties', type: 'json', nullable: true }
                  ]
                }
              ]
            }
          ]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading datasources:', error);
        setLoading(false);
      }
    };

    if (workspace) {
      loadDatasources();
    }
  }, [workspace]);

  const handleDatasourceSelect = (datasourceId: string) => {
    const datasource = datasources.find(d => d.id === datasourceId);
    if (datasource) {
      setSelectedDatasource(datasource);
      setDatasetConfig(prev => ({
        ...prev,
        datasource_id: datasourceId,
        name: `dataset_from_${datasource.name}`,
        display_name: `Dataset from ${datasource.display_name}`
      }));
      setActiveStep(1);
    }
  };

  const handleTableSelect = (tableName: string) => {
    setDatasetConfig(prev => ({
      ...prev,
      source_table: tableName,
      name: `${tableName}_dataset`,
      display_name: `${tableName} Dataset`,
      columns: selectedDatasource?.tables.find(t => t.name === tableName)?.columns.map(col => ({
        name: col.name,
        type: col.type,
        alias: col.name
      })) || []
    }));
    setActiveStep(2);
  };

  const handlePreviewData = async () => {
    try {
      // Simulate data preview
      const mockData = [
        { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-02' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-03' },
        { id: 4, name: 'Alice Brown', email: 'alice@example.com', created_at: '2024-01-04' },
        { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', created_at: '2024-01-05' }
      ];
      setPreviewData(mockData);
    } catch (error) {
      console.error('Error previewing data:', error);
    }
  };

  const handleSaveDataset = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Saving dataset:', datasetConfig);
      
      // Navigate back to datasets list
      router.replace(`/workspace/datasets`);
    } catch (error) {
      console.error('Error saving dataset:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderSourceSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Data Source
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Choose a data source to create your dataset from.
      </Typography>

      <Grid container spacing={2}>
        {datasources.map((datasource) => (
          <Grid item xs={12} md={6} key={datasource.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { 
                  transform: 'translateY(-2px)', 
                  boxShadow: 3 
                },
                border: selectedDatasource?.id === datasource.id ? 2 : 1,
                borderColor: selectedDatasource?.id === datasource.id ? 'primary.main' : 'divider'
              }}
              onClick={() => handleDatasourceSelect(datasource.id)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <DataIcon color="primary" />
                  <Typography variant="h6">
                    {datasource.display_name}
                  </Typography>
                  <Chip
                    label={datasource.status}
                    size="small"
                    color={datasource.status === 'connected' ? 'success' : 'error'}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {datasource.type} • {datasource.tables.length} tables
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {datasource.tables.slice(0, 3).map((table) => (
                    <Chip 
                      key={table.name}
                      label={table.name}
                      size="small" 
                      variant="outlined"
                    />
                  ))}
                  {datasource.tables.length > 3 && (
                    <Chip 
                      label={`+${datasource.tables.length - 3} more`}
                      size="small" 
                      variant="outlined"
                      color="primary"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderDatasetConfiguration = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Dataset
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Basic Information
            </Typography>
            
            <TextField
              fullWidth
              label="Dataset Name"
              value={datasetConfig.name}
              onChange={(e) => setDatasetConfig(prev => ({ ...prev, name: e.target.value }))}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Display Name"
              value={datasetConfig.display_name}
              onChange={(e) => setDatasetConfig(prev => ({ ...prev, display_name: e.target.value }))}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Description"
              value={datasetConfig.description}
              onChange={(e) => setDatasetConfig(prev => ({ ...prev, description: e.target.value }))}
              margin="normal"
              multiline
              rows={2}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Dataset Type</InputLabel>
              <Select
                value={datasetConfig.type}
                onChange={(e) => setDatasetConfig(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <MenuItem value="table">Table</MenuItem>
                <MenuItem value="query">Custom Query</MenuItem>
                <MenuItem value="view">Database View</MenuItem>
                <MenuItem value="transformation">Transformation</MenuItem>
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Select Table
            </Typography>
            
            {selectedDatasource?.tables.map((table) => (
              <Card 
                key={table.name}
                sx={{ 
                  mb: 2,
                  cursor: 'pointer',
                  border: datasetConfig.source_table === table.name ? 2 : 1,
                  borderColor: datasetConfig.source_table === table.name ? 'primary.main' : 'divider'
                }}
                onClick={() => handleTableSelect(table.name)}
              >
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {table.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {table.columns.length} columns
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderTransformations = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Transform Data (Optional)
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Add transformations to modify your data before creating the dataset.
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Data transformations are optional. You can create the dataset as-is and add transformations later.
      </Alert>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Available Transformations
        </Typography>
        
        <Grid container spacing={2}>
          {[
            { type: 'filter', label: 'Filter Rows', description: 'Filter data based on conditions' },
            { type: 'aggregate', label: 'Aggregate', description: 'Group and summarize data' },
            { type: 'join', label: 'Join Tables', description: 'Combine data from multiple tables' },
            { type: 'pivot', label: 'Pivot', description: 'Reshape data structure' }
          ].map((transform) => (
            <Grid item xs={12} sm={6} md={3} key={transform.type}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                <TransformIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="subtitle2" gutterBottom>
                  {transform.label}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {transform.description}
                </Typography>
                <Button 
                  size="small" 
                  sx={{ mt: 1 }}
                  onClick={() => console.log(`Add ${transform.type} transformation`)}
                >
                  Add
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );

  const renderPreview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Preview & Save
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Dataset Summary
            </Typography>
            
            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">Name</Typography>
              <Typography variant="body1">{datasetConfig.display_name}</Typography>
            </Box>
            
            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">Source</Typography>
              <Typography variant="body1">
                {selectedDatasource?.display_name} • {datasetConfig.source_table}
              </Typography>
            </Box>
            
            <Box mb={2}>
              <Typography variant="body2" color="textSecondary">Type</Typography>
              <Chip label={datasetConfig.type.toUpperCase()} size="small" />
            </Box>
            
            <Button
              variant="outlined"
              fullWidth
              startIcon={<PreviewIcon />}
              onClick={handlePreviewData}
              sx={{ mt: 2 }}
            >
              Preview Data
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Data Preview
            </Typography>
            
            {previewData.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {Object.keys(previewData[0]).map((column) => (
                        <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                          {column}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((cell: any, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                height={200}
                sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 1 }}
              >
                <SchemaIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body2" color="textSecondary">
                  Click "Preview Data" to see a sample of your dataset
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const breadcrumbs = [
    { label: 'Workspace', href: `/workspace` },
    { label: 'Datasets', href: `/workspace/datasets` },
    { label: 'Dataset Builder' }
  ];

  const actions = (
    <>
      <Button
        variant="outlined"
        startIcon={<BackIcon />}
        onClick={() => router.replace(`/workspace/datasets`)}
      >
        Cancel
      </Button>
      <PermissionGate permission="dataset.create">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveDataset}
          disabled={saving || !datasetConfig.name || !datasetConfig.datasource_id}
        >
          {saving ? 'Creating...' : 'Create Dataset'}
        </Button>
      </PermissionGate>
    </>
  );

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  return (
    <NavbarOnlyLayout
      title="Dataset Builder"
      subtitle="Create datasets from your data sources"
      breadcrumbs={breadcrumbs}
      actions={actions}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Stepper */}
        <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          {activeStep === 0 && renderSourceSelection()}
          {activeStep === 1 && renderDatasetConfiguration()}
          {activeStep === 2 && renderTransformations()}
          {activeStep === 3 && renderPreview()}
        </Box>

        {/* Navigation */}
        <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" justifyContent="between">
            <Button
              disabled={activeStep === 0}
              onClick={() => setActiveStep(prev => prev - 1)}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep(prev => prev + 1)}
              disabled={
                activeStep === steps.length - 1 ||
                (activeStep === 0 && !selectedDatasource) ||
                (activeStep === 1 && (!datasetConfig.name || !datasetConfig.source_table))
              }
            >
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Box>
    </NavbarOnlyLayout>
  );
};

export default DatasetBuilderPage;