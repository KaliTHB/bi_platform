// api-services/src/services/WebviewService.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface Webview {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  workspace_id: string;
  theme_config: ThemeConfig;
  branding_config: BrandingConfig;
  access_config: AccessConfig;
  seo_config: SeoConfig;
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  last_accessed_at?: Date;
  access_count: number;
  public_url: string;
}

interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  accent_color?: string;
  font_family?: string;
  custom_css?: string;
  layout_style: 'grid' | 'list' | 'masonry';
  show_search: boolean;
  show_filters: boolean;
  show_footer: boolean;
  show_header: boolean;
}

interface BrandingConfig {
  logo_url?: string;
  favicon_url?: string;
  company_name?: string;
  tagline?: string;
  footer_text?: string;
  contact_info?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

interface AccessConfig {
  is_public: boolean;
  require_login: boolean;
  allowed_domains?: string[];
  password_protection?: {
    enabled: boolean;
    password_hash?: string;
  };
  ip_whitelist?: string[];
  session_timeout_minutes?: number;
}

interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  og_image?: string;
  canonical_url?: string;
  robots_meta?: string;
}

interface WebviewCategory {
  id: string;
  webview_id: string;
  category_id: string;
  category_name: string;
  category_description?: string;
  category_color?: string;
  category_icon?: string;
  dashboard_count: number;
  order_index: number;
  is_visible: boolean;
  dashboards?: WebviewDashboard[];
}

interface WebviewDashboard {
  id: string;
  dashboard_id: string;
  webview_id: string;
  category_id: string;
  name: string;
  display_name: string;
  description?: string;
  thumbnail_url?: string;
  is_featured: boolean;
  is_public: boolean;
  view_count: number;
  last_viewed_at?: Date;
  order_index: number;
  tags: string[];
}

interface WebviewActivity {
  id: string;
  webview_id: string;
  session_id?: string;
  user_id?: string;
  event_type: string;
  category_id?: string;
  dashboard_id?: string;
  search_query?: string;
  navigation_path: string[];
  device_info: {
    type: string;
    screen_resolution: string;
    browser: string;
  };
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  duration_ms?: number;
  is_authenticated: boolean;
}

interface WebviewStats {
  total: number;
  featured: number;
  totalViews: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  topCategories: Array<{
    category_id: string;
    category_name: string;
    view_count: number;
  }>;
  topDashboards: Array<{
    dashboard_id: string;
    dashboard_name: string;
    view_count: number;
  }>;
}

interface WebviewAnalytics {
  period: string;
  total_views: number;
  unique_visitors: number;
  avg_session_duration_ms: number;
  bounce_rate: number;
  top_categories: Array<{
    category_id: string;
    category_name: string;
    views: number;
    unique_visitors: number;
  }>;
  top_dashboards: Array<{
    dashboard_id: string;
    dashboard_name: string;
    views: number;
    unique_visitors: number;
  }>;
  traffic_sources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  device_breakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  hourly_activity: Array<{
    hour: number;
    views: number;
  }>;
  geographic_distribution: Array<{
    country: string;
    visitors: number;
  }>;
}

interface WebviewCreateData {
  name: string;
  display_name?: string;
  description?: string;
  workspace_id: string;
  theme_config?: Partial<ThemeConfig>;
  branding_config?: Partial<BrandingConfig>;
  access_config?: Partial<AccessConfig>;
  seo_config?: Partial<SeoConfig>;
  is_active?: boolean;
  created_by: string;
}

interface WebviewUpdateData {
  name?: string;
  display_name?: string;
  description?: string;
  theme_config?: Partial<ThemeConfig>;
  branding_config?: Partial<BrandingConfig>;
  access_config?: Partial<AccessConfig>;
  seo_config?: Partial<SeoConfig>;
  is_active?: boolean;
}

interface GetWebviewsOptions {
  workspace_id?: string;
  include_inactive?: boolean;
  user_id?: string;
}

