// File: api-services/src/services/WebviewService.ts

import { Pool } from 'pg';
import { CategoryService } from './CategoryService';

export interface WebviewConfig {
  id: string;
  workspace_id: string;
  webview_name: string;
  display_name: string;
  description?: string;
  theme_config: any;
  navigation_config: any;
  branding_config: any;
  default_category_id?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WebviewAnalyticsEvent {
  event_type: string;
  webview_id: string;
  user_id: string;
  category_id?: string;
  dashboard_id?: string;
  session_id: string;
  ip_address?: string;
  user_agent?: string;
  action_timestamp: Date;
  duration_ms?: number;
  metadata: any;
}

export class WebviewService {
  private categoryService: CategoryService;

  constructor(private db: Pool) {
    this.categoryService = new CategoryService(db);
  }

  async getWebviewByName(
    workspaceId: string,
    webviewName: string
  ): Promise<WebviewConfig | null> {
    const query = `
      SELECT * FROM webview_configs 
      WHERE workspace_id = $1 AND webview_name = $2 AND is_active = true
    `;

    const result = await this.db.query(query, [workspaceId, webviewName]);
    return result.rows[0] || null;
  }

  async getWebviewNavigation(
    webviewId: string,
    userId: string,
    workspaceId: string
  ) {
    // Get webview configuration
    const webviewConfig = await this.getWebviewById(webviewId);
    if (!webviewConfig) {
      throw new Error('Webview not found');
    }

    // Get categories with user access filtering
    const categories = await this.categoryService.getWorkspaceCategories(
      workspaceId,
      true, // Include dashboards
      true, // User accessible only
      userId
    );

    // Get user favorites and recent dashboards
    const [favorites, recent] = await Promise.all([
      this.getUserFavoriteDashboards(userId, workspaceId),
      this.getUserRecentDashboards(userId, workspaceId)
    ]);

    return {
      webview_config: webviewConfig,
      categories,
      user_favorites: favorites,
      recent_dashboards: recent
    };
  }

  async getWebviewById(webviewId: string): Promise<WebviewConfig | null> {
    const query = 'SELECT * FROM webview_configs WHERE id = $1 AND is_active = true';
    const result = await this.db.query(query, [webviewId]);
    return result.rows[0] || null;
  }

  async createWebview(webviewData: Partial<WebviewConfig>): Promise<WebviewConfig> {
    const query = `
      INSERT INTO webview_configs 
      (workspace_id, webview_name, display_name, description, theme_config, 
       navigation_config, branding_config, default_category_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      webviewData.workspace_id,
      webviewData.webview_name,
      webviewData.display_name,
      webviewData.description,
      JSON.stringify(webviewData.theme_config || {}),
      JSON.stringify(webviewData.navigation_config || {}),
      JSON.stringify(webviewData.branding_config || {}),
      webviewData.default_category_id,
      webviewData.created_by
    ]);

    return result.rows[0];
  }

  async updateWebview(
    webviewId: string,
    webviewData: Partial<WebviewConfig>
  ): Promise<WebviewConfig> {
    const query = `
      UPDATE webview_configs 
      SET 
        display_name = COALESCE($2, display_name),
        description = COALESCE($3, description),
        theme_config = COALESCE($4, theme_config),
        navigation_config = COALESCE($5, navigation_config),
        branding_config = COALESCE($6, branding_config),
        default_category_id = COALESCE($7, default_category_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [
      webviewId,
      webviewData.display_name,
      webviewData.description,
      webviewData.theme_config ? JSON.stringify(webviewData.theme_config) : null,
      webviewData.navigation_config ? JSON.stringify(webviewData.navigation_config) : null,
      webviewData.branding_config ? JSON.stringify(webviewData.branding_config) : null,
      webviewData.default_category_id
    ]);

    return result.rows[0];
  }

  async checkWebviewAccess(
    userId: string,
    webviewId: string
  ): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM webview_access wa
        LEFT JOIN user_role_assignments ura ON wa.role_id = ura.role_id
        WHERE wa.webview_id = $1
        AND wa.is_active = true
        AND (wa.expires_at IS NULL OR wa.expires_at > NOW())
        AND wa.permissions ? 'can_read'
        AND (
          wa.user_id = $2 OR
          (wa.role_id IS NOT NULL AND ura.user_id = $2 AND ura.is_active = true)
        )
      ) as has_access
    `;

    const result = await this.db.query(query, [webviewId, userId]);
    return result.rows[0].has_access;
  }

  async trackAnalytics(event: WebviewAnalyticsEvent): Promise<void> {
    const query = `
      INSERT INTO webview_analytics 
      (workspace_id, webview_id, user_id, category_id, dashboard_id, 
       action_type, session_id, ip_address, user_agent, duration_ms, metadata)
      VALUES (
        (SELECT workspace_id FROM webview_configs WHERE id = $1),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `;

    await this.db.query(query, [
      event.webview_id,
      event.user_id,
      event.category_id,
      event.dashboard_id,
      event.event_type,
      event.session_id,
      event.ip_address,
      event.user_agent,
      event.duration_ms,
      JSON.stringify(event.metadata)
    ]);
  }

  private async getUserFavoriteDashboards(userId: string, workspaceId: string) {
    // This would require a favorites table - for now return empty array
    return [];
  }

  private async getUserRecentDashboards(userId: string, workspaceId: string) {
    const query = `
      SELECT DISTINCT d.*, wa.action_timestamp as last_viewed
      FROM dashboards d
      INNER JOIN webview_analytics wa ON d.id = wa.dashboard_id
      WHERE wa.user_id = $1 AND d.workspace_id = $2
      ORDER BY wa.action_timestamp DESC
      LIMIT 10
    `;

    const result = await this.db.query(query, [userId, workspaceId]);
    return result.rows;
  }
}