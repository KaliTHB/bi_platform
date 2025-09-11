
// layouts/index.ts
export { default as WebviewLayout } from './WebviewLayout';
export { default as WorkspaceLayout } from './WorkspaceLayout';

// Type exports for better TypeScript support
export type { WebviewConfig } from './WebviewLayout';
export type { WorkspaceInfo, UserInfo } from './WorkspaceLayout';