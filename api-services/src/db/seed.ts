// File: api-services/src/db/seed.ts
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface SeedData {
  users: Array<{
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  }>;
  workspaces: Array<{
    name: string;
    display_name: string;
    slug: string;
    owner_username: string;
  }>;
  permissions: Array<{
    name: string;
    resource: string;
    action: string;
    description: string;
  }>;
  roles: Array<{
    name: string;
    display_name: string;
    description: string;
    permissions: string[];
    is_system_role: boolean;
  }>;
}

const seedData: SeedData = {
  users: [
    {
      username: 'admin',
      email: 'admin@localhost',
      password: 'password',
      first_name: 'System',
      last_name: 'Administrator',
      is_active: true
    },
    {
      username: 'demo_user',
      email: 'demo@localhost',
      password: 'demo123',
      first_name: 'Demo',
      last_name: 'User',
      is_active: true
    }
  ],
  workspaces: [
    {
      name: 'Default Workspace',
      display_name: 'Default Workspace',
      slug: 'default',
      owner_username: 'admin'
    },
    {
      name: 'Demo Workspace',
      display_name: 'Demo Analytics Workspace',
      slug: 'demo',
      owner_username: 'demo_user'
    }
  ],
  permissions: [
    // Workspace permissions
    { name: 'workspace.read', resource: 'workspace', action: 'read', description: 'View workspace information' },
    { name: 'workspace.create', resource: 'workspace', action: 'create', description: 'Create new workspaces' },
    { name: 'workspace.update', resource: 'workspace', action: 'update', description: 'Update workspace settings' },
    { name: 'workspace.delete', resource: 'workspace', action: 'delete', description: 'Delete workspaces' },
    { name: 'workspace.admin', resource: 'workspace', action: 'admin', description: 'Full workspace administration' },

    // User management permissions
    { name: 'user_mgmt.read', resource: 'user_mgmt', action: 'read', description: 'View users' },
    { name: 'user_mgmt.create', resource: 'user_mgmt', action: 'create', description: 'Create users' },
    { name: 'user_mgmt.update', resource: 'user_mgmt', action: 'update', description: 'Update users' },
    { name: 'user_mgmt.delete', resource: 'user_mgmt', action: 'delete', description: 'Delete users' },

    // Plugin permissions
    { name: 'plugin.config.read', resource: 'plugin.config', action: 'read', description: 'View plugin configurations' },
    { name: 'plugin.config.update', resource: 'plugin.config', action: 'update', description: 'Update plugin configurations' },
    { name: 'plugin.config.test', resource: 'plugin.config', action: 'test', description: 'Test plugin connections' },

    // Dashboard permissions
    { name: 'dashboard.read', resource: 'dashboard', action: 'read', description: 'View dashboards' },
    { name: 'dashboard.create', resource: 'dashboard', action: 'create', description: 'Create dashboards' },
    { name: 'dashboard.update', resource: 'dashboard', action: 'update', description: 'Update dashboards' },
    { name: 'dashboard.delete', resource: 'dashboard', action: 'delete', description: 'Delete dashboards' },

    // Dataset permissions
    { name: 'dataset.read', resource: 'dataset', action: 'read', description: 'View datasets' },
    { name: 'dataset.create', resource: 'dataset', action: 'create', description: 'Create datasets' },
    { name: 'dataset.update', resource: 'dataset', action: 'update', description: 'Update datasets' },
    { name: 'dataset.delete', resource: 'dataset', action: 'delete', description: 'Delete datasets' },

    // Export permissions
    { name: 'export.dashboard', resource: 'export', action: 'dashboard', description: 'Export dashboards' },
    { name: 'export.data', resource: 'export', action: 'data', description: 'Export data' }
  ],
  roles: [
    {
      name: 'super_admin',
      display_name: 'Super Administrator',
      description: 'Full system access',
      permissions: ['*'], // All permissions
      is_system_role: true
    },
    {
      name: 'workspace_admin',
      display_name: 'Workspace Administrator',
      description: 'Full workspace management',
      permissions: [
        'workspace.read', 'workspace.update', 'workspace.admin',
        'user_mgmt.read', 'user_mgmt.create', 'user_mgmt.update',
        'plugin.config.read', 'plugin.config.update', 'plugin.config.test',
        'dashboard.read', 'dashboard.create', 'dashboard.update', 'dashboard.delete',
        'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete',
        'export.dashboard', 'export.data'
      ],
      is_system_role: true
    },
    {
      name: 'analyst',
      display_name: 'Data Analyst',
      description: 'Create and manage dashboards and datasets',
      permissions: [
        'workspace.read',
        'dashboard.read', 'dashboard.create', 'dashboard.update',
        'dataset.read', 'dataset.create', 'dataset.update',
        'export.dashboard', 'export.data'
      ],
      is_system_role: true
    },
    {
      name: 'viewer',
      display_name: 'Dashboard Viewer',
      description: 'View-only access to dashboards',
      permissions: [
        'workspace.read',
        'dashboard.read',
        'dataset.read',
        'export.dashboard'
      ],
      is_system_role: true
    }
  ]
};

