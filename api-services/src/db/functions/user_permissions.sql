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