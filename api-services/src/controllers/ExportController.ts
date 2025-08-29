/ File: api-services/src/controllers/ExportController.ts

import { Request, Response } from 'express';
import { ExportService } from '../services/ExportService';
import { PermissionService } from '../services/PermissionService';

export class ExportController {
  constructor(
    private exportService: ExportService,
    private permissionService: PermissionService
  ) {}

  async exportDashboard(req: Request, res: Response) {
    try {
      const { dashboardId } = req.params;
      const { format, options } = req.body;
      const { workspace_id } = req.user;

      // Check dashboard access
      if (!await this.permissionService.checkDashboardAccess(req.user.id, dashboardId, 'can_read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Dashboard access denied' }
        });
      }

      // Check export permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, `export.${format}`)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: `${format.toUpperCase()} export not allowed` }
        });
      }

      const exportResult = await this.exportService.exportDashboard(
        dashboardId,
        format,
        options,
        req.user.id
      );

      if (format === 'pdf' || format === 'png' || format === 'svg') {
        // Return file download
        res.setHeader('Content-Type', this.getContentType(format));
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        res.send(exportResult.data);
      } else {
        // Return JSON response
        res.json({
          success: true,
          data: exportResult
        });
      }
    } catch (error) {
      console.error('Error exporting dashboard:', error);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_FAILED', message: 'Failed to export dashboard' }
      });
    }
  }

  async exportChart(req: Request, res: Response) {
    try {
      const { chartId } = req.params;
      const { format, options } = req.body;
      const { workspace_id } = req.user;

      // Check chart access (via dashboard and dataset permissions)
      if (!await this.permissionService.checkChartAccess(req.user.id, chartId, 'read')) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Chart access denied' }
        });
      }

      // Check export permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, `export.${format}`)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: `${format.toUpperCase()} export not allowed` }
        });
      }

      const exportResult = await this.exportService.exportChart(
        chartId,
        format,
        options,
        req.user.id
      );

      if (format === 'png' || format === 'svg') {
        res.setHeader('Content-Type', this.getContentType(format));
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        res.send(exportResult.data);
      } else {
        res.json({
          success: true,
          data: exportResult
        });
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_FAILED', message: 'Failed to export chart' }
      });
    }
  }

  async createBatchExport(req: Request, res: Response) {
    try {
      const { export_type, resource_ids, format, options } = req.body;
      const { workspace_id } = req.user;

      // Check export permission
      if (!await this.permissionService.hasPermission(req.user.id, workspace_id, `export.${format}`)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: `${format.toUpperCase()} export not allowed` }
        });
      }

      const exportJob = await this.exportService.createBatchExport(
        export_type,
        resource_ids,
        format,
        options,
        req.user.id,
        workspace_id
      );

      res.status(201).json({
        success: true,
        data: {
          export_job_id: exportJob.id,
          status: exportJob.status,
          estimated_completion: exportJob.estimated_completion
        }
      });
    } catch (error) {
      console.error('Error creating batch export:', error);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_FAILED', message: 'Failed to create batch export' }
      });
    }
  }

  async getExportStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;

      const job = await this.exportService.getExportJobStatus(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: { code: 'JOB_NOT_FOUND', message: 'Export job not found' }
        });
      }

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error fetching export status:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch export status' }
      });
    }
  }

  private getContentType(format: string): string {
    const contentTypes = {
      pdf: 'application/pdf',
      png: 'image/png',
      svg: 'image/svg+xml',
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return contentTypes[format] || 'application/octet-stream';
  }
}
