/**
 * Check if a data type is numeric
 */
export const isNumericType = (dataType: string): boolean => {
  if (!dataType || typeof dataType !== 'string') {
    return false;
  }
  
  const lowerType = dataType.toLowerCase();
  
  // PostgreSQL numeric types
  const postgresNumericTypes = [
    'integer', 'int', 'int4', 'bigint', 'int8', 'smallint', 'int2',
    'decimal', 'numeric', 'real', 'float4', 'double', 'float8',
    'serial', 'bigserial', 'smallserial', 'money'
  ];
  
  // MySQL/MariaDB numeric types  
  const mysqlNumericTypes = [
    'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint',
    'decimal', 'dec', 'numeric', 'fixed', 'float', 'double', 'real',
    'bit'
  ];
  
  // Generic/normalized numeric types
  const genericNumericTypes = [
    'number', 'integer', 'decimal', 'float', 'double', 'bigint', 'numeric'
  ];
  
  // Check exact matches first
  if ([...postgresNumericTypes, ...mysqlNumericTypes, ...genericNumericTypes].includes(lowerType)) {
    return true;
  }
  
  // Check partial matches
  const numericKeywords = ['int', 'float', 'double', 'decimal', 'numeric', 'number', 'serial'];
  return numericKeywords.some(keyword => lowerType.includes(keyword));
};

/**
 * Check if a data type is categorical/string
 */
export const isCategoricalType = (dataType: string): boolean => {
  if (!dataType || typeof dataType !== 'string') {
    return false;
  }
  
  const lowerType = dataType.toLowerCase();
  
  // PostgreSQL string types
  const postgresStringTypes = [
    'text', 'varchar', 'character', 'char', 'bpchar', 'name', 'uuid'
  ];
  
  // MySQL/MariaDB string types
  const mysqlStringTypes = [
    'char', 'varchar', 'text', 'tinytext', 'mediumtext', 'longtext',
    'binary', 'varbinary', 'enum', 'set'
  ];
  
  // Generic/normalized string types
  const genericStringTypes = [
    'string', 'varchar', 'text', 'char', 'character'
  ];
  
  // Check exact matches first
  if ([...postgresStringTypes, ...mysqlStringTypes, ...genericStringTypes].includes(lowerType)) {
    return true;
  }
  
  // Check partial matches
  const stringKeywords = ['text', 'char', 'varchar', 'string'];
  return stringKeywords.some(keyword => lowerType.includes(keyword));
};

/**
 * Check if a data type is date/time related
 */
export const isDateType = (dataType: string): boolean => {
  if (!dataType || typeof dataType !== 'string') {
    return false;
  }
  
  const lowerType = dataType.toLowerCase();
  
  // PostgreSQL date/time types
  const postgresDateTypes = [
    'date', 'time', 'timestamp', 'timestamptz', 'timetz', 'interval'
  ];
  
  // MySQL/MariaDB date/time types
  const mysqlDateTypes = [
    'date', 'time', 'datetime', 'timestamp', 'year'
  ];
  
  // Generic/normalized date types
  const genericDateTypes = [
    'date', 'datetime', 'timestamp', 'time'
  ];
  
  // Check exact matches first
  if ([...postgresDateTypes, ...mysqlDateTypes, ...genericDateTypes].includes(lowerType)) {
    return true;
  }
  
  // Check partial matches
  const dateKeywords = ['date', 'time', 'timestamp'];
  return dateKeywords.some(keyword => lowerType.includes(keyword));
};

/**
 * Check if a data type is boolean
 */
export const isBooleanType = (dataType: string): boolean => {
  if (!dataType || typeof dataType !== 'string') {
    return false;
  }
  
  const lowerType = dataType.toLowerCase();
  
  const booleanTypes = ['boolean', 'bool', 'bit'];
  return booleanTypes.includes(lowerType) || lowerType.includes('bool');
};

/**
 * Get the general category of a data type
 */
export const getDataTypeCategory = (dataType: string): 'numeric' | 'categorical' | 'date' | 'boolean' | 'unknown' => {
  if (isNumericType(dataType)) return 'numeric';
  if (isDateType(dataType)) return 'date';
  if (isBooleanType(dataType)) return 'boolean';
  if (isCategoricalType(dataType)) return 'categorical';
  return 'unknown';
};

/**
 * Validate if a field type is compatible with expected types
 */
export const validateFieldType = (dataType: string, expectedTypes: string[]): boolean => {
  return expectedTypes.some(type => {
    switch (type.toLowerCase()) {
      case 'numeric':
      case 'number':
        return isNumericType(dataType);
      case 'categorical':
      case 'string':
        return isCategoricalType(dataType);
      case 'date':
      case 'datetime':
        return isDateType(dataType);
      case 'boolean':
      case 'bool':
        return isBooleanType(dataType);
      default:
        return true; // Allow all types if not specified
    }
  });
};

// ============================================================================
// EXPECTED DATA TYPES FOR CHART MAPPINGS
// ============================================================================

/**
 * Returns the expected data types for different chart mapping types
 * @param mappingType - The type of mapping (x-axis, y-axis, series, etc.)
 * @returns Array of expected data types
 */
