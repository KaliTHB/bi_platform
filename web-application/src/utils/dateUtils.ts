// web-application/src/utils/dateUtils.ts

/**
 * Format a timestamp into a human-readable relative time string
 * @param timestamp - The timestamp in milliseconds
 * @returns A formatted string like "Just now", "5m ago", "2h ago", etc.
 */
export const formatTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Format a timestamp into a more detailed relative time string
 * @param timestamp - The timestamp in milliseconds
 * @returns A formatted string like "2 minutes ago", "1 hour ago", etc.
 */
export const formatDetailedTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);

  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Format a date into a standard format
 * @param date - Date object, ISO string, or timestamp
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = new Date(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format a date and time into a standard format
 * @param date - Date object, ISO string, or timestamp
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = new Date(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return dateObj.toLocaleString('en-US', { ...defaultOptions, ...options });
};

/**
 * Format time only from a date
 * @param date - Date object, ISO string, or timestamp
 * @param use24Hour - Whether to use 24-hour format (default: false)
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string | number,
  use24Hour: boolean = false
): string => {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  };
  
  return dateObj.toLocaleTimeString('en-US', options);
};

/**
 * Get time difference between two dates
 * @param start - Start date
 * @param end - End date (defaults to now)
 * @returns Object with time difference breakdown
 */
export const getTimeDifference = (
  start: Date | string | number,
  end: Date | string | number = Date.now()
) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const diff = Math.abs(endTime - startTime);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalMs: diff };
};

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns Boolean indicating if date is today
 */
export const isToday = (date: Date | string | number): boolean => {
  const today = Date.now();
  const checkDate = new Date(date);
  
  return (
    today.getDate() === checkDate.getDate() &&
    today.getMonth() === checkDate.getMonth() &&
    today.getFullYear() === checkDate.getFullYear()
  );
};

/**
 * Check if a date is yesterday
 * @param date - Date to check
 * @returns Boolean indicating if date is yesterday
 */
export const isYesterday = (date: Date | string | number): boolean => {
  const yesterday = Date.now();
  yesterday.setDate(yesterday.getDate() - 1);
  const checkDate = new Date(date);
  
  return (
    yesterday.getDate() === checkDate.getDate() &&
    yesterday.getMonth() === checkDate.getMonth() &&
    yesterday.getFullYear() === checkDate.getFullYear()
  );
};

/**
 * Format a duration in milliseconds to human readable string
 * @param duration - Duration in milliseconds
 * @returns Formatted duration string like "2h 30m" or "45s"
 */
export const formatDuration = (duration: number): string => {
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  return `${seconds}s`;
};

/**
 * Get start of day for a given date
 * @param date - Date to get start of day for
 * @returns Date object set to start of day (00:00:00.000)
 */
export const getStartOfDay = (date: Date | string | number): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Get end of day for a given date
 * @param date - Date to get end of day for
 * @returns Date object set to end of day (23:59:59.999)
 */
export const getEndOfDay = (date: Date | string | number): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};