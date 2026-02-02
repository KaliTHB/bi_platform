// web-application/src/auth/index.ts
export { useAuth, useAuthContext, AuthContext } from '../hooks/useAuth';
export { AuthProvider } from '../components/AuthProvider';
export type { 
  User, 
  Workspace, 
  AuthState, 
  LoginResult, 
  SwitchWorkspaceResult, 
  AuthContextType 
} from '../hooks/useAuth';