// File: web-application/src/constants/plugins.ts
// Plugin system constants

export const PLUGIN_CATEGORIES = {
  DATA_SOURCES: {
    RELATIONAL: ['postgres', 'mysql', 'mariadb', 'mssql', 'oracle', 'sqlite'],
    NOSQL: ['mongodb', 'cosmosdb', 'dynamodb'],
    CLOUD: ['bigquery', 'snowflake', 'redshift', 'athena'],
    STORAGE: ['s3', 'azure_storage', 'google_storage'],
    FILE_SHARING: ['google_drive', 'one_drive', 'dropbox'],
    DATA_LAKES: ['delta_table_aws', 'delta_table_azure', 'iceberg'],
  },
  
  VISUALIZATIONS: {
    BASIC: ['bar', 'line', 'pie', 'scatter', 'area'],
    ADVANCED: ['heatmap', 'treemap', 'sankey', 'radar', 'gauge'],
    STATISTICAL: ['histogram', 'boxplot', 'violin', 'regression'],
    GEOSPATIAL: ['choropleth', 'scatter_geo', 'density_map'],
  },
  
  TRANSFORMATIONS: {
    AGGREGATION: ['sum', 'count', 'average', 'min', 'max'],
    FILTERING: ['where', 'having', 'distinct'],
    GROUPING: ['group_by', 'partition_by'],
    JOINS: ['inner_join', 'left_join', 'right_join', 'full_join'],
  },
} as const;

export const PLUGIN_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  LOADING: 'loading',
  UPDATING: 'updating',
} as const;

export const PLUGIN_TYPES = {
  DATA_SOURCE: 'data_source',
  VISUALIZATION: 'visualization',
  TRANSFORMATION: 'transformation',
  EXPORT: 'export',
  INTEGRATION: 'integration',
} as const;