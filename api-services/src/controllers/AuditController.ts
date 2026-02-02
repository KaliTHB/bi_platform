/ File: api-services/src/controllers/AuditController.ts

import { Request, Response } from 'express';
import { AuditService } from '../services/AuditService';
import { PermissionService } from '../services/PermissionService';

export class AuditController {
  constructor(
    private auditService: AuditService,
    private permissionService: PermissionService
  ) {}

  async getAuditLogs(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const { 
        log_type,
        user_id,
        resource_type,
        resource_id,
        start_date,
        end_date,
        page = 1,
        limit = 50 
      } = req.query;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'audit.read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Audit log access denied' }
        });
      }

      const logs = await this.auditService.getAuditLogs(workspace_id, {
        log_type: log_type as string,
        user_id: user_id as string,
        resource_type: resource_type as string,
        resource_id: resource_id as string,
        start_date: start_date ? new Date(start_date as string) : undefined,
        end_date: end_date ? new Date(end_date as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: logs.logs,
        metadata: {
          page: logs.page,
          limit: logs.limit,
          total: logs.total,
          total_pages: logs.total_pages
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load audit logs' }
      });
    }
  }

  async getAuditSummary(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;

      // Check permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'audit.read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Audit summary access denied' }
        });
      }

      const summary = await this.auditService.getAuditSummary(workspace_id);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load audit summary' }
      });
    }
  }

  async exportAuditLogs(req: Request, res: Response) {
    try {
      const { workspace_id } = req.user;
      const { format = 'csv', ...filters } = req.query;

      // Check permissions
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, 'audit.export')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Audit export not allowed' }
        });
      }

      const exportData = await this.auditService.exportAuditLogs(workspace_id, {
        format: format as string,
        ...filters
      });

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now().toISOString().split('T')[0]}.${format}"`);
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_FAILED', message: 'Failed to export audit logs' }
      });
    }
  }
}