interface GetCategoriesOptions {
  search?: string;
  include_dashboards?: boolean;
  include_inactive?: boolean;
  public_access?: boolean;
}

interface GetAnalyticsOptions {
  period: string;
  start_date?: string;
  end_date?: string;
}

export class WebviewService {
  private webviews: Map<string, Webview> = new Map();
  private webviewCategories: Map<string, WebviewCategory[]> = new Map();
  private webviewDashboards: Map<string, WebviewDashboard[]> = new Map();
  private webviewActivities: WebviewActivity[] = [];

  constructor() {
    // Initialize with some sample data for development
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample webview
    const sampleWebview: Webview = {
      id: uuidv4(),
      name: 'company_dashboard',
      display_name: 'Company Dashboard Portal',
      description: 'Public dashboard portal for company metrics and insights',
      workspace_id: 'sample-workspace',
      theme_config: {
        primary_color: '#007bff',
        secondary_color: '#6c757d',
        background_color: '#ffffff',
        text_color: '#333333',
        accent_color: '#28a745',
        font_family: 'Inter, sans-serif',
        layout_style: 'grid',
        show_search: true,
        show_filters: true,
        show_footer: true,
        show_header: true
      },
      branding_config: {
        company_name: 'Acme Corporation',
        tagline: 'Data-driven insights for better decisions',
        footer_text: '© 2024 Acme Corporation. All rights reserved.',
        contact_info: {
          email: 'contact@acme.com',
          website: 'https://acme.com'
        }
      },
      access_config: {
        is_public: true,
        require_login: false,
        password_protection: {
          enabled: false
        },
        session_timeout_minutes: 60
      },
      seo_config: {
        title: 'Acme Corporation - Business Intelligence Dashboard',
        description: 'Explore our company metrics, sales data, and business insights through interactive dashboards.',
        keywords: ['business intelligence', 'dashboard', 'analytics', 'acme'],
        robots_meta: 'index, follow'
      },
      is_active: true,
      created_by: 'sample-user',
      created_at: new Date(),
      updated_at: new Date(),
      access_count: 1245,
      public_url: `https://dashboards.acme.com/company_dashboard`
    };

    this.webviews.set(sampleWebview.id, sampleWebview);

    // Sample categories
    const sampleCategories: WebviewCategory[] = [
      {
        id: uuidv4(),
        webview_id: sampleWebview.id,
        category_id: 'sales-category',
        category_name: 'Sales & Revenue',
        category_description: 'Sales performance and revenue analytics',
        category_color: '#007bff',
        category_icon: 'trending-up',
        dashboard_count: 5,
        order_index: 0,
        is_visible: true
      },
      {
        id: uuidv4(),
        webview_id: sampleWebview.id,
        category_id: 'operations-category',
        category_name: 'Operations',
        category_description: 'Operational metrics and KPIs',
        category_color: '#28a745',
        category_icon: 'settings',
        dashboard_count: 3,
        order_index: 1,
        is_visible: true
      },
      {
        id: uuidv4(),
        webview_id: sampleWebview.id,
        category_id: 'finance-category',
        category_name: 'Finance',
        category_description: 'Financial reports and analysis',
        category_color: '#ffc107',
        category_icon: 'dollar-sign',
        dashboard_count: 4,
        order_index: 2,
        is_visible: true
      }
    ];

    this.webviewCategories.set(sampleWebview.id, sampleCategories);

    // Sample dashboards
    const sampleDashboards: WebviewDashboard[] = [
      {
        id: uuidv4(),
        dashboard_id: 'dashboard-1',
        webview_id: sampleWebview.id,
        category_id: 'sales-category',
        name: 'monthly_sales',
        display_name: 'Monthly Sales Overview',
        description: 'Monthly sales performance and trends',
        is_featured: true,
        is_public: true,
        view_count: 234,
        order_index: 0,
        tags: ['sales', 'monthly', 'overview']
      },
      {
        id: uuidv4(),
        dashboard_id: 'dashboard-2',
        webview_id: sampleWebview.id,
        category_id: 'sales-category',
        name: 'regional_performance',
        display_name: 'Regional Performance',
        description: 'Sales performance by geographic region',
        is_featured: false,
        is_public: true,
        view_count: 156,
        order_index: 1,
        tags: ['sales', 'regional', 'geographic']
      },
      {
        id: uuidv4(),
        dashboard_id: 'dashboard-3',
        webview_id: sampleWebview.id,
        category_id: 'operations-category',
        name: 'operational_kpis',
        display_name: 'Operational KPIs',
        description: 'Key performance indicators for operations',
        is_featured: true,
        is_public: true,
        view_count: 189,
        order_index: 0,
        tags: ['operations', 'kpi', 'performance']
      }
    ];

    this.webviewDashboards.set(sampleWebview.id, sampleDashboards);
  }

