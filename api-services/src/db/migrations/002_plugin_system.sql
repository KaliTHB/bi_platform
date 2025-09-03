-- api-services/src/db/migrations/002_seed_data.sql

-- Insert system permissions
INSERT INTO permissions (name, display_name, description, category, is_system) VALUES
-- Workspace permissions
('workspace.read', 'View Workspace', 'View workspace information and settings', 'workspace', true),
('workspace.write', 'Manage Workspace', 'Modify workspace settings and configuration', 'workspace', true),
('workspace.admin', 'Administer Workspace', 'Full workspace administration including user management', 'workspace', true),

-- User permissions
('user.read', 'View Users', 'View user profiles and basic information', 'user', true),
('user.write', 'Manage Users', 'Create, update, and manage user accounts', 'user', true),
('user.invite', 'Invite Users', 'Send invitations to new users', 'user', true),
('user.role_assign', 'Assign Roles', 'Assign and manage user roles', 'user', true),

-- Dataset permissions
('dataset.read', 'View Datasets', 'View dataset definitions and data', 'dataset', true),
('dataset.write', 'Manage Datasets', 'Create, update, and delete datasets', 'dataset', true),
('dataset.query', 'Query Datasets', 'Execute queries against datasets', 'dataset', true),
('dataset.transform', 'Transform Datasets', 'Create transformation datasets', 'dataset', true),

-- Dashboard permissions
('dashboard.read', 'View Dashboards', 'View dashboards and charts', 'dashboard', true),
('dashboard.write', 'Manage Dashboards', 'Create, update, and delete dashboards', 'dashboard', true),
('dashboard.share', 'Share Dashboards', 'Share dashboards with other users', 'dashboard', true),
('dashboard.publish', 'Publish Dashboards', 'Publish dashboards to webviews', 'dashboard', true),

-- Data source permissions
('data_source.read', 'View Data Sources', 'View data source configurations', 'data_source', true),
('data_source.write', 'Manage Data Sources', 'Create, update, and delete data sources', 'data_source', true),
('data_source.test', 'Test Connections', 'Test data source connections', 'data_source', true),

-- Export permissions
('export.data', 'Export Data', 'Export data in various formats', 'export', true),
('export.dashboard', 'Export Dashboards', 'Export dashboards as PDF or images', 'export', true),

-- Plugin permissions
('plugin.read', 'View Plugins', 'View available plugins and configurations', 'plugin', true),
('plugin.configure', 'Configure Plugins', 'Configure plugin settings per workspace', 'plugin', true),

-- Webview permissions
('webview.read', 'View Webviews', 'View webview panel configurations', 'webview', true),
('webview.write', 'Manage Webviews', 'Create and manage webview panels', 'webview', true),
('webview.access', 'Access Webviews', 'Access published webview panels', 'webview', true),

-- Analytics permissions
('analytics.read', 'View Analytics', 'View usage analytics and reports', 'analytics', true),

-- Audit permissions
('audit.read', 'View Audit Logs', 'View security and usage audit logs', 'audit', true);

-- Insert system roles
INSERT INTO roles (name, display_name, description, level, is_system) VALUES
('viewer', 'Viewer', 'Can view dashboards and data', 10, true),
('analyst', 'Analyst', 'Can create queries, datasets, and dashboards', 30, true),
('editor', 'Editor', 'Can manage content and share with others', 50, true),
('admin', 'Administrator', 'Can manage workspace, users, and all content', 80, true),
('owner', 'Owner', 'Full workspace control including dangerous operations', 100, true);

-- Get role IDs for permission assignments
DO $$
DECLARE
    viewer_id UUID;
    analyst_id UUID;
    editor_id UUID;
    admin_id UUID;
    owner_id UUID;
