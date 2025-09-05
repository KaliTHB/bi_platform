CREATE OR REPLACE FUNCTION check_user_dataset_access(
    p_user_id UUID, 
    p_dataset_id UUID, 
    p_workspace_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    dataset_record RECORD;
    parent_id UUID;
    has_access BOOLEAN := FALSE;
BEGIN
    -- Get dataset information
    SELECT * INTO dataset_record FROM datasets WHERE id = p_dataset_id AND workspace_id = p_workspace_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check direct access to this dataset
    SELECT EXISTS(
        SELECT 1 FROM dataset_access da
        LEFT JOIN user_roles ura ON da.role_id = ura.role_id
        WHERE da.dataset_id = p_dataset_id
        AND da.is_active = TRUE
        AND (da.expires_at IS NULL OR da.expires_at > NOW())
        AND (
            da.user_id = p_user_id OR
            (da.role_id IS NOT NULL AND ura.user_id = p_user_id AND ura.is_active = TRUE)
        )
    ) INTO has_access;
    
    IF NOT has_access THEN
        RETURN FALSE;
    END IF;
    
    -- For transformation datasets, check parent access recursively
    IF dataset_record.type = 'transformation' AND dataset_record.parent_dataset_ids IS NOT NULL THEN
        FOR parent_id IN SELECT unnest(dataset_record.parent_dataset_ids) LOOP
            IF NOT check_user_dataset_access(p_user_id, parent_id, p_workspace_id) THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;