  async getWebviews(options: GetWebviewsOptions): Promise<Webview[]> {
    try {
      logger.info('Getting webviews', { options });

      let webviews = Array.from(this.webviews.values());

      // Filter by workspace
      if (options.workspace_id) {
        webviews = webviews.filter(w => w.workspace_id === options.workspace_id);
      }

      // Filter by active status
      if (!options.include_inactive) {
        webviews = webviews.filter(w => w.is_active);
      }

      // Sort by display name
      webviews.sort((a, b) => a.display_name.localeCompare(b.display_name));

      return webviews;
    } catch (error: any) {
      logger.error('Error getting webviews:', error);
      throw new Error(`Failed to get webviews: ${error.message}`);
    }
  }

  async createWebview(webviewData: WebviewCreateData): Promise<Webview> {
    try {
      logger.info('Creating webview', { name: webviewData.name });

      // Validate name uniqueness within workspace
      const existingWebview = Array.from(this.webviews.values())
        .find(w => w.workspace_id === webviewData.workspace_id && w.name === webviewData.name);

      if (existingWebview) {
        throw new Error(`Webview with name '${webviewData.name}' already exists in this workspace`);
      }

      // Create default configurations
      const defaultThemeConfig: ThemeConfig = {
        primary_color: '#007bff',
        secondary_color: '#6c757d',
        background_color: '#ffffff',
        text_color: '#333333',
        layout_style: 'grid',
        show_search: true,
        show_filters: true,
        show_footer: true,
        show_header: true,
        ...webviewData.theme_config
      };

      const defaultAccessConfig: AccessConfig = {
        is_public: false,
        require_login: true,
        password_protection: { enabled: false },
        session_timeout_minutes: 60,
        ...webviewData.access_config
      };

      const webview: Webview = {
        id: uuidv4(),
        name: webviewData.name,
        display_name: webviewData.display_name || webviewData.name,
        description: webviewData.description,
        workspace_id: webviewData.workspace_id,
        theme_config: defaultThemeConfig,
        branding_config: webviewData.branding_config || {},
        access_config: defaultAccessConfig,
        seo_config: webviewData.seo_config || {},
        is_active: webviewData.is_active !== false,
        created_by: webviewData.created_by,
        created_at: new Date(),
        updated_at: new Date(),
        access_count: 0,
        public_url: `${process.env.PUBLIC_URL || 'https://app.example.com'}/webview/${webviewData.name}`
      };

      this.webviews.set(webview.id, webview);
      
      // Initialize empty categories and dashboards for the webview
      this.webviewCategories.set(webview.id, []);
      this.webviewDashboards.set(webview.id, []);

      logger.info('Webview created successfully', { id: webview.id, name: webview.name });
      return webview;
    } catch (error: any) {
      logger.error('Error creating webview:', error);
      throw new Error(`Failed to create webview: ${error.message}`);
    }
  }