class DatabaseSeeder {
  private db: Pool;

  constructor() {
    this.db = db;
  }

  async seed() {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      logger.info('Starting database seeding...');

      // Seed permissions
      await this.seedPermissions(client);
      logger.info('✓ Permissions seeded');

      // Seed users
      await this.seedUsers(client);
      logger.info('✓ Users seeded');

      // Seed workspaces
      await this.seedWorkspaces(client);
      logger.info('✓ Workspaces seeded');

      // Seed roles
      await this.seedRoles(client);
      logger.info('✓ Roles seeded');

      // Assign roles to users
      await this.assignRoles(client);
      logger.info('✓ User roles assigned');

      // Seed sample plugin configurations
      await this.seedPluginConfigurations(client);
      logger.info('✓ Plugin configurations seeded');

      await client.query('COMMIT');
      logger.info('Database seeding completed successfully!');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database seeding failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async seedPermissions(client: any) {
    for (const permission of seedData.permissions) {
      await client.query(
        `INSERT INTO permissions (name, resource, action, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET
         description = $4`,
        [permission.name, permission.resource, permission.action, permission.description]
      );
    }
  }

  private async seedUsers(client: any) {
    for (const user of seedData.users) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      await client.query(
        `INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE SET
         email = $2, first_name = $4, last_name = $5, is_active = $6`,
        [user.username, user.email, hashedPassword, user.first_name, user.last_name, user.is_active]
      );
    }
  }

