// web-application/src/utils/schemaUtils.ts

/**
 * Safely extracts default values from a chart plugin schema
 * Handles different schema formats and provides type safety
 */
export function extractDefaultValues(configSchema: any): Record<string, any> {
  const defaultConfig: Record<string, any> = {};
  
  if (!configSchema || typeof configSchema !== 'object') {
    return defaultConfig;
  }
  
  try {
    // Handle JSON Schema format with properties object
    if ('properties' in configSchema && configSchema.properties) {
      Object.entries(configSchema.properties).forEach(([key, property]) => {
        const defaultValue = getDefaultFromProperty(property);
        if (defaultValue !== undefined) {
          defaultConfig[key] = defaultValue;
        }
      });
    } 
    // Handle flat schema format (direct key-value pairs)
    else {
      Object.entries(configSchema).forEach(([key, property]) => {
        const defaultValue = getDefaultFromProperty(property);
        if (defaultValue !== undefined) {
          defaultConfig[key] = defaultValue;
        }
      });
    }
  } catch (error) {
    console.warn('Error extracting default values from schema:', error);
  }
  
  return defaultConfig;
}

/**
 * Safely extracts default value from a schema property
 */
function getDefaultFromProperty(property: unknown): any {
  if (!property || typeof property !== 'object') {
    return undefined;
  }
  
  const prop = property as Record<string, any>;
  
  // Check for explicit default value
  if ('default' in prop) {
    return prop.default;
  }
  
  // Provide sensible defaults based on type
  if ('type' in prop) {
    switch (prop.type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return undefined;
    }
  }
  
  return undefined;
}

/**
 * Type guard to check if an object has a specific property
 */
export function hasProperty<T extends string>(
  obj: unknown, 
  prop: T
): obj is Record<T, unknown> {
  return obj !== null && typeof obj === 'object' && prop in obj;
}

/**
 * Safely gets a nested property from an object
 */
export function safeGetProperty(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as any)[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}