  async getWebviewById(id: string): Promise<Webview | null> {
    try {
      const webview = this.webviews.get(id);
      
      if (webview) {
        // Update access stats
        webview.last_accessed_at = new Date();
        webview.access_count += 1;
        this.webviews.set(id, webview);
      }

      return webview || null;
    } catch (error: any) {
      logger.error('Error getting webview by ID:', error);
      throw new Error(`Failed to get webview: ${error.message}`);
    }
  }

  async getWebviewByName(name: string, skipAccessTracking: boolean = false): Promise<Webview | null> {
    try {
      const webview = Array.from(this.webviews.values())
        .find(w => w.name === name);

      if (webview && !skipAccessTracking) {
        // Update access stats
        webview.last_accessed_at = new Date();
        webview.access_count += 1;
        this.webviews.set(webview.id, webview);
      }

      return webview || null;
    } catch (error: any) {
      logger.error('Error getting webview by name:', error);
      throw new Error(`Failed to get webview: ${error.message}`);
    }
  }

  async updateWebview(id: string, updateData: WebviewUpdateData, updatedBy: string): Promise<Webview> {
    try {
      logger.info('Updating webview', { id, updateData });

      const webview = this.webviews.get(id);
      if (!webview) {
        throw new Error('Webview not found');
      }

      // Validate name uniqueness if name is being updated
      if (updateData.name && updateData.name !== webview.name) {
        const existingWebview = Array.from(this.webviews.values())
          .find(w => w.workspace_id === webview.workspace_id && w.name === updateData.name);
        
        if (existingWebview) {
          throw new Error(`Webview with name '${updateData.name}' already exists in this workspace`);
        }
      }

      const updatedWebview: Webview = {
        ...webview,
        name: updateData.name || webview.name,
        display_name: updateData.display_name || webview.display_name,
        description: updateData.description !== undefined ? updateData.description : webview.description,
        theme_config: updateData.theme_config ? { ...webview.theme_config, ...updateData.theme_config } : webview.theme_config,
        branding_config: updateData.branding_config ? { ...webview.branding_config, ...updateData.branding_config } : webview.branding_config,
        access_config: updateData.access_config ? { ...webview.access_config, ...updateData.access_config } : webview.access_config,
        seo_config: updateData.seo_config ? { ...webview.seo_config, ...updateData.seo_config } : webview.seo_config,
        is_active: updateData.is_active !== undefined ? updateData.is_active : webview.is_active,
        updated_by: updatedBy,
        updated_at: new Date()
      };

      // Update public URL if name changed
      if (updateData.name && updateData.name !== webview.name) {
        updatedWebview.public_url = `${process.env.PUBLIC_URL || 'https://app.example.com'}/webview/${updateData.name}`;
      }

      this.webviews.set(id, updatedWebview);

      logger.info('Webview updated successfully', { id });
      return updatedWebview;
    } catch (error: any) {
      logger.error('Error updating webview:', error);
      throw new Error(`Failed to update webview: ${error.message}`);
    }
  }

  async deleteWebview(id: string): Promise<void> {
    try {
      logger.info('Deleting webview', { id });

      const webview = this.webviews.get(id);
      if (!webview) {
        throw new Error('Webview not found');
      }

      // Clean up related data
      this.webviews.delete(id);
      this.webviewCategories.delete(id);
      this.webviewDashboards.delete(id);
      
      // Clean up activities
      this.webviewActivities = this.webviewActivities.filter(a => a.webview_id !== id);

      logger.info('Webview deleted successfully', { id });
    } catch (error: any) {
      logger.error('Error deleting webview:', error);
      throw new Error(`Failed to delete webview: ${error.message}`);
    }
  }

