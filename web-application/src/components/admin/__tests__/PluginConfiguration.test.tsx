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

// Mock the hooks
jest.mock('../../../hooks/usePluginConfiguration', () => ({
  usePluginConfiguration: () => ({
    availablePlugins: [
      {
        name: 'postgresql',
        displayName: 'PostgreSQL',
        category: 'relational',
        version: '1.0.0',
        plugin_type: 'datasource',
        configSchema: {
          type: 'object',
          properties: {
            host: { type: 'string', required: true, title: 'Host' },
            port: { type: 'number', title: 'Port', default: 5432 }
          }
        }
      }
    ],
    workspaceConfigs: [
      {
        plugin_name: 'postgresql',
        plugin_type: 'datasource',
        configuration: { host: 'localhost', port: 5432 },
        is_enabled: true,
        usage_count: 10,
        created_at: new Date(),
        updated_at: new Date()
      }
    ],
    loading: false,
    error: null,
    loadConfigurations: jest.fn(),
    updatePluginConfig: jest.fn(),
    testConnection: jest.fn()
  })
}));

const mockStore = configureStore({
  reducer: {
    // Add your reducers here
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
    expect(screen.getByText('relational')).toBeInTheDocument();
  });

  it('displays plugin cards with correct information', () => {
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const pluginCard = screen.getByText('PostgreSQL').closest('.MuiCard-root');
    expect(pluginCard).toBeInTheDocument();
    
    // Check for enable/disable toggle
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeChecked();
    
    // Check for configure button
    expect(screen.getByText('Configure')).toBeInTheDocument();
    
    // Check for test button (datasource only)
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('opens configuration dialog when configure button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const configureButton = screen.getByText('Configure');
    await user.click(configureButton);
    
    await waitFor(() => {
      expect(screen.getByText('Configure PostgreSQL')).toBeInTheDocument();
    });
  });

  it('handles plugin toggle correctly', async () => {
    const user = userEvent.setup();
    const mockUpdatePluginConfig = jest.fn();
    
    // Mock the hook to return our mock function
    jest.doMock('../../../hooks/usePluginConfiguration', () => ({
      usePluginConfiguration: () => ({
        availablePlugins: [],
        workspaceConfigs: [],
        loading: false,
        error: null,
        loadConfigurations: jest.fn(),
        updatePluginConfig: mockUpdatePluginConfig,
        testConnection: jest.fn()
      })
    }));
    
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    const toggle = screen.getByRole('checkbox');
    await user.click(toggle);
    
    expect(mockUpdatePluginConfig).toHaveBeenCalledWith(
      'datasource',
      'postgresql',
      {},
      false
    );
  });

  it('displays loading state correctly', () => {
    // Mock loading state
    jest.doMock('../../../hooks/usePluginConfiguration', () => ({
      usePluginConfiguration: () => ({
        availablePlugins: [],
        workspaceConfigs: [],
        loading: true,
        error: null,
        loadConfigurations: jest.fn(),
        updatePluginConfig: jest.fn(),
        testConnection: jest.fn()
      })
    }));
    
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    // Mock error state
    jest.doMock('../../../hooks/usePluginConfiguration', () => ({
      usePluginConfiguration: () => ({
        availablePlugins: [],
        workspaceConfigs: [],
        loading: false,
        error: 'Failed to load plugins',
        loadConfigurations: jest.fn(),
        updatePluginConfig: jest.fn(),
        testConnection: jest.fn()
      })
    }));
    
    renderWithProviders(<PluginConfiguration workspaceId="test-workspace" />);
    
    expect(screen.getByText('Failed to load plugins')).toBeInTheDocument();
  });
});
