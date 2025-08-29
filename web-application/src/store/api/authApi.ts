// web-application/src/store/api/authApi.ts
import { baseApi } from './baseApi';

export interface LoginRequest {
  username: string;
  password: string;
  workspace_slug: string;
}

export interface LoginResponse {
  user: any;
  token: string;
  workspace: any;
  permissions: string[];
  expires_at: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    refreshToken: builder.mutation<{ token: string; expires_at: string }, { refresh_token: string }>({
      query: ({ refresh_token }) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: { refresh_token },
      }),
    }),
    getUserWorkspaces: builder.query<any[], void>({
      query: () => '/auth/workspaces',
      providesTags: ['Workspace'],
    }),
    getUserProfile: builder.query<any, void>({
      query: () => '/auth/profile',
      providesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useGetUserWorkspacesQuery,
  useGetUserProfileQuery,
} = authApi;