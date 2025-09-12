// api-services/src/services/DashboardService.ts
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ChartService } from './ChartService';
import bcrypt from 'bcryptjs';

// ✅ INTERFACES
interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  category_id?: string;
  layout_config: any;
  theme_config: any;
  global_filters: GlobalFilter[];
  filter_connections: FilterConnection[];
  is_public: boolean;
  is_featured: boolean;
  tags: string[];
  auto_refresh_interval?: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  view_count: number;
  status: string;
}

interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'dropdown' | 'multiselect' | 'date_range' | 'text' | 'number_range';
  data_source: {
    type: 'query' | 'static' | 'dataset';
    source: string;
    value_column: string;
    label_column?: string;
  };
  default_value?: any;
  is_required: boolean;
  is_visible: boolean;
  position: number;
}

interface FilterConnection {
  filter_id: string;
  chart_id: string;
  target_column: string;
  connection_type: 'direct' | 'parameter' | 'calculated';
  transformation?: string;
}

interface DashboardChart {
  chart_id: string;
  dashboard_id: string;
  position: { x: number; y: number; w: number; h: number };
  order_index: number;
  is_visible: boolean;
}

interface SharingConfig {
  id: string;
  dashboard_id: string;
  share_type: 'public' | 'password' | 'private';
  share_token: string;
  expires_at?: Date;
  hashed_password?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  access_count: number;
}

interface DashboardCreateData {
  name: string;
  display_name?: string;
  description?: string;
  category_id?: string;
  layout_config?: any;
  theme_config?: any;
  global_filters?: GlobalFilter[];
  filter_connections?: FilterConnection[];
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
  auto_refresh_interval?: number;
  created_by: string;
  workspace_id?: string;
}

interface DashboardUpdateData {
  name?: string;
  display_name?: string;
  description?: string;
  category_id?: string;
  layout_config?: any;
  theme_config?: any;
  global_filters?: GlobalFilter[];
  filter_connections?: FilterConnection[];
  is_public?: boolean;
  is_featured?: boolean;
  tags?: string[];
  auto_refresh_interval?: number;
}

interface GetDashboardsOptions {
  page: number;
  limit: number;
  filters: {
    category_id?: string;
    created_by?: string;
    is_public?: boolean;
    is_featured?: boolean;
    search?: string;
  };
  include_charts?: boolean;
}

interface ExportResult {
  export_id: string;
  format: string;
  file_path?: string;
  download_url?: string;
  file_size_bytes?: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
  estimated_completion_time?: Date;
}

interface RefreshResult {
  refresh_id: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  started_at: Date;
  estimated_completion_time?: Date;
  charts_to_refresh: number;
}

interface FilterApplicationResult {
  results: Array<{
    chart_id: string;
    success: boolean;
    data?: any;
    error?: string;
    cache_invalidated?: boolean;
  }>;
  affected_charts: number;
}

interface CacheStatus {
  dashboard_cached: boolean;
  charts_cached: number;
  total_charts: number;
  last_cache_update?: Date;
  cache_size_mb?: number;
}

interface ShareDashboardData {
  share_type: 'public' | 'password' | 'private';
  expires_at?: Date;
  password?: string;
  created_by: string;
}

export class DashboardService {
  private database: Pool;
  private chartService: ChartService;
  // In-memory storage for development (replace with actual database queries later)
  private dashboards: Map<string, Dashboard> = new Map();
  private dashboardCharts: Map<string, DashboardChart[]> = new Map();
  private sharingConfigs: Map<string, SharingConfig> = new Map();
  private refreshJobs: Map<string, RefreshResult> = new Map();
  private exportJobs: Map<string, ExportResult> = new Map();

  constructor(database?: Pool) {
    if (!database) {
      throw new Error('Database connection is required for DashboardService');
    }
    
    this.database = database;
    
    if (typeof this.database.query !== 'function') {
      throw new Error('Invalid database connection - missing query method');
    }
    
    this.chartService = new ChartService(database);
    this.initializeSampleData();
    
    logger.info('DashboardService initialized successfully', {
      service: 'bi-platform-api',
      hasDatabase: !!this.database,
      hasQuery: typeof this.database.query === 'function'
    });
  }

