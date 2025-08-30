// web-application/src/types/auth.types.ts

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  workspace_ids?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings: WorkspaceSettings;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  user_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  user_roles?: WorkspaceRole[];
  highest_role_level?: number;
  membership_status?: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  stats?: {
    active_users: number;
    total_dashboards: number;
    total_datasets: number;
    total_data_sources: number;
    total_categories: number;
  };
}

export interface WorkspaceSettings {
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  date_format: string;
  number_format: string;
  language: string;
  max_query_timeout: number;
  max_export_rows: number;
  features: {
    sql_editor: boolean;
    dashboard_builder: boolean;
    data_exports: boolean;
    api_access: boolean;
    webhooks: boolean;
  };
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  level: number;
  is_system: boolean;
  workspace_id?: string;
  permissions: Permission[];
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  resource_type?: string;
  is_system: boolean;
  created_at: Date;
}

export interface WorkspaceRole {
  role_id: string;
  role_name: string;
  level: number;
  assigned_at?: Date;
  assigned_by?: string;
}

export interface UserWorkspace {
  user_id: string;
  workspace_id: string;
  roles: WorkspaceRole[];
  joined_at: Date;
  invited_by?: string;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}

export interface LoginRequest {
  email: string;
  password: string;
  workspace_slug?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_in: number;
  workspaces: Workspace[];
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  workspace_id: string;
  role_ids: string[];
  invited_by: string;
  token: string;
  expires_at: Date;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  created_at: Date;
}

export interface CreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  role_ids: string[];
  send_invitation: boolean;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface AssignRoleRequest {
  user_id: string;
  role_ids: string[];
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  level: number;
  permission_ids: string[];
}

export interface UpdateRoleRequest {
  display_name?: string;
  description?: string;
  level?: number;
  permission_ids?: string[];
}

// Dashboard related types
export interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string;
  category_id?: string;
  category?: Category;
  layout_config: DashboardLayout;
  filter_config: DashboardFilter[];
  is_public: boolean;
  is_featured: boolean;
  is_active: boolean;
  chart_count: number;
  webview_count?: number;
  created_by: string;
  created_by_name?: string;
  created_at: Date;
  updated_at: Date;
  charts?: Chart[];
}

export interface DashboardLayout {
  components: DashboardComponent[];
  settings: {
    grid_size?: number;
    auto_height?: boolean;
    responsive?: boolean;
  };
}

export interface DashboardComponent {
  id: string;
  type: 'chart' | 'text' | 'filter' | 'spacer';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: any;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
  column: string;
  dataset_id: string;
  options?: FilterOption[];
  default_value?: any;
  required?: boolean;
}

export interface FilterOption {
  label: string;
  value: any;
}

// Dataset related types
export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  type: 'SOURCE' | 'TRANSFORMATION';
  data_source_id?: string;
  data_source?: DataSource;
  query_config?: QueryConfig;
  transformation_config?: TransformationConfig;
  parent_dataset_id?: string;
  parent_dataset?: {
    id: string;
    name: string;
  };
  schema_config: SchemaConfig;
  row_level_security: RowLevelSecurity;
  cache_ttl: number;
  chart_count: number;
  has_access: boolean;
  is_active: boolean;
  created_by: string;
  created_by_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DataSource {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  connection_config: any;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface QueryConfig {
  query: string;
  parameters?: QueryParameter[];
}

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  default_value?: any;
  required?: boolean;
}

export interface TransformationConfig {
  filters?: TransformationFilter[];
  select_columns?: string[];
  computed_columns?: ComputedColumn[];
  renamed_columns?: ColumnRename[];
  aggregations?: Aggregation[];
  joins?: Join[];
  sorts?: Sort[];
}

export interface TransformationFilter {
  column: string;
  operator: string;
  value: any;
}

export interface ComputedColumn {
  name: string;
  expression: string;
  type: string;
  description?: string;
}

export interface ColumnRename {
  from: string;
  to: string;
}

export interface Aggregation {
  column: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  alias?: string;
}

export interface Join {
  dataset_id: string;
  type: 'inner' | 'left' | 'right' | 'full';
  conditions: JoinCondition[];
}

export interface JoinCondition {
  left_column: string;
  right_column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
}

export interface Sort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface SchemaConfig {
  columns: DatasetColumn[];
  primary_key?: string;
  indexes?: Index[];
}

export interface DatasetColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  format?: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface RowLevelSecurity {
  enabled: boolean;
  user_column?: string;
  conditions?: SecurityCondition[];
}

export interface SecurityCondition {
  column: string;
  operator: string;
  value: any;
}

// Chart related types
export interface Chart {
  id: string;
  workspace_id: string;
  dashboard_id: string;
  dataset_id: string;
  dataset?: {
    id: string;
    name: string;
  };
  name: string;
  type: string;
  config: ChartConfig;
  position: ChartPosition;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChartConfig {
  title?: ChartTitle;
  legend?: ChartLegend;
  axes?: ChartAxes;
  series?: ChartSeries[];
  colors?: string[];
  theme?: string;
  interaction?: ChartInteraction;
  animation?: ChartAnimation;
  [key: string]: any;
}

export interface ChartTitle {
  text?: string;
  subtitle?: string;
  position?: 'left' | 'center' | 'right';
  style?: any;
}

export interface ChartLegend {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  orientation: 'horizontal' | 'vertical';
  style?: any;
}

export interface ChartAxes {
  x_axis?: ChartAxis;
  y_axes?: ChartAxis[];
}

export interface ChartAxis {
  column: string;
  type?: 'category' | 'value' | 'time' | 'log';
  title?: string;
  label_rotation?: number;
  min?: number;
  max?: number;
  scale?: 'linear' | 'log';
}

export interface ChartSeries {
  column: string;
  name?: string;
  type?: string;
  color?: string;
  style?: any;
  aggregation?: 'none' | 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface ChartInteraction {
  zoom_enabled?: boolean;
  pan_enabled?: boolean;
  tooltip_enabled?: boolean;
  crosshair_enabled?: boolean;
}

export interface ChartAnimation {
  enabled: boolean;
  duration: number;
  easing?: string;
}

export interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Category related types
export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  sort_order: number;
  dashboard_count?: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  children?: Category[];
}

// Plugin related types
export interface DataSourcePlugin {
  name: string;
  type: string;
  version: string;
  description: string;
  category: string;
  connection_schema: any;
  features: string[];
  supported_sql_features: string[];
}

export interface ChartPlugin {
  name: string;
  type: string;
  version: string;
  description: string;
  category: string;
  library: string;
  config_schema: any;
  render_config: any;
  supported_data_types: string[];
  min_columns: number;
  max_columns: number;
  data_requirements: any;
  performance: any;
}

// Webview related types
export interface Webview {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description?: string;
  theme_config: WebviewTheme;
  navigation_config: WebviewNavigation;
  access_config: WebviewAccess;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WebviewTheme {
  primary_color: string;
  secondary_color: string;
  font_family?: string;
  logo_url?: string;
  custom_css?: string;
}

export interface WebviewNavigation {
  show_categories: boolean;
  show_search: boolean;
  show_user_menu: boolean;
  custom_links?: CustomLink[];
}

export interface CustomLink {
  label: string;
  url: string;
  icon?: string;
  target?: '_blank' | '_self';
}

export interface WebviewAccess {
  public: boolean;
  allowed_domains: string[];
  require_login: boolean;
  allowed_roles?: string[];
}

// Audit related types
export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}