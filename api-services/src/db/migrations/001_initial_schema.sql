-- api-services/src/db/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'USER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{
    "theme": "light",
    "timezone": "UTC",
    "date_format": "YYYY-MM-DD",
    "number_format": "en-US",
    "language": "en",
    "max_query_timeout": 300,
    "max_export_rows": 10000,
    "features": {
      "sql_editor": true,
      "dashboard_builder": true,
      "data_exports": true,
      "api_access": true,
      "webhooks": false
    }
  }',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  is_system BOOLEAN DEFAULT false,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, workspace_id)
);

-- Role permissions
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User workspaces
CREATE TABLE user_workspaces (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'SUSPENDED')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, workspace_id)
);

-- User workspace roles
CREATE TABLE user_workspace_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, workspace_id, role_id)
);

-- Data sources table
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  connection_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- Datasets table
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('SOURCE', 'TRANSFORMATION')),
  data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  query_config JSONB,
  transformation_config JSONB,
  parent_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  schema_config JSONB,
  row_level_security JSONB DEFAULT '{}',
  cache_ttl INTEGER DEFAULT 3600,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- Dataset permissions
CREATE TABLE dataset_permissions (
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_type VARCHAR(20) DEFAULT 'READ' CHECK (permission_type IN ('READ', 'WRITE', 'ADMIN')),
  PRIMARY KEY (dataset_id, role_id)
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(7),
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, name, parent_id)
);

-- Dashboards table
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  layout_config JSONB DEFAULT '{"components": [], "settings": {}}',
  filter_config JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- Charts table
CREATE TABLE charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "width": 4, "height": 3}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webviews table
CREATE TABLE webviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  theme_config JSONB DEFAULT '{"primary_color": "#1976d2", "secondary_color": "#dc004e"}',
  navigation_config JSONB DEFAULT '{"show_categories": true, "show_search": true}',
  access_config JSONB DEFAULT '{"public": false, "allowed_domains": []}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webview permissions
CREATE TABLE webview_permissions (
  webview_id UUID REFERENCES webviews(id) ON DELETE CASCADE,
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (webview_id, dashboard_id)
);

-- Query cache table
CREATE TABLE query_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  result_data JSONB,
  row_count INTEGER,
  execution_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User invitations table
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role_ids UUID[] NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_user_workspaces_user ON user_workspaces(user_id);
CREATE INDEX idx_user_workspaces_workspace ON user_workspaces(workspace_id);
CREATE INDEX idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX idx_datasets_type ON datasets(type);
CREATE INDEX idx_dashboards_workspace ON dashboards(workspace_id);
CREATE INDEX idx_dashboards_slug ON dashboards(workspace_id, slug);
CREATE INDEX idx_charts_dashboard ON charts(dashboard_id);
CREATE INDEX idx_query_cache_hash ON query_cache(query_hash);
CREATE INDEX idx_query_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charts_updated_at BEFORE UPDATE ON charts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webviews_updated_at BEFORE UPDATE ON webviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
