import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  
  const auth = useSelector((state: RootState) => state.auth);

  const signOut = async () => {
    try {
      // Call logout API
      if (auth.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${auth.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear local state
      dispatch(logout());
      router.push('/login');
    }
  };

  const hasPermission = (permission: string): boolean => {
    return auth.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => auth.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => auth.permissions.includes(permission));
  };

  return {
    ...auth,
    signOut,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};