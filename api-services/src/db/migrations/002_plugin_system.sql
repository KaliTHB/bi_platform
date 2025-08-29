-- api-services/src/db/migrations/002_plugin_system.sql
-- Enhanced Data Sources
CREATE TABLE datasources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plugin_name VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(250),
    description TEXT,
    connection_config JSONB NOT NULL DEFAULT '{}',
    credentials_encrypted TEXT,
    test_query TEXT,
    connection_pool_config JSONB DEFAULT '{"max_connections": 20, "min_connections": 5}',
    performance_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_tested TIMESTAMP WITH TIME ZONE,
    test_status VARCHAR(20) DEFAULT 'pending',
    test_error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_datasource_per_workspace UNIQUE(workspace_id, name)
);

-- Dataset Management with Enhanced Transformation Support
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    datasource_ids UUID[] NOT NULL,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(250),
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('table', 'query', 'transformation')),
    base_query TEXT NOT NULL,
    parent_dataset_ids UUID[],
    transformation_stages JSONB DEFAULT '[]',
    calculated_columns JSONB DEFAULT '[]',
    measures JSONB DEFAULT '[]',
    relationships JSONB DEFAULT '[]',
    schema_json JSONB DEFAULT '{}',
    metadata_json JSONB DEFAULT '{}',
    refresh_schedule JSONB,
    cache_ttl INTEGER DEFAULT 3600,
    row_count_estimate INTEGER DEFAULT 0,
    last_refreshed TIMESTAMP WITH TIME ZONE,
    refresh_status VARCHAR(20) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dataset_version UNIQUE(workspace_id, name, version)
);

-- Dataset Access Control
CREATE TABLE dataset_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    group_id UUID,
    role_id UUID REFERENCES custom_roles(id),
    permissions JSONB NOT NULL DEFAULT '["can_read"]',
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT single_access_target CHECK (
        (user_id IS NOT NULL AND group_id IS NULL AND role_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND group_id IS NULL AND role_id IS NOT NULL)
    )
);

-- Performance Indexes
CREATE INDEX idx_datasources_workspace_plugin ON datasources(workspace_id, plugin_name);
CREATE INDEX idx_datasets_workspace_type ON datasets(workspace_id, type);
CREATE INDEX idx_dataset_access_dataset ON dataset_access(dataset_id);

-- api-services/src/db/migrations/003_webview_system.sql
-- Dashboard Categories for Webview Panel
CREATE TABLE dashboard_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(250),
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20),
    parent_category_id UUID REFERENCES dashboard_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_category_per_workspace UNIQUE(workspace_id, name)
);

-- Webview Configurations
CREATE TABLE webview_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    webview_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    description TEXT,
    theme_config JSONB DEFAULT '{}',
    navigation_config JSONB DEFAULT '{}',
    branding_config JSONB DEFAULT '{}',
    default_category_id UUID REFERENCES dashboard_categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_webview_per_workspace UNIQUE(workspace_id, webview_name)
);

-- Webview Access Control
CREATE TABLE webview_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webview_id UUID NOT NULL REFERENCES webview_configs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    group_id UUID,
    role_id UUID REFERENCES custom_roles(id),
    permissions JSONB NOT NULL DEFAULT '["can_read"]',
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT single_webview_access_target CHECK (
        (user_id IS NOT NULL AND group_id IS NULL AND role_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND group_id IS NULL AND role_id IS NOT NULL)
    )
);

-- Webview Navigation Analytics
CREATE TABLE webview_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    webview_id UUID NOT NULL REFERENCES webview_configs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES dashboard_categories(id),
    dashboard_id UUID,
    action_type VARCHAR(50) NOT NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- Performance Indexes
CREATE INDEX idx_categories_workspace_parent ON dashboard_categories(workspace_id, parent_category_id);
CREATE INDEX idx_webview_configs_workspace ON webview_configs(workspace_id);
CREATE INDEX idx_webview_analytics_webview_timestamp ON webview_analytics(webview_id, action_timestamp);

-- api-services/src/db/migrations/004_category_system.sql
-- Enhanced Dashboards with Plugin Integration and Category Support
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES dashboard_categories(id),
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(250),
    description TEXT,
    slug VARCHAR(100) NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}',
    tabs JSONB DEFAULT '[]',
    global_filters JSONB DEFAULT '[]',
    filter_connections JSONB DEFAULT '[]',
    theme_config JSONB DEFAULT '{}',
    layout_config JSONB DEFAULT '{}',
    responsive_settings JSONB DEFAULT '{}',
    thumbnail_url TEXT,
    owner_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_public BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    published_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    last_viewed TIMESTAMP WITH TIME ZONE,
    rls_policies_json JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_dashboard_slug UNIQUE(workspace_id, slug),
    CONSTRAINT unique_dashboard_name UNIQUE(workspace_id, name)
);

-- Dashboard Access Control
CREATE TABLE dashboard_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    group_id UUID,
    role_id UUID REFERENCES custom_roles(id),
    access_level VARCHAR(20) NOT NULL DEFAULT 'can_read' CHECK (access_level IN ('can_read', 'can_edit', 'can_admin')),
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT single_dashboard_access_target CHECK (
        (user_id IS NOT NULL AND group_id IS NULL AND role_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL AND role_id IS NULL) OR
        (user_id IS NULL AND group_id IS NULL AND role_id IS NOT NULL)
    )
);

-- Enhanced Charts with Plugin Integration
CREATE TABLE charts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    tab_id VARCHAR(50),
    dataset_ids UUID[] NOT NULL,
    plugin_name VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(250),
    description TEXT,
    chart_type VARCHAR(50) NOT NULL,
    chart_category VARCHAR(50) NOT NULL,
    chart_library VARCHAR(50) NOT NULL,
    config_json JSONB NOT NULL DEFAULT '{}',
    position_json JSONB DEFAULT '{}',
    styling_config JSONB DEFAULT '{}',
    interaction_config JSONB DEFAULT '{}',
    query_config JSONB DEFAULT '{}',
    drilldown_config JSONB DEFAULT '{}',
    calculated_fields JSONB DEFAULT '[]',
    conditional_formatting JSONB DEFAULT '[]',
    export_config JSONB DEFAULT '{}',
    cache_config JSONB DEFAULT '{"enabled": true, "ttl": 600}',
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    last_rendered TIMESTAMP WITH TIME ZONE,
    render_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_dashboards_workspace_status ON dashboards(workspace_id, status);
CREATE INDEX idx_dashboards_category ON dashboards(category_id);
CREATE INDEX idx_charts_dashboard ON charts(dashboard_id);
CREATE INDEX idx_dashboard_access_dashboard ON dashboard_access(dashboard_id);