// File: api-services/src/plugins/datasources/storage_services/index.ts
// Central export file for all storage service plugins

export { azureStoragePlugin } from './azure_storage';
export { s3Plugin } from './s3';
export { googleStoragePlugin } from './google_storage';
export { googleDrivePlugin } from './google_drive';
export { oneDrivePlugin } from './one_drive';
export { ftpPlugin } from './ftp';

// Plugin registry for storage services
export const storageServicePlugins = {
  azure_storage: () => import('./azure_storage').then(m => m.azureStoragePlugin),
  s3: () => import('./s3').then(m => m.s3Plugin),
  google_storage: () => import('./google_storage').then(m => m.googleStoragePlugin),
  google_drive: () => import('./google_drive').then(m => m.googleDrivePlugin),
  one_drive: () => import('./one_drive').then(m => m.oneDrivePlugin),
  ftp: () => import('./ftp').then(m => m.ftpPlugin)
};

// Get all available storage service plugins
export const getStorageServicePlugins = () => {
  return Object.keys(storageServicePlugins);
};

// Plugin categories for storage services
export const STORAGE_CATEGORIES = {
  CLOUD_STORAGE: ['azure_storage', 's3', 'google_storage'],
  FILE_SHARING: ['google_drive', 'one_drive'],
  FILE_TRANSFER: ['ftp']
} as const;