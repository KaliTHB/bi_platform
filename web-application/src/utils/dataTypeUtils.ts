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

/**
 * Get expected data types for a field mapping
 */
export const getExpectedDataTypes = (mappingType: string): string[] => {
  switch (mappingType.toLowerCase()) {
    case 'x-axis':
    case 'xfield':
    case 'category':
      return ['categorical', 'date', 'string'];
    
    case 'y-axis': 
    case 'yfield':
    case 'value':
    case 'measure':
      return ['numeric'];
      
    case 'size':
    case 'radius':
      return ['numeric'];
      
    case 'color':
      return ['categorical', 'numeric'];
      
    case 'date':
    case 'time':
      return ['date'];
      
    default:
      return ['categorical', 'numeric', 'date']; // Allow all types by default
  }
};