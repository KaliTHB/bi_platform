import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const chartApi = createApi({
  reducerPath: 'chartApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/charts',
  }),
  tagTypes: ['Chart'],
  endpoints: (builder) => ({
    getCharts: builder.query<any, any>({
      query: () => '',
      providesTags: ['Chart'],
    }),
  }),
});

export const { useGetChartsQuery } = chartApi;
