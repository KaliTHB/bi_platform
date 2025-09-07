-- api-services/src/db/migrations/001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
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
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT workspaces_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT workspaces_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, workspace_id)
);

-- Create permissions table if not exists
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_is_active ON workspaces(is_active);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_workspace_id ON user_role_assignments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active ON user_role_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);

-- Create user_role_assignments table
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

-- Data sources table
CREATE TABLE datasources (
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
    role_id UUID REFERENCES roles(id),
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

-- Dataset permissions
CREATE TABLE dataset_permissions (
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_type VARCHAR(20) DEFAULT 'READ' CHECK (permission_type IN ('READ', 'WRITE', 'ADMIN')),
  PRIMARY KEY (dataset_id, role_id)
);

CREATE TABLE dashboard_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(250),
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20),
    parent_category_id UUID REFERENCES dashboard_categories(id), -- For hierarchy
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_category_per_workspace UNIQUE(workspace_id, name)
);

-- Webview Access Control
CREATE TABLE webview_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webview_id UUID NOT NULL REFERENCES webview(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    group_id UUID,
    role_id UUID REFERENCES roles(id),
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
    webview_id UUID NOT NULL REFERENCES webviews(id) ON DELETE CASCADE,
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


-- Dashboards table
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
    is_active bool NULL DEFAULT TRUE,
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

-- Charts table
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

-- Webviews table
-- Drop old tables if needed

CREATE TABLE public.webviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    
    -- Identity & naming
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(200),
    description TEXT,

    -- Configurations merged from both tables
    theme_config JSONB DEFAULT '{}'::jsonb,
    navigation_config JSONB DEFAULT '{}'::jsonb,
    branding_config JSONB DEFAULT '{}'::jsonb,
    access_config JSONB DEFAULT '{}'::jsonb,

    -- Optional linkage
    default_category_id UUID REFERENCES public.dashboard_categories(id),

    -- Lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_webview_per_workspace UNIQUE (workspace_id, name)
);

-- Index for fast workspace lookups
CREATE INDEX idx_webviews_workspace ON public.webviews USING btree (workspace_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_webviews_updated_at
BEFORE UPDATE ON public.webviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- Webview permissions
CREATE TABLE webview_access (
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

CREATE TRIGGER update_datasources_updated_at BEFORE UPDATE ON datasources
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

-- Performance Indexes
CREATE INDEX idx_categories_workspace_parent ON dashboard_categories(workspace_id, parent_category_id);
CREATE INDEX idx_webview_workspace ON webviews(workspace_id);
CREATE INDEX idx_webview_analytics_webview_timestamp ON webview_analytics(webview_id, action_timestamp);

-- Dashboard Access Control
CREATE TABLE dashboard_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    group_id UUID,
    role_id UUID REFERENCES roles(id),
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


-- Performance Indexes
CREATE INDEX idx_dashboards_workspace_status ON dashboards(workspace_id, status);
CREATE INDEX idx_dashboards_category ON dashboards(category_id);
CREATE INDEX idx_dashboard_access_dashboard ON dashboard_access(dashboard_id);

-- Performance Indexes
CREATE INDEX idx_datasources_workspace_plugin ON datasources(workspace_id, plugin_name);
CREATE INDEX idx_datasets_workspace_type ON datasets(workspace_id, type);
CREATE INDEX idx_dataset_access_dataset ON dataset_access(dataset_id);
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at updates
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_role_assignments_updated_at ON user_role_assignments;
CREATE TRIGGER update_user_role_assignments_updated_at
  BEFORE UPDATE ON user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();