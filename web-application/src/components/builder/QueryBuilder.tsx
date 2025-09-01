// File: web-application/src/components/builder/QueryBuilder.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Code as CodeIcon,
 TableChart as TableIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface QueryBuilderProps {
  datasetId?: string;
  onExecute: (query: string, datasetId: string) => void;
  onSave: (query: string) => void;
  loading?: boolean;
}

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  created_at: Date;
  description?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
  </div>
);

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  datasetId,
  onExecute,
  onSave,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState('SELECT * FROM dataset LIMIT 100');
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [autoLimit, setAutoLimit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved queries and history
  useEffect(() => {
    loadSavedQueries();
    loadQueryHistory();
  }, [datasetId]);

  const loadSavedQueries = () => {
    // Mock saved queries - in real app, load from API
    setSavedQueries([
      {
        id: '1',
        name: 'Top 10 Records',
        query: 'SELECT * FROM dataset ORDER BY id DESC LIMIT 10',
        created_at: new Date('2024-01-15'),
        description: 'Get the most recent 10 records'
      },
      {
        id: '2', 
        name: 'Sales Summary',
        query: 'SELECT category, SUM(amount) as total FROM dataset GROUP BY category',
        created_at: new Date('2024-01-10'),
        description: 'Aggregate sales by category'
      }
    ]);
  };

  const loadQueryHistory = () => {
    // Mock query history - in real app, load from localStorage or API
    setQueryHistory([
      'SELECT * FROM dataset WHERE status = "active"',
      'SELECT category, COUNT(*) FROM dataset GROUP BY category',
      'SELECT * FROM dataset ORDER BY created_at DESC LIMIT 50'
    ]);
  };

  const handleExecuteQuery = () => {
    if (!datasetId) {
      setError('Please select a dataset first');
      return;
    }

    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setError(null);
    
    let finalQuery = query;
    if (autoLimit && !query.toLowerCase().includes('limit')) {
      finalQuery = `${query} LIMIT 1000`;
    }

    onExecute(finalQuery, datasetId);
    
    // Add to history
    if (!queryHistory.includes(finalQuery)) {
      setQueryHistory(prev => [finalQuery, ...prev.slice(0, 9)]); // Keep last 10
    }
  };

  const handleSaveQuery = () => {
    if (!query.trim()) return;
    
    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: `Query ${savedQueries.length + 1}`,
      query: query,
      created_at: new Date(),
      description: 'Custom query'
    };
    
    setSavedQueries(prev => [newQuery, ...prev]);
    onSave(query);
  };

  const handleLoadQuery = (queryToLoad: string) => {
    setQuery(queryToLoad);
    setActiveTab(0); // Switch to editor tab
  };

  const handleClearQuery = () => {
    setQuery('');
    setError(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Query Builder
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Write custom SQL queries to filter and transform your data
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<CodeIcon />} label="Editor" />
          <Tab icon={<SaveIcon />} label="Saved" />
          <Tab icon={<HistoryIcon />} label="History" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Query Editor Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
            {/* Query Input */}
            <Box sx={{ flex: 1, mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={8}
                variant="outlined"
                label="SQL Query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }
                }}
              />
            </Box>

            {/* Options */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoLimit}
                    onChange={(e) => setAutoLimit(e.target.checked)}
                  />
                }
                label="Auto-add LIMIT clause for safety"
              />
            </Box>

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} /> : <RunIcon />}
                  onClick={handleExecuteQuery}
                  disabled={loading || !datasetId}
                >
                  {loading ? 'Running...' : 'Run Query'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveQuery}
                  disabled={!query.trim()}
                >
                  Save
                </Button>
              </Box>

              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearQuery}
                color="error"
              >
                Clear
              </Button>
            </Box>

            {/* Help Text */}
            <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Query Tips:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Use <code>SELECT * FROM dataset</code> to get all columns<br/>
                • Add <code>WHERE</code> clauses to filter data<br/>
                • Use <code>GROUP BY</code> for aggregations<br/>
                • Always include <code>LIMIT</code> for large datasets
              </Typography>
            </Paper>
          </Box>
        </TabPanel>

        {/* Saved Queries Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {savedQueries.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No saved queries yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Save queries from the editor to reuse them later
                </Typography>
              </Box>
            ) : (
              <List>
                {savedQueries.map((savedQuery, index) => (
                  <React.Fragment key={savedQuery.id}>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleLoadQuery(savedQuery.query)}>
                        <ListItemIcon>
                          <CodeIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={savedQuery.name}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {savedQuery.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(savedQuery.created_at)}
                              </Typography>
                            </Box>
                          }
                        />
                        <Tooltip title="Load query">
                          <IconButton size="small">
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemButton>
                    </ListItem>
                    {index < savedQueries.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* Query History Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {queryHistory.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No query history
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your executed queries will appear here
                </Typography>
              </Box>
            ) : (
              <List>
                {queryHistory.map((historyQuery, index) => (
                  <React.Fragment key={index}>
                    <ListItem disablePadding>
                      <ListItemButton onClick={() => handleLoadQuery(historyQuery)}>
                        <ListItemIcon>
                          <HistoryIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {historyQuery}
                            </Typography>
                          }
                          secondary={`Query ${index + 1}`}
                        />
                        <Tooltip title="Load query">
                          <IconButton size="small">
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemButton>
                    </ListItem>
                    {index < queryHistory.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>
      </Box>

      {/* Footer */}
      {!datasetId && (
        <Paper sx={{ p: 2, bgcolor: 'warning.50', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="warning.dark">
            ⚠️ Select a dataset first to run queries
          </Typography>
        </Paper>
      )}
    </Box>
  );
};