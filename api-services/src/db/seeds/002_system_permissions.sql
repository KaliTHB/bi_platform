-- api-services/src/db/seeds/002_system_permissions.sql
-- Row-Level Security Policies
CREATE TABLE rls_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    level VARCHAR(20) NOT NULL CHECK (level IN ('workspace', 'group', 'user', 'dashboard', 'chart', 'webview')),
    target_id UUID,
    dataset_ids UUID[] DEFAULT '{}',
    policy_expression TEXT NOT NULL,
    context_variables JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    performance_hint JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Query Audit Logging
CREATE TABLE query_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    session_id VARCHAR(255),
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64),
    dataset_ids UUID[] DEFAULT '{}',
    datasource_ids UUID[] DEFAULT '{}',
    execution_time_ms INTEGER,
    row_count INTEGER,
    bytes_processed BIGINT,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    error_code VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    query_type VARCHAR(50),
    cache_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permission Audit Logging
CREATE TABLE permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    permission VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    granted_by UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calculated Fields and Measures
CREATE TABLE calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    chart_id UUID REFERENCES charts(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(250),
    description TEXT,
    calculation_type VARCHAR(50) NOT NULL CHECK (calculation_type IN ('column', 'measure', 'table')),
    expression TEXT NOT NULL,
    data_type VARCHAR(50),
    format_string VARCHAR(100),
    dependencies JSONB DEFAULT '[]',
    context_requirements JSONB DEFAULT '{}',
    performance_hint JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT calculation_target CHECK (
        (dataset_id IS NOT NULL AND chart_id IS NULL) OR
        (dataset_id IS NULL AND chart_id IS NOT NULL)
    )
);

-- Performance Indexes
CREATE INDEX idx_rls_policies_workspace ON rls_policies(workspace_id);
CREATE INDEX idx_query_audit_logs_workspace_created ON query_audit_logs(workspace_id, created_at);
CREATE INDEX idx_permission_audit_logs_workspace_created ON permission_audit_logs(workspace_id, created_at);
CREATE INDEX idx_calculations_workspace ON calculations(workspace_id);