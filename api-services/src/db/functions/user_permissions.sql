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
        JOIN user_roles ura ON cr.id = ura.role_id
        WHERE ura.user_id = p_user_id 
        AND ura.workspace_id = p_workspace_id
        AND ura.is_active = TRUE
        AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
        AND cr.is_active = TRUE
    ) AS all_perms;
    
    RETURN permissions;
END;
$$ LANGUAGE plpgsql;