export const getExpectedDataTypes = (mappingType: string): string[] => {
  const mappingTypeMap: Record<string, string[]> = {
    // X-Axis mappings - typically categorical or date
    'x-axis': ['categorical', 'date'],
    'xField': ['categorical', 'date'],
    'x_axis': ['categorical', 'date'],
    'xAxis': ['categorical', 'date'],
    'X-Axis': ['categorical', 'date'],
    'category': ['categorical', 'date'],
    'dimension': ['categorical', 'date'],
    
    // Y-Axis mappings - typically numeric
    'y-axis': ['numeric'],
    'yField': ['numeric'],
    'y_axis': ['numeric'],
    'yAxis': ['numeric'],
    'Y-Axis': ['numeric'],
    'value': ['numeric'],
    'valueField': ['numeric'],
    'measure': ['numeric'],
    'metric': ['numeric'],
    
    // Series mappings - typically categorical
    'series': ['categorical'],
    'color': ['categorical'],
    'group': ['categorical'],
    'legend': ['categorical'],
    
    // Size mappings - typically numeric
    'size': ['numeric'],
    'radius': ['numeric'],
    'area': ['numeric'],
    
    // Date/Time mappings
    'date': ['date'],
    'time': ['date'],
    'timestamp': ['date'],
    
    // Special mappings
    'label': ['categorical', 'numeric'],
    'tooltip': ['categorical', 'numeric', 'date'],
    'filter': ['categorical', 'numeric', 'date', 'boolean'],
    
    // Geographic mappings
    'latitude': ['numeric'],
    'longitude': ['numeric'],
    'location': ['categorical'],
    'region': ['categorical'],
    
    // Default fallback
    'any': ['categorical', 'numeric', 'date', 'boolean']
  };

  // Normalize the mapping type to lowercase for lookup
  const normalizedType = mappingType.toLowerCase();
  
  // Check for exact match first
  if (mappingTypeMap[normalizedType]) {
    return mappingTypeMap[normalizedType];
  }
  
  // Check for partial matches
  for (const [key, types] of Object.entries(mappingTypeMap)) {
    if (normalizedType.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedType)) {
      return types;
    }
  }
  
  // Default fallback - allow any type
  return mappingTypeMap['any'];
};

// ============================================================================
// DATA TYPE CONVERSION UTILITIES
// ============================================================================

export const convertDataType = (value: any, targetType: string): any => {
  if (value == null) return null;
  
  switch (targetType.toLowerCase()) {
    case 'number':
    case 'numeric':
    case 'integer':
    case 'float':
      return Number(value);
    
    case 'string':
    case 'text':
      return String(value);
    
    case 'boolean':
    case 'bool':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value);
    
    case 'date':
    case 'datetime':
      return new Date(value);
    
    default:
      return value;
  }
};

export const inferDataType = (values: any[]): string => {
  if (!values || values.length === 0) return 'string';
  
  // Filter out null/undefined values
  const validValues = values.filter(v => v != null);
  if (validValues.length === 0) return 'string';
  
  // Check if all values are numbers
  if (validValues.every(v => !isNaN(Number(v)) && isFinite(Number(v)))) {
    return 'number';
  }
  
  // Check if all values are booleans
  if (validValues.every(v => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1)) {
    return 'boolean';
  }
  
  // Check if all values are dates
  if (validValues.every(v => !isNaN(Date.parse(v)))) {
    return 'date';
  }
  
  // Default to string
  return 'string';
};

// ============================================================================
// FIELD VALIDATION UTILITIES
// ============================================================================

export const validateFieldForMapping = (
  fieldType: string, 
  mappingType: string
): { isValid: boolean; reason?: string } => {
  const expectedTypes = getExpectedDataTypes(mappingType);
  
  let fieldCategory = 'unknown';
  if (isNumericType(fieldType)) fieldCategory = 'numeric';
  else if (isCategoricalType(fieldType)) fieldCategory = 'categorical';
  else if (isDateType(fieldType)) fieldCategory = 'date';
  else if (isBooleanType(fieldType)) fieldCategory = 'boolean';
  
  const isValid = expectedTypes.includes(fieldCategory);
  
  return {
    isValid,
    reason: isValid ? undefined : `Field type '${fieldType}' (${fieldCategory}) is not compatible with mapping '${mappingType}'. Expected: ${expectedTypes.join(', ')}`
  };
};

// ============================================================================
// CHART SPECIFIC UTILITIES
// ============================================================================

export const getRecommendedMappings = (chartType: string): Record<string, string[]> => {
  const chartMappings: Record<string, Record<string, string[]>> = {
    'bar': {
      'x-axis': ['categorical'],
      'y-axis': ['numeric'],
      'series': ['categorical']
    },
    'line': {
      'x-axis': ['date', 'categorical'],
      'y-axis': ['numeric'],
      'series': ['categorical']
    },
    'pie': {
      'category': ['categorical'],
      'value': ['numeric']
    },
    'scatter': {
      'x-axis': ['numeric'],
      'y-axis': ['numeric'],
      'size': ['numeric'],
      'color': ['categorical', 'numeric']
    },
    'area': {
      'x-axis': ['date', 'categorical'],
      'y-axis': ['numeric'],
      'series': ['categorical']
    },
    'heatmap': {
      'x-axis': ['categorical'],
      'y-axis': ['categorical'],
      'value': ['numeric']
    }
  };
  
  return chartMappings[chartType.toLowerCase()] || {
    'x-axis': ['categorical', 'date'],
    'y-axis': ['numeric']
  };
};

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  isNumericType,
  isCategoricalType,
  isDateType,
  isBooleanType,
  getExpectedDataTypes,
  convertDataType,
  inferDataType,
  validateFieldForMapping,
  getRecommendedMappings
};