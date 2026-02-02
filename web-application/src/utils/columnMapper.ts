// Create a new utility file: src/utils/columnMapper.ts

import { ColumnDefinition } from '../types/dataset.types';

// API column format (what you're receiving)
export interface ApiColumn {
  name: string;
  type: string;
}

// Transform API columns to ColumnDefinition format
export const mapApiColumnsToColumnDefinitions = (
  apiColumns: ApiColumn[]
): ColumnDefinition[] => {
  return apiColumns.map(col => ({
    name: col.name,
    display_name: col.name,
    data_type: col.type,
    is_nullable: true,        // Default - could be enhanced with actual API data
    is_primary_key: false,    // Default - could be enhanced with actual API data
    description: undefined,   // Optional
    format_hint: undefined,   // Optional
    default_value: undefined, // Optional
  }));
};
