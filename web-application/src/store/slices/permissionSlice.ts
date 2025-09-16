// src/store/slices/permissionSlice.ts - COMPLETE UPDATED VERSION

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { castDraft } from "immer";

// ========================================
// TYPES AND INTERFACES
// ========================================

export interface PermissionState {
  // Core permission data
  userPermissions: string[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  
  // Additional metadata
  permissionSource: 'api' | 'cache' | 'auth' | null;
  workspaceId: string | null;
  cacheExpiry: number | null;
  
  // Permission validation
  validationErrors: string[];
  isValidated: boolean;
  
  // Permission categories for organization
  categories: string[];
  
  // Role information
  userRoles: string[];
  roleLevel: number;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

// ========================================
// INITIAL STATE
// ========================================

const initialState: PermissionState = {
  // Core permission data
  userPermissions: [],
  loading: false,
  error: null,
  lastUpdated: null,
  
  // Additional metadata
  permissionSource: null,
  workspaceId: null,
  cacheExpiry: null,
  
  // Permission validation
  validationErrors: [],
  isValidated: false,
  
  // Permission categories
  categories: [],
  
  // Role information
  userRoles: [],
  roleLevel: 0,
  isAdmin: false,
  isSuperAdmin: false,
};

// ========================================
// PERMISSION SLICE
// ========================================

const permissionSlice = createSlice({
  name: 'permission',
  initialState,
  reducers: {
    // ========================================
    // CORE PERMISSION MANAGEMENT
    // ========================================
    
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.userPermissions = castDraft(action.payload);
      state.lastUpdated = Date.now();
      state.error = null;
      state.isValidated = true;
      state.validationErrors = [];
      
      // Update permission categories
      state.categories = extractCategoriesFromPermissions(action.payload);
    },
    
    setPermissionsWithMetadata: (state, action: PayloadAction<{
      permissions: string[];
      source?: 'api' | 'cache' | 'auth';
      workspaceId?: string;
      cacheTimeout?: number;
      roles?: string[];
      roleLevel?: number;
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
    }>) => {
      const { 
        permissions, 
        source = 'api', 
        workspaceId = null, 
        cacheTimeout = 30 * 60 * 1000, // 30 minutes
        roles = [],
        roleLevel = 0,
        isAdmin = false,
        isSuperAdmin = false
      } = action.payload;
      
      state.userPermissions = castDraft(permissions);
      state.permissionSource = source;
      state.workspaceId = workspaceId;
      state.cacheExpiry = Date.now() + cacheTimeout;
      state.lastUpdated = Date.now();
      state.error = null;
      state.isValidated = true;
      state.validationErrors = [];
      
      // Role information
      state.userRoles = castDraft(roles);
      state.roleLevel = roleLevel;
      state.isAdmin = isAdmin;
      state.isSuperAdmin = isSuperAdmin;
      
      // Update categories
      state.categories = extractCategoriesFromPermissions(permissions);
    },
    
    // ========================================
    // LOADING AND ERROR STATES
    // ========================================
    
    setPermissionLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null; // Clear error when starting to load
      }
    },
    
    setPermissionError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
      state.isValidated = false;
    },
    
    clearPermissionError: (state) => {
      state.error = null;
      state.validationErrors = [];
    },
    
    // ========================================
    // PERMISSION OPERATIONS
    // ========================================
    
    clearPermissions: (state) => {
      state.userPermissions = [];
      state.error = null;
      state.lastUpdated = null;
      state.permissionSource = null;
      state.workspaceId = null;
      state.cacheExpiry = null;
      state.validationErrors = [];
      state.isValidated = false;
      state.categories = [];
      state.userRoles = [];
      state.roleLevel = 0;
      state.isAdmin = false;
      state.isSuperAdmin = false;
    },
    
    addPermission: (state, action: PayloadAction<string>) => {
      const permission = action.payload;
      if (!state.userPermissions.includes(permission)) {
        state.userPermissions.push(permission);
        state.lastUpdated = Date.now();
        
        // Update categories
        state.categories = extractCategoriesFromPermissions(state.userPermissions);
      }
    },
    
    removePermission: (state, action: PayloadAction<string>) => {
      const permission = action.payload;
      const initialLength = state.userPermissions.length;
      state.userPermissions = state.userPermissions.filter(p => p !== permission);
      
      if (state.userPermissions.length !== initialLength) {
        state.lastUpdated = Date.now();
        
        // Update categories
        state.categories = extractCategoriesFromPermissions(state.userPermissions);
      }
    },
    
    // ========================================
    // BULK OPERATIONS
    // ========================================
    
