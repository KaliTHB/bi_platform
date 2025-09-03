// api-services/src/services/DashboardService.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ChartService } from './ChartService';

// Interfaces
interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  category_id?: string;
  layout_config: any;
  theme_config?: any;
  global_filters?: GlobalFilter[];
  filter_connections?: FilterConnection[];
  is_public: boolean;
  is_featured: boolean;
  tags: string[];
  auto_refresh_interval?: number;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  last_viewed_at?: Date;
  view_count: number;
  status: 'active' | 'inactive' | 'archived';
  charts?: DashboardChart[];
  sharing_config?: SharingConfig;
}

interface GlobalFilter {
  id: string;
  name: string;
  display_name: string;
  type: 'date_range' | 'single_select' | 'multi_select' | 'text' | 'numeric_range';
  data_source: {
    type: 'dataset' | 'static' | 'query';
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
  id: string;
  chart_id: string;
  dashboard_id: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  title?: string;
  description?: string;
  order_index: number;
  is_visible: boolean;
  chart?: {
    id: string;
    name: string;
    type: string;
    dataset_id: string;
  };
}

interface SharingConfig {
  id: string;
  dashboard_id: string;
  share_type: 'public' | 'password' | 'private';
  share_token: string;
  expires_at?: Date;
  password_hash?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  access_count: number;
  last_accessed_at?: Date;
}

interface DashboardCreateData {
  workspace_id: string;
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
  private dashboards: Map<string, Dashboard> = new Map();
  private dashboardCharts: Map<string, DashboardChart[]> = new Map();
  private sharingConfigs: Map<string, SharingConfig> = new Map();
  private refreshJobs: Map<string, RefreshResult> = new Map();
  private chartService: ChartService;

