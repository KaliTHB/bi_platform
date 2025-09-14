// web-application/src/pages/workspace/sql-editor.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Chip,
  CircularProgress,
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
  Tooltip,
  Divider,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Schema as SchemaIcon,
  TableChart as TableIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Storage as StorageIcon,
  Folder as FolderIcon,
  AccountTree as TreeIcon,
  ArrowBack as BackIcon,
  ExpandMore as ExpandMoreIcon,
  Clear as ClearIcon,
  FormatSize as FormatIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGate } from '../../components/shared/PermissionGate';
import NavbarOnlyLayout from '../../components/layout/NavbarOnlyLayout';

// Types
interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  query: string;
  queryId?: string;
}

interface TabState {
  mainTab: number;
  rightPanelTab: number;
}

interface QueryHistory {
  id: string;
  query: string;
  executedAt: string;
  executionTime: number;
  rowCount?: number;
  status: 'success' | 'error';
  error?: string;
  datasource: string;
}

interface DataSource {
  id: string;
  name: string;
  display_name: string;
  type: string;
  status: 'connected' | 'error' | 'pending';
  host?: string;
  database?: string;
  tables?: DatabaseTable[];
}

interface DatabaseTable {
  name: string;
  schema?: string;
  type: 'table' | 'view' | 'materialized_view';
  rowCount?: number;
  columns: TableColumn[];
}

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
}

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  datasource_id: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`sql-editor-tabpanel-${index}`}
    aria-labelledby={`sql-editor-tab-${index}`}
    {...other}
  >
    {value === index && children}
  </div>
);

