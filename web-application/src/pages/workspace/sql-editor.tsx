// web-application/src/pages/workspace/sql-editor.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  Grid
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
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGate } from '@/components/shared/PermissionGate';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  query: string;
}

interface QueryHistory {
  id: string;
  query: string;
  executedAt: string;
  executionTime: number;
  rowCount?: number;
  status: 'success' | 'error';
  error?: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'error' | 'pending';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
  </div>
);

const SQLEditorPage: React.FC = () => {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const { hasPermission } = usePermissions();

  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [sqlQuery, setSqlQuery] = useState<string>('-- Enter your SQL query here\nSELECT * FROM your_table LIMIT 10;');
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [datasources, setDatasources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Mock data - replace with actual API calls
        setTimeout(() => {
          setDatasources([
            { id: '1', name: 'Main Database', type: 'PostgreSQL', status: 'connected' },
            { id: '2', name: 'Analytics DB', type: 'MySQL', status: 'connected' },
            { id: '3', name: 'Sales API', type: 'REST API', status: 'pending' }
          ]);

          setQueryHistory([
            {
              id: '1',
              query: 'SELECT COUNT(*) FROM sales_orders WHERE created_at >= CURRENT_DATE - INTERVAL \'30 days\'',
              executedAt: '2024-01-15T10:30:00Z',
              executionTime: 145,
              rowCount: 1,
              status: 'success'
            },
            {
              id: '2',
              query: 'SELECT customer_name, SUM(order_total) FROM orders GROUP BY customer_name ORDER BY SUM(order_total) DESC',
              executedAt: '2024-01-15T09:15:00Z',
              executionTime: 892,
              rowCount: 245,
              status: 'success'
            },
            {
              id: '3',
              query: 'SELECT * FROM invalid_table',
              executedAt: '2024-01-14T16:45:00Z',
              executionTime: 0,
              status: 'error',
              error: 'Table "invalid_table" does not exist'
            }
          ]);

          // Set default datasource
          setSelectedDataSource('1');
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading SQL editor data:', error);
        setLoading(false);
      }
    };

    if (workspace) {
      loadData();
    }
  }, [workspace]);

  // Check for dataset parameter in URL
  useEffect(() => {
    const { dataset } = router.query;
    if (dataset && typeof dataset === 'string') {
      setSqlQuery(`-- Query for dataset: ${dataset}\nSELECT * FROM ${dataset} LIMIT 100;`);
    }
  }, [router.query]);

  const handleExecuteQuery = useCallback(async () => {
    if (!sqlQuery.trim() || !selectedDataSource) {
      setError('Please select a data source and enter a query');
      return;
    }

    setIsExecuting(true);
    setError(null);

    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful result
      const mockResult: QueryResult = {
        columns: ['id', 'customer_name', 'order_date', 'total_amount', 'status'],
        rows: [
          ['1', 'John Doe', '2024-01-15', '$1,250.00', 'completed'],
          ['2', 'Jane Smith', '2024-01-14', '$890.50', 'pending'],
          ['3', 'Bob Johnson', '2024-01-13', '$2,150.75', 'completed'],
          ['4', 'Alice Brown', '2024-01-12', '$675.25', 'shipped'],
          ['5', 'Charlie Wilson', '2024-01-11', '$1,850.00', 'completed']
        ],
        rowCount: 5,
        executionTime: 234,
        query: sqlQuery
      };

      setQueryResults(mockResult);

      // Add to history
      const historyEntry: QueryHistory = {
        id: Date.now().toString(),
        query: sqlQuery,
        executedAt: new Date().toISOString(),
        executionTime: mockResult.executionTime,
        rowCount: mockResult.rowCount,
        status: 'success'
      };

      setQueryHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10
      setTabValue(1); // Switch to Results tab

    } catch (error) {
      const errorMessage = 'Query execution failed';
      setError(errorMessage);
      
      // Add error to history
      const historyEntry: QueryHistory = {
        id: Date.now().toString(),
        query: sqlQuery,
        executedAt: new Date().toISOString(),
        executionTime: 0,
        status: 'error',
        error: errorMessage
      };

      setQueryHistory(prev => [historyEntry, ...prev.slice(0, 9)]);
    } finally {
      setIsExecuting(false);
    }
  }, [sqlQuery, selectedDataSource]);

  const handleSaveQuery = () => {
    // Implement save query logic
    console.log('Save query:', sqlQuery);
  };

  const handleExportResults = () => {
    if (!queryResults) return;

    // Create CSV content
    const headers = queryResults.columns.join(',');
    const rows = queryResults.rows.map(row => row.join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'query-results.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleHistorySelect = (historyItem: QueryHistory) => {
    setSqlQuery(historyItem.query);
    setTabValue(0); // Switch to Query tab
  };

  if (!workspace) {
    return <div>Loading workspace...</div>;
  }

  if (loading) {
    return (
      <WorkspaceLayout>
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" justifyContent="between" alignItems="center">
            <Box>
              <Typography variant="h5" component="h1" gutterBottom>
                SQL Editor
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Write and execute SQL queries against your data sources
              </Typography>
            </Box>

            <Box display="flex" gap={1}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Data Source</InputLabel>
                <Select
                  value={selectedDataSource}
                  onChange={(e) => setSelectedDataSource(e.target.value)}
                  label="Data Source"
                >
                  {datasources.map((ds) => (
                    <MenuItem key={ds.id} value={ds.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: ds.status === 'connected' ? 'success.main' : 
                                    ds.status === 'error' ? 'error.main' : 'warning.main'
                          }}
                        />
                        {ds.name} ({ds.type})
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <PermissionGate permission="query.save">
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveQuery}
                >
                  Save
                </Button>
              </PermissionGate>
            </Box>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Panel - Query Editor & History */}
          <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid', borderColor: 'divider' }}>
            {/* Query Editor */}
            <Box sx={{ flexGrow: 1, p: 2 }}>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">Query Editor</Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    startIcon={isExecuting ? <StopIcon /> : <RunIcon />}
                    onClick={handleExecuteQuery}
                    disabled={isExecuting || !selectedDataSource}
                    color={isExecuting ? 'secondary' : 'primary'}
                  >
                    {isExecuting ? 'Executing...' : 'Run Query'}
                  </Button>
                </Box>
              </Box>

              <Paper variant="outlined" sx={{ height: 'calc(100% - 80px)', mb: 2 }}>
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    padding: '16px',
                    fontFamily: 'Monaco, Menlo, monospace',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'none',
                    backgroundColor: '#fafafa'
                  }}
                  placeholder="Enter your SQL query here..."
                />
              </Paper>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>

            {/* Query History */}
            <Box sx={{ height: '200px', borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Query History
              </Typography>
              <Box sx={{ height: '150px', overflowY: 'auto' }}>
                {queryHistory.map((item) => (
                  <Paper
                    key={item.id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handleHistorySelect(item)}
                  >
                    <Box display="flex" justifyContent="between" alignItems="center">
                      <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                        {item.query.substring(0, 50)}...
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={item.status}
                          size="small"
                          color={item.status === 'success' ? 'success' : 'error'}
                          variant="outlined"
                        />
                        <Typography variant="caption" color="textSecondary">
                          {new Date(item.executedAt).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Right Panel - Results */}
          <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Tabs
                value={tabValue}
                onChange={(_, newValue) => setTabValue(newValue)}
                sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
              >
                <Tab label="Query" icon={<SchemaIcon />} iconPosition="start" />
                <Tab 
                  label={`Results ${queryResults ? `(${queryResults.rowCount})` : ''}`} 
                  icon={<TableIcon />} 
                  iconPosition="start" 
                />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                  <Typography variant="h6" gutterBottom>
                    Query Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Selected Data Source
                        </Typography>
                        {selectedDataSource ? (
                          <Box>
                            <Typography variant="body2">
                              {datasources.find(ds => ds.id === selectedDataSource)?.name}
                            </Typography>
                            <Chip
                              label={datasources.find(ds => ds.id === selectedDataSource)?.type}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No data source selected
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Query Stats
                        </Typography>
                        <Typography variant="body2">
                          Lines: {sqlQuery.split('\n').length}
                        </Typography>
                        <Typography variant="body2">
                          Characters: {sqlQuery.length}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {queryResults ? (
                    <>
                      {/* Results Header */}
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" justifyContent="between" alignItems="center">
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="h6">
                              Query Results
                            </Typography>
                            <Chip
                              label={`${queryResults.rowCount} rows`}
                              size="small"
                              color="primary"
                            />
                            <Chip
                              label={`${queryResults.executionTime}ms`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          
                          <Button
                            size="small"
                            startIcon={<ExportIcon />}
                            onClick={handleExportResults}
                          >
                            Export CSV
                          </Button>
                        </Box>
                      </Box>

                      {/* Results Table */}
                      <TableContainer sx={{ flexGrow: 1 }}>
                        <Table stickyHeader size="small">
                          <TableHead>
                            <TableRow>
                              {queryResults.columns.map((column, index) => (
                                <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                                  {column}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {queryResults.rows.map((row, rowIndex) => (
                              <TableRow key={rowIndex} hover>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {cell}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Box
                      display="flex"
                      flexDirection="column"
                      justifyContent="center"
                      alignItems="center"
                      height="100%"
                    >
                      <TableIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" color="textSecondary">
                        No results to display
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Run a query to see results here
                      </Typography>
                    </Box>
                  )}
                </Box>
              </TabPanel>
            </Paper>
          </Box>
        </Box>
      </Box>
    </WorkspaceLayout>
  );
};

export default SQLEditorPage;