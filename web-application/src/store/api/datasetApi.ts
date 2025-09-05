import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const datasetApi = createApi({
  reducerPath: 'datasetApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/datasets',
  }),
  tagTypes: ['Dataset'],
  endpoints: (builder) => ({
    getDatasets: builder.query<any, any>({
      query: () => '',
      providesTags: ['Dataset'],
    }),
  }),
});

export const { useGetDatasetsQuery } = datasetApi;