BEGIN
    SELECT id INTO viewer_id FROM roles WHERE name = 'viewer' AND is_system = true;
    SELECT id INTO analyst_id FROM roles WHERE name = 'analyst' AND is_system = true;
    SELECT id INTO editor_id FROM roles WHERE name = 'editor' AND is_system = true;
    SELECT id INTO admin_id FROM roles WHERE name = 'admin' AND is_system = true;
    SELECT id INTO owner_id FROM roles WHERE name = 'owner' AND is_system = true;

    -- Viewer permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT viewer_id, id FROM permissions WHERE name IN (
        'workspace.read',
        'dataset.read',
        'dataset.query',
        'dashboard.read',
        'export.data',
        'export.dashboard',
        'webview.access'
    );

    -- Analyst permissions (includes all viewer permissions)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT analyst_id, id FROM permissions WHERE name IN (
        'workspace.read',
        'dataset.read',
        'dataset.query',
        'dataset.write',
        'dataset.transform',
        'dashboard.read',
        'dashboard.write',
        'data_source.read',
        'data_source.test',
        'export.data',
        'export.dashboard',
        'plugin.read',
        'webview.access'
    );

    -- Editor permissions (includes all analyst permissions)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT editor_id, id FROM permissions WHERE name IN (
        'workspace.read',
        'user.read',
        'dataset.read',
        'dataset.query',
        'dataset.write',
        'dataset.transform',
        'dashboard.read',
        'dashboard.write',
        'dashboard.share',
        'dashboard.publish',
        'data_source.read',
        'data_source.write',
        'data_source.test',
        'export.data',
        'export.dashboard',
        'plugin.read',
        'plugin.configure',
        'webview.read',
        'webview.write',
        'webview.access',
        'analytics.read'
    );

    -- Admin permissions (includes all editor permissions)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_id, id FROM permissions WHERE name IN (
        'workspace.read',
        'workspace.write',
        'user.read',
        'user.write',
        'user.invite',
        'user.role_assign',
        'dataset.read',
        'dataset.query',
        'dataset.write',
        'dataset.transform',
        'dashboard.read',
        'dashboard.write',
        'dashboard.share',
        'dashboard.publish',
        'data_source.read',
        'data_source.write',
        'data_source.test',
        'export.data',
        'export.dashboard',
        'plugin.read',
        'plugin.configure',
        'webview.read',
        'webview.write',
        'webview.access',
        'analytics.read',
        'audit.read'
    );

    -- Owner permissions (all permissions)
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT owner_id, id FROM permissions;
END $$;

-- Create default super admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES (
    'admin@system.local',
    '$2b$12$2EXOOGy6DG5aG9ZWJYzNHhQzEu7.D1K1p/a0dL8fyeXHgYgLdGe5',  -- This should be the actual hash
    'System',
    'Administrator', 
    'SUPER_ADMIN',
    true,
    true
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Create sample workspace
INSERT INTO workspaces (name, slug, description, created_by)
VALUES (
    'Demo Workspace',
    'demo-workspace',
    'A sample workspace for demonstration purposes',
    (SELECT id FROM users WHERE email = 'admin@system.local')
);

-- Add super admin to sample workspace
INSERT INTO user_workspaces (user_id, workspace_id, status)
VALUES (
    (SELECT id FROM users WHERE email = 'admin@system.local'),
    (SELECT id FROM workspaces WHERE slug = 'demo-workspace'),
    'ACTIVE'
);

-- Assign owner role to super admin in sample workspace
INSERT INTO user_workspace_roles (user_id, workspace_id, role_id, assigned_by)
VALUES (
    (SELECT id FROM users WHERE email = 'admin@system.local'),
    (SELECT id FROM workspaces WHERE slug = 'demo-workspace'),
    (SELECT id FROM roles WHERE name = 'owner' AND is_system = true),
    (SELECT id FROM users WHERE email = 'admin@system.local')
);

-- Create sample categories
INSERT INTO categories (workspace_id, name, description, icon, color, created_by) VALUES
(
    (SELECT id FROM workspaces WHERE slug = 'demo-workspace'),
    'Sales & Marketing',
    'Sales performance and marketing analytics dashboards',
    'trending_up',
    '#4CAF50',
    (SELECT id FROM users WHERE email = 'admin@system.local')
),
(
    (SELECT id FROM workspaces WHERE slug = 'demo-workspace'),
    'Operations',
    'Operational metrics and KPI dashboards',
    'settings',
    '#FF9800',
    (SELECT id FROM users WHERE email = 'admin@system.local')
),
(
    (SELECT id FROM workspaces WHERE slug = 'demo-workspace'),
    'Finance',
    'Financial reporting and budget tracking',
    'account_balance',
    '#2196F3',
    (SELECT id FROM users WHERE email = 'admin@system.local')
);