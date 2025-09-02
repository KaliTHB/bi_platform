
import { apiClient } from '../utils/apiUtils';

// User API
export const userAPI = {
  getUsers: async (workspaceId?: string): Promise<{ success: boolean; users: any[]; message?: string }> => {
    const endpoint = workspaceId ? `/users?workspace_id=${workspaceId}` : '/users';
    const response = await apiClient.get(endpoint);
    return response.data;
  },

  getUser: async (userId: string): Promise<{ success: boolean; user: any; message?: string }> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, data: any): Promise<{ success: boolean; user: any; message: string }> => {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  },

  updateUserProfile: async (data: any): Promise<{ success: boolean; user: any; message: string }> => {
    const response = await apiClient.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/users/change-password', data);
    return response.data;
  },
};
