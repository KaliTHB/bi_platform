import { apiClient } from '../utils/apiUtils';
import type {
  Workspace, 
  CreateWorkspaceRequest, 
  UpdateWorkspaceRequest 
} from '../types';

// Workspace API
export const workspaceAPI = {
  getWorkspaces: async (): Promise<{ success: boolean; workspaces: Workspace[]; message?: string }> => {
    const response = await apiClient.get('/workspaces');
    return response.data;
  },

  getWorkspace: async (workspaceId: string): Promise<{ success: boolean; workspace: Workspace; message?: string }> => {
    const response = await apiClient.get(`/workspaces/${workspaceId}`);
    return response.data;
  },

  createWorkspace: async (data: CreateWorkspaceRequest): Promise<{ success: boolean; workspace: Workspace; message: string }> => {
    const response = await apiClient.post('/workspaces', data);
    return response.data;
  },

  updateWorkspace: async (workspaceId: string, data: UpdateWorkspaceRequest): Promise<{ success: boolean; workspace: Workspace; message: string }> => {
    const response = await apiClient.put(`/workspaces/${workspaceId}`, data);
    return response.data;
  },

  deleteWorkspace: async (workspaceId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/workspaces/${workspaceId}`);
    return response.data;
  },

  getWorkspaceMembers: async (workspaceId: string): Promise<{ success: boolean; members: any[]; message?: string }> => {
    const response = await apiClient.get(`/workspaces/${workspaceId}/members`);
    return response.data;
  },

  getWorkspaceActivity: async (workspaceId: string, params?: any): Promise<{ success: boolean; activity: any[]; message?: string }> => {
    let endpoint = `/workspaces/${workspaceId}/activity`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
      
      if (queryParams.toString()) {
        endpoint += `?${queryParams.toString()}`;
      }
    }
    
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  inviteUser: async (workspaceId: string, userData: any): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/workspaces/${workspaceId}/invite`, userData);
    return response.data;
  },

  updateUserRole: async (workspaceId: string, userId: string, roleData: { role_ids: string[] }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.put(`/workspaces/${workspaceId}/members/${userId}/roles`, roleData);
    return response.data;
  },

  removeUser: async (workspaceId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
    return response.data;
  },
};