const SQLEditorPage: React.FC = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Query editor state
  const [sqlQuery, setSqlQuery] = useState<string>('-- Welcome to SQL Editor\n-- Write your SQL queries here\n\nSELECT * FROM customers LIMIT 10;');
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  
  // UI state
  const [tabValue, setTabValue] = useState(0);
  const [tabState, setTabState] = useState<TabState>({
  mainTab: 0,
  rightPanelTab: 0
});
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [rightPanelTab, setRightPanelTab] = useState(0);
  
  // Data state
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  

  // Dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  
  // Refs
  const sqlEditorRef = useRef<HTMLTextAreaElement>(null);

  // Mock data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Mock data sources
      const mockDataSources: DataSource[] = [
        {
          id: 'ds1',
          name: 'production-postgres',
          display_name: 'Production PostgreSQL',
          type: 'postgresql',
          status: 'connected',
          host: 'prod-db.company.com',
          database: 'analytics',
          tables: [
            {
              name: 'customers',
              type: 'table',
              rowCount: 125430,
              columns: [
                { name: 'id', type: 'integer', nullable: false },
                { name: 'email', type: 'varchar(255)', nullable: false },
                { name: 'name', type: 'varchar(100)', nullable: false },
                { name: 'created_at', type: 'timestamp', nullable: false },
                { name: 'updated_at', type: 'timestamp', nullable: true }
              ]
            },
            {
              name: 'orders',
              type: 'table',
              rowCount: 342180,
              columns: [
                { name: 'id', type: 'integer', nullable: false },
                { name: 'customer_id', type: 'integer', nullable: false },
                { name: 'total_amount', type: 'decimal(10,2)', nullable: false },
                { name: 'status', type: 'varchar(20)', nullable: false },
                { name: 'order_date', type: 'date', nullable: false }
              ]
            },
            {
              name: 'products',
              type: 'table',
              rowCount: 5240,
              columns: [
                { name: 'id', type: 'integer', nullable: false },
                { name: 'name', type: 'varchar(200)', nullable: false },
                { name: 'price', type: 'decimal(8,2)', nullable: false },
                { name: 'category_id', type: 'integer', nullable: true }
              ]
            }
          ]
        },
        {
          id: 'ds2',
          name: 'bigquery-analytics',
          display_name: 'BigQuery Analytics',
          type: 'bigquery',
          status: 'connected',
          database: 'analytics-warehouse',
          tables: [
            {
              name: 'user_events',
              type: 'table',
              rowCount: 2847560,
              columns: [
                { name: 'user_id', type: 'string', nullable: false },
                { name: 'event_name', type: 'string', nullable: false },
                { name: 'event_timestamp', type: 'timestamp', nullable: false },
                { name: 'properties', type: 'json', nullable: true }
              ]
            },
            {
              name: 'sales_summary',
              type: 'view',
              columns: [
                { name: 'date', type: 'date', nullable: false },
                { name: 'total_sales', type: 'numeric', nullable: false },
                { name: 'order_count', type: 'integer', nullable: false }
              ]
            }
          ]
        },
        {
          id: 'ds3',
          name: 'staging-mysql',
          display_name: 'Staging MySQL',
          type: 'mysql',
          status: 'error',
          host: 'staging-db.company.com',
          database: 'staging_app'
        }
      ];

      // Mock query history
      const mockHistory: QueryHistory[] = [
        {
          id: 'q1',
          query: 'SELECT COUNT(*) FROM customers WHERE created_at > \'2024-01-01\'',
          executedAt: '2024-01-15T10:30:00Z',
          executionTime: 245,
          rowCount: 1,
          status: 'success',
          datasource: 'Production PostgreSQL'
        },
        {
          id: 'q2',
          query: 'SELECT c.name, COUNT(o.id) as order_count FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY order_count DESC LIMIT 10',
          executedAt: '2024-01-15T09:15:00Z',
          executionTime: 1240,
          rowCount: 10,
          status: 'success',
          datasource: 'Production PostgreSQL'
        },
        {
          id: 'q3',
          query: 'SELECT * FROM non_existent_table',
          executedAt: '2024-01-15T08:45:00Z',
          executionTime: 0,
          status: 'error',
          error: 'Table "non_existent_table" does not exist',
          datasource: 'Production PostgreSQL'
        }
      ];

      // Mock saved queries
      const mockSavedQueries: SavedQuery[] = [
        {
          id: 'sq1',
          name: 'Top Customers by Orders',
          query: 'SELECT c.name, c.email, COUNT(o.id) as order_count, SUM(o.total_amount) as total_spent FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name, c.email ORDER BY order_count DESC LIMIT 20',
          datasource_id: 'ds1',
          created_at: '2024-01-10T00:00:00Z',
          updated_at: '2024-01-12T15:30:00Z',
          tags: ['customers', 'analytics']
        },
        {
          id: 'sq2',
          name: 'Monthly Sales Report',
          query: 'SELECT DATE_TRUNC(\'month\', order_date) as month, COUNT(*) as orders, SUM(total_amount) as revenue FROM orders WHERE order_date >= \'2024-01-01\' GROUP BY DATE_TRUNC(\'month\', order_date) ORDER BY month',
          datasource_id: 'ds1',
          created_at: '2024-01-08T00:00:00Z',
          updated_at: '2024-01-08T00:00:00Z',
          tags: ['sales', 'reporting', 'monthly']
        }
      ];

      setDataSources(mockDataSources);
      setQueryHistory(mockHistory);
      setSavedQueries(mockSavedQueries);
      
      if (mockDataSources.length > 0) {
        setSelectedDataSource(mockDataSources[0].id);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim() || !selectedDataSource) return;

    setIsExecuting(true);
    setQueryError(null);
    
    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful result
      const mockResult: QueryResult = {
        columns: ['id', 'name', 'email', 'created_at'],
        rows: [
          [1, 'John Doe', 'john@example.com', '2024-01-15T10:00:00Z'],
          [2, 'Jane Smith', 'jane@example.com', '2024-01-14T15:30:00Z'],
          [3, 'Mike Johnson', 'mike@example.com', '2024-01-13T09:15:00Z'],
          [4, 'Sarah Wilson', 'sarah@example.com', '2024-01-12T14:45:00Z'],
          [5, 'David Brown', 'david@example.com', '2024-01-11T11:20:00Z']
        ],
        rowCount: 5,
        executionTime: 1245,
        query: sqlQuery.trim(),
        queryId: `q_${Date.now()}`
      };

      setQueryResults(mockResult);
      setRightPanelTab(1); // Switch to Results tab

      // Add to history
      const historyItem: QueryHistory = {
        id: `q_${Date.now()}`,
        query: sqlQuery.trim(),
        executedAt: new Date().toISOString(),
        executionTime: mockResult.executionTime,
        rowCount: mockResult.rowCount,
        status: 'success',
        datasource: dataSources.find(ds => ds.id === selectedDataSource)?.display_name || 'Unknown'
      };
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 19)]); // Keep last 20
      
    } catch (error) {
      const errorMessage = 'Query execution failed. Please check your SQL syntax.';
      setQueryError(errorMessage);
      
      // Add error to history
      const historyItem: QueryHistory = {
        id: `q_${Date.now()}`,
        query: sqlQuery.trim(),
        executedAt: new Date().toISOString(),
        executionTime: 0,
        status: 'error',
        error: errorMessage,
        datasource: dataSources.find(ds => ds.id === selectedDataSource)?.display_name || 'Unknown'
      };
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveQuery = () => {
    if (!sqlQuery.trim()) return;
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    if (!queryName.trim() || !sqlQuery.trim()) return;

    const savedQuery: SavedQuery = {
      id: `sq_${Date.now()}`,
      name: queryName.trim(),
      query: sqlQuery.trim(),
      datasource_id: selectedDataSource,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setSavedQueries(prev => [savedQuery, ...prev]);
    setSaveDialogOpen(false);
    setQueryName('');
  };

  const handleLoadSavedQuery = (query: SavedQuery) => {
    setSqlQuery(query.query);
    setSelectedDataSource(query.datasource_id);
  };

  const handleLoadHistoryQuery = (historyItem: QueryHistory) => {
    setSqlQuery(historyItem.query);
  };

  const handleClearQuery = () => {
    setSqlQuery('');
    setQueryResults(null);
    setQueryError(null);
  };

  const handleFormatQuery = () => {
    // Simple SQL formatting - replace with proper SQL formatter
    const formatted = sqlQuery
      .replace(/\bSELECT\b/gi, 'SELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bHAVING\b/gi, '\nHAVING')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
      .replace(/\bRIGHT JOIN\b/gi, '\nRIGHT JOIN')
      .replace(/\bINNER JOIN\b/gi, '\nINNER JOIN');
    
    setSqlQuery(formatted);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <SuccessIcon fontSize="small" color="success" />;
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      default:
        return <WarningIcon fontSize="small" color="warning" />;
    }
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const selectedDataSourceObj = dataSources.find(ds => ds.id === selectedDataSource);

  const breadcrumbs = [
    { label: 'Workspace', href: `/workspace/${workspace?.slug}` },
    { label: 'SQL Editor' }
  ];

  const navbarActions = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        variant="outlined"
        startIcon={<BackIcon />}
        onClick={() => router.replace(`/workspace/${workspace?.slug}`)}
        size="small"
      >
        Back to Workspace
      </Button>
    </Box>
  );

  return (
    <NavbarOnlyLayout
      title="SQL Editor"
      breadcrumbs={breadcrumbs}
      actions={navbarActions}
    >
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        {/* Left Panel - Schema Browser */}
        <Paper 
          elevation={1}
          sx={{ 
            width: leftPanelWidth, 
            display: 'flex', 
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'divider',
            borderRadius: 0
          }}
        >
          {/* Left Panel Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Database Schema
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Data Source</InputLabel>
              <Select
                value={selectedDataSource}
                onChange={(e) => setSelectedDataSource(e.target.value)}
                label="Data Source"
              >
                {dataSources.map((ds) => (
                  <MenuItem key={ds.id} value={ds.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      {getStatusIcon(ds.status)}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2">{ds.display_name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {ds.type} • {ds.host || ds.database}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Schema Tree */}
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
            {selectedDataSourceObj && selectedDataSourceObj.status === 'connected' && selectedDataSourceObj.tables ? (
              selectedDataSourceObj.tables.map((table) => (
                <Accordion key={table.name} elevation={0}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TableIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={500}>
                        {table.name}
                      </Typography>
                      <Chip 
                        label={table.type} 
                        size="small" 
                        variant="outlined" 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense>
                      {table.columns?.map((column) => (
                        <ListItem key={column.name} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <SchemaIcon fontSize="small" color="action" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2">
                                {column.name}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                {column.type}
                                {!column.nullable && ' • NOT NULL'}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))
            ) : selectedDataSourceObj && selectedDataSourceObj.status === 'error' ? (
              <Alert severity="error" sx={{ m: 1 }}>
                Failed to connect to data source. Please check the connection settings.
              </Alert>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  Select a data source to view schema
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Main Content - Query Editor and Results */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Query Editor Header */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              borderBottom: '1px solid', 
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                Query Editor
              </Typography>
              {selectedDataSourceObj && (
                <Chip 
                  label={selectedDataSourceObj.display_name}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Clear Query">
                <IconButton onClick={handleClearQuery} size="small">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Format SQL">
                <IconButton onClick={handleFormatQuery} size="small">
                  <FormatIcon />
                </IconButton>
              </Tooltip>
              <PermissionGate permissions={['sql_editor.save']}>
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveQuery}
                  disabled={!sqlQuery.trim()}
                  size="small"
                >
                  Save
                </Button>
              </PermissionGate>
              <PermissionGate permissions={['sql_editor.execute']}>
                <Button
                  variant="contained"
                  startIcon={isExecuting ? <StopIcon /> : <RunIcon />}
                  onClick={handleExecuteQuery}
                  disabled={isExecuting || !selectedDataSource || !sqlQuery.trim()}
                  color={isExecuting ? 'secondary' : 'primary'}
                >
                  {isExecuting ? 'Stop' : 'Run Query'}
                </Button>
              </PermissionGate>
            </Box>
          </Paper>

          {/* Main Editor and Results Area */}
          <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Query Editor */}
            <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, flexGrow: 1 }}>
                <TextField
                  ref={sqlEditorRef}
                  multiline
                  fullWidth
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Write your SQL query here..."
                  variant="outlined"
                  sx={{ 
                    height: '100%',
                    '& .MuiInputBase-root': {
                      height: '100%',
                      alignItems: 'flex-start',
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      fontSize: '14px'
                    },
                    '& .MuiInputBase-input': {
                      height: '100% !important',
                      overflow: 'auto !important'
                    }
                  }}
                />
              </Box>
            </Box>

            {/* Results Panel */}
            <Box sx={{ width: '50%', borderLeft: '1px solid', borderColor: 'divider' }}>
              <Paper elevation={0} sx={{ height: '100%', borderRadius: 0 }}>
                {/* Right Panel Tabs - Fixed structure */}
                <Tabs 
                  value={tabState.rightPanelTab} 
                  onChange={(e, newValue) => handleTabChange('rightPanel', newValue)}
                  variant="fullWidth"
                >
                  <Tab 
                    label="Info" 
                    icon={<InfoIcon />} 
                    iconPosition="start"
                    sx={{ minHeight: 40, fontSize: '0.75rem' }}
                  />
                  <Tab 
                    label={`Results${queryResults ? ` (${queryResults.rowCount})` : ''}`} 
                    icon={<TableIcon />} 
                    iconPosition="start" 
                  />
                  <Tab 
                    label={`Saved (${savedQueries.length})`}
                    icon={<SaveIcon />} 
                    iconPosition="start"
                    sx={{ minHeight: 40, fontSize: '0.75rem' }}
                  />
                  <Tab 
                    label={`History (${queryHistory.length})`}
                    icon={<HistoryIcon />} 
                    iconPosition="start"
                    sx={{ minHeight: 40, fontSize: '0.75rem' }}
                  />
                </Tabs>

                <TabPanel value={tabState.rightPanelTab} index={0}>
                  <Box sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Connection Info
                            </Typography>
                            {selectedDataSourceObj ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getStatusIcon(selectedDataSourceObj.status)}
                                  <Typography variant="body2">
                                    {selectedDataSourceObj.display_name}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="textSecondary">
                                  Type: {selectedDataSourceObj.type}
                                </Typography>
                                {selectedDataSourceObj.host && (
                                  <Typography variant="caption" color="textSecondary">
                                    Host: {selectedDataSourceObj.host}
                                  </Typography>
                                )}
                                {selectedDataSourceObj.database && (
                                  <Typography variant="caption" color="textSecondary">
                                    Database: {selectedDataSourceObj.database}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                No data source selected
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>

                      {queryResults && (
                        <Grid item xs={12}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                Last Query Results
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <SpeedIcon fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    Execution time: {formatExecutionTime(queryResults.executionTime)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <TableIcon fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    Rows returned: {queryResults.rowCount.toLocaleString()}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <ScheduleIcon fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    Executed: {new Date().toLocaleTimeString()}
                                  </Typography>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                </TabPanel>

                <TabPanel value={tabState.rightPanelTab} index={1}>
                  <Box sx={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
                    {isExecuting ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <CircularProgress />
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            Executing query...
                          </Typography>
                        </Box>
                      </Box>
                    ) : queryError ? (
                      <Box sx={{ p: 2 }}>
                        <Alert severity="error">
                          <Typography variant="body2">
                            {queryError}
                          </Typography>
                        </Alert>
                      </Box>
                    ) : queryResults ? (
                      <TableContainer>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              {queryResults.columns.map((column, index) => (
                                <TableCell key={index}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {column}
                                  </Typography>
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {queryResults.rows.map((row, rowIndex) => (
                              <TableRow key={rowIndex} hover>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    <Typography variant="body2">
                                      {cell === null ? (
                                        <span style={{ color: '#999', fontStyle: 'italic' }}>NULL</span>
                                      ) : (
                                        String(cell)
                                      )}
                                    </Typography>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <TableIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                          <Typography variant="body1" color="textSecondary">
                            No query results yet
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Run a query to see results here
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </TabPanel>
                <TabPanel value={tabState.rightPanelTab} index={3}>
                <List dense>
                  {queryHistory.map((item) => (
                    <ListItem
                      key={item.id}
                      button
                      onClick={() => handleLoadHistoryQuery(item)}
                      sx={{ px: 2, py: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {item.status === 'success' ? (
                          <SuccessIcon fontSize="small" color="success" />
                        ) : (
                          <ErrorIcon fontSize="small" color="error" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {item.query.slice(0, 40)}...
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {new Date(item.executedAt).toLocaleString()} • {formatExecutionTime(item.executionTime)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
              <TabPanel value={tabState.rightPanelTab} index={4}>
                <List dense>
                  {savedQueries.map((query) => (
                    <ListItem
                      key={query.id}
                      button
                      onClick={() => handleLoadSavedQuery(query)}
                      sx={{ px: 2, py: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <SaveIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={500}>
                            {query.name}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {new Date(query.updated_at).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
              </Paper>
            </Box>
          </Box>
        </Box>

        {/* Save Query Dialog */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Save Query</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Query Name"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              sx={{ mt: 1 }}
              placeholder="Enter a name for this query"
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Query Preview:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {sqlQuery.slice(0, 500)}{sqlQuery.length > 500 ? '...' : ''}
                </Typography>
              </Paper>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfirm} variant="contained" disabled={!queryName.trim()}>
              Save Query
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </NavbarOnlyLayout>
  );
};

export default SQLEditorPage;