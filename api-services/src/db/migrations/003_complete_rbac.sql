-- Complete RBAC Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- System permissions table (if not exists)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 0, -- Role hierarchy level
    is_system BOOLEAN DEFAULT false,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, workspace_id)
);

-- Role-Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGINT GENERATED ALWAYS AS identity NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_permissions_pkey PRIMARY KEY (id),
	CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id)
);


-- User-Role assignments
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, workspace_id, role_id)
);

-- User-specific permission overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL, -- true = grant, false = revoke
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    reason TEXT,
    UNIQUE(user_id, workspace_id, permission_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_workspace 
ON user_role_assignments(user_id, workspace_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
ON role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user_workspace 
ON user_permission_overrides(user_id, workspace_id);

-- Insert system permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
-- Workspace Management
('workspace.read', 'View Workspace', 'View workspace information and settings', 'workspace'),
('workspace.update', 'Update Workspace', 'Modify workspace settings', 'workspace'),
('workspace.admin', 'Administer Workspace', 'Full workspace administration', 'workspace'),

-- User Management
('user.read', 'View Users', 'View user information', 'user_management'),
('user.create', 'Create Users', 'Add new users', 'user_management'),
('user.update', 'Update Users', 'Modify user information', 'user_management'),
('user.delete', 'Delete Users', 'Remove users', 'user_management'),

-- Dashboard Management
('dashboard.read', 'View Dashboards', 'View dashboards', 'dashboard'),
('dashboard.create', 'Create Dashboards', 'Create new dashboards', 'dashboard'),
('dashboard.update', 'Update Dashboards', 'Modify dashboards', 'dashboard'),
('dashboard.delete', 'Delete Dashboards', 'Remove dashboards', 'dashboard'),
('dashboard.publish', 'Publish Dashboards', 'Publish dashboards', 'dashboard'),
('dashboard.share', 'Share Dashboards', 'Share dashboards', 'dashboard'),

-- Dataset Management
('dataset.read', 'View Datasets', 'View and query datasets', 'dataset'),
('dataset.create', 'Create Datasets', 'Create new datasets', 'dataset'),
('dataset.update', 'Update Datasets', 'Modify datasets', 'dataset'),
('dataset.delete', 'Delete Datasets', 'Remove datasets', 'dataset'),

-- Chart Management
('chart.read', 'View Charts', 'View charts', 'chart'),
('chart.create', 'Create Charts', 'Create new charts', 'chart'),
('chart.update', 'Update Charts', 'Modify charts', 'chart'),
('chart.delete', 'Delete Charts', 'Remove charts', 'chart'),

-- Data Source Management
('datasource.read', 'View Data Sources', 'View data source configurations', 'datasource'),
('datasource.create', 'Create Data Sources', 'Add new data sources', 'datasource'),
('datasource.update', 'Update Data Sources', 'Modify data sources', 'datasource'),
('datasource.delete', 'Delete Data Sources', 'Remove data sources', 'datasource'),

-- SQL Editor
('sql_editor.access', 'Access SQL Editor', 'Use SQL editor interface', 'tools'),
('sql_editor.execute', 'Execute SQL', 'Run SQL queries', 'tools'),

-- Export Capabilities
('export.pdf', 'Export PDF', 'Export content as PDF', 'export'),
('export.excel', 'Export Excel', 'Export data to Excel', 'export'),
('export.csv', 'Export CSV', 'Export data to CSV', 'export'),
('export.image', 'Export Images', 'Export visualizations as images', 'export'),

-- Administration
('audit.read', 'View Audit Logs', 'Access audit and activity logs', 'admin'),
('security.manage', 'Security Settings', 'Manage security configurations', 'admin')

ON CONFLICT (name) DO NOTHING;

-- Insert default system roles
INSERT INTO roles (name, display_name, description, level, is_system) VALUES
('admin', 'Administrator', 'Full system access with all permissions', 100, true),
('editor', 'Editor', 'Can create and manage content', 50, true),
('viewer', 'Viewer', 'Read-only access to content', 10, true)
ON CONFLICT (name, workspace_id) DO NOTHING;

-- Assign permissions to default roles
DO $$
DECLARE
    admin_role_id UUID;
    editor_role_id UUID;
    viewer_role_id UUID;
BEGIN
    -- Get role IDs
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' AND is_system = true;
    SELECT id INTO editor_role_id FROM roles WHERE name = 'editor' AND is_system = true;
    SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer' AND is_system = true;

    -- Admin gets all permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT admin_role_id, id FROM permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Editor permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT editor_role_id, id FROM permissions 
    WHERE name IN (
        'workspace.read',
        'dashboard.read', 'dashboard.create', 'dashboard.update', 'dashboard.delete', 'dashboard.publish', 'dashboard.share',
        'dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete',
        'chart.read', 'chart.create', 'chart.update', 'chart.delete',
        'datasource.read',
        'sql_editor.access', 'sql_editor.execute',
        'export.pdf', 'export.excel', 'export.csv', 'export.image'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;

    -- Viewer permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT viewer_role_id, id FROM permissions 
    WHERE name IN (
        'workspace.read',
        'dashboard.read',
        'dataset.read',
        'chart.read',
        'export.csv', 'export.image'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;