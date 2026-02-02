import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const datasourceApi = createApi({
  reducerPath: 'datasourceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/datasources',
  }),
  tagTypes: ['Datasource'],
  endpoints: (builder) => ({
    getDatasources: builder.query<any, any>({
      query: () => '',
      providesTags: ['Datasource'],
    }),
  }),
});

export const { useGetDatasourcesQuery } = datasourceApi;