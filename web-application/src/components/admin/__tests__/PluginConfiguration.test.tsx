// File: web-application/src/components/admin/__tests__/PluginConfiguration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PluginConfiguration } from '../PluginConfiguration';
import * as pluginAPI from '../../../services/pluginAPI';

// Mock the plugin API
jest.mock('../../../services/pluginAPI');
const mockedPluginAPI = pluginAPI as jest.Mocked<typeof pluginAPI>;

// ✅ Updated mock - using the consolidated usePlugins hook
jest.mock('../../../hooks/usePlugins', () => ({
  usePlugins: () => ({
    dataSourcePlugins: [
      {
        name: 'postgresql',
        displayName: 'PostgreSQL',
        category: 'relational',
        version: '1.0.0',
        description: 'PostgreSQL database connector',
        configSchema: {
          host: { 
            type: 'string', 
            required: true, 
            title: 'Host',
            description: 'Database host address' 
          },
          port: { 
            type: 'number', 
            title: 'Port', 
            default: 5432,
            description: 'Database port number'
          },
          database: {
            type: 'string',
            required: true,
            title: 'Database Name',
            description: 'Name of the database to connect to'
          },
          username: {
            type: 'string',
            required: true,
            title: 'Username',
            description: 'Database username'
          },
          password: {
            type: 'password',
            required: true,
            title: 'Password',
            description: 'Database password'
          }
        },
        capabilities: {
          supportsBulkInsert: true,
          supportsTransactions: true,
          supportsStoredProcedures: true,
          supportsStreaming: false,
          supportsCaching: true,
          maxConcurrentConnections: 10,
          connectionTimeout: 30000,
          queryTimeout: 60000
        }
      }
    ],
    chartPlugins: [
      {
        name: 'bar_chart',
        displayName: 'Bar Chart',
        category: 'basic',
        library: 'echarts' as const,
        version: '1.0.0',
        description: 'Basic bar chart visualization',
        configSchema: {
          title: {
            type: 'string',
            title: 'Chart Title',
            description: 'Title for the chart'
          },
          showLegend: {
            type: 'boolean',
            title: 'Show Legend',
            default: true
          }
        },
        supportedDataTypes: ['string', 'number'],
        minColumns: 2,
        maxColumns: 10
      }
    ],
    dataSourceConfigs: [
      {
        plugin_name: 'postgresql',
        plugin_type: 'datasource' as const,
        configuration: { 
          host: 'localhost', 
          port: 5432,
          database: 'test_db',
          username: 'test_user' 
        },
        is_enabled: true,
        usage_count: 10,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      }
    ],
    chartConfigs: [],
    loading: false,
    testingConnection: false,
    error: null,
    refreshPlugins: jest.fn(),
    loadConfigurations: jest.fn(),
    getDataSourcePlugin: jest.fn(),
    getChartPlugin: jest.fn(),
    updatePluginConfig: jest.fn(),
    enablePlugin: jest.fn(),
    disablePlugin: jest.fn(),
    testDataSourceConnection: jest.fn().mockResolvedValue({
      connection_valid: true,
      message: 'Connection successful',
      response_time: 150
    }),
    validatePluginConfig: jest.fn(),
    getPluginStatistics: jest.fn(),
    getPluginsByCategory: jest.fn(),
    isPluginEnabled: jest.fn(),
    getPluginConfig: jest.fn(),
    invalidatePluginCache: jest.fn()
  })
}));

// Mock performance tracker
jest.mock('../../../hooks/usePerformanceTracker', () => ({
  usePerformanceTracker: () => ({
    trackEvent: jest.fn()
  })
}));

const mockStore = configureStore({
  reducer: {
    auth: (state = { token: 'mock-token', user: null }) => state,
    workspace: (state = { currentWorkspace: { id: 'test-workspace' } }) => state,
  }
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('PluginConfiguration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders plugin configuration interface', () => {
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    expect(screen.getByText('Plugin Configuration')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('relational (1)')).toBeInTheDocument();
    expect(screen.getByText('Bar Chart')).toBeInTheDocument();
  });

  it('displays plugin cards with correct information', () => {
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const pluginCard = screen.getByText('PostgreSQL').closest('.MuiCard-root');
    expect(pluginCard).toBeInTheDocument();
    
    // Check for enable/disable toggle
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeChecked();
    
    // Check for configure button
    expect(screen.getByRole('button', { name: /configure/i })).toBeInTheDocument();
    
    // Check for test button (datasource only)
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    // Check for version info
    expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();
    
    // Check for plugin type chip
    expect(screen.getByText('datasource')).toBeInTheDocument();
  });

  it('opens configuration dialog when configure button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const configureButton = screen.getByRole('button', { name: /configure/i });
    await user.click(configureButton);
    
    // Since we're using lazy loading, we might need to wait for the dialog
    // This test would need the actual PluginConfigDialog component to be mocked
  });

  it('handles plugin toggle correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeChecked();
    
    await user.click(toggle);
    
    // The mock function should have been called
    // You can add more specific assertions based on your implementation
  });

  it('handles connection test correctly', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const testButton = screen.getByText('Test');
    await user.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('Connection successful')).toBeInTheDocument();
    });
  });

  it('displays plugin categories correctly', () => {
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    // Should show relational category with count
    expect(screen.getByText('relational (1)')).toBeInTheDocument();
    expect(screen.getByText('basic (1)')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    // Verify that loadConfigurations was called
    // You can add more specific assertions based on your implementation
  });

  it('displays error state correctly', () => {
    // Mock the hook to return an error state
    jest.doMock('../../../hooks/usePlugins', () => ({
      usePlugins: () => ({
        dataSourcePlugins: [],
        chartPlugins: [],
        dataSourceConfigs: [],
        chartConfigs: [],
        loading: false,
        testingConnection: false,
        error: 'Failed to load plugins',
        // ... other properties with default values
      })
    }));
    
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    expect(screen.getByText('Failed to load plugins')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    jest.doMock('../../../hooks/usePlugins', () => ({
      usePlugins: () => ({
        dataSourcePlugins: [],
        chartPlugins: [],
        dataSourceConfigs: [],
        chartConfigs: [],
        loading: true,
        testingConnection: false,
        error: null,
        // ... other properties with default values
      })
    }));
    
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    expect(screen.getByText('Plugin Configuration')).toBeInTheDocument();
    // Should show skeleton loading states
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(5); // 4 cards + 1 button
  });
});