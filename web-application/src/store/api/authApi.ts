import { baseApi } from './baseApi';
import { setCredentials, clearAuth, updateTokens } from '../slices/authSlice';

interface LoginRequest {
  username: string;
  password: string;
  workspaceSlug?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    email: string;
    display_name: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

interface RefreshRequest {
  refreshToken: string;
}

interface SwitchWorkspaceRequest {
  workspaceSlug: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
          
          // Store tokens in localStorage for persistence
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        } catch (error) {
          // Handle login error
        }
      },
    }),
    
    refreshToken: builder.mutation<AuthResponse, RefreshRequest>({
      query: ({ refreshToken }) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(updateTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          }));
          
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        } catch (error) {
          dispatch(clearAuth());
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      },
    }),
    
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        dispatch(clearAuth());
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      },
    }),
    
    switchWorkspace: builder.mutation<AuthResponse, SwitchWorkspaceRequest>({
      query: ({ workspaceSlug }) => ({
        url: '/auth/switch-workspace',
        method: 'POST',
        body: { workspaceSlug },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
          
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
        } catch (error) {
          // Handle error
        }
      },
    }),
    
    getCurrentUser: builder.query<{
      user: any;
      permissions: string[];
      roles: string[];
      workspaces: any[];
    }, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useSwitchWorkspaceMutation,
  useGetCurrentUserQuery,
} = authApi;