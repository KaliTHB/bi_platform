// web-application/src/components/debug/DebugPanel.tsx (Development Only)
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import {
  ExpandMore,
  BugReport,
  Close,
  Refresh,
  ContentCopy,
} from '@mui/icons-material';
import { workspaceService } from '@/api/workspaceAPI';

interface DebugPanelProps {
  onClose?: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ onClose }) => {
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const runDiagnostics = async () => {
    setTesting(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      localStorage: {},
      apiTests: {},
    };

    // Check localStorage
    try {
      results.localStorage = {
        auth_token: localStorage.getItem('auth_token') ? 'Present' : 'Missing',
        token_length: localStorage.getItem('auth_token')?.length || 0,
        workspace_id: localStorage.getItem('selected_workspace_id') || 'None',
        workspace_data: localStorage.getItem('selected_workspace') || 'None',
      };
    } catch (error) {
      results.localStorage = { error: 'Cannot access localStorage' };
    }

    // Test API connectivity
    try {
      const healthCheck = await fetch(`${results.apiUrl}/health`);
      results.apiTests.healthCheck = {
        status: healthCheck.status,
        ok: healthCheck.ok,
        statusText: healthCheck.statusText,
      };
    } catch (error: any) {
      results.apiTests.healthCheck = {
        error: error.message,
        type: 'Network Error',
      };
    }

    // Test workspace API
    try {
      const workspaces = await workspaceService.getUserWorkspaces();
      results.apiTests.workspaceService = {
        success: true,
        workspaceCount: workspaces.length,
        workspaces: workspaces.map(w => ({ id: w.id, name: w.name, role: w.role })),
      };
    } catch (error: any) {
      results.apiTests.workspaceService = {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }

    // Test direct API call
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${results.apiUrl}/api/workspaces`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      results.apiTests.directAPI = {
        status: response.status,
        ok: response.ok,
        data: data,
      };
    } catch (error: any) {
      results.apiTests.directAPI = {
        error: error.message,
      };
    }

    setTestResults(results);
    setTesting(false);
  };

  const copyToClipboard = () => {
    if (testResults) {
      navigator.clipboard.writeText(JSON.stringify(testResults, null, 2));
    }
  };

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 16, 
      right: 16, 
      width: 400, 
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 9999 
    }}>
      <Paper elevation={8} sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BugReport sx={{ mr: 1 }} />
            <Typography variant="h6">Debug Panel</Typography>
            <Chip label="DEV" size="small" sx={{ ml: 1 }} />
          </Box>
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <Close />
            </IconButton>
          )}
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          This panel helps diagnose workspace loading issues in development.
        </Alert>

        <Button
          variant="contained"
          color="primary"
          onClick={runDiagnostics}
          disabled={testing}
          startIcon={testing ? <Refresh className="spin" /> : <BugReport />}
          fullWidth
          sx={{ mb: 2 }}
        >
          {testing ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        {testResults && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={copyToClipboard}
                startIcon={<ContentCopy />}
              >
                Copy Results
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setTestResults(null)}
              >
                Clear
              </Button>
            </Box>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2">Environment Info</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                  {JSON.stringify({
                    environment: testResults.environment,
                    apiUrl: testResults.apiUrl,
                    timestamp: testResults.timestamp,
                  }, null, 2)}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2">
                  LocalStorage
                  <Chip 
                    label={testResults.localStorage.auth_token === 'Present' ? 'OK' : 'ISSUE'} 
                    size="small" 
                    color={testResults.localStorage.auth_token === 'Present' ? 'success' : 'error'} 
                    sx={{ ml: 1 }} 
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                  {JSON.stringify(testResults.localStorage, null, 2)}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2">
                  API Tests
                  <Chip 
                    label={testResults.apiTests.workspaceService?.success ? 'OK' : 'FAILED'} 
                    size="small" 
                    color={testResults.apiTests.workspaceService?.success ? 'success' : 'error'} 
                    sx={{ ml: 1 }} 
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', maxHeight: 300, overflow: 'auto' }}>
                  {JSON.stringify(testResults.apiTests, null, 2)}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Paper>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default DebugPanel;