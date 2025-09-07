import { FieldInfo } from '@/types/chart.types';

export const getFieldTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    'number': '📊',
    'string': '📝',
    'date': '📅',
    'boolean': '☑️'
  };
  return icons[type] || '❓';
};

export const getFieldTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'number': '#1e40af',
    'string': '#7c3aed',
    'date': '#065f46',
    'boolean': '#92400e'
  };
  return colors[type] || '#6b7280';
};

export const getFieldTypeBadgeClass = (type: string): string => {
  const classes: Record<string, string> = {
    'number': 'type-badge-number',
    'string': 'type-badge-string',
    'date': 'type-badge-date',
    'boolean': 'type-badge-boolean'
  };
  return classes[type] || 'type-badge-default';
};

export const inferFieldType = (sampleValues: any[]): string => {
  if (sampleValues.length === 0) return 'string';

  const uniqueValues = new Set(sampleValues);
  
  // Check if boolean (only true/false values)
  if (uniqueValues.size <= 2 && 
      Array.from(uniqueValues).every(val => 
        val === true || val === false || val === 'true' || val === 'false'
      )) {
    return 'boolean';
  }

  // Check if all values can be parsed as numbers
  const numericValues = sampleValues.filter(val => {
    const num = Number(val);
    return !isNaN(num) && isFinite(num);
  });

  if (numericValues.length === sampleValues.length) {
    return 'number';
  }

  // Check if all values can be parsed as dates
  const dateValues = sampleValues.filter(val => {
    const date = new Date(val);
    return date instanceof Date && !isNaN(date.getTime());
  });

  if (dateValues.length === sampleValues.length) {
    return 'date';
  }

  // Default to string
  return 'string';
};

export const validateFieldData = (field: FieldInfo): string[] => {
  const errors: string[] = [];

  if (!field.name || field.name.trim() === '') {
    errors.push('Field name is required');
  }

  if (!field.type || !['string', 'number', 'date', 'boolean'].includes(field.type)) {
    errors.push('Invalid field type');
  }

  if (field.uniqueCount !== undefined && field.uniqueCount < 0) {
    errors.push('Unique count cannot be negative');
  }

  if (field.nullCount !== undefined && field.nullCount < 0) {
    errors.push('Null count cannot be negative');
  }

  return errors;
};

export const generateFieldStatistics = (values: any[], fieldType: string) => {
  const stats = {
    count: values.length,
    uniqueCount: new Set(values).size,
    nullCount: values.filter(v => v === null || v === undefined).length
  };

  if (fieldType === 'number') {
    const numericValues = values
      .filter(v => v !== null && v !== undefined)
      .map(v => Number(v))
      .filter(n => !isNaN(n));

    if (numericValues.length > 0) {
      return {
        ...stats,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        sum: numericValues.reduce((a, b) => a + b, 0)
      };
    }
  }

  return stats;
};