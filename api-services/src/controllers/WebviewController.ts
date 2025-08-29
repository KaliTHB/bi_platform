// File: api-services/src/services/WebviewService.ts

import { DatabaseService } from './DatabaseService';

export class WebviewService extends DatabaseService {
  async getWebviewByName(webviewName: string) {
    const query = `
      SELECT id, workspace_id, webview_name, display_name, description,
             theme_config, navigation_config, branding_config,
             default_category_id, is_active, created_by, created_at, updated_at
      FROM webview_configs
      WHERE webview_name = $1 AND is_active = true
    `;
    
    const result = await this.query(query, [webviewName]);
    return result.rows[0];
  }

  async trackAnalyticsEvent(eventData: {
    webview_id: string;
    user_id: string;
    workspace_id: string;
    category_id?: string;
    dashboard_id?: string;
    action_type: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    duration_ms?: number;
    metadata?: any;
  }) {
    const query = `
      INSERT INTO webview_analytics (
        workspace_id, webview_id, user_id, category_id, dashboard_id,
        action_type, session_id, ip_address, user_agent, 
        duration_ms, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      eventData.workspace_id,
      eventData.webview_id,
      eventData.user_id,
      eventData.category_id || null,
      eventData.dashboard_id || null,
      eventData.action_type,
      eventData.session_id || null,
      eventData.ip_address || null,
      eventData.user_agent || null,
      eventData.duration_ms || null,
      JSON.stringify(eventData.metadata || {})
    ];

    await this.query(query, values);
  }

  async getWebviewAnalytics(webviewId: string, dateFrom: Date, dateTo: Date) {
    const query = `
      SELECT 
        action_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(duration_ms) as avg_duration,
        DATE(action_timestamp) as event_date
      FROM webview_analytics
      WHERE webview_id = $1 
        AND action_timestamp >= $2 
        AND action_timestamp <= $3
      GROUP BY action_type, DATE(action_timestamp)
      ORDER BY event_date DESC, event_count DESC
    `;

    const result = await this.query(query, [webviewId, dateFrom, dateTo]);
    return result.rows;
  }
}