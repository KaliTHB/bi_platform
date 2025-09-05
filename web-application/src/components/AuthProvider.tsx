// web-application/src/components/AuthProvider.tsx
import React from 'react';
import type { ReactNode } from 'react';
import { useAuth, AuthContext } from '../hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}