  private async seedWorkspaces(client: any) {
    for (const workspace of seedData.workspaces) {
      // Get owner user ID
      const ownerResult = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [workspace.owner_username]
      );

      if (ownerResult.rows.length === 0) {
        logger.warn(`Owner user ${workspace.owner_username} not found for workspace ${workspace.name}`);
        continue;
      }

      const ownerId = ownerResult.rows[0].id;

      await client.query(
        `INSERT INTO workspaces (name, display_name, slug, owner_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET
         name = $1, display_name = $2, owner_id = $4`,
        [workspace.name, workspace.display_name, workspace.slug, ownerId]
      );
    }
  }

  private async seedRoles(client: any) {
    for (const role of seedData.roles) {
      // Insert role
      await client.query(
        `INSERT INTO custom_roles (name, display_name, description, is_system_role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET
         display_name = $2, description = $3`,
        [role.name, role.display_name, role.description, role.is_system_role]
      );

      // Get role ID
      const roleResult = await client.query(
        'SELECT id FROM custom_roles WHERE name = $1',
        [role.name]
      );

      const roleId = roleResult.rows[0].id;

      // Clear existing role permissions
      await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [roleId]
      );

      // Assign permissions to role
      if (role.permissions.includes('*')) {
        // Assign all permissions
        const allPermissions = await client.query('SELECT id FROM permissions');
        for (const permission of allPermissions.rows) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [roleId, permission.id]
          );
        }
      } else {
        // Assign specific permissions
        for (const permissionName of role.permissions) {
          const permissionResult = await client.query(
            'SELECT id FROM permissions WHERE name = $1',
            [permissionName]
          );

          if (permissionResult.rows.length > 0) {
            await client.query(
              'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
              [roleId, permissionResult.rows[0].id]
            );
          }
        }
      }
    }
  }

  private async assignRoles(client: any) {
    // Assign super_admin role to admin user
    const adminResult = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    const superAdminResult = await client.query('SELECT id FROM custom_roles WHERE name = $1', ['super_admin']);

    if (adminResult.rows.length > 0 && superAdminResult.rows.length > 0) {
      const defaultWorkspace = await client.query('SELECT id FROM workspaces WHERE slug = $1', ['default']);
      
      if (defaultWorkspace.rows.length > 0) {
        await client.query(
          `INSERT INTO workspace_users (workspace_id, user_id, role_id, is_active)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (workspace_id, user_id) DO UPDATE SET
           role_id = $3, is_active = true`,
          [defaultWorkspace.rows[0].id, adminResult.rows[0].id, superAdminResult.rows[0].id]
        );
      }
    }

    // Assign analyst role to demo user
    const demoUserResult = await client.query('SELECT id FROM users WHERE username = $1', ['demo_user']);
    const analystRoleResult = await client.query('SELECT id FROM custom_roles WHERE name = $1', ['analyst']);

    if (demoUserResult.rows.length > 0 && analystRoleResult.rows.length > 0) {
      const demoWorkspace = await client.query('SELECT id FROM workspaces WHERE slug = $1', ['demo']);
      
      if (demoWorkspace.rows.length > 0) {
        await client.query(
          `INSERT INTO workspace_users (workspace_id, user_id, role_id, is_active)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (workspace_id, user_id) DO UPDATE SET
           role_id = $3, is_active = true`,
          [demoWorkspace.rows[0].id, demoUserResult.rows[0].id, analystRoleResult.rows[0].id]
        );
      }
    }
  }

  private async seedPluginConfigurations(client: any) {
    const workspaces = await client.query('SELECT id, slug FROM workspaces');
    const adminUser = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);

    if (adminUser.rows.length === 0) return;

    for (const workspace of workspaces.rows) {
      // Enable PostgreSQL plugin for all workspaces
      await client.query(
        `INSERT INTO workspace_plugin_configs (workspace_id, plugin_type, plugin_name, configuration, is_enabled, enabled_by)
         VALUES ($1, 'datasource', 'postgresql', $2, true, $3)
         ON CONFLICT (workspace_id, plugin_type, plugin_name) DO NOTHING`,
        [
          workspace.id,
          JSON.stringify({
            host: 'localhost',
            port: 5432,
            database: 'sample_db',
            username: 'postgres',
            password: 'password'
          }),
          adminUser.rows[0].id
        ]
      );

      // Enable basic chart plugins
      const chartPlugins = ['echarts-bar', 'echarts-line', 'echarts-pie'];
      for (const plugin of chartPlugins) {
        await client.query(
          `INSERT INTO workspace_plugin_configs (workspace_id, plugin_type, plugin_name, configuration, is_enabled, enabled_by)
           VALUES ($1, 'chart', $2, '{}', true, $3)
           ON CONFLICT (workspace_id, plugin_type, plugin_name) DO NOTHING`,
          [workspace.id, plugin, adminUser.rows[0].id]
        );
      }
    }
  }

  async clean() {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      logger.info('Cleaning database...');

      // Clean in reverse order of dependencies
      await client.query('DELETE FROM workspace_plugin_configs');
      await client.query('DELETE FROM workspace_users');
      await client.query('DELETE FROM role_permissions');
      await client.query('DELETE FROM custom_roles WHERE is_system_role = false');
      await client.query('DELETE FROM workspaces WHERE slug != \'default\'');
      await client.query('DELETE FROM users WHERE username != \'admin\'');
      await client.query('DELETE FROM permissions');

      await client.query('COMMIT');
      logger.info('Database cleaned successfully!');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Database cleaning failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// CLI interface
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  const command = process.argv[2];

  switch (command) {
    case 'clean':
      seeder.clean()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
    case 'seed':
    default:
      seeder.seed()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
  }
}

export { DatabaseSeeder };