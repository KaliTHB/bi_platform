-- api-services/src/db/seeds/003_sample_data.sql
-- Insert default categories
DO $
DECLARE
    default_workspace_id UUID;
    admin_user_id UUID;
    analytics_category_id UUID;
    finance_category_id UUID;
    operations_category_id UUID;
    default_webview_id UUID;
BEGIN
    -- Get default workspace and admin user
    SELECT id INTO default_workspace_id FROM workspaces WHERE slug = 'default';
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
    
    -- Create sample categories
    INSERT INTO dashboard_categories (workspace_id, name, display_name, description, icon, color, sort_order, created_by)
    VALUES 
        (default_workspace_id, 'analytics', 'Analytics', 'Business analytics and KPI dashboards', 'analytics', '#1976d2', 1, admin_user_id)
        RETURNING id INTO analytics_category_id;
    
    INSERT INTO dashboard_categories (workspace_id, name, display_name, description, icon, color, sort_order, created_by)
    VALUES 
        (default_workspace_id, 'finance', 'Finance', 'Financial reports and budget tracking', 'attach_money', '#2e7d32', 2, admin_user_id)
        RETURNING id INTO finance_category_id;
    
    INSERT INTO dashboard_categories (workspace_id, name, display_name, description, icon, color, sort_order, created_by)
    VALUES 
        (default_workspace_id, 'operations', 'Operations', 'Operational metrics and performance', 'settings', '#ed6c02', 3, admin_user_id)
        RETURNING id INTO operations_category_id;
    
    -- Create default webview
    INSERT INTO webview (workspace_id, webview_name, display_name, description, default_category_id, created_by)
    VALUES (
        default_workspace_id, 
        'main-portal', 
        'Main Portal', 
        'Primary dashboard portal for all users',
        analytics_category_id,
        admin_user_id
    ) RETURNING id INTO default_webview_id;
    
    -- Grant webview access to all roles
    INSERT INTO webview_access (webview_id, role_id, permissions, granted_by)
    SELECT 
        default_webview_id,
        cr.id,
        '["can_read"]'::jsonb,
        admin_user_id
    FROM roles cr
    WHERE cr.workspace_id = default_workspace_id;
    
END $;