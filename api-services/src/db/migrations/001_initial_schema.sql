-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Core Workspace Management
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    display_name VARCHAR(250),
    description TEXT,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID,
    branding_config JSONB DEFAULT '{}',
    settings_json JSONB DEFAULT '{}',
    plugin_config JSONB DEFAULT '{}',
    default_dashboard_id UUID,
    theme_config JSONB DEFAULT '{}',
    rls_config JSONB DEFAULT '{}',
    calculation_config JSONB DEFAULT '{}',
    log_retention_settings JSONB DEFAULT '{"query_logs_days": 90, "permission_logs_days": 365, "error_logs_days": 30, "security_logs_days": 365}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced User Management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    azure_ad_id VARCHAR(255) UNIQUE,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    avatar_url TEXT,
    profile_data JSONB DEFAULT '{}',
    calculation_permissions JSONB DEFAULT '{}',
    rls_context JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Custom Role System
CREATE TABLE custom_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_role_per_workspace UNIQUE(workspace_id, name)
);

-- User Role Assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- File-Based Plugin Configuration
CREATE TABLE workspace_plugin_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plugin_type VARCHAR(20) NOT NULL CHECK (plugin_type IN ('datasource', 'chart')),
    plugin_name VARCHAR(100) NOT NULL,
    configuration JSONB DEFAULT '{}',
    custom_settings JSONB DEFAULT '{}',
    performance_config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT TRUE,
    enabled_by UUID NOT NULL REFERENCES users(id),
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    CONSTRAINT unique_workspace_plugin UNIQUE(workspace_id, plugin_type, plugin_name)
);

-- Create default admin user
INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
VALUES (
    'admin',
    'admin@localhost',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'System',
    'Administrator',
    true
);

-- Create default workspace
INSERT INTO workspaces (name, display_name, slug, owner_id)
VALUES (
    'Default Workspace',
    'Default Workspace',
    'default',
    (SELECT id FROM users WHERE username = 'admin')
);