
-- api-services/src/db/seeds/001_default_roles.sql
-- Insert system permissions into default workspace
DO $$
DECLARE
    default_workspace_id UUID;
    admin_role_id UUID;
    contributor_role_id UUID;
    reader_role_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get default workspace ID
    SELECT id INTO default_workspace_id FROM workspaces WHERE slug = 'default';
    
    -- Get admin user ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    
    -- Create Administrator role
    INSERT INTO roles ( name, description, permissions, is_system_role, created_by)
    VALUES (
        'Administrator',
        'Full system access with all permissions',
        '[
            "workspace.read", "workspace.update", "workspace.admin",
            "user.read", "user.create", "user.update", "user.delete",
            "role.read", "role.create", "role.update", "role.delete", "role.assign",
            "category.read", "category.create", "category.update", "category.delete",
            "webview.read", "webview.create", "webview.update", "webview.delete", "webview.admin",
            "dataset.read", "dataset.create", "dataset.update", "dataset.delete", "dataset.share",
            "dashboard.read", "dashboard.create", "dashboard.update", "dashboard.delete", "dashboard.publish", "dashboard.share",
            "chart.read", "chart.create", "chart.update", "chart.delete",
            "export.pdf", "export.excel", "export.csv", "export.image",
            "plugin.config.read", "plugin.config.update",
            "sql_editor.access", "sql_editor.execute",
            "audit.read", "security.manage"
        ]'::jsonb,
        true,
        admin_user_id
    ) RETURNING id INTO admin_role_id;
    
    -- Create Contributor role
    INSERT INTO roles ( name, description, permissions, is_system_role, created_by)
    VALUES (
        'Contributor',
        'Can create and manage content but limited admin access',
        '[
            "workspace.read",
            "category.read", "category.create", "category.update",
            "webview.read",
            "dataset.read", "dataset.create", "dataset.update", "dataset.delete", "dataset.share",
            "dashboard.read", "dashboard.create", "dashboard.update", "dashboard.delete", "dashboard.publish", "dashboard.share",
            "chart.read", "chart.create", "chart.update", "chart.delete",
            "export.pdf", "export.excel", "export.csv", "export.image",
            "sql_editor.access", "sql_editor.execute"
        ]'::jsonb,
        true,
        admin_user_id
    ) RETURNING id INTO contributor_role_id;
    
    -- Create Reader role
    INSERT INTO roles ( name, description, permissions, is_system_role, created_by)
    VALUES (
        'Reader',
        'Read-only access to published dashboards through webview',
        '[
            "workspace.read",
            "category.read",
            "webview.read",
            "dataset.read",
            "dashboard.read",
            "chart.read",
            "export.csv", "export.image"
        ]'::jsonb,
        true,
        admin_user_id
    ) RETURNING id INTO reader_role_id;
    
    -- Assign Administrator role to admin user
    INSERT INTO user_roles (user_id, role_id, assigned_by)
    VALUES (admin_user_id , admin_role_id, admin_user_id);
    
END $$;