    addPermissions: (state, action: PayloadAction<string[]>) => {
      const newPermissions = action.payload.filter(p => !state.userPermissions.includes(p));
      if (newPermissions.length > 0) {
        state.userPermissions.push(...newPermissions);
        state.lastUpdated = Date.now();
        
        // Update categories
        state.categories = extractCategoriesFromPermissions(state.userPermissions);
      }
    },
    
    removePermissions: (state, action: PayloadAction<string[]>) => {
      const permissionsToRemove = new Set(action.payload);
      const originalLength = state.userPermissions.length;
      state.userPermissions = state.userPermissions.filter(p => !permissionsToRemove.has(p));
      
      if (state.userPermissions.length !== originalLength) {
        state.lastUpdated = Date.now();
        
        // Update categories
        state.categories = extractCategoriesFromPermissions(state.userPermissions);
      }
    },
    
    // ========================================
    // ADVANCED OPERATIONS
    // ========================================
    
    updatePermission: (state, action: PayloadAction<{ oldPermission: string; newPermission: string }>) => {
      const { oldPermission, newPermission } = action.payload;
      const index = state.userPermissions.indexOf(oldPermission);
      
      if (index !== -1) {
        state.userPermissions[index] = newPermission;
        state.lastUpdated = Date.now();
        
        // Update categories
        state.categories = extractCategoriesFromPermissions(state.userPermissions);
      }
    },
    
    togglePermission: (state, action: PayloadAction<string>) => {
      const permission = action.payload;
      const index = state.userPermissions.indexOf(permission);
      
      if (index >= 0) {
        state.userPermissions.splice(index, 1);
      } else {
        state.userPermissions.push(permission);
      }
      
      state.lastUpdated = Date.now();
      
      // Update categories
      state.categories = extractCategoriesFromPermissions(state.userPermissions);
    },
    
    // ========================================
    // CACHE AND VALIDATION
    // ========================================
    
    refreshPermissionsTimestamp: (state) => {
      state.lastUpdated = Date.now();
    },
    
    validatePermissions: (state, action: PayloadAction<string[]>) => {
      // Filter out any invalid permissions that aren't in the valid list
      const validPermissions = new Set(action.payload);
      const filteredPermissions = state.userPermissions.filter(p => validPermissions.has(p));
      const invalidPermissions = state.userPermissions.filter(p => !validPermissions.has(p));
      
      if (filteredPermissions.length !== state.userPermissions.length) {
        state.userPermissions = filteredPermissions;
        state.lastUpdated = Date.now();
        state.validationErrors = invalidPermissions.map(p => `Invalid permission: ${p}`);
      } else {
        state.validationErrors = [];
      }
      
      state.isValidated = true;
    },
    
    mergePermissions: (state, action: PayloadAction<{ 
      permissions: string[]; 
      source: string;
      priority?: 'high' | 'normal' | 'low';
    }>) => {
      const { permissions: newPermissions, source, priority = 'normal' } = action.payload;
      
      // If high priority, replace all permissions
      if (priority === 'high') {
        state.userPermissions = castDraft(newPermissions);
      } else {
        // Otherwise, merge unique permissions
        const uniqueNewPermissions = newPermissions.filter(p => !state.userPermissions.includes(p));
        if (uniqueNewPermissions.length > 0) {
          state.userPermissions.push(...uniqueNewPermissions);
        }
      }
      
      state.lastUpdated = Date.now();
      state.permissionSource = source as any;
      
      // Update categories
      state.categories = extractCategoriesFromPermissions(state.userPermissions);
    },
    
    // ========================================
    // WORKSPACE CONTEXT
    // ========================================
    
    setWorkspaceContext: (state, action: PayloadAction<{
      workspaceId: string;
      permissions: string[];
      roles: string[];
    }>) => {
      const { workspaceId, permissions, roles } = action.payload;
      
      state.workspaceId = workspaceId;
      state.userPermissions = castDraft(permissions);
      state.userRoles = castDraft(roles);
      state.lastUpdated = Date.now();
      
      // Update admin status based on permissions
      state.isAdmin = permissions.some(p => p.includes('admin') || p.includes('workspace.manage'));
      state.isSuperAdmin = permissions.some(p => p.includes('super_admin') || p.includes('system.admin'));
      
      // Update categories
      state.categories = extractCategoriesFromPermissions(permissions);
    },
    
    clearWorkspaceContext: (state) => {
      state.workspaceId = null;
      state.userPermissions = [];
      state.userRoles = [];
      state.categories = [];
      state.isAdmin = false;
      state.isSuperAdmin = false;
      state.roleLevel = 0;
      state.lastUpdated = Date.now();
    },
    
    // ========================================
    // ROLE MANAGEMENT
    // ========================================
    
