// File: web-application/src/constants/validation.ts
// Validation rules and constraints

export const VALIDATION_RULES = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 254,
    REQUIRED: true,
  },
  
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
  
  WORKSPACE: {
    NAME: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 50,
      PATTERN: /^[a-zA-Z0-9\s-_]+$/,
    },
    DESCRIPTION: {
      MAX_LENGTH: 500,
    },
  },
  
  DASHBOARD: {
    NAME: {
      MIN_LENGTH: 1,
      MAX_LENGTH: 100,
    },
    DESCRIPTION: {
      MAX_LENGTH: 1000,
    },
  },
  
  FILE_UPLOAD: {
    MAX_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_TYPES: ['.csv', '.xlsx', '.json', '.parquet'],
    ALLOWED_MIME_TYPES: [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
    ],
  },
} as const;