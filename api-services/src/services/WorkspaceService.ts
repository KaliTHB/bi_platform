// api-services/src/services/WorkspaceService.ts
import { logger } from '../utils/logger';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  display_name?: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_role?: string;
  user_roles?: string[];
  highest_role?: string;
  member_count?: number;
  dashboard_count?: number;
  dataset_count?: number;
  joined_at?: string;
}

export interface WorkspaceStats {
  member_count: number;
  dashboard_count: number;
  dataset_count: number;
  chart_count: number;
  data_source_count: number;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  user?: {
    email: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export class WorkspaceService {
  
  /**
   * Get all workspaces accessible to a user
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      logger.info('Getting workspaces for user', { userId });
      
      // For now, return hardcoded workspaces
      // In production, this would query the database
      const workspaces: Workspace[] = [
        {
          id: 'thb-workspace-001',
          name: 'THB',
          slug: 'thb',
          display_name: 'The Hub',
          description: '',
          logo_url: null,
          settings: {
            theme: 'default',
            timezone: 'UTC',
            currency: 'USD'
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_role: 'admin',
          user_roles: ['admin'],
          highest_role: 'admin',
          member_count: 1,
          dashboard_count: 0,
          dataset_count: 0,
          joined_at: new Date().toISOString()
        },
        {
          id: 'sample-workspace-002',
          name: 'Sample',
          slug: 'sample',
          display_name: 'Sample Workspace',
          description: 'Sample workspace for testing and development',
          logo_url: null,
          settings: {
            theme: 'default',
            timezone: 'UTC',
            currency: 'USD'
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_role: 'editor',
          user_roles: ['editor'],
          highest_role: 'editor',
          member_count: 5,
          dashboard_count: 12,
          dataset_count: 8,
          joined_at: new Date().toISOString()
        }
      ];

      logger.info('Retrieved workspaces', { 
        userId, 
        workspaceCount: workspaces.length 
      });

      return workspaces;
      
    } catch (error: any) {
      logger.error('Error getting user workspaces:', {
        userId,
        error: error.message,
        stack: error.stack
      });
      throw new Error('Failed to retrieve user workspaces');
    }
  }

  /**
   * Get workspace by ID
   */
  async getWorkspaceById(workspaceId: string, userId: string): Promise<Workspace | null> {
    try {
      logger.info('Getting workspace by ID', { workspaceId, userId });
      
      const workspaces = await this.getUserWorkspaces(userId);
      const workspace = workspaces.find(w => w.id === workspaceId || w.slug === workspaceId);
      
      return workspace || null;
      
    } catch (error: any) {
      logger.error('Error getting workspace by ID:', {
        workspaceId,
        userId,
        error: error.message
      });
      throw new Error('Failed to retrieve workspace');
    }
  }

  /**
   * Check if user has access to workspace
   */
  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const workspaces = await this.getUserWorkspaces(userId);
      return workspaces.some(w => w.id === workspaceId || w.slug === workspaceId);
    } catch (error: any) {
      logger.error('Error checking workspace access:', {
        userId,
        workspaceId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
    try {
      // In production, this would query the database for actual counts
      return {
        member_count: 1,
        dashboard_count: 0,
        dataset_count: 0,
        chart_count: 0,
        data_source_count: 0
      };
    } catch (error: any) {
      logger.error('Error getting workspace stats:', {
        workspaceId,
        error: error.message
      });
      throw new Error('Failed to retrieve workspace statistics');
    }
  }

  /**
   * Create new workspace
   */
  async createWorkspace(data: {
    name: string;
    slug?: string;
    description?: string;
    settings?: any;
  }, userId: string): Promise<Workspace> {
    try {
      // Generate slug if not provided
      const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const workspace: Workspace = {
        id: `workspace-${Date.now()}`,
        name: data.name,
        slug,
        display_name: data.name,
        description: data.description || '',
        logo_url: null,
        settings: data.settings || {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_role: 'owner',
        user_roles: ['owner'],
        highest_role: 'owner',
        member_count: 1,
        dashboard_count: 0,
        dataset_count: 0,
        joined_at: new Date().toISOString()
      };

      logger.info('Created workspace', { 
        workspaceId: workspace.id, 
        userId 
      });

      return workspace;
      
    } catch (error: any) {
      logger.error('Error creating workspace:', {
        userId,
        data,
        error: error.message
      });
      throw new Error('Failed to create workspace');
    }
  }

  /**
   * Update workspace
   */
  async updateWorkspace(
    workspaceId: string,
    data: Partial<{
      name: string;
      description: string;
      settings: any;
      logo_url: string;
    }>,
    userId: string
  ): Promise<Workspace | null> {
    try {
      const workspace = await this.getWorkspaceById(workspaceId, userId);
      if (!workspace) {
        return null;
      }

      const updatedWorkspace: Workspace = {
        ...workspace,
        ...data,
        updated_at: new Date().toISOString()
      };

      logger.info('Updated workspace', { 
        workspaceId, 
        userId 
      });

      return updatedWorkspace;
      
    } catch (error: any) {
      logger.error('Error updating workspace:', {
        workspaceId,
        userId,
        error: error.message
      });
      throw new Error('Failed to update workspace');
    }
  }
}