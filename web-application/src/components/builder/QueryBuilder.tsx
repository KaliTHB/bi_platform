// File: ./src/components/builder/QueryBuilder.tsx
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
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Code as CodeIcon,
  TableChart as TableIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';

interface QueryBuilderProps {
  datasetId?: string;
  onExecute: (query: string, datasetId: string) => Promise<void>;
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
  const [executing, setExecuting] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');

  // Load saved queries and history on mount
  useEffect(() => {
    loadSavedQueries();
    loadQueryHistory();
  }, [datasetId]);

  // Load from localStorage or API
  const loadSavedQueries = () => {
    try {
      const stored = localStorage.getItem(`savedQueries_${datasetId || 'default'}`);
      if (stored) {
        const queries = JSON.parse(stored).map((q: any) => ({
          ...q,
          created_at: new Date(q.created_at)
        }));
        setSavedQueries(queries);
      } else {
        // Default queries for first time users
        setSavedQueries([
          {
            id: '1',
            name: 'Sample Query',
            query: 'SELECT * FROM dataset LIMIT 10',
            created_at: new Date(),
            description: 'Basic select query with limit'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load saved queries:', error);
      setSavedQueries([]);
    }
  };

  const loadQueryHistory = () => {
    try {
      const stored = localStorage.getItem(`queryHistory_${datasetId || 'default'}`);
      if (stored) {
        setQueryHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load query history:', error);
      setQueryHistory([]);
    }
  };

  // Save to localStorage
  const saveToStorage = (queries: SavedQuery[], history: string[]) => {
    try {
      localStorage.setItem(
        `savedQueries_${datasetId || 'default'}`,
        JSON.stringify(queries)
      );
      localStorage.setItem(
        `queryHistory_${datasetId || 'default'}`,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  };

  const handleExecuteQuery = async () => {
    if (!datasetId) {
      setError('Please select a dataset first');
      return;
    }

    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setError(null);
    setExecuting(true);
    
    try {
      let finalQuery = query.trim();
      
      // Add LIMIT if auto-limit is enabled and no LIMIT exists
      if (autoLimit && !finalQuery.toLowerCase().includes('limit')) {
        finalQuery = `${finalQuery} LIMIT 1000`;
      }

      await onExecute(finalQuery, datasetId);
      
      // Add to history (avoid duplicates)
      const newHistory = [finalQuery, ...queryHistory.filter(q => q !== finalQuery)].slice(0, 10);
      setQueryHistory(newHistory);
      saveToStorage(savedQueries, newHistory);

    } catch (error) {
      console.error('Query execution failed:', error);
      setError(error instanceof Error ? error.message : 'Query execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleSaveQuery = () => {
    if (!query.trim()) {
      setError('Please enter a query to save');
      return;
    }
    
    setSaveDialogOpen(true);
    setQueryName(`Query ${savedQueries.length + 1}`);
    setQueryDescription('');
  };

  const confirmSaveQuery = () => {
    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: queryName || `Query ${savedQueries.length + 1}`,
      query: query.trim(),
      created_at: new Date(),
      description: queryDescription || undefined
    };
    
    const newSavedQueries = [newQuery, ...savedQueries];
    setSavedQueries(newSavedQueries);
    saveToStorage(newSavedQueries, queryHistory);
    
    setSaveDialogOpen(false);
    onSave(query);
    
    // Switch to saved tab to show the new query
    setActiveTab(1);
  };

  const handleLoadQuery = (queryToLoad: string) => {
    setQuery(queryToLoad);
    setError(null);
    setActiveTab(0); // Switch to editor tab
  };

  const handleDeleteSavedQuery = (queryId: string) => {
    const newSavedQueries = savedQueries.filter(q => q.id !== queryId);
    setSavedQueries(newSavedQueries);
    saveToStorage(newSavedQueries, queryHistory);
  };

  const handleClearQuery = () => {
    setQuery('');
    setError(null);
  };

  const handleClearHistory = () => {
    setQueryHistory([]);
    saveToStorage(savedQueries, []);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getQueryPreview = (queryText: string, maxLength: number = 50) => {
    return queryText.length > maxLength 
      ? queryText.substring(0, maxLength) + '...' 
      : queryText;
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
        {datasetId && (
          <Chip 
            label={`Dataset: ${datasetId}`} 
            size="small" 
            sx={{ mt: 1 }}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<CodeIcon />} label="Editor" />
          <Tab 
            icon={<SaveIcon />} 
            label={`Saved (${savedQueries.length})`} 
          />
          <Tab 
            icon={<HistoryIcon />} 
            label={`History (${queryHistory.length})`} 
          />
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
                rows={10}
                variant="outlined"
                label="SQL Query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
                sx={{
                  height: '100%',
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    height: '100%'
                  },
                  '& .MuiOutlinedInput-input': {
                    height: '100% !important',
                    overflow: 'auto !important'
                  }
                }}
              />
            </Box>

            {/* Options */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoLimit}
                    onChange={(e) => setAutoLimit(e.target.checked)}
                  />
                }
                label="Auto-add LIMIT clause for safety"
              />
              
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearQuery}
                disabled={!query.trim()}
              >
                Clear
              </Button>
            </Box>

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={
                  (loading || executing) ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <RunIcon />
                  )
                }
                onClick={handleExecuteQuery}
                disabled={loading || executing || !datasetId || !query.trim()}
              >
                {loading || executing ? 'Executing...' : 'Execute Query'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={handleSaveQuery}
                disabled={!query.trim()}
              >
                Save Query
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* Saved Queries Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            {savedQueries.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <SaveIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No saved queries yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Save frequently used queries for quick access
                </Typography>
              </Box>
            ) : (
              <List>
                {savedQueries.map((savedQuery, index) => (
                  <React.Fragment key={savedQuery.id}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <Tooltip title="Load query">
                            <IconButton 
                              size="small" 
                              onClick={() => handleLoadQuery(savedQuery.query)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete query">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteSavedQuery(savedQuery.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemButton onClick={() => handleLoadQuery(savedQuery.query)}>
                        <ListItemIcon>
                          <SaveIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={savedQuery.name}
                          secondary={
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  display: 'block',
                                  color: 'text.secondary',
                                  mb: 0.5
                                }}
                              >
                                {getQueryPreview(savedQuery.query, 60)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Created: {formatDate(savedQuery.created_at)}
                              </Typography>
                              {savedQuery.description && (
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {savedQuery.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
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
            {/* History Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">
                Recent Queries
              </Typography>
              {queryHistory.length > 0 && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearHistory}
                >
                  Clear History
                </Button>
              )}
            </Box>

            {queryHistory.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
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
                          secondary={`Executed query #${index + 1}`}
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

      {/* Footer Warning */}
      {!datasetId && (
        <Paper sx={{ p: 2, bgcolor: 'warning.50', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="warning.dark">
            ⚠️ Select a dataset first to run queries
          </Typography>
        </Paper>
      )}

      {/* Save Query Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Query</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Query Name"
            fullWidth
            variant="outlined"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={queryDescription}
            onChange={(e) => setQueryDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Query Preview:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '12px',
                maxHeight: '100px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {query}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={confirmSaveQuery} 
            variant="contained"
            disabled={!queryName.trim()}
          >
            Save Query
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};