  private initializeSampleData(): void {
    const sampleDashboard: Dashboard = {
      id: uuidv4(),
      workspace_id: 'sample-workspace',
      name: 'sales_overview',
      display_name: 'Sales Overview',
      description: 'Key sales metrics and performance indicators',
      category_id: 'analytics',
      layout_config: {
        grid: { columns: 12, rows: 8 },
        responsive: true
      },
      theme_config: { primary_color: '#1976d2' },
      global_filters: [
        {
          id: uuidv4(),
          name: 'date_range',
          display_name: 'Date Range',
          type: 'date_range',
          data_source: {
            type: 'static',
            source: 'date_range',
            value_column: 'value'
          },
          default_value: { start: '2024-01-01', end: '2024-12-31' },
          is_required: false,
          is_visible: true,
          position: 1
        }
      ],
      filter_connections: [],
      is_public: false,
      is_featured: true,
      tags: ['sales', 'analytics', 'kpi'],
      auto_refresh_interval: 300,
      created_by: 'sample-user',
      created_at: new Date(),
      updated_at: new Date(),
      view_count: 0,
      status: 'active'
    };

    this.dashboards.set(sampleDashboard.id, sampleDashboard);
    this.dashboardCharts.set(sampleDashboard.id, []);
  }

  // ✅ EXISTING CORE METHODS
  async getDashboards(workspaceId: string, options: GetDashboardsOptions): Promise<{
    dashboards: Dashboard[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    pagination: any;
  }> {
    try {
      logger.info('Getting dashboards', { workspaceId, options });

      let filteredDashboards = Array.from(this.dashboards.values())
        .filter(d => d.workspace_id === workspaceId);

      // Apply filters
      if (options.filters.category_id) {
        filteredDashboards = filteredDashboards.filter(d => d.category_id === options.filters.category_id);
      }
      if (options.filters.created_by) {
        filteredDashboards = filteredDashboards.filter(d => d.created_by === options.filters.created_by);
      }
      if (options.filters.is_public !== undefined) {
        filteredDashboards = filteredDashboards.filter(d => d.is_public === options.filters.is_public);
      }
      if (options.filters.is_featured !== undefined) {
        filteredDashboards = filteredDashboards.filter(d => d.is_featured === options.filters.is_featured);
      }
      if (options.filters.search) {
        const searchTerm = options.filters.search.toLowerCase();
        filteredDashboards = filteredDashboards.filter(d => 
          d.name.toLowerCase().includes(searchTerm) || 
          d.display_name.toLowerCase().includes(searchTerm) ||
          (d.description && d.description.toLowerCase().includes(searchTerm))
        );
      }

      const total = filteredDashboards.length;
      const pages = Math.ceil(total / options.limit);
      const startIndex = (options.page - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const dashboards = filteredDashboards.slice(startIndex, endIndex);

      return {
        dashboards,
        total,
        page: options.page,
        limit: options.limit,
        pages,
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages: pages
        }
      };
    } catch (error: any) {
      logger.error('Error getting dashboards:', error);
      throw new Error(`Failed to get dashboards: ${error.message}`);
    }
  }

  async createDashboard(dashboardData: DashboardCreateData): Promise<Dashboard> {
    try {
      logger.info('Creating dashboard', { name: dashboardData.name });

      // Check for name uniqueness
      const existingDashboard = Array.from(this.dashboards.values())
        .find(d => d.workspace_id === dashboardData.workspace_id && d.name === dashboardData.name);

      if (existingDashboard) {
        throw new Error(`Dashboard with name '${dashboardData.name}' already exists in this workspace`);
      }

      const newDashboard: Dashboard = {
        id: uuidv4(),
        workspace_id: dashboardData.workspace_id || 'default-workspace',
        name: dashboardData.name,
        display_name: dashboardData.display_name || dashboardData.name,
        description: dashboardData.description,
        category_id: dashboardData.category_id,
        layout_config: dashboardData.layout_config || {},
        theme_config: dashboardData.theme_config || {},
        global_filters: dashboardData.global_filters || [],
        filter_connections: dashboardData.filter_connections || [],
        is_public: dashboardData.is_public || false,
        is_featured: dashboardData.is_featured || false,
        tags: dashboardData.tags || [],
        auto_refresh_interval: dashboardData.auto_refresh_interval,
        created_by: dashboardData.created_by,
        created_at: new Date(),
        updated_at: new Date(),
        view_count: 0,
        status: 'active'
      };

      this.dashboards.set(newDashboard.id, newDashboard);
      this.dashboardCharts.set(newDashboard.id, []);

      logger.info('Dashboard created successfully', { id: newDashboard.id });
      return newDashboard;
    } catch (error: any) {
      logger.error('Error creating dashboard:', error);
      throw new Error(`Failed to create dashboard: ${error.message}`);
    }
  }

  async getDashboard(id: string, includeCharts: boolean = false): Promise<Dashboard | null> {
    try {
      const dashboard = this.dashboards.get(id);
      
      if (!dashboard) {
        return null;
      }

      // Increment view count
      dashboard.view_count++;
      this.dashboards.set(id, dashboard);

      return dashboard;
    } catch (error: any) {
      logger.error('Error getting dashboard:', error);
      throw new Error(`Failed to get dashboard: ${error.message}`);
    }
  }

  async updateDashboard(id: string, updateData: DashboardUpdateData): Promise<Dashboard> {
    try {
      const existingDashboard = this.dashboards.get(id);
      
      if (!existingDashboard) {
        throw new Error('Dashboard not found');
      }

      const updatedDashboard: Dashboard = {
        ...existingDashboard,
        ...updateData,
        updated_at: new Date()
      };

      this.dashboards.set(id, updatedDashboard);

      logger.info('Dashboard updated successfully', { id });
      return updatedDashboard;
    } catch (error: any) {
      logger.error('Error updating dashboard:', error);
      throw new Error(`Failed to update dashboard: ${error.message}`);
    }
  }

  async deleteDashboard(id: string): Promise<void> {
    try {
      const dashboard = this.dashboards.get(id);
      
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Delete dashboard
      this.dashboards.delete(id);
      this.dashboardCharts.delete(id);

      // Delete related sharing configs
      for (const [shareId, config] of this.sharingConfigs.entries()) {
        if (config.dashboard_id === id) {
          this.sharingConfigs.delete(shareId);
        }
      }

      logger.info('Dashboard deleted successfully', { id });
    } catch (error: any) {
      logger.error('Error deleting dashboard:', error);
      throw new Error(`Failed to delete dashboard: ${error.message}`);
    }
  }

  // 🚀 ADDITIONAL CRUD OPERATIONS
  async duplicateDashboard(id: string, data: { name?: string; created_by: string }): Promise<Dashboard> {
    try {
      const originalDashboard = this.dashboards.get(id);
      
      if (!originalDashboard) {
        throw new Error('Dashboard not found');
      }

      const duplicatedDashboard: Dashboard = {
        ...originalDashboard,
        id: uuidv4(),
        name: data.name || `${originalDashboard.name}_copy`,
        display_name: data.name || `${originalDashboard.display_name} (Copy)`,
        created_by: data.created_by,
        created_at: new Date(),
        updated_at: new Date(),
        view_count: 0
      };

      this.dashboards.set(duplicatedDashboard.id, duplicatedDashboard);
      
      // Duplicate charts
      const originalCharts = this.dashboardCharts.get(id) || [];
      this.dashboardCharts.set(duplicatedDashboard.id, [...originalCharts]);

      logger.info('Dashboard duplicated successfully', { 
        originalId: id, 
        duplicatedId: duplicatedDashboard.id 
      });
      
      return duplicatedDashboard;
    } catch (error: any) {
      logger.error('Error duplicating dashboard:', error);
      throw new Error(`Failed to duplicate dashboard: ${error.message}`);
    }
  }

  async getDashboardCharts(dashboardId: string): Promise<DashboardChart[]> {
    try {
      const charts = this.dashboardCharts.get(dashboardId) || [];
      return charts;
    } catch (error: any) {
      logger.error('Error getting dashboard charts:', error);
      throw new Error(`Failed to get dashboard charts: ${error.message}`);
    }
  }

  // 🚀 NEW CACHE & FILTER OPERATIONS
  async getDashboardData(dashboardId: string, filters: any = {}, forceRefresh: boolean = false): Promise<any> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Get dashboard charts
      const charts = this.dashboardCharts.get(dashboardId) || [];
      
      // Apply filters and get data for each chart
      const chartData = await Promise.all(
        charts.map(async (chart) => {
          try {
            // Mock chart data with filters applied
            return {
              chart_id: chart.chart_id,
              data: {
                columns: ['category', 'value'],
                rows: [
                  ['A', Math.floor(Math.random() * 100)],
                  ['B', Math.floor(Math.random() * 100)],
                  ['C', Math.floor(Math.random() * 100)]
                ]
              },
              filters_applied: filters,
              cached: !forceRefresh,
              last_updated: new Date()
            };
          } catch (error) {
            logger.error(`Error getting data for chart ${chart.chart_id}:`, error);
            return {
              chart_id: chart.chart_id,
              error: 'Failed to load chart data',
              filters_applied: filters
            };
          }
        })
      );

      return {
        dashboard_id: dashboardId,
        dashboard_name: dashboard.name,
        charts: chartData,
        global_filters: dashboard.global_filters || [],
        layout: dashboard.layout_config,
        last_updated: new Date(),
        cache_status: {
          enabled: true,
          last_refresh: new Date()
        }
      };
    } catch (error: any) {
      logger.error('Error getting dashboard data:', error);
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  async refreshDashboard(dashboardId: string): Promise<RefreshResult> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const refreshId = uuidv4();
      const charts = this.dashboardCharts.get(dashboardId) || [];
      
      const refreshResult: RefreshResult = {
        refresh_id: refreshId,
        status: 'initiated',
        started_at: new Date(),
        estimated_completion_time: new Date(Date.now() + 30000), // 30 seconds
        charts_to_refresh: charts.length
      };

      this.refreshJobs.set(refreshId, refreshResult);

      // Simulate async refresh
      setTimeout(() => {
        const updatedResult = { ...refreshResult, status: 'completed' as const };
        this.refreshJobs.set(refreshId, updatedResult);
      }, 5000);

      return refreshResult;
    } catch (error: any) {
      logger.error('Error refreshing dashboard:', error);
      throw new Error(`Failed to refresh dashboard: ${error.message}`);
    }
  }

  async getRefreshStatus(refreshId: string): Promise<RefreshResult | null> {
    return this.refreshJobs.get(refreshId) || null;
  }

  async applyFilters(dashboardId: string, filters: any[]): Promise<FilterApplicationResult> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const charts = this.dashboardCharts.get(dashboardId) || [];
      
      const results = charts.map(chart => ({
        chart_id: chart.chart_id,
        success: true,
        data: { filtered: true, filters_applied: filters },
        cache_invalidated: true
      }));

      return {
        results,
        affected_charts: charts.length
      };
    } catch (error: any) {
      logger.error('Error applying filters:', error);
      throw new Error(`Failed to apply filters: ${error.message}`);
    }
  }

  async exportDashboard(dashboardId: string, format: string, options: any = {}): Promise<ExportResult> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const exportId = uuidv4();
      const exportResult: ExportResult = {
        export_id: exportId,
        format,
        status: 'processing',
        created_at: new Date(),
        estimated_completion_time: new Date(Date.now() + 60000) // 1 minute
      };

      this.exportJobs.set(exportId, exportResult);

      // Simulate async export
      setTimeout(() => {
        const updatedResult = { 
          ...exportResult, 
          status: 'completed' as const,
          completed_at: new Date(),
          file_path: `/exports/${exportId}.${format}`,
          download_url: `/api/exports/${exportId}/download`,
          file_size_bytes: 1024000 // 1MB
        };
        this.exportJobs.set(exportId, updatedResult);
      }, 10000);

      return exportResult;
    } catch (error: any) {
      logger.error('Error exporting dashboard:', error);
      throw new Error(`Failed to export dashboard: ${error.message}`);
    }
  }

  async getExportStatus(exportId: string): Promise<ExportResult | null> {
    return this.exportJobs.get(exportId) || null;
  }

  async getCacheStatus(dashboardId: string): Promise<CacheStatus> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const charts = this.dashboardCharts.get(dashboardId) || [];
      
      return {
        dashboard_cached: true,
        charts_cached: charts.length,
        total_charts: charts.length,
        last_cache_update: new Date(),
        cache_size_mb: 2.5
      };
    } catch (error: any) {
      logger.error('Error getting cache status:', error);
      throw new Error(`Failed to get cache status: ${error.message}`);
    }
  }

  async clearCache(dashboardId: string): Promise<void> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Mock cache clearing
      logger.info('Cache cleared for dashboard', { dashboardId });
    } catch (error: any) {
      logger.error('Error clearing cache:', error);
      throw new Error(`Failed to clear cache: ${error.message}`);
    }
  }

  // ✅ SHARING & ANALYTICS METHODS
  async shareDashboard(dashboardId: string, shareData: ShareDashboardData): Promise<SharingConfig> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const sharingConfig: SharingConfig = {
        id: uuidv4(),
        dashboard_id: dashboardId,
        share_type: shareData.share_type,
        share_token: uuidv4(),
        expires_at: shareData.expires_at,
        hashed_password: shareData.password ? await bcrypt.hash(shareData.password, 10) : undefined,
        is_active: true,
        created_by: shareData.created_by,
        created_at: new Date(),
        access_count: 0
      };

      this.sharingConfigs.set(sharingConfig.id, sharingConfig);
      return sharingConfig;
    } catch (error: any) {
      logger.error('Error sharing dashboard:', error);
      throw new Error(`Failed to share dashboard: ${error.message}`);
    }
  }

  async updateSharingSettings(dashboardId: string, updateData: any): Promise<SharingConfig | null> {
    try {
      for (const [id, config] of this.sharingConfigs.entries()) {
        if (config.dashboard_id === dashboardId) {
          const updatedConfig = { ...config, ...updateData };
          this.sharingConfigs.set(id, updatedConfig);
          return updatedConfig;
        }
      }
      return null;
    } catch (error: any) {
      logger.error('Error updating sharing settings:', error);
      throw new Error(`Failed to update sharing settings: ${error.message}`);
    }
  }

  async getSharingSettings(dashboardId: string): Promise<SharingConfig | null> {
    try {
      for (const config of this.sharingConfigs.values()) {
        if (config.dashboard_id === dashboardId && config.is_active) {
          return config;
        }
      }
      return null;
    } catch (error: any) {
      logger.error('Error getting sharing settings:', error);
      throw new Error(`Failed to get sharing settings: ${error.message}`);
    }
  }

  async revokeDashboardSharing(dashboardId: string): Promise<void> {
    try {
      for (const [id, config] of this.sharingConfigs.entries()) {
        if (config.dashboard_id === dashboardId) {
          config.is_active = false;
          this.sharingConfigs.set(id, config);
        }
      }
      logger.info('Dashboard sharing revoked', { dashboardId });
    } catch (error: any) {
      logger.error('Error revoking dashboard sharing:', error);
      throw new Error(`Failed to revoke dashboard sharing: ${error.message}`);
    }
  }

  async refreshCache(dashboardId: string, force: boolean = false): Promise<{
  refresh_id: string;
  status: string;
  started_at: Date;
  estimated_completion_time?: Date;
  affected_charts: number;
}> {
  try {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Generate a refresh ID
    const refreshId = uuidv4();
    
    // Get charts associated with this dashboard
    const charts = this.dashboardCharts.get(dashboardId) || [];
    const affectedChartsCount = charts.length;

    // Create refresh result
    const refreshResult = {
      refresh_id: refreshId,
      status: 'initiated',
      started_at: new Date(),
      estimated_completion_time: new Date(Date.now() + (affectedChartsCount * 5000)), // 5 seconds per chart
      affected_charts: affectedChartsCount
    };

    // Store the refresh job (in a real implementation, this would be in a job queue)
    this.refreshJobs.set(refreshId, refreshResult);

    // Simulate cache refresh process (in a real implementation, this would be async)
    setTimeout(async () => {
      try {
        // Mock refresh process for each chart
        for (const chart of charts) {
          // Simulate chart data refresh
          logger.info(`Refreshing chart cache: ${chart.id}`);
          
          // In a real implementation, you would:
          // 1. Clear existing cache
          // 2. Re-execute queries
          // 3. Update cache with new data
        }

        // Update refresh job status to completed
        const updatedResult = {
          ...refreshResult,
          status: 'completed',
          completed_at: new Date()
        };
        this.refreshJobs.set(refreshId, updatedResult);

        logger.info('Dashboard cache refresh completed', { 
          dashboardId, 
          refreshId, 
          affectedCharts: affectedChartsCount 
        });
      } catch (error) {
        // Update refresh job status to failed
        const failedResult = {
          ...refreshResult,
          status: 'failed',
          error_message: error.message,
          completed_at: new Date()
        };
        this.refreshJobs.set(refreshId, failedResult);

        logger.error('Dashboard cache refresh failed', { 
          dashboardId, 
          refreshId, 
          error: error.message 
        });
      }
    }, 1000); // Start processing after 1 second

    logger.info('Dashboard cache refresh initiated', { 
      dashboardId, 
      refreshId, 
      force, 
      affectedCharts: affectedChartsCount 
    });

    return refreshResult;
  } catch (error: any) {
    logger.error('Error initiating dashboard cache refresh:', error);
    throw new Error(`Failed to refresh dashboard cache: ${error.message}`);
  }
}

  async getDashboardAnalytics(dashboardId: string, params: any): Promise<any> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Mock analytics data
      return {
        dashboard_id: dashboardId,
        views: {
          total: 150,
          unique_users: 45,
          daily_average: 12
        },
        charts: {
          total_interactions: 320,
          most_viewed_chart: 'chart_123',
          average_time_spent: 45
        },
        filters: {
          most_used_filter: 'date_range',
          filter_usage_count: 89
        },
        performance: {
          average_load_time: 2.3,
          cache_hit_rate: 0.85
        }
      };
    } catch (error: any) {
      logger.error('Error getting dashboard analytics:', error);
      throw new Error(`Failed to get dashboard analytics: ${error.message}`);
    }
  }
}