/ File: api-services/src/controllers/__tests__/PluginController.test.ts
import request from 'supertest';
import { app } from '../../app';
import { PluginService } from '../../services/PluginService';
import { PermissionService } from '../../services/PermissionService';

// Mock services
jest.mock('../../services/PluginService');
jest.mock('../../services/PermissionService');

const mockPluginService = PluginService as jest.MockedClass<typeof PluginService>;
const mockPermissionService = PermissionService as jest.MockedClass<typeof PermissionService>;

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      workspace_id: 'test-workspace-id'
    };
    next();
  }
}));

describe('PluginController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/plugins/available', () => {
    it('should return available plugins', async () => {
      const mockPlugins = [
        {
          name: 'postgresql',
          displayName: 'PostgreSQL',
          category: 'relational',
          version: '1.0.0',
          plugin_type: 'datasource',
          configSchema: {}
        }
      ];

      mockPluginService.prototype.getAvailablePlugins.mockResolvedValue(mockPlugins);

      const response = await request(app)
        .get('/api/plugins/available')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plugins).toEqual(mockPlugins);
    });

    it('should handle errors gracefully', async () => {
      mockPluginService.prototype.getAvailablePlugins.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/plugins/available')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/plugins/configurations', () => {
    it('should return workspace configurations when user has permission', async () => {
      const mockConfigurations = [
        {
          plugin_name: 'postgresql',
          plugin_type: 'datasource',
          configuration: { host: 'localhost' },
          is_enabled: true
        }
      ];

      mockPermissionService.prototype.hasPermission.mockResolvedValue(true);
      mockPluginService.prototype.getWorkspaceConfigurations.mockResolvedValue(
        mockConfigurations
      );

      const response = await request(app)
        .get('/api/plugins/configurations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.configurations).toEqual(mockConfigurations);
    });

    it('should return 403 when user lacks permission', async () => {
      mockPermissionService.prototype.hasPermission.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/plugins/configurations')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PUT /api/plugins/configurations', () => {
    it('should update plugin configuration successfully', async () => {
      const updateData = {
        plugin_type: 'datasource',
        plugin_name: 'postgresql',
        configuration: { host: 'localhost', port: 5432 },
        is_enabled: true
      };

      const mockUpdatedConfig = {
        ...updateData,
        id: 'config-id',
        workspace_id: 'test-workspace-id',
        created_at: new Date(),
        updated_at: Date.now()
      };

      mockPermissionService.prototype.hasPermission.mockResolvedValue(true);
      mockPluginService.prototype.updatePluginConfiguration.mockResolvedValue(
        mockUpdatedConfig
      );

      const response = await request(app)
        .put('/api/plugins/configurations')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.configuration).toEqual(mockUpdatedConfig);
    });

    it('should validate request body', async () => {
      const invalidData = {
        plugin_type: 'invalid-type',
        plugin_name: '',
        configuration: {},
        is_enabled: 'not-boolean'
      };

      const response = await request(app)
        .put('/api/plugins/configurations')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/plugins/test-connection', () => {
    it('should test plugin connection successfully', async () => {
      const testData = {
        plugin_name: 'postgresql',
        configuration: { host: 'localhost', port: 5432 }
      };

      mockPermissionService.prototype.hasPermission.mockResolvedValue(true);
      mockPluginService.prototype.testPluginConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful'
      });

      const response = await request(app)
        .post('/api/plugins/test-connection')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connection_valid).toBe(true);
      expect(response.body.data.message).toBe('Connection successful');
      expect(response.body.data.response_time).toBeGreaterThan(0);
    });

    it('should handle connection test failure', async () => {
      const testData = {
        plugin_name: 'postgresql',
        configuration: { host: 'invalid-host' }
      };

      mockPermissionService.prototype.hasPermission.mockResolvedValue(true);
      mockPluginService.prototype.testPluginConnection.mockResolvedValue({
        success: false,
        message: 'Connection failed',
        error_code: 'CONNECTION_FAILED'
      });

      const response = await request(app)
        .post('/api/plugins/test-connection')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connection_valid).toBe(false);
      expect(response.body.data.message).toBe('Connection failed');
    });
  });
});
