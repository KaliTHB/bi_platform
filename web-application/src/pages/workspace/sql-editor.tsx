// Create this file: web-application/src/pages/workspace/sql-editor.tsx

import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Save,
  History,
  TableChart,
  Clear,
  Download
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionGate } from '../../components/shared/PermissionGate';
import Navigation from '../../components/shared/Navigation';

// SQL Editor Page Component
const SQLEditorPage: NextPage = () => {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const { hasPermission } = usePermissions();
  
  const [query, setQuery] = useState<string>('-- Welcome to SQL Editor\n-- Write your SQL queries here\n\nSELECT * FROM users LIMIT 10;');
  const [results, setResults] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQueries, setSavedQueries] = useState<string[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Check permissions
  const canAccessSQLEditor = hasPermission('sql_editor.access');
  const canExecuteSQL = hasPermission('sql_editor.execute');

  // Load saved queries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sqlEditor_savedQueries');
    if (saved) {
      try {
        setSavedQueries(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to load saved queries');
      }
    }
  }, []);

  // Mock query execution
  const handleExecuteQuery = async () => {
    if (!canExecuteSQL) {
      setError('You do not have permission to execute SQL queries');
      return;
    }

    setIsExecuting(true);
    setError(null);
    const startTime = Date.now();
    
    try {
      // Mock API call - replace with real API
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay
      
      // Mock results based on query content
      let mockResults;
      
      if (query.toLowerCase().includes('users')) {
        mockResults = [
          { id: 1, username: 'admin', email: 'admin@company.com', role: 'admin', created_at: '2024-01-01', is_active: true },
          { id: 2, username: 'user1', email: 'user1@company.com', role: 'user', created_at: '2024-01-02', is_active: true },
          { id: 3, username: 'user2', email: 'user2@company.com', role: 'user', created_at: '2024-01-03', is_active: false },
          { id: 4, username: 'manager', email: 'manager@company.com', role: 'manager', created_at: '2024-01-04', is_active: true }
        ];
      } else if (query.toLowerCase().includes('dashboard')) {
        mockResults = [
          { id: 1, title: 'Sales Dashboard', category: 'Business', created_by: 'admin', views: 145 },
          { id: 2, title: 'User Analytics', category: 'Analytics', created_by: 'user1', views: 89 },
          { id: 3, title: 'Financial Report', category: 'Finance', created_by: 'manager', views: 234 }
        ];
      } else {
        mockResults = [
          { column1: 'Sample', column2: 'Data', column3: 42, column4: true },
          { column1: 'Mock', column2: 'Result', column3: 24, column4: false },
          { column1: 'Test', column2: 'Query', column3: 66, column4: true }
        ];
      }
      
      const endTime = Date.now();
      setExecutionTime(endTime - startTime);
      setResults(mockResults);
      
      console.log('✅ SQL query executed successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
      console.error('❌ SQL query failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Clear query
  const handleClearQuery = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setExecutionTime(null);
  };

  // Save query
  const handleSaveQuery = () => {
    const queryName = prompt('Enter a name for this query:');
    if (queryName && query.trim()) {
      const newQuery = `${queryName}: ${query.trim()}`;
      const updated = [...savedQueries, newQuery];
      setSavedQueries(updated);
      localStorage.setItem('sqlEditor_savedQueries', JSON.stringify(updated));
      console.log('💾 Query saved:', queryName);
    }
  };

  // Load saved query
  const handleLoadQuery = (savedQuery: string) => {
    const [name, ...queryParts] = savedQuery.split(': ');
    const queryText = queryParts.join(': ');
    setQuery(queryText);
    setResults([]);
    setError(null);
    setExecutionTime(null);
  };

  // Export results
  const handleExportResults = () => {
    if (results.length === 0) return;
    
    const csv = [
      Object.keys(results[0]).join(','),
      ...results.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/workspace/overview');
  };

  // Render results table
  const renderResults = () => {
    if (results.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <TableChart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="text.secondary">
            No results to display. Execute a query to see results here.
          </Typography>
        </Box>
      );
    }

    const columns = Object.keys(results[0]);

    return (
      <Box>
        {/* Results Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip label={`${results.length} rows`} color="success" />
            {executionTime && (
              <Chip label={`${executionTime}ms`} variant="outlined" />
            )}
          </Box>
          <Button
            startIcon={<Download />}
            onClick={handleExportResults}
            size="small"
          >
            Export CSV
          </Button>
        </Box>

        {/* Results Table */}
        <Box sx={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5' }}>
              <tr>
                {columns.map(col => (
                  <th key={col} style={{ 
                    border: '1px solid #ddd', 
                    padding: '12px 16px', 
                    backgroundColor: '#f5f5f5',
                    textAlign: 'left',
                    fontWeight: 600
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={index} style={{ 
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' 
                }}>
                  {columns.map(col => (
                    <td key={col} style={{ 
                      border: '1px solid #ddd', 
                      padding: '12px 16px',
                      verticalAlign: 'top'
                    }}>
                      {typeof row[col] === 'boolean' ? (row[col] ? '✓' : '✗') : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    );
  };

  // Permission check
  if (!canAccessSQLEditor) {
    return (
      <PermissionGate permissions={['sql_editor.access']}>
        <Box>
          <Navigation title="SQL Editor" />
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Alert severity="error">
              You do not have permission to access the SQL Editor. Please contact your administrator.
            </Alert>
          </Container>
        </Box>
      </PermissionGate>
    );
  }

  return (
    <Box>
      <Navigation title="SQL Editor" />
      
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom>
              SQL Editor
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Write and execute SQL queries against your data sources
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`👤 ${user?.username}`} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              label={workspace?.display_name || 'Default Workspace'} 
              color="primary" 
              size="small"
            />
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Query Editor */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Query Editor
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Clear />}
                      onClick={handleClearQuery}
                      disabled={!query.trim()}
                      size="small"
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Save />}
                      onClick={handleSaveQuery}
                      disabled={!query.trim()}
                      size="small"
                    >
                      Save
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={isExecuting ? <CircularProgress size={16} /> : <PlayArrow />}
                      onClick={handleExecuteQuery}
                      disabled={isExecuting || !canExecuteSQL || !query.trim()}
                    >
                      {isExecuting ? 'Executing...' : 'Execute'}
                    </Button>
                  </Box>
                </Box>

                {/* Query Input */}
                <Box sx={{ 
                  border: '1px solid #ddd', 
                  borderRadius: 1, 
                  minHeight: 300,
                  fontFamily: 'monospace'
                }}>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="-- Enter your SQL query here..."
                    style={{
                      width: '100%',
                      height: '300px',
                      border: 'none',
                      padding: '16px',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      fontSize: '14px',
                      resize: 'vertical',
                      outline: 'none',
                      lineHeight: '1.5'
                    }}
                  />
                </Box>

                {/* Permission Warning */}
                {!canExecuteSQL && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    You can view the SQL Editor but do not have permission to execute queries.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Saved Queries Sidebar */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <History sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Saved Queries
                  </Typography>
                </Box>
                
                {savedQueries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                    No saved queries yet. Save your queries to see them here.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {savedQueries.map((savedQuery, index) => {
                      const [name] = savedQuery.split(': ');
                      return (
                        <Box
                          key={index}
                          sx={{
                            p: 2,
                            border: '1px solid #ddd',
                            borderRadius: 1,
                            backgroundColor: '#f9f9f9',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: '#f0f0f0',
                              borderColor: '#ccc'
                            }
                          }}
                          onClick={() => handleLoadQuery(savedQuery)}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Query Error:</strong> {error}
            </Typography>
          </Alert>
        )}

        {/* Results Section */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Query Results
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {renderResults()}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default SQLEditorPage;