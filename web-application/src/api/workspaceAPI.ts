import apiClient from '@/middleware/apiMiddleware';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings: WorkspaceSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_roles: string[];
  highest_role_level: number;
}

export interface WorkspaceSettings {
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  date_format: string;
  number_format: string;
  language: string;
  currency: string;
  max_query_timeout: number;
  max_export_rows: number;
  features: string[];
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
  logo_url?: string;
}

class WorkspaceService {
  // Get all workspaces for current user
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await apiClient.get('/api/workspaces');
    return response.data || response.workspaces || [];
  }

  // Get specific workspace by ID
  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await apiClient.get(`/api/workspaces/${workspaceId}`);
    return response.data || response;
  }

  // Get current workspace details
  async getCurrentWorkspace(): Promise<Workspace> {
    const response = await apiClient.workspace.get('');
    return response.data || response;
  }

  // Create new workspace
  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await apiClient.post('/api/workspaces', data);
    return response.data || response;
  }

  // Update workspace
  async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    const response = await apiClient.put(`/api/workspaces/${workspaceId}`, data);
    return response.data || response;
  }

  // Delete workspace
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await apiClient.delete(`/api/workspaces/${workspaceId}`);
  }

  // Switch to different workspace
  async switchWorkspace(workspaceSlug: string): Promise<any> {
    const response = await apiClient.post('/api/auth/switch-workspace', {
      workspace_slug: workspaceSlug
    });
    return response.data || response;
  }

  // Get workspace members
  async getWorkspaceMembers(): Promise<any[]> {
    const response = await apiClient.workspace.get('/members');
    return response.data || response.members || [];
  }

  // Invite user to workspace
  async inviteUser(email: string, roleId: string): Promise<any> {
    const response = await apiClient.workspace.post('/members/invite', {
      email,
      role_id: roleId
    });
    return response.data || response;
  }

  // Remove user from workspace
  async removeUser(userId: string): Promise<void> {
    await apiClient.workspace.delete(`/members/${userId}`);
  }

  // Get workspace settings
  async getWorkspaceSettings(): Promise<WorkspaceSettings> {
    const response = await apiClient.workspace.get('/settings');
    return response.data || response;
  }

  // Update workspace settings
  async updateWorkspaceSettings(settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    const response = await apiClient.workspace.put('/settings', settings);
    return response.data || response;
  }
}

export const workspaceService = new WorkspaceService();