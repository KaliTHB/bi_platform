CREATE OR REPLACE FUNCTION check_webview_dashboard_access(
    p_user_id UUID,
    p_dashboard_id UUID,
    p_webview_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    dashboard_record RECORD;
    dataset_id UUID;
    has_dashboard_access BOOLEAN := FALSE;
    has_webview_access BOOLEAN := FALSE;
    has_dataset_access BOOLEAN := TRUE;
BEGIN
    -- Get dashboard information
    SELECT * INTO dashboard_record FROM dashboards WHERE id = p_dashboard_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check webview access
    SELECT EXISTS(
        SELECT 1 FROM webview_access wa
        LEFT JOIN user_role_assignments ura ON wa.role_id = ura.role_id
        WHERE wa.webview_id = p_webview_id
        AND wa.is_active = TRUE
        AND (wa.expires_at IS NULL OR wa.expires_at > NOW())
        AND wa.permissions ? 'can_read'
        AND (
            wa.user_id = p_user_id OR
            (wa.role_id IS NOT NULL AND ura.user_id = p_user_id AND ura.is_active = TRUE)
        )
    ) INTO has_webview_access;
    
    IF NOT has_webview_access THEN
        RETURN FALSE;
    END IF;
    
    -- Check dashboard access
    SELECT EXISTS(
        SELECT 1 FROM dashboard_access da
        LEFT JOIN user_role_assignments ura ON da.role_id = ura.role_id
        WHERE da.dashboard_id = p_dashboard_id
        AND da.is_active = TRUE
        AND (da.expires_at IS NULL OR da.expires_at > NOW())
        AND da.access_level = 'can_read'
        AND (
            da.user_id = p_user_id OR
            (da.role_id IS NOT NULL AND ura.user_id = p_user_id AND ura.is_active = TRUE)
        )
    ) INTO has_dashboard_access;
    
    IF NOT has_dashboard_access THEN
        RETURN FALSE;
    END IF;
    
    -- Check access to all datasets used by charts in this dashboard
    FOR dataset_id IN 
        SELECT unnest(c.dataset_ids) 
        FROM charts c 
        WHERE c.dashboard_id = p_dashboard_id 
        AND c.is_active = TRUE
    LOOP
        IF NOT check_user_dataset_access(p_user_id, dataset_id, dashboard_record.workspace_id) THEN
            has_dataset_access := FALSE;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN has_dataset_access;
END;
$$ LANGUAGE plpgsql;
