// web-application/src/utils/formatUtils.ts

/**
 * Format a number as currency
 * @param amount - The number to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Format a number with thousand separators
 * @param number - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted number string
 */
export const formatNumber = (
  number: number,
  decimals: number = 0,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

/**
 * Format a number as a percentage
 * @param number - The number to format (0.15 becomes 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  number: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

/**
 * Format bytes into human readable format
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "1.23 MB"
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Truncate text to a specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 */
export const truncateText = (
  text: string,
  maxLength: number,
  suffix: string = '...'
): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Capitalize the first letter of each word
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export const capitalizeWords = (text: string): string => {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Convert camelCase or PascalCase to human readable format
 * @param text - Text to convert
 * @returns Human readable text
 */
export const camelToTitle = (text: string): string => {
  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Format a file size with appropriate unit
 * @param size - Size in bytes
 * @returns Formatted size string
 */
export const formatFileSize = (size: number): string => {
  return formatBytes(size);
};

/**
 * Format a large number with K, M, B suffixes
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string like "1.2K" or "5.6M"
 */
export const formatLargeNumber = (num: number, decimals: number = 1): string => {
  if (num < 1000) return num.toString();
  
  const units = ['', 'K', 'M', 'B', 'T'];
  const unitIndex = Math.floor(Math.log10(Math.abs(num)) / 3);
  const unitValue = Math.pow(1000, unitIndex);
  const formattedNum = (num / unitValue).toFixed(decimals);
  
  return `${formattedNum}${units[unitIndex]}`;
};

/**
 * Clean and format a phone number
 * @param phone - Phone number to format
 * @param format - Format pattern (default: US format)
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (
  phone: string,
  format: string = '(xxx) xxx-xxxx'
): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return format
      .replace(/x{3}/, match[1])
      .replace(/x{3}/, match[2])
      .replace(/x{4}/, match[3]);
  }
  
  return phone;
};

/**
 * Format an address into a single line
 * @param address - Address object with street, city, state, zip
 * @returns Formatted address string
 */
export const formatAddress = (address: {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}): string => {
  const parts = [
    address.street,
    address.city,
    address.state && address.zip ? `${address.state} ${address.zip}` : address.state || address.zip,
    address.country,
  ].filter(Boolean);
  
  return parts.join(', ');
};