CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    ura.user_id,
    ura.workspace_id,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.description as permission_description,
    p.category as permission_category,
    r.name as role_name,
    r.id as role_id,
    r.role_level as role_level,
    ura.is_active as is_role_active,
    (
        ura.is_active = TRUE 
        AND r.is_active = TRUE 
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
    ) as is_permission_active,
    ura.assigned_at,
    ura.expires_at,
    r.is_system as is_system_role
FROM user_role_assignments ura
JOIN roles r ON ura.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- User activity summary view (updated to use the new user_permissions_view)
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT ura.role_id) as role_count,
    COUNT(DISTINCT upv.permission_name) as permission_count,
    MAX(u.last_login) as last_activity,
    u.is_active,
    u.created_at
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = TRUE
LEFT JOIN user_permissions_view upv ON u.id = upv.user_id AND upv.is_permission_active = TRUE
GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.is_active, u.created_at;

-- Role effectiveness summary view
CREATE OR REPLACE VIEW role_effectiveness_summary AS
SELECT 
    r.id,
    r.name,
    r.display_name,
    r.description,
    r.level,
    COUNT(DISTINCT ura.user_id) as active_users,
    COUNT(DISTINCT rp.permission_id) as permission_count,
    r.created_at,
    r.is_system,
    r.is_active
FROM roles r
LEFT JOIN user_role_assignments ura ON r.id = ura.role_id AND ura.is_active = TRUE
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.display_name, r.description, r.level, r.created_at, r.is_system, r.is_active;

-- Workspace user permissions summary
CREATE OR REPLACE VIEW workspace_user_permissions AS
SELECT 
    ura.workspace_id,
    ura.user_id,
    u.username,
    u.email,
    u.first_name,
    u.last_name,
    jsonb_agg(DISTINCT r.name) as roles,
    jsonb_agg(DISTINCT p.name) as permissions,
    MAX(r.level) as max_role_level,
    bool_or(
        r.name ILIKE '%admin%' OR 
        r.name ILIKE '%owner%' OR 
        r.level >= 80
    ) as is_admin,
    MIN(ura.assigned_at) as first_assigned,
    MAX(ura.assigned_at) as last_assigned
FROM user_role_assignments ura
JOIN users u ON ura.user_id = u.id
JOIN roles r ON ura.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE ura.is_active = TRUE
  AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
  AND r.is_active = TRUE
  AND u.is_active = TRUE
GROUP BY ura.workspace_id, ura.user_id, u.username, u.email, u.first_name, u.last_name;

-- Permission usage summary
CREATE OR REPLACE VIEW permission_usage_summary AS
SELECT 
    p.id,
    p.name,
    p.display_name,
    p.description,
    p.category,
    COUNT(DISTINCT r.id) as assigned_to_roles,
    COUNT(DISTINCT ura.user_id) as total_users_with_permission,
    COUNT(DISTINCT ura.workspace_id) as workspaces_using_permission
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
LEFT JOIN roles r ON rp.role_id = r.id AND r.is_active = TRUE
LEFT JOIN user_role_assignments ura ON r.id = ura.role_id 
    AND ura.is_active = TRUE 
    AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
GROUP BY p.id, p.name, p.display_name, p.description, p.category;

-- Create indexes to support the views
CREATE INDEX IF NOT EXISTS idx_user_permissions_view_user_workspace 
ON user_role_assignments(user_id, workspace_id) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_permissions_view_permission 
ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_users_active 
ON users(is_active) 
WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION get_user_effective_permissions(
    p_user_id UUID, 
    p_workspace_id UUID
) RETURNS JSONB AS $$
DECLARE
    permissions JSONB := '[]'::jsonb;
BEGIN
    -- Collect permissions from all assigned roles
    SELECT COALESCE(jsonb_agg(DISTINCT perm), '[]'::jsonb) INTO permissions
    FROM (
        SELECT jsonb_array_elements(cr.permissions) AS perm
        FROM roles cr
        JOIN user_role_assignments ura ON cr.id = ura.role_id
        WHERE ura.user_id = p_user_id 
        AND ura.workspace_id = p_workspace_id
        AND ura.is_active = TRUE
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        AND cr.is_active = TRUE
    ) AS all_perms;
    
    RETURN permissions;
END;
$$ LANGUAGE plpgsql;

CREATE VIEW user_activity_summary AS
SELECT 
  u.id,
  u.username,
  u.email,
  COUNT(DISTINCT ura.role_id) as role_count,
  COUNT(DISTINCT upv.permission_name) as permission_count,
  MAX(u.last_login) as last_activity
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = TRUE
LEFT JOIN user_permissions_view upv ON u.id = upv.user_id AND upv.is_permission_active = TRUE
GROUP BY u.id, u.username, u.email;

-- Role effectiveness view
CREATE VIEW role_effectiveness_summary AS
SELECT 
  r.id,
  r.name,
  COUNT(DISTINCT ura.user_id) as active_users,
  COUNT(DISTINCT rp.permission_id) as permission_count,
  r.created_at,
  r.is_system
FROM roles r
LEFT JOIN user_role_assignments ura ON r.id = ura.role_id AND ura.is_active = TRUE
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.created_at, r.is_system;