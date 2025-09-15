// api-services/src/types/express.d.ts - FIXED VERSION
import { Request } from 'express';

// Consistent User Data Interface
export interface AuthUserData {
  user_id: string;
  email: string;
  username?: string;
  workspace_id?: string;
  workspace_slug?: string;
  workspace_role?: string;
  is_admin?: boolean;
  role_level?: number;
  roles?: string[];
  permissions?: string[];
}

// ✅ AUTHENTICATED REQUEST - User is guaranteed to be present
export interface AuthenticatedRequest extends Request {
  user: AuthUserData; // Required - guaranteed by authentication middleware
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  userPermissions?: string[];
}

// ✅ MAYBE AUTHENTICATED - For optional authentication middleware
export interface MaybeAuthenticatedRequest extends Request {
  user?: AuthUserData; // Optional - user might not be authenticated yet
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  userPermissions?: string[];
}

// ✅ WORKSPACE-SPECIFIC REQUEST - Workspace context required
export interface WorkspaceAuthRequest extends AuthenticatedRequest {
  user: AuthUserData & { workspace_id: string };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

// Extend Express Request globally for compatibility
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserData; // Keep optional for general Express usage
      workspace?: {
        id: string;
        name: string;
        slug: string;
      };
      userPermissions?: string[];
    }
  }
}