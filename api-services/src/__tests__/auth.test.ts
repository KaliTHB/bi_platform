// File: api-services/src/__tests__/auth.test.ts
import request from 'supertest';
import { Pool } from 'pg';
import app from '../app';
import { createTestDatabase, clearTestDatabase } from './helpers/database';

describe('Authentication API', () => {
  let db: Pool;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await clearTestDatabase(db);
    await db.end();
  });

  beforeEach(async () => {
    // Clear and seed test data
    await clearTestDatabase(db);
    await seedTestData(db);
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword',
          workspaceSlug: 'test-workspace'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.workspace).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
          workspaceSlug: 'test-workspace'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.errors[0].code).toBe('AUTHENTICATION_FAILED');
    });

    it('should reject invalid workspace', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword',
          workspaceSlug: 'nonexistent-workspace'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let auth_token: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword',
          workspaceSlug: 'test-workspace'
        });

      auth_token = loginResponse.body.data.token;
    });

    it('should refresh token with valid auth', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${auth_token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(auth_token);
    });

    it('should reject refresh without auth', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

async function seedTestData(db: Pool) {
  // Create test workspace
  await db.query(`
    INSERT INTO workspaces (id, name, slug, is_active)
    VALUES ('test-workspace-id', 'Test Workspace', 'test-workspace', true)
  `);

  // Create test user
  await db.query(`
    INSERT INTO users (id, email, password_hash, is_active)
    VALUES ('test-user-id', 'test@example.com', '$2a$10$hash', true)
  `);

  // Create test role
  await db.query(`
    INSERT INTO roles (id, workspace_id, name, permissions, is_system_role)
    VALUES ('test-role-id', 'test-workspace-id', 'Test Role', '["workspace.read"]', true)
  `);

  // Assign role to user
  await db.query(`
    INSERT INTO user_role_assignments (user_id, workspace_id, role_id, assigned_by)
    VALUES ('test-user-id', 'test-workspace-id', 'test-role-id', 'test-user-id')
  `);
}
