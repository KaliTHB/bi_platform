CREATE OR REPLACE FUNCTION apply_rls_policies(
    p_base_query TEXT,
    p_user_id UUID,
    p_workspace_id UUID,
    p_dataset_ids UUID[]
) RETURNS TEXT AS $$
DECLARE
    policy_record RECORD;
    modified_query TEXT;
    policy_conditions TEXT[] := '{}';
    final_condition TEXT;
BEGIN
    modified_query := p_base_query;
    
    -- Get applicable RLS policies
    FOR policy_record IN
        SELECT * FROM rls_policies
        WHERE workspace_id = p_workspace_id
        AND is_active = TRUE
        AND (
            dataset_ids && p_dataset_ids OR
            dataset_ids IS NULL OR
            array_length(dataset_ids, 1) IS NULL
        )
        ORDER BY priority DESC
    LOOP
        -- Replace context variables with actual values
        policy_conditions := policy_conditions || replace(
            replace(
                policy_record.policy_expression,
                '{user_id}',
                quote_literal(p_user_id::text)
            ),
            '{workspace_id}',
            quote_literal(p_workspace_id::text)
        );
    END LOOP;
    
    -- Apply policies if any exist
    IF array_length(policy_conditions, 1) > 0 THEN
        final_condition := array_to_string(policy_conditions, ' AND ');
        modified_query := format(
            'SELECT * FROM (%s) rls_filtered WHERE %s',
            modified_query,
            final_condition
        );
    END IF;
    
    RETURN modified_query;
END;
$$ LANGUAGE plpgsql;