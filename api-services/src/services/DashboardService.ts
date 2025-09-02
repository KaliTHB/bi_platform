// api-services/src/services/DashboardService.ts
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface Dashboard {
  id: string;
  workspace_id: string;
  name: string;
  display_name: string;
  description?: string;
  category_id?: string;
  layout_config: any;
  theme_config?: any;
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

  constructor() {
    // Initialize with some sample data for development
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample dashboard
    const sampleDashboard: Dashboard = {
      id: uuidv4(),
      workspace_id: 'sample-workspace',
      name: 'sales_overview',
      display_name: 'Sales Overview',
      description: 'Monthly sales performance dashboard',
      category_id: 'sales-category',
      layout_config: {
        grid: { columns: 12, rows: 8, gap: 16 },
        responsive: true
      },
      theme_config: {
        primary_color: '#007bff',
        background_color: '#ffffff'
      },
      is_public: false,
      is_featured: true,
      tags: ['sales', 'revenue', 'kpi'],
      auto_refresh_interval: 300, // 5 minutes
      created_by: 'sample-user',
      created_at: new Date(),
      updated_at: new Date(),
      view_count: 45,
      status: 'active'
    };

    this.dashboards.set(sampleDashboard.id, sampleDashboard);

    // Sample dashboard charts
    const sampleCharts: DashboardChart[] = [
      {
        id: uuidv4(),
        chart_id: 'sample-chart-1',
        dashboard_id: sampleDashboard.id,
        position: { x: 0, y: 0, width: 6, height: 4 },
        title: 'Monthly Revenue',
        order_index: 0,
        is_visible: true
      },
      {
        id: uuidv4(),
        chart_id: 'sample-chart-2',
        dashboard_id: sampleDashboard.id,
        position: { x: 6, y: 0, width: 6, height: 4 },
        title: 'Sales by Region',
        order_index: 1,
        is_visible: true
      }
    ];

    this.dashboardCharts.set(sampleDashboard.id, sampleCharts);
  }

  async getDashboards(workspaceId: string, options: GetDashboardsOptions): Promise<{
    dashboards: Dashboard[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      logger.info('Getting dashboards', { workspaceId, options });

      // Filter dashboards by workspace
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

      // Sort by created_at desc
      allDashboards.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

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

      // Validate name uniqueness within workspace
      const existingDashboard = Array.from(this.dashboards.values())
        .find(d => d.workspace_id === workspaceId && d.name === dashboardData.name);

      if (existingDashboard) {
        throw new Error(`Dashboard with name '${dashboardData.name}' already exists in this workspace`);
      }

      const dashboard: Dashboard = {
        id: uuidv4(),
        workspace_id: workspaceId,
        name: dashboardData.name,
        display_name: dashboardData.display_name || dashboardData.name,
        description: dashboardData.description,
        category_id: dashboardData.category_id,
        layout_config: dashboardData.layout_config || {
          grid: { columns: 12, rows: 8, gap: 16 },
          responsive: true
        },
        theme_config: dashboardData.theme_config,
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

      this.dashboards.set(dashboard.id, dashboard);
      this.dashboardCharts.set(dashboard.id, []);

      logger.info('Dashboard created successfully', { id: dashboard.id, name: dashboard.name });
      return dashboard;
    } catch (error: any) {
      logger.error('Error creating dashboard:', error);
      throw new Error(`Failed to create dashboard: ${error.message}`);
    }
  }

  async getDashboardById(id: string, includeCharts: boolean = false): Promise<Dashboard | null> {
    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return null;
      }

      const result = { ...dashboard };
      if (includeCharts) {
        result.charts = this.dashboardCharts.get(id) || [];
      }

      // Update last viewed
      dashboard.last_viewed_at = new Date();
      dashboard.view_count += 1;
      this.dashboards.set(id, dashboard);

      return result;
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

  async duplicateDashboard(
    sourceId: string, 
    createdBy: string, 
    newName?: string, 
    includeCharts: boolean = true
  ): Promise<Dashboard> {
    try {
      logger.info('Duplicating dashboard', { sourceId, newName, includeCharts });

      const sourceDashboard = this.dashboards.get(sourceId);
      if (!sourceDashboard) {
        throw new Error('Source dashboard not found');
      }

      const duplicatedName = newName || `${sourceDashboard.name}_copy_${Date.now()}`;

      // Check name uniqueness
      const existingDashboard = Array.from(this.dashboards.values())
        .find(d => d.workspace_id === sourceDashboard.workspace_id && d.name === duplicatedName);

      if (existingDashboard) {
        throw new Error(`Dashboard with name '${duplicatedName}' already exists in this workspace`);
      }

      const duplicatedDashboard: Dashboard = {
        ...sourceDashboard,
        id: uuidv4(),
        name: duplicatedName,
        display_name: newName || `${sourceDashboard.display_name} (Copy)`,
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date(),
        last_viewed_at: undefined,
        view_count: 0,
        is_featured: false // Don't duplicate featured status
      };

      this.dashboards.set(duplicatedDashboard.id, duplicatedDashboard);

      // Duplicate charts if requested
      if (includeCharts) {
        const sourceCharts = this.dashboardCharts.get(sourceId) || [];
        const duplicatedCharts = sourceCharts.map(chart => ({
          ...chart,
          id: uuidv4(),
          dashboard_id: duplicatedDashboard.id
        }));

        this.dashboardCharts.set(duplicatedDashboard.id, duplicatedCharts);
      } else {
        this.dashboardCharts.set(duplicatedDashboard.id, []);
      }

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
      
      // In a real implementation, this would also fetch chart details
      return charts.map(chart => ({
        ...chart,
        chart: {
          id: chart.chart_id,
          name: `Chart ${chart.chart_id}`,
          type: 'bar',
          dataset_id: 'sample-dataset'
        }
      }));
    } catch (error: any) {
      logger.error('Error getting dashboard charts:', error);
      throw new Error(`Failed to get dashboard charts: ${error.message}`);
    }
  }

  async exportDashboard(
    dashboardId: string, 
    format: string, 
    includeData: boolean = false
  ): Promise<ExportResult> {
    try {
      logger.info('Exporting dashboard', { dashboardId, format, includeData });

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const exportResult: ExportResult = {
        export_id: uuidv4(),
        format,
        status: 'processing',
        created_at: new Date()
      };

      // Simulate async export processing
      setTimeout(async () => {
        try {
          const fileName = `dashboard_${dashboard.name}_${Date.now()}.${format}`;
          const mockFilePath = `/exports/${fileName}`;
          const mockDownloadUrl = `https://api.example.com/exports/${fileName}`;

          exportResult.status = 'completed';
          exportResult.file_path = mockFilePath;
          exportResult.download_url = mockDownloadUrl;
          exportResult.file_size_bytes = Math.floor(Math.random() * 1000000) + 100000;
          exportResult.completed_at = new Date();

          logger.info('Dashboard export completed', { exportId: exportResult.export_id });
        } catch (error) {
          logger.error('Error in export processing:', error);
          exportResult.status = 'failed';
          exportResult.error_message = 'Export processing failed';
        }
      }, 2000);

      return exportResult;
    } catch (error: any) {
      logger.error('Error exporting dashboard:', error);
      throw new Error(`Failed to export dashboard: ${error.message}`);
    }
  }

  async shareDashboard(dashboardId: string, shareData: ShareDashboardData): Promise<SharingConfig> {
    try {
      logger.info('Sharing dashboard', { dashboardId, shareType: shareData.share_type });

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      // Check if sharing already exists
      let existingShare: SharingConfig | undefined;
      for (const shareConfig of this.sharingConfigs.values()) {
        if (shareConfig.dashboard_id === dashboardId && shareConfig.is_active) {
          existingShare = shareConfig;
          break;
        }
      }

      let passwordHash: string | undefined;
      if (shareData.password) {
        // In a real implementation, use proper password hashing (bcrypt)
        passwordHash = Buffer.from(shareData.password).toString('base64');
      }

      const shareConfig: SharingConfig = {
        id: existingShare?.id || uuidv4(),
        dashboard_id: dashboardId,
        share_type: shareData.share_type,
        share_token: uuidv4().replace(/-/g, ''),
        expires_at: shareData.expires_at,
        password_hash: passwordHash,
        is_active: true,
        created_by: shareData.created_by,
        created_at: existingShare?.created_at || new Date(),
        access_count: existingShare?.access_count || 0,
        last_accessed_at: existingShare?.last_accessed_at
      };

      this.sharingConfigs.set(shareConfig.id, shareConfig);

      logger.info('Dashboard shared successfully', { 
        dashboardId, 
        shareId: shareConfig.id,
        shareToken: shareConfig.share_token 
      });
      return shareConfig;
    } catch (error: any) {
      logger.error('Error sharing dashboard:', error);
      throw new Error(`Failed to share dashboard: ${error.message}`);
    }
  }

  async updateSharingSettings(dashboardId: string, settings: Partial<ShareDashboardData>): Promise<SharingConfig> {
    try {
      logger.info('Updating sharing settings', { dashboardId, settings });

      // Find existing sharing config
      let existingShare: SharingConfig | undefined;
      for (const shareConfig of this.sharingConfigs.values()) {
        if (shareConfig.dashboard_id === dashboardId && shareConfig.is_active) {
          existingShare = shareConfig;
          break;
        }
      }

      if (!existingShare) {
        throw new Error('No active sharing configuration found for this dashboard');
      }

      let passwordHash: string | undefined = existingShare.password_hash;
      if (settings.password) {
        passwordHash = Buffer.from(settings.password).toString('base64');
      } else if (settings.password === null) {
        passwordHash = undefined;
      }

      const updatedShareConfig: SharingConfig = {
        ...existingShare,
        share_type: settings.share_type || existingShare.share_type,
        expires_at: settings.expires_at !== undefined ? settings.expires_at : existingShare.expires_at,
        password_hash: passwordHash
      };

      this.sharingConfigs.set(updatedShareConfig.id, updatedShareConfig);

      logger.info('Sharing settings updated successfully', { 
        dashboardId, 
        shareId: updatedShareConfig.id 
      });
      return updatedShareConfig;
    } catch (error: any) {
      logger.error('Error updating sharing settings:', error);
      throw new Error(`Failed to update sharing settings: ${error.message}`);
    }
  }

  async addChartToDashboard(
    dashboardId: string, 
    chartId: string, 
    position: { x: number; y: number; width: number; height: number },
    title?: string
  ): Promise<DashboardChart> {
    try {
      logger.info('Adding chart to dashboard', { dashboardId, chartId });

      const dashboard = this.dashboards.get(dashboardId);
      if (!dashboard) {
        throw new Error('Dashboard not found');
      }

      const charts = this.dashboardCharts.get(dashboardId) || [];
      const nextOrderIndex = Math.max(...charts.map(c => c.order_index), -1) + 1;

      const dashboardChart: DashboardChart = {
        id: uuidv4(),
        chart_id: chartId,
        dashboard_id: dashboardId,
        position,
        title,
        order_index: nextOrderIndex,
        is_visible: true
      };

      charts.push(dashboardChart);
      this.dashboardCharts.set(dashboardId, charts);

      // Update dashboard modified time
      dashboard.updated_at = new Date();
      this.dashboards.set(dashboardId, dashboard);

      logger.info('Chart added to dashboard successfully', { 
        dashboardId, 
        chartId,
        dashboardChartId: dashboardChart.id 
      });
      return dashboardChart;
    } catch (error: any) {
      logger.error('Error adding chart to dashboard:', error);
      throw new Error(`Failed to add chart to dashboard: ${error.message}`);
    }
  }

  async removeChartFromDashboard(dashboardId: string, dashboardChartId: string): Promise<void> {
    try {
      logger.info('Removing chart from dashboard', { dashboardId, dashboardChartId });

      const charts = this.dashboardCharts.get(dashboardId) || [];
      const updatedCharts = charts.filter(c => c.id !== dashboardChartId);

      if (charts.length === updatedCharts.length) {
        throw new Error('Chart not found in dashboard');
      }

      this.dashboardCharts.set(dashboardId, updatedCharts);

      // Update dashboard modified time
      const dashboard = this.dashboards.get(dashboardId);
      if (dashboard) {
        dashboard.updated_at = new Date();
        this.dashboards.set(dashboardId, dashboard);
      }

      logger.info('Chart removed from dashboard successfully', { 
        dashboardId, 
        dashboardChartId 
      });
    } catch (error: any) {
      logger.error('Error removing chart from dashboard:', error);
      throw new Error(`Failed to remove chart from dashboard: ${error.message}`);
    }
  }
}