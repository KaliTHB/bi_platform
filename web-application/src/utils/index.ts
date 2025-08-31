// web-application/src/utils/index.ts

// Date and time utilities
export {
  formatTimestamp,
  formatDetailedTimestamp,
  formatDate,
  formatDateTime,
  formatTime,
  formatDuration,
  getTimeDifference,
  isToday,
  isYesterday,
  getStartOfDay,
  getEndOfDay,
} from './dateUtils';

// Format utilities
export {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatBytes,
  formatFileSize,
  formatLargeNumber,
  formatPhoneNumber,
  formatAddress,
  truncateText,
  capitalizeWords,
  camelToTitle,
} from './formatUtils';

// API utilities (if you already have apiUtils.ts)
export { ApiClient } from './apiUtils';

// You can add more utility exports here as you create them:
// export { formatCurrency, formatNumber } from './formatUtils';
// export { validateEmail, validatePassword } from './validationUtils';
// export { debounce, throttle } from './performanceUtils';
// export { copyToClipboard, downloadFile } from './browserUtils';