    setUserRoles: (state, action: PayloadAction<{
      roles: string[];
      roleLevel?: number;
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
    }>) => {
      const { roles, roleLevel = 0, isAdmin = false, isSuperAdmin = false } = action.payload;
      
      state.userRoles = castDraft(roles);
      state.roleLevel = roleLevel;
      state.isAdmin = isAdmin;
      state.isSuperAdmin = isSuperAdmin;
      state.lastUpdated = Date.now();
    },
    
    addRole: (state, action: PayloadAction<string>) => {
      const role = action.payload;
      if (!state.userRoles.includes(role)) {
        state.userRoles.push(role);
        state.lastUpdated = Date.now();
        
        // Update admin status
        if (role.includes('admin')) {
          state.isAdmin = true;
        }
        if (role.includes('super_admin')) {
          state.isSuperAdmin = true;
        }
      }
    },
    
    removeRole: (state, action: PayloadAction<string>) => {
      const role = action.payload;
      state.userRoles = state.userRoles.filter(r => r !== role);
      state.lastUpdated = Date.now();
      
      // Update admin status
      state.isAdmin = state.userRoles.some(r => r.includes('admin'));
      state.isSuperAdmin = state.userRoles.some(r => r.includes('super_admin'));
    },
    
    // ========================================
    // CACHE MANAGEMENT
    // ========================================
    
    setCacheExpiry: (state, action: PayloadAction<number>) => {
      state.cacheExpiry = Date.now() + action.payload;
    },
    
    clearCache: (state) => {
      state.cacheExpiry = null;
      state.permissionSource = null;
    },
    
    checkCacheExpiry: (state) => {
      if (state.cacheExpiry && Date.now() > state.cacheExpiry) {
        // Mark cache as expired but don't clear data
        state.cacheExpiry = null;
        state.permissionSource = null;
      }
    },
    
    // ========================================
    // RESET STATE
    // ========================================
    
    resetPermissionState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Extract unique categories from permissions array
 */
function extractCategoriesFromPermissions(permissions: string[]): string[] {
  const categories = new Set<string>();
  
  permissions.forEach(permission => {
    // Extract category from permission pattern like 'category.action'
    const parts = permission.split('.');
    if (parts.length > 1) {
      categories.add(parts[0]);
    }
  });
  
  return Array.from(categories).sort();
}

// ========================================
// ACTION EXPORTS
// ========================================

export const {
  // Core permission management
  setPermissions,
  setPermissionsWithMetadata,
  
  // Loading and error states
  setPermissionLoading,
  setPermissionError,
  clearPermissionError,
  
  // Permission operations
  clearPermissions,
  addPermission,
  removePermission,
  
  // Bulk operations
  addPermissions,
  removePermissions,
  
  // Advanced operations
  updatePermission,
  togglePermission,
  
  // Cache and validation
  refreshPermissionsTimestamp,
  validatePermissions,
  mergePermissions,
  
  // Workspace context
  setWorkspaceContext,
  clearWorkspaceContext,
  
  // Role management
  setUserRoles,
  addRole,
  removeRole,
  
  // Cache management
  setCacheExpiry,
  clearCache,
  checkCacheExpiry,
  
  // Reset state
  resetPermissionState,
} = permissionSlice.actions;

// ========================================
// SELECTORS (Optional - for convenience)
// ========================================

// You can add these to a separate selectors file if preferred
export const permissionSelectors = {
  // Basic selectors
  selectUserPermissions: (state: { permission: PermissionState }) => state.permission.userPermissions,
  selectPermissionLoading: (state: { permission: PermissionState }) => state.permission.loading,
  selectPermissionError: (state: { permission: PermissionState }) => state.permission.error,
  
  // Advanced selectors
  selectIsPermissionCacheValid: (state: { permission: PermissionState }) => {
    const { cacheExpiry } = state.permission;
    return cacheExpiry && Date.now() < cacheExpiry;
  },
  
  selectPermissionsByCategory: (state: { permission: PermissionState }, category: string) => {
    return state.permission.userPermissions.filter(permission => 
      permission.startsWith(`${category}.`)
    );
  },
  
  selectHasPermission: (state: { permission: PermissionState }, permission: string) => {
    const { userPermissions } = state.permission;
    return userPermissions.includes(permission) || 
           userPermissions.some(p => p.endsWith('.*') && permission.startsWith(p.slice(0, -2) + '.'));
  },
  
  selectUserRoleLevel: (state: { permission: PermissionState }) => state.permission.roleLevel,
  selectIsAdmin: (state: { permission: PermissionState }) => state.permission.isAdmin,
  selectIsSuperAdmin: (state: { permission: PermissionState }) => state.permission.isSuperAdmin,
};

// ========================================
// DEFAULT EXPORT
// ========================================

export default permissionSlice.reducer;