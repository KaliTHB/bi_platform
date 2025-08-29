// File: api-services/src/services/PermissionService.ts

import { DatabaseService } from './DatabaseService';

export class PermissionService extends DatabaseService {
  async getUserPermissions(userId: string, workspaceId: string) {
    const query = `SELECT get_user_effective_permissions($1, $2) as permissions`;
    const result = await this.query(query, [userId, workspaceId]);
    
    return result.rows[0]?.permissions || [];
  }

  async hasPermission(userId: string, workspaceId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, workspaceId);
    return permissions.includes(permission);
  }

  async checkWebviewAccess(userId: string, webviewId: string): Promise<boolean> {
    const query = `
      SELECT 1
      FROM webview_access wa
      LEFT JOIN user_role_assignments ura ON wa.role_id = ura.role_id
      WHERE wa.webview_id = $2
        AND wa.is_active = true
        AND (wa.expires_at IS NULL OR wa.expires_at > NOW())
        AND wa.permissions ? 'can_read'
        AND (
          wa.user_id = $1 OR
          (wa.role_id IS NOT NULL AND ura.user_id = $1 AND ura.is_active = true)
        )
      LIMIT 1
    `;

    const result = await this.query(query, [userId, webviewId]);
    return result.rows.length > 0;
  }

  async checkWebviewDashboardAccess(userId: string, dashboardId: string, webviewId: string): Promise<boolean> {
    const query = `SELECT check_webview_dashboard_access($1, $2, $3) as has_access`;
    const result = await this.query(query, [userId, dashboardId, webviewId]);
    
    return result.rows[0]?.has_access || false;
  }

  async checkDatasetAccess(userId: string, datasetId: string, workspaceId: string): Promise<boolean> {
    const query = `SELECT check_user_dataset_access($1, $2, $3) as has_access`;
    const result = await this.query(query, [userId, datasetId, workspaceId]);   
    return result.rows[0]?.has_access || false;
  }
}