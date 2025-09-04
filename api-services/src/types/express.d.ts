import { Request } from 'express';

// Extend Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        username: string;
        email: string;
        workspace_id?: string;
        roles?: string[];
        permissions?: string[];
      };
      workspace?: {
        id: string;
        name: string;
        slug: string;
      };
      userPermissions?: string[];
    }
  }
}

// Export for explicit imports
export interface AuthenticatedRequest extends Request {
  user: {
    user_id: string;
    username: string;
    email: string;
    workspace_id?: string;
    roles?: string[];
    permissions?: string[];
  };
}

export interface RBACRequest extends AuthenticatedRequest {
  userPermissions?: string[];
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
}