  async getWebviewCategories(webviewId: string, options: GetCategoriesOptions): Promise<WebviewCategory[]> {
    try {
      logger.info('Getting webview categories', { webviewId, options });

      let categories = this.webviewCategories.get(webviewId) || [];

      // Filter by visibility if public access
      if (options.public_access) {
        categories = categories.filter(c => c.is_visible);
      }

      // Filter by search term
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        categories = categories.filter(c => 
          c.category_name.toLowerCase().includes(searchTerm) ||
          (c.category_description && c.category_description.toLowerCase().includes(searchTerm))
        );
      }

      // Include dashboards if requested
      if (options.include_dashboards) {
        const allDashboards = this.webviewDashboards.get(webviewId) || [];
        
        categories = categories.map(category => {
          let dashboards = allDashboards.filter(d => d.category_id === category.category_id);
          
          // Filter by public access
          if (options.public_access) {
            dashboards = dashboards.filter(d => d.is_public);
          }

          // Sort dashboards by order index, then by name
          dashboards.sort((a, b) => {
            if (a.order_index !== b.order_index) {
              return a.order_index - b.order_index;
            }
            return a.display_name.localeCompare(b.display_name);
          });

          return {
            ...category,
            dashboards
          };
        });
      }

      // Sort categories by order index
      categories.sort((a, b) => a.order_index - b.order_index);

      return categories;
    } catch (error: any) {
      logger.error('Error getting webview categories:', error);
      throw new Error(`Failed to get webview categories: ${error.message}`);
    }
  }

  async getPublicDashboard(webviewId: string, dashboardId: string): Promise<WebviewDashboard | null> {
    try {
      const dashboards = this.webviewDashboards.get(webviewId) || [];
      const dashboard = dashboards.find(d => d.dashboard_id === dashboardId);

      if (!dashboard || !dashboard.is_public) {
        return null;
      }

      // Update view count
      dashboard.view_count += 1;
      dashboard.last_viewed_at = new Date();

      return dashboard;
    } catch (error: any) {
      logger.error('Error getting public dashboard:', error);
      throw new Error(`Failed to get public dashboard: ${error.message}`);
    }
  }

  async getWebviewStats(webviewId: string): Promise<WebviewStats> {
    try {
      const categories = this.webviewCategories.get(webviewId) || [];
      const dashboards = this.webviewDashboards.get(webviewId) || [];
      
      const totalDashboards = dashboards.length;
      const featuredDashboards = dashboards.filter(d => d.is_featured).length;
      const totalViews = dashboards.reduce((sum, d) => sum + d.view_count, 0);

      // Calculate unique visitors from activities (simplified)
      const activities = this.webviewActivities.filter(a => a.webview_id === webviewId);
      const uniqueVisitors = new Set(
        activities.map(a => a.user_id || a.ip_address).filter(Boolean)
      ).size;

      // Calculate average session duration
      const avgSessionDuration = activities.length > 0 
        ? activities.reduce((sum, a) => sum + (a.duration_ms || 0), 0) / activities.length 
        : 0;

      // Top categories by view count
      const topCategories = categories.map(cat => {
        const categoryDashboards = dashboards.filter(d => d.category_id === cat.category_id);
        const viewCount = categoryDashboards.reduce((sum, d) => sum + d.view_count, 0);
        return {
          category_id: cat.category_id,
          category_name: cat.category_name,
          view_count: viewCount
        };
      }).sort((a, b) => b.view_count - a.view_count).slice(0, 5);

      // Top dashboards by view count
      const topDashboards = dashboards
        .map(d => ({
          dashboard_id: d.dashboard_id,
          dashboard_name: d.display_name,
          view_count: d.view_count
        }))
        .sort((a, b) => b.view_count - a.view_count)
        .slice(0, 5);

      return {
        total: totalDashboards,
        featured: featuredDashboards,
        totalViews,
        uniqueVisitors,
        avgSessionDuration,
        topCategories,
        topDashboards
      };
    } catch (error: any) {
      logger.error('Error getting webview stats:', error);
      throw new Error(`Failed to get webview stats: ${error.message}`);
    }
  }

  async logActivity(webviewId: string, activityData: any, isAuthenticated: boolean): Promise<void> {
    try {
      const activity: WebviewActivity = {
        id: uuidv4(),
        webview_id: webviewId,
        session_id: activityData.session_id || uuidv4(),
        user_id: activityData.user_id,
        event_type: activityData.event_type,
        category_id: activityData.category_id,
        dashboard_id: activityData.dashboard_id,
        search_query: activityData.search_query,
        navigation_path: activityData.navigation_path || [],
        device_info: activityData.device_info || {
          type: 'unknown',
          screen_resolution: 'unknown',
          browser: 'unknown'
        },
        ip_address: activityData.ip_address,
        user_agent: activityData.user_agent,
        timestamp: activityData.timestamp || new Date(),
        duration_ms: activityData.duration_ms,
        is_authenticated: isAuthenticated
      };

      this.webviewActivities.push(activity);

      // Keep only recent activities (last 10000) to prevent memory issues
      if (this.webviewActivities.length > 10000) {
        this.webviewActivities = this.webviewActivities.slice(-8000);
      }

      logger.info('Activity logged', { webviewId, eventType: activity.event_type });
    } catch (error: any) {
      logger.error('Error logging activity:', error);
      // Don't throw error for activity logging failures
    }
  }

  async getWebviewAnalytics(webviewId: string, options: GetAnalyticsOptions): Promise<WebviewAnalytics> {
    try {
      logger.info('Getting webview analytics', { webviewId, options });

      // Get activities for the webview
      let activities = this.webviewActivities.filter(a => a.webview_id === webviewId);

      // Filter by date range if provided
      if (options.start_date || options.end_date) {
        const startDate = options.start_date ? new Date(options.start_date) : new Date(0);
        const endDate = options.end_date ? new Date(options.end_date) : new Date();
        
        activities = activities.filter(a => 
          a.timestamp >= startDate && a.timestamp <= endDate
        );
      }

      // Calculate basic metrics
      const totalViews = activities.length;
      const uniqueVisitors = new Set(
        activities.map(a => a.user_id || a.ip_address).filter(Boolean)
      ).size;

      const avgSessionDuration = activities.length > 0 
        ? activities.reduce((sum, a) => sum + (a.duration_ms || 0), 0) / activities.length 
        : 0;

      // Calculate bounce rate (simplified: single page views)
      const sessions = new Map<string, number>();
      activities.forEach(a => {
        const sessionKey = a.session_id || `${a.user_id || a.ip_address}_${a.timestamp.getDate()}`;
        sessions.set(sessionKey, (sessions.get(sessionKey) || 0) + 1);
      });
      
      const singlePageSessions = Array.from(sessions.values()).filter(count => count === 1).length;
      const bounceRate = sessions.size > 0 ? singlePageSessions / sessions.size : 0;

      // Top categories
      const categoryViews = new Map<string, { views: number; visitors: Set<string> }>();
      activities.filter(a => a.category_id).forEach(a => {
        const key = a.category_id!;
        const visitor = a.user_id || a.ip_address || 'anonymous';
        
        if (!categoryViews.has(key)) {
          categoryViews.set(key, { views: 0, visitors: new Set() });
        }
        
        const category = categoryViews.get(key)!;
        category.views += 1;
        category.visitors.add(visitor);
      });

      const categories = this.webviewCategories.get(webviewId) || [];
      const topCategories = Array.from(categoryViews.entries()).map(([categoryId, data]) => {
        const category = categories.find(c => c.category_id === categoryId);
        return {
          category_id: categoryId,
          category_name: category?.category_name || 'Unknown',
          views: data.views,
          unique_visitors: data.visitors.size
        };
      }).sort((a, b) => b.views - a.views).slice(0, 10);

      // Top dashboards
      const dashboardViews = new Map<string, { views: number; visitors: Set<string> }>();
      activities.filter(a => a.dashboard_id).forEach(a => {
        const key = a.dashboard_id!;
        const visitor = a.user_id || a.ip_address || 'anonymous';
        
        if (!dashboardViews.has(key)) {
          dashboardViews.set(key, { views: 0, visitors: new Set() });
        }
        
        const dashboard = dashboardViews.get(key)!;
        dashboard.views += 1;
        dashboard.visitors.add(visitor);
      });

      const dashboards = this.webviewDashboards.get(webviewId) || [];
      const topDashboards = Array.from(dashboardViews.entries()).map(([dashboardId, data]) => {
        const dashboard = dashboards.find(d => d.dashboard_id === dashboardId);
        return {
          dashboard_id: dashboardId,
          dashboard_name: dashboard?.display_name || 'Unknown',
          views: data.views,
          unique_visitors: data.visitors.size
        };
      }).sort((a, b) => b.views - a.views).slice(0, 10);

      // Traffic sources (mock data)
      const trafficSources = [
        { source: 'direct', visitors: Math.floor(uniqueVisitors * 0.4), percentage: 40 },
        { source: 'search', visitors: Math.floor(uniqueVisitors * 0.3), percentage: 30 },
        { source: 'social', visitors: Math.floor(uniqueVisitors * 0.2), percentage: 20 },
        { source: 'email', visitors: Math.floor(uniqueVisitors * 0.1), percentage: 10 }
      ];

      // Device breakdown (simplified from user agent analysis)
      const deviceTypes = activities.reduce((acc, a) => {
        const deviceType = a.device_info.type || 'desktop';
        acc[deviceType] = (acc[deviceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const deviceBreakdown = {
        desktop: deviceTypes.desktop || 0,
        mobile: deviceTypes.mobile || 0,
        tablet: deviceTypes.tablet || 0
      };

      // Hourly activity
      const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        views: activities.filter(a => a.timestamp.getHours() === hour).length
      }));

      // Geographic distribution (mock data)
      const geographicDistribution = [
        { country: 'United States', visitors: Math.floor(uniqueVisitors * 0.4) },
        { country: 'United Kingdom', visitors: Math.floor(uniqueVisitors * 0.2) },
        { country: 'Canada', visitors: Math.floor(uniqueVisitors * 0.15) },
        { country: 'Australia', visitors: Math.floor(uniqueVisitors * 0.1) },
        { country: 'Germany', visitors: Math.floor(uniqueVisitors * 0.08) },
        { country: 'Other', visitors: Math.floor(uniqueVisitors * 0.07) }
      ].filter(item => item.visitors > 0);

      return {
        period: options.period,
        total_views: totalViews,
        unique_visitors: uniqueVisitors,
        avg_session_duration_ms: avgSessionDuration,
        bounce_rate: bounceRate,
        top_categories: topCategories,
        top_dashboards: topDashboards,
        traffic_sources: trafficSources,
        device_breakdown: deviceBreakdown,
        hourly_activity: hourlyActivity,
        geographic_distribution: geographicDistribution
      };
    } catch (error: any) {
      logger.error('Error getting webview analytics:', error);
      throw new Error(`Failed to get webview analytics: ${error.message}`);
    }
  }

  async updateWebviewSettings(id: string, settings: any, updatedBy: string): Promise<Webview> {
    try {
      logger.info('Updating webview settings', { id, settings });

      const webview = this.webviews.get(id);
      if (!webview) {
        throw new Error('Webview not found');
      }

      // Update specific settings
      const updatedWebview: Webview = {
        ...webview,
        theme_config: settings.theme_config ? { ...webview.theme_config, ...settings.theme_config } : webview.theme_config,
        branding_config: settings.branding_config ? { ...webview.branding_config, ...settings.branding_config } : webview.branding_config,
        access_config: settings.access_config ? { ...webview.access_config, ...settings.access_config } : webview.access_config,
        seo_config: settings.seo_config ? { ...webview.seo_config, ...settings.seo_config } : webview.seo_config,
        updated_by: updatedBy,
        updated_at: new Date()
      };

      this.webviews.set(id, updatedWebview);

      logger.info('Webview settings updated successfully', { id });
      return updatedWebview;
    } catch (error: any) {
      logger.error('Error updating webview settings:', error);
      throw new Error(`Failed to update webview settings: ${error.message}`);
    }
  }
}