  constructor() {
    this.chartService = new ChartService();
    this.initializeSampleData();
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

  // ✅ EXISTING METHODS
  async getDashboards(workspaceId: string, options: GetDashboardsOptions): Promise<{
    dashboards: Dashboard[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      logger.info('Getting dashboards', { workspaceId, options });

      let allDashboards = Array.from(this.dashboards.values())
        .filter(dashboard => dashboard.workspace_id === workspaceId);

      // Apply filters
      if (options.filters.category_id) {
        allDashboards = allDashboards.filter(d => d.category_id === options.filters.category_id);
      }
      if (options.filters.created_by) {
        allDashboards = allDashboards.filter(d => d.created_by === options.filters.created_by);
      }
      if (options.filters.is_public !== undefined) {
        allDashboards = allDashboards.filter(d => d.is_public === options.filters.is_public);
      }
      if (options.filters.is_featured !== undefined) {
        allDashboards = allDashboards.filter(d => d.is_featured === options.filters.is_featured);
      }
      if (options.filters.search) {
        const searchTerm = options.filters.search.toLowerCase();
        allDashboards = allDashboards.filter(d => 
          d.name.toLowerCase().includes(searchTerm) ||
          d.display_name.toLowerCase().includes(searchTerm) ||
          (d.description && d.description.toLowerCase().includes(searchTerm)) ||
          d.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      const total = allDashboards.length;
      const pages = Math.ceil(total / options.limit);
      const offset = (options.page - 1) * options.limit;
      let dashboards = allDashboards.slice(offset, offset + options.limit);

      // Include charts if requested
      if (options.include_charts) {
        dashboards = dashboards.map(dashboard => ({
          ...dashboard,
          charts: this.dashboardCharts.get(dashboard.id) || []
        }));
      }

      return {
        dashboards,
        total,
        page: options.page,
        limit: options.limit,
        pages
      };
    } catch (error: any) {
      logger.error('Error getting dashboards:', error);
      throw new Error(`Failed to get dashboards: ${error.message}`);
    }
  }

  async createDashboard(workspaceId: string, dashboardData: DashboardCreateData): Promise<Dashboard> {
    try {
      logger.info('Creating dashboard', { workspaceId, name: dashboardData.name });

      // Check for name uniqueness
      const existingDashboard = Array.from(this.dashboards.values())
        .find(d => d.workspace_id === workspaceId && d.name === dashboardData.name);

      if (existingDashboard) {
        throw new Error(`Dashboard with name '${dashboardData.name}' already exists in this workspace`);
      }

      const newDashboard: Dashboard = {
        id: uuidv4(),
        workspace_id: workspaceId,
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

  async getDashboard(id: string): Promise<Dashboard | null> {
    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return null;
      }

      // Include charts
      const charts = this.dashboardCharts.get(id) || [];
      return { ...dashboard, charts };
    } catch (error: any) {
      logger.error('Error getting dashboard by ID:', error);
      throw new Error(`Failed to get dashboard: ${error.message}`);
    }
  }

  async updateDashboard(id: string, updateData: DashboardUpdateData): Promise<Dashboard> {
    try {
      logger.info('Updating dashboard', { id, updateData });

      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Validate name uniqueness if name is being updated
      if (updateData.name && updateData.name !== dashboard.name) {
        const existingDashboard = Array.from(this.dashboards.values())
          .find(d => d.workspace_id === dashboard.workspace_id && d.name === updateData.name);
        
        if (existingDashboard) {
          throw new Error(`Dashboard with name '${updateData.name}' already exists in this workspace`);
        }
      }

      const updatedDashboard: Dashboard = {
        ...dashboard,
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
      logger.info('Deleting dashboard', { id });

      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Clean up related data
      this.dashboards.delete(id);
      this.dashboardCharts.delete(id);
      
      // Clean up sharing configs
      for (const [shareId, shareConfig] of this.sharingConfigs.entries()) {
        if (shareConfig.dashboard_id === id) {
          this.sharingConfigs.delete(shareId);
        }
      }

      logger.info('Dashboard deleted successfully', { id });
    } catch (error: any) {
      logger.error('Error deleting dashboard:', error);
      throw new Error(`Failed to delete dashboard: ${error.message}`);
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

async refreshDashboard(dashboardId: string): Promise<{
  refresh_id: string;
  status: string;
  started_at: Date;
  affected_charts: number;
}> {
  try {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const charts = this.dashboardCharts.get(dashboardId) || [];
    const refreshId = `refresh_${Date.now()}`;

    // Mock refresh process
    setTimeout(() => {
      // In a real implementation, this would trigger actual data refresh
      logger.info(`Dashboard ${dashboardId} refresh completed`);
    }, 2000);

    return {
      refresh_id: refreshId,
      status: 'started',
      started_at: new Date(),
      affected_charts: charts.length
    };
  } catch (error: any) {
    logger.error('Error refreshing dashboard:', error);
    throw new Error(`Failed to refresh dashboard: ${error.message}`);
  }
}

async applyGlobalFilter(dashboardId: string, filters: any): Promise<any> {
  try {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Update dashboard with global filters
    dashboard.global_filters = filters;
    dashboard.updated_at = new Date();
    this.dashboards.set(dashboardId, dashboard);

    // Get affected charts
    const charts = this.dashboardCharts.get(dashboardId) || [];
    
    return {
      dashboard_id: dashboardId,
      filters_applied: filters,
      affected_charts: charts.length,
      applied_at: new Date(),
      status: 'applied'
    };
  } catch (error: any) {
    logger.error('Error applying global filter:', error);
    throw new Error(`Failed to apply global filter: ${error.message}`);
  }
}

async getDashboardCacheStatus(dashboardId: string): Promise<{
  dashboard_cached: boolean;
  charts_cached: number;
  total_charts: number;
  last_cache_update?: Date;
  cache_size_mb?: number;
}> {
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
      cache_size_mb: Math.round(Math.random() * 50) / 10 // Mock cache size
    };
  } catch (error: any) {
    logger.error('Error getting dashboard cache status:', error);
    throw new Error(`Failed to get dashboard cache status: ${error.message}`);
  }
}

  async duplicateDashboard(
    sourceId: string, 
    createdBy: string, 
    newName?: string
  ): Promise<Dashboard> {
    try {
      logger.info('Duplicating dashboard', { sourceId, createdBy, newName });

      const sourceDashboard = this.dashboards.get(sourceId);
      if (!sourceDashboard) {
        throw new Error('Source dashboard not found');
      }

      const duplicateName = newName || `${sourceDashboard.name}_copy`;

      const duplicatedDashboard: Dashboard = {
        ...sourceDashboard,
        id: uuidv4(),
        name: duplicateName,
        display_name: `${sourceDashboard.display_name} (Copy)`,
        is_public: false,
        is_featured: false,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date(),
        view_count: 0
      };

      this.dashboards.set(duplicatedDashboard.id, duplicatedDashboard);
      
      // Copy charts
      const sourceCharts = this.dashboardCharts.get(sourceId) || [];
      const duplicatedCharts = sourceCharts.map(chart => ({
        ...chart,
        id: uuidv4(),
        dashboard_id: duplicatedDashboard.id
      }));
      this.dashboardCharts.set(duplicatedDashboard.id, duplicatedCharts);

      logger.info('Dashboard duplicated successfully', { 
        sourceId, 
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
      
      // Enhance with chart details
      const enhancedCharts = await Promise.all(
        charts.map(async (dashboardChart) => {
          const chart = await this.chartService.getChart(dashboardChart.chart_id);
          return {
            ...dashboardChart,
            chart: chart ? {
              id: chart.id,
              name: chart.name,
              type: chart.type,
              dataset_id: chart.dataset_id
            } : undefined
          };
        })
      );

      return enhancedCharts;
    } catch (error: any) {
      logger.error('Error getting dashboard charts:', error);
      throw new Error(`Failed to get dashboard charts: ${error.message}`);
    }
  }

  // 🚀 NEW METHODS - CRITICAL CACHE & FILTER OPERATIONS

  async getDashboardData(
    dashboardId: string,
    userId: string,
    params?: {
      refresh?: boolean;
      filters?: any[];
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    charts: any[];
    metadata: {
      dashboard_id: string;
      chart_count: number;
      last_updated: Date;
      cached: boolean;
      execution_time_ms?: number;
    };
  }> {
    try {
      logger.info('Getting dashboard data', { dashboardId, userId, params });

      const startTime = Date.now();
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const dashboardCharts = this.dashboardCharts.get(dashboardId) || [];

      // Apply global filters if provided
      let effectiveFilters = dashboard.global_filters || [];
      if (params?.filters) {
        effectiveFilters = [...effectiveFilters, ...params.filters];
      }

      // Get data for each chart
      const chartDataPromises = dashboardCharts.map(async (dashboardChart) => {
        try {
          const chartData = await this.chartService.getChartData(dashboardChart.chart_id, {
            filters: effectiveFilters,
            refresh: params?.refresh,
            limit: params?.limit
          });

          return {
            dashboard_chart_id: dashboardChart.id,
            chart_id: dashboardChart.chart_id,
            position: dashboardChart.position,
            title: dashboardChart.title,
            data: chartData.data,
            columns: chartData.columns,
            metadata: chartData.metadata,
            cached: chartData.cached
          };
        } catch (error) {
          logger.error(`Error getting data for chart ${dashboardChart.chart_id}:`, error);
          return {
            dashboard_chart_id: dashboardChart.id,
            chart_id: dashboardChart.chart_id,
            position: dashboardChart.position,
            title: dashboardChart.title,
            error: error instanceof Error ? error.message : 'Unknown error',
            cached: false
          };
        }
      });

      const chartsData = await Promise.all(chartDataPromises);
      const executionTime = Date.now() - startTime;

      const result = {
        charts: chartsData,
        metadata: {
          dashboard_id: dashboardId,
          chart_count: dashboardCharts.length,
          last_updated: new Date(),
          cached: chartsData.some(cd => cd.cached),
          execution_time_ms: executionTime
        }
      };

      logger.info('Dashboard data retrieved successfully', { 
        dashboardId, 
        chartCount: chartsData.length,
        executionTime 
      });

      return result;
    } catch (error: any) {
      logger.error('Error getting dashboard data:', error);
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  async refreshDashboard(
    dashboardId: string,
    userId: string
  ): Promise<RefreshResult> {
    try {
      logger.info('Refreshing dashboard', { dashboardId, userId });

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const dashboardCharts = this.dashboardCharts.get(dashboardId) || [];
      const refreshId = uuidv4();

      const refreshJob: RefreshResult = {
        refresh_id: refreshId,
        status: 'initiated',
        started_at: new Date(),
        charts_to_refresh: dashboardCharts.length,
        estimated_completion_time: new Date(Date.now() + (dashboardCharts.length * 5000)) // 5s per chart estimate
      };

      this.refreshJobs.set(refreshId, refreshJob);

      // Refresh all charts asynchronously
      setTimeout(async () => {
        try {
          const refreshPromises = dashboardCharts.map(async (dashboardChart) => {
            try {
              await this.chartService.refreshChart(dashboardChart.chart_id);
              return { chart_id: dashboardChart.chart_id, success: true };
            } catch (error) {
              logger.error(`Error refreshing chart ${dashboardChart.chart_id}:`, error);
              return { chart_id: dashboardChart.chart_id, success: false, error };
            }
          });

          await Promise.all(refreshPromises);

          const job = this.refreshJobs.get(refreshId);
          if (job) {
            job.status = 'completed';
            this.refreshJobs.set(refreshId, job);
          }

          logger.info('Dashboard refresh completed', { dashboardId, refreshId });
        } catch (error) {
          const job = this.refreshJobs.get(refreshId);
          if (job) {
            job.status = 'failed';
            this.refreshJobs.set(refreshId, job);
          }
          logger.error('Dashboard refresh failed:', error);
        }
      }, 1000);

      return refreshJob;
    } catch (error: any) {
      logger.error('Error refreshing dashboard:', error);
      throw new Error(`Failed to refresh dashboard: ${error.message}`);
    }
  }

  async applyGlobalFilter(
    dashboardId: string,
    filterId: string,
    filterValue: any,
    userId: string
  ): Promise<FilterApplicationResult> {
    try {
      logger.info('Applying global filter', { dashboardId, filterId, filterValue, userId });

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Find the global filter
      const globalFilter = dashboard.global_filters?.find(f => f.id === filterId);
      if (!globalFilter) {
        throw new Error('Global filter not found');
      }

      // Find all connected charts
      const connectedCharts = dashboard.filter_connections
        ?.filter(conn => conn.filter_id === filterId)
        ?.map(conn => conn.chart_id) || [];

      // Apply filter to each connected chart
      const results = [];
      for (const chartId of connectedCharts) {
        try {
          // In a real implementation, this would apply the filter to the chart
          const chartData = await this.chartService.getChartData(chartId, {
            filters: [{ id: filterId, value: filterValue }],
            refresh: true // Force refresh to apply new filter
          });

          results.push({ 
            chart_id: chartId, 
            success: true, 
            data: chartData,
            cache_invalidated: true
          });
        } catch (error) {
          logger.error(`Error applying filter to chart ${chartId}:`, error);
          results.push({ 
            chart_id: chartId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const result: FilterApplicationResult = {
        results,
        affected_charts: connectedCharts.length
      };

      logger.info('Global filter applied successfully', { 
        dashboardId, 
        filterId, 
        affectedCharts: connectedCharts.length 
      });

      return result;
    } catch (error: any) {
      logger.error('Error applying global filter:', error);
      throw new Error(`Failed to apply global filter: ${error.message}`);
    }
  }

  async exportDashboard(
    dashboardId: string,
    options: any,
    userId: string
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting dashboard', { dashboardId, options, userId });

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const exportId = uuidv4();
      const exportResult: ExportResult = {
        export_id: exportId,
        format: options.format,
        status: 'processing',
        created_at: new Date()
      };

      // Simulate export processing
      setTimeout(() => {
        exportResult.status = 'completed';
        exportResult.completed_at = new Date();
        exportResult.file_path = `/exports/dashboard_${dashboardId}_${exportId}.${options.format}`;
        exportResult.download_url = `https://your-domain.com/api/exports/dashboard_${dashboardId}_${exportId}.${options.format}`;
        exportResult.file_size_bytes = 1024 * 1024; // 1MB mock size
      }, 5000);

      logger.info('Dashboard export initiated', { dashboardId, exportId });
      return exportResult;
    } catch (error: any) {
      logger.error('Error exporting dashboard:', error);
      throw new Error(`Failed to export dashboard: ${error.message}`);
    }
  }

  // 🔧 ADDITIONAL UTILITY METHODS

  async updateDashboardLayout(dashboardId: string, layout: any): Promise<any> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      dashboard.layout_config = layout;
      dashboard.updated_at = new Date();
      this.dashboards.set(dashboardId, dashboard);

      return layout;
    } catch (error: any) {
      logger.error('Error updating dashboard layout:', error);
      throw new Error(`Failed to update dashboard layout: ${error.message}`);
    }
  }

  async updateDashboardFilters(dashboardId: string, filters: GlobalFilter[]): Promise<GlobalFilter[]> {
    try {
      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      dashboard.global_filters = filters;
      dashboard.updated_at = new Date();
      this.dashboards.set(dashboardId, dashboard);

      return filters;
    } catch (error: any) {
      logger.error('Error updating dashboard filters:', error);
      throw new Error(`Failed to update dashboard filters: ${error.message}`);
    }
  }

  async clearDashboardCache(dashboardId: string): Promise<{
    cache_cleared: boolean;
    affected_charts: number;
  }> {
    try {
      const dashboardCharts = this.dashboardCharts.get(dashboardId) || [];
      
      // Clear cache for all charts in dashboard
      const clearPromises = dashboardCharts.map(async (dashboardChart) => {
        try {
          // In a real implementation, this would clear the chart cache
          return { chart_id: dashboardChart.chart_id, success: true };
        } catch (error) {
          return { chart_id: dashboardChart.chart_id, success: false };
        }
      });

      await Promise.all(clearPromises);

      return {
        cache_cleared: true,
        affected_charts: dashboardCharts.length
      };
    } catch (error: any) {
      logger.error('Error clearing dashboard cache:', error);
      throw new Error(`Failed to clear dashboard cache: ${error.message}`);
    }
  }

  async getDashboardCacheStatus(dashboardId: string): Promise<CacheStatus> {
    try {
      const dashboardCharts = this.dashboardCharts.get(dashboardId) || [];
      
      // Mock cache status - in real implementation, check actual cache
      return {
        dashboard_cached: true,
        charts_cached: dashboardCharts.length,
        total_charts: dashboardCharts.length,
        last_cache_update: new Date(),
        cache_size_mb: 2.5
      };
    } catch (error: any) {
      logger.error('Error getting dashboard cache status:', error);
      throw new Error(`Failed to get dashboard cache status: ${error.message}`);
    }
  }

  // ✅ EXISTING UTILITY METHODS
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
        password_hash: shareData.password ? 'hashed_password' : undefined,
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

  async getDashboardAnalytics(dashboardId: string, params: any): Promise<any> {
    try {
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