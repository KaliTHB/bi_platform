// web-application/src/components/builder/SQLQueryEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Tooltip
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Code as CodeIcon,
  TableChart as TableIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  success: boolean;
  error?: string;
}

interface SQLQueryEditorProps {
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  onQueryRun?: (query: string) => Promise<QueryResult>;
  readOnly?: boolean;
  height?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// =============================================================================
// Sample Data and Queries
// =============================================================================

const sampleQueries = [
  {
    name: 'Basic Select',
    query: `SELECT * FROM clinical_stage LIMIT 100;`
  },
  {
    name: 'Aggregate by Stage',
    query: `SELECT 
  clinical_stage,
  COUNT(*) as count
FROM clinical_stage
GROUP BY clinical_stage
ORDER BY count DESC;`
  },
  {
    name: 'Time Series',
    query: `SELECT 
  DATE(created_at) as date,
  COUNT(*) as daily_count
FROM clinical_stage
WHERE created_at >= '2024-01-01'
GROUP BY DATE(created_at)
ORDER BY date;`
  }
];

const mockColumns = [
  { name: 'clinical_stage', type: 'string', description: 'Clinical trial stage' },
  { name: 'stage_of_development', type: 'string', description: 'Development stage' },
  { name: 'count', type: 'number', description: 'Count of records' },
  { name: 'created_at', type: 'timestamp', description: 'Record creation time' }
];

const mockQueryResult: QueryResult = {
  columns: ['clinical_stage', 'count'],
  rows: [
    ['0, Pre-clinical', 45],
    ['1, Phase I', 32],
    ['2, Phase II or Combined I/II', 28],
    ['3, Phase III', 15],
    ['4, Authorized', 8]
  ],
  rowCount: 5,
  executionTime: 234,
  success: true
};

// =============================================================================
// Helper Components
// =============================================================================

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ height: '100%' }}>
    {value === index && children}
  </div>
);

// =============================================================================
// Main Component
// =============================================================================

const SQLQueryEditor: React.FC<SQLQueryEditorProps> = ({
  initialQuery = '',
  onQueryChange,
  onQueryRun,
  readOnly = false,
  height = 400
}) => {
  const [query, setQuery] = useState(initialQuery || `WHEN stage_of_development = 'Pre-clinical'
  THEN '0, Pre-clinical'
WHEN stage_of_development = 'Phase I'  
  THEN '1, Phase I'
WHEN stage_of_development = 'Phase I/II'
  OR stage_of_development = 'Phase II'
  THEN '2, Phase II or Combined I/II'
WHEN stage_of_development = 'Phase III'
  THEN '3, Phase III'
WHEN stage_of_development = 'Authorized'
  THEN '4, Authorized'
END`);
  
  const [activeTab, setActiveTab] = useState(0);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [samplesMenuAnchor, setSamplesMenuAnchor] = useState<null | HTMLElement>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (onQueryChange) {
      onQueryChange(query);
    }
  }, [query, onQueryChange]);

  const handleQueryRun = async () => {
    if (!query.trim() || isRunning) return;
    
    setIsRunning(true);
    try {
      let result: QueryResult;
      if (onQueryRun) {
        result = await onQueryRun(query);
      } else {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = mockQueryResult;
      }
      setQueryResult(result);
      setActiveTab(0); // Switch to Results tab
    } catch (error) {
      setQueryResult({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSampleQuery = (sampleQuery: string) => {
    setQuery(sampleQuery);
    setSamplesMenuAnchor(null);
  };

  const filteredColumns = mockColumns.filter(col =>
    col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getResultIcon = () => {
    if (!queryResult) return null;
    if (queryResult.success) return <SuccessIcon color="success" fontSize="small" />;
    return <ErrorIcon color="error" fontSize="small" />;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'grey.50'
      }}>
        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CodeIcon />
          Custom SQL
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setSamplesMenuAnchor(e.currentTarget)}
          >
            Samples
          </Button>
          
          <ButtonGroup size="small">
            <Button
              variant="contained"
              startIcon={isRunning ? <CircularProgress size={16} /> : <RunIcon />}
              onClick={handleQueryRun}
              disabled={isRunning || !query.trim()}
            >
              {isRunning ? 'Running...' : 'Run'}
            </Button>
            {isRunning && (
              <Button
                variant="outlined"
                startIcon={<StopIcon />}
                onClick={() => setIsRunning(false)}
              >
                Stop
              </Button>
            )}
          </ButtonGroup>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Main Query Area */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Query Editor */}
          <Box sx={{ flexGrow: 1, p: 2 }}>
            <TextField
              multiline
              fullWidth
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              disabled={readOnly || isRunning}
              inputRef={textareaRef}
              sx={{
                '& .MuiInputBase-root': {
                  height: '100%',
                  alignItems: 'flex-start'
                },
                '& .MuiInputBase-input': {
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                  fontSize: '13px',
                  lineHeight: 1.4,
                  height: '100% !important',
                  overflow: 'auto !important'
                }
              }}
            />
          </Box>

          {/* Results Area */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', height: '40%', minHeight: 200 }}>
            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    Results
                    {getResultIcon()}
                    {queryResult && (
                      <Chip 
                        label={queryResult.rowCount} 
                        size="small" 
                        variant="outlined"
                        sx={{ height: 20 }}
                      />
                    )}
                  </Box>
                } 
              />
              <Tab label="Samples" />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              <Box sx={{ height: '100%', p: 2 }}>
                {queryResult ? (
                  queryResult.success ? (
                    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {queryResult.rowCount} rows • {queryResult.executionTime}ms
                        </Typography>
                      </Box>
                      
                      <TableContainer sx={{ flexGrow: 1 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              {queryResult.columns.map((column, index) => (
                                <TableCell key={index} sx={{ fontWeight: 600 }}>
                                  {column}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {queryResult.rows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
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
                    </Box>
                  ) : (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Query Error:</strong> {queryResult.error}
                      </Typography>
                    </Alert>
                  )
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary'
                  }}>
                    <TableIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body2">
                      Run a query to see results
                    </Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Box sx={{ height: '100%', p: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Search columns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  clinical_stage
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  0, Pre-clinical
                </Typography>

                <TableContainer sx={{ height: 'calc(100% - 100px)' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Column</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredColumns.map((column, index) => (
                        <TableRow key={index} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>
                            {column.name}
                          </TableCell>
                          <TableCell>
                            <Chip label={column.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{column.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </Box>

      {/* Sample Queries Menu */}
      <Menu
        anchorEl={samplesMenuAnchor}
        open={Boolean(samplesMenuAnchor)}
        onClose={() => setSamplesMenuAnchor(null)}
      >
        {sampleQueries.map((sample, index) => (
          <MenuItem
            key={index}
            onClick={() => handleSampleQuery(sample.query)}
            sx={{ 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              minWidth: 250,
              whiteSpace: 'normal'
            }}
          >
            <Typography variant="subtitle2">{sample.name}</Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontFamily: 'monospace',
                mt: 0.5,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {sample.query.split('\n')[0]}...
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default SQLQueryEditor;