// web-application/src/api/workspaceAPI.ts
import { apiClient } from '@/utils/apiUtils';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  settings?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_roles?: string[];
  role?: string;
  member_count?: number;
}

export interface CreateWorkspaceRequest {
  name: string;
  slug?: string;
  description?: string;
  settings?: Partial<any>;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: Partial<any>;
  logo_url?: string;
}

class WorkspaceService {
  // Get all workspaces for current user
  async getUserWorkspaces(): Promise<Workspace[]> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Workspaces API response:', data);

      // Handle different response formats
      let workspacesArray: any[] = [];
      if (data.success && Array.isArray(data.data)) {
        workspacesArray = data.data;
      } else if (data.success && Array.isArray(data.workspaces)) {
        workspacesArray = data.workspaces;
      } else if (Array.isArray(data)) {
        workspacesArray = data;
      } else if (data.workspaces && Array.isArray(data.workspaces)) {
        workspacesArray = data.workspaces;
      }

      // Transform and validate workspaces
      return workspacesArray
        .filter(ws => ws && ws.id)
        .map((ws: any) => ({
          id: ws.id,
          name: ws.name || 'Unnamed Workspace',
          slug: ws.slug || ws.id,
          description: ws.description || '',
          logo_url: ws.logo_url,
          settings: ws.settings || {},
          is_active: ws.is_active !== false,
          created_at: ws.created_at || new Date().toISOString(),
          updated_at: ws.updated_at || new Date().toISOString(),
          user_roles: ws.user_roles || [],
          role: ws.role || ws.user_role || ws.highest_role || 'member',
          member_count: Number(ws.member_count) || 0,
        }));
    } catch (error) {
      console.error('Error fetching user workspaces:', error);
      throw error;
    }
  }

  // Get all workspaces (alias for getUserWorkspaces for backward compatibility)
  async getWorkspaces(): Promise<Workspace[]> {
    return this.getUserWorkspaces();
  }

  // Get specific workspace by ID
  async getWorkspace(workspaceId: string): Promise<Workspace> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : data;
    } catch (error) {
      console.error('Error fetching workspace:', error);
      throw error;
    }
  }

  // Get current workspace details
  async getCurrentWorkspace(): Promise<Workspace> {
    try {
      const token = localStorage.getItem('auth_token');
      const workspaceId = localStorage.getItem('selected_workspace_id');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      if (!workspaceId) {
        throw new Error('No workspace selected');
      }

      return this.getWorkspace(workspaceId);
    } catch (error) {
      console.error('Error fetching current workspace:', error);
      throw error;
    }
  }

  // Create new workspace
  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : result;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }

  // Update workspace
  async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : result;
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  }

  // Delete workspace
  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  }

  // Switch to different workspace
  async switchWorkspace(workspaceSlug: string): Promise<any> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/auth/switch-workspace`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_slug: workspaceSlug
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : result;
    } catch (error) {
      console.error('Error switching workspace:', error);
      throw error;
    }
  }

  // Get workspace members
  async getWorkspaceMembers(workspaceId?: string): Promise<any[]> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const effectiveWorkspaceId = workspaceId || localStorage.getItem('selected_workspace_id');
      if (!effectiveWorkspaceId) {
        throw new Error('No workspace ID provided');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${effectiveWorkspaceId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : (data.members || []);
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      throw error;
    }
  }

  // Invite user to workspace
  async inviteUser(email: string, roleId: string, workspaceId?: string): Promise<any> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const effectiveWorkspaceId = workspaceId || localStorage.getItem('selected_workspace_id');
      if (!effectiveWorkspaceId) {
        throw new Error('No workspace ID provided');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${effectiveWorkspaceId}/members/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role_id: roleId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : result;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  // Remove user from workspace
  async removeUser(userId: string, workspaceId?: string): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const effectiveWorkspaceId = workspaceId || localStorage.getItem('selected_workspace_id');
      if (!effectiveWorkspaceId) {
        throw new Error('No workspace ID provided');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${effectiveWorkspaceId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  // Get workspace settings
  async getWorkspaceSettings(workspaceId?: string): Promise<any> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const effectiveWorkspaceId = workspaceId || localStorage.getItem('selected_workspace_id');
      if (!effectiveWorkspaceId) {
        throw new Error('No workspace ID provided');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${effectiveWorkspaceId}/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : data;
    } catch (error) {
      console.error('Error fetching workspace settings:', error);
      throw error;
    }
  }

  // Update workspace settings
  async updateWorkspaceSettings(settings: Partial<any>, workspaceId?: string): Promise<any> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const effectiveWorkspaceId = workspaceId || localStorage.getItem('selected_workspace_id');
      if (!effectiveWorkspaceId) {
        throw new Error('No workspace ID provided');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/workspaces/${effectiveWorkspaceId}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : result;
    } catch (error) {
      console.error('Error updating workspace settings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const workspaceService = new WorkspaceService();

// Export both for compatibility
export const workspaceAPI = workspaceService;

export default workspaceService;