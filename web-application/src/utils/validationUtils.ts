// web-application/src/utils/validationUtils.ts

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Validate required string field
export const validateRequiredString = (
  value: string | undefined | null, 
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): ValidationResult => {
  const errors: string[] = [];
  
  if (!value || value.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  } else {
    if (value.trim().length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters`);
    }
    
    if (maxLength && value.trim().length > maxLength) {
      errors.push(`${fieldName} must be less than ${maxLength} characters`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate email format
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please enter a valid email address');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate slug format (URL-safe string)
export const validateSlug = (slug: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!slug || slug.trim().length === 0) {
    errors.push('Slug is required');
  } else {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug.trim())) {
      errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate numeric range
export const validateNumericRange = (
  value: number | undefined | null,
  fieldName: string,
  min?: number,
  max?: number,
  required: boolean = true
): ValidationResult => {
  const errors: string[] = [];
  
  if (value === undefined || value === null) {
    if (required) {
      errors.push(`${fieldName} is required`);
    }
  } else {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${fieldName} must be a valid number`);
    } else {
      if (min !== undefined && value < min) {
        errors.push(`${fieldName} must be at least ${min}`);
      }
      
      if (max !== undefined && value > max) {
        errors.push(`${fieldName} must be at most ${max}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate array length
export const validateArrayLength = (
  arr: any[] | undefined | null,
  fieldName: string,
  minLength: number = 0,
  maxLength?: number,
  required: boolean = true
): ValidationResult => {
  const errors: string[] = [];
  
  if (!arr || !Array.isArray(arr)) {
    if (required) {
      errors.push(`${fieldName} is required`);
    }
  } else {
    if (arr.length < minLength) {
      errors.push(`${fieldName} must have at least ${minLength} item${minLength !== 1 ? 's' : ''}`);
    }
    
    if (maxLength && arr.length > maxLength) {
      errors.push(`${fieldName} must have at most ${maxLength} item${maxLength !== 1 ? 's' : ''}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Validate object has required properties
export const validateRequiredProperties = (
  obj: any,
  requiredProperties: string[],
  objectName: string = 'Object'
): ValidationResult => {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    errors.push(`${objectName} is required`);
  } else {
    requiredProperties.forEach(prop => {
      if (!(prop in obj) || obj[prop] === undefined || obj[prop] === null) {
        errors.push(`${objectName}.${prop} is required`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Combine multiple validation results
export const combineValidationResults = (...results: ValidationResult[]): ValidationResult => {
  const allErrors = results.flatMap(result => result.errors);
  const allWarnings = results.flatMap(result => result.warnings || []);
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  };
};

// Validate workspace-specific data format
export const validateWorkspaceData = (data: any): ValidationResult => {
  const nameValidation = validateRequiredString(data?.name, 'Workspace name', 1, 100);
  const slugValidation = data?.slug ? validateSlug(data.slug) : { valid: true, errors: [] };
  
  return combineValidationResults(nameValidation, slugValidation);
};

// Validate dashboard-specific data format  
export const validateDashboardData = (data: any): ValidationResult => {
  const nameValidation = validateRequiredString(data?.name, 'Dashboard name', 1, 100);
  const descriptionValidation = data?.description 
    ? validateRequiredString(data.description, 'Dashboard description', 0, 500)
    : { valid: true, errors: [] };
  
  return combineValidationResults(nameValidation, descriptionValidation);
};

// Validate chart-specific data format
export const validateChartData = (data: any): ValidationResult => {
  const nameValidation = validateRequiredString(data?.name, 'Chart name', 1, 100);
  const typeValidation = validateRequiredString(data?.type, 'Chart type');
  const datasetValidation = validateRequiredString(data?.dataset_id, 'Dataset');
  
  const positionValidation = validateRequiredProperties(
    data?.position,
    ['x', 'y', 'width', 'height'],
    'Chart position'
  );
  
  return combineValidationResults(
    nameValidation, 
    typeValidation, 
    datasetValidation, 
    positionValidation
  );
};

// Validate dataset-specific data format
export const validateDatasetData = (data: any): ValidationResult => {
  const nameValidation = validateRequiredString(data?.name, 'Dataset name', 1, 100);
  const typeValidation = data?.type && !['table', 'query', 'transformation'].includes(data.type)
    ? { valid: false, errors: ['Dataset type must be table, query, or transformation'] }
    : { valid: true, errors: [] };
  
  return combineValidationResults(nameValidation, typeValidation);
};