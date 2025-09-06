// File: api-services/src/__tests__/webview.test.ts
import request from 'supertest';
import { Pool } from 'pg';
import app from '../app';
import { createTestDatabase, clearTestDatabase } from './helpers/database';

describe('Webview API', () => {
  let db: Pool;
  let auth_token: string;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await clearTestDatabase(db);
    await db.end();
  });

  beforeEach(async () => {
    await clearTestDatabase(db);
    await seedWebviewTestData(db);
    
    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword',
        workspaceSlug: 'test-workspace'
      });

    auth_token = loginResponse.body.data.token;
  });

  describe('GET /api/webview/:webviewName', () => {
    it('should get webview configuration', async () => {
      const response = await request(app)
        .get('/api/webview/test-webview')
        .set('Authorization', `Bearer ${auth_token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.webview_config).toBeDefined();
      expect(response.body.data.categories).toBeDefined();
    });

    it('should reject non-existent webview', async () => {
      const response = await request(app)
        .get('/api/webview/nonexistent')
        .set('Authorization', `Bearer ${auth_token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get('/api/webview/test-webview');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/webview/:webviewName/categories', () => {
    it('should get webview categories', async () => {
      const response = await request(app)
        .get('/api/webview/test-webview/categories')
        .set('Authorization', `Bearer ${auth_token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/webview/:webviewName/analytics', () => {
    it('should track analytics event', async () => {
      const response = await request(app)
        .post('/api/webview/test-webview/analytics')
        .set('Authorization', `Bearer ${auth_token}`)
        .send({
          event_type: 'category_expand',
          category_id: 'test-category-id',
          session_id: 'test-session',
          navigation_path: ['home', 'category1'],
          device_info: {
            type: 'desktop',
            screen_resolution: '1920x1080',
            browser: 'Chrome'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

async function seedWebviewTestData(db: Pool) {
  // Create test workspace
  await db.query(`
    INSERT INTO workspaces (id, name, slug, is_active)
    VALUES ('test-workspace-id', 'Test Workspace', 'test-workspace', true)
  `);

  // Create test user with password hash for 'testpassword'
  await db.query(`
    INSERT INTO users (id, email, password_hash, is_active)
    VALUES ('test-user-id','test@example.com', 
            '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', true)
  `);

  // Create test role with webview permissions
  await db.query(`
    INSERT INTO roles (id, workspace_id, name, permissions, is_system)
    VALUES ('test-role-id', 'test-workspace-id', 'Test Role', 
            '["workspace.read", "webview.read", "dashboard.read", "dataset.read"]', true)
  `);

  // Assign role to user
  await db.query(`
    INSERT INTO user_role_assignments  (user_id, workspace_id, role_id, assigned_by)
    VALUES ('test-user-id', 'test-workspace-id', 'test-role-id', 'test-user-id')
  `);

  // Create test webview
  await db.query(`
    INSERT INTO webviews (id, workspace_id, webview_name, display_name, is_active, created_by)
    VALUES ('test-webview-id', 'test-workspace-id', 'test-webview', 'Test Webview', true, 'test-user-id')
  `);

  // Create webview access
  await db.query(`
    INSERT INTO webview_access (webview_id, role_id, permissions, granted_by)
    VALUES ('test-webview-id', 'test-role-id', '["can_read"]', 'test-user-id')
  `);

  // Create test category
  await db.query(`
    INSERT INTO dashboard_categories (id, workspace_id, name, display_name, is_active, created_by)
    VALUES ('test-category-id', 'test-workspace-id', 'test-category', 'Test Category', true, 'test-user-id')
  `);
}
