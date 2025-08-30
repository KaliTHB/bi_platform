// File: api-services/src/__tests__/helpers/database.ts
import { Pool } from 'pg';

export async function createTestDatabase(): Promise<Pool> {
  const pool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'bi_platform_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Create tables if they don't exist
  await createTestTables(pool);

  return pool;
}

export async function clearTestDatabase(db: Pool): Promise<void> {
  const tables = [
    'webview_analytics',
    'webview_access',
    'webview_configs',
    'dashboard_categories',
    'user_role_assignments',
    'custom_roles',
    'users',
    'workspaces'
  ];

  for (const table of tables) {
    await db.query(`DELETE FROM ${table}`);
  }
}

async function createTestTables(db: Pool): Promise<void> {
  // This would contain the same schema as in the main migration
  // For brevity, I'll include just the essential tables for testing

  await db.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL UNIQUE,
      slug VARCHAR(100) UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(150) NOT NULL UNIQUE,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS custom_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]',
      is_system_role BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_role_per_workspace UNIQUE(workspace_id, name)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_role_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
      assigned_by UUID NOT NULL REFERENCES users(id),
      assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS webview_configs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      webview_name VARCHAR(100) NOT NULL,
      display_name VARCHAR(200),
      theme_config JSONB DEFAULT '{}',
      navigation_config JSONB DEFAULT '{}',
      branding_config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_webview_per_workspace UNIQUE(workspace_id, webview_name)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS webview_access (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      webview_id UUID NOT NULL REFERENCES webview_configs(id) ON DELETE CASCADE,
      role_id UUID REFERENCES custom_roles(id),
      permissions JSONB NOT NULL DEFAULT '["can_read"]',
      granted_by UUID NOT NULL REFERENCES users(id),
      granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS dashboard_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      display_name VARCHAR(250),
      is_active BOOLEAN DEFAULT TRUE,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_category_per_workspace UNIQUE(workspace_id, name)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS webview_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      webview_id UUID NOT NULL REFERENCES webview_configs(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      category_id UUID REFERENCES dashboard_categories(id),
      action_type VARCHAR(50) NOT NULL,
      session_id VARCHAR(255),
      action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB DEFAULT '{